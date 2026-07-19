import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import { db, cartTable, purchasedTable, pendingPurchasesTable, modulesTable, notificationsTable } from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";
import { clerkClient } from "@clerk/express";
import { eq, and } from "drizzle-orm";
import crypto from "node:crypto";

/** 1 minute for testing — change to 6 * 3600 * 1000 for production */
const REMIND_COOLDOWN_MS = 60 * 1_000;

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const DEV_DOMAIN = process.env.REPLIT_DEV_DOMAIN;

// ── Startup env-var check ─────────────────────────────────────────────────────
if (!BOT_TOKEN) {
  console.warn("[Telegram] TELEGRAM_BOT_TOKEN is not set — Telegram notifications disabled.");
}
if (!CHAT_ID) {
  console.warn("[Telegram] TELEGRAM_CHAT_ID is not set — receipt notifications will be skipped. Set this secret to enable Telegram messages.");
}

// ── Register Telegram webhook on startup ──────────────────────────────────────
if (BOT_TOKEN && DEV_DOMAIN) {
  const webhookUrl = `https://${DEV_DOMAIN}/api/purchases/telegram-webhook`;
  fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: webhookUrl }),
  })
    .then((r) => r.json())
    .then((j) => console.log("[Telegram] Webhook registered:", JSON.stringify(j)))
    .catch((e) => console.error("[Telegram] Webhook registration failed:", e));
}

// ── POST /purchases/submit ────────────────────────────────────────────────────
router.post(
  "/purchases/submit",
  requireAuth,
  upload.single("receipt") as ReturnType<typeof upload.single>,
  async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthedRequest).userId;

    if (!req.file) {
      res.status(400).json({ error: "Receipt image is required" });
      return;
    }

    // 1. Get cart items
    const cartRows = await db
      .select()
      .from(cartTable)
      .where(eq(cartTable.userId, userId));

    if (cartRows.length === 0) {
      res.status(400).json({ error: "Cart is empty" });
      return;
    }

    const moduleIds = cartRows.map((r) => r.moduleId);

    // 2. Fetch module titles
    const allModules = await db.select().from(modulesTable);
    const moduleMap = new Map(allModules.map((m) => [m.id, m]));
    const moduleNames = moduleIds.map((id) => moduleMap.get(id)?.title ?? id);

    // 3. Get user info from Clerk
    const user = await clerkClient.users.getUser(userId);
    const name =
      `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "Unknown";
    const email =
      user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
        ?.emailAddress ??
      user.emailAddresses[0]?.emailAddress ??
      "Unknown";

    // 4. Session ID groups all modules in this checkout
    const sessionId = crypto.randomUUID();

    // 5. Send photo + inline buttons to Telegram
    let telegramMessageId: number | null = null;
    let telegramFileId = "";

    if (BOT_TOKEN && CHAT_ID) {
      const caption = [
        `<b>🎓 New Purchase Request</b>`,
        ``,
        `<b>Student:</b> ${escapeHtml(name)}`,
        `<b>Email:</b> ${escapeHtml(email)}`,
        `<b>Modules:</b>`,
        ...moduleNames.map((n) => `  • ${escapeHtml(n)}`),
        ``,
        `<code>session: ${sessionId}</code>`,
      ].join("\n");

      const replyMarkup = JSON.stringify({
        inline_keyboard: [
          [
            { text: "✅ Approve", callback_data: `approve:${sessionId}` },
            { text: "❌ Reject", callback_data: `reject:${sessionId}` },
          ],
        ],
      });

      const formData = new FormData();
      formData.append("chat_id", CHAT_ID);
      formData.append("caption", caption);
      formData.append("parse_mode", "HTML");
      formData.append("reply_markup", replyMarkup);
      formData.append(
        "photo",
        new Blob([new Uint8Array(req.file.buffer)], { type: req.file.mimetype }),
        req.file.originalname || "receipt.jpg"
      );

      try {
        const tgRes = await fetch(
          `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`,
          { method: "POST", body: formData }
        );
        const tgJson = (await tgRes.json()) as {
          ok: boolean;
          result?: {
            message_id: number;
            photo?: Array<{ file_id: string }>;
          };
        };
        if (tgJson.ok && tgJson.result) {
          telegramMessageId = tgJson.result.message_id;
          telegramFileId = tgJson.result.photo?.at(-1)?.file_id ?? "";
        } else {
          console.error("[Telegram] sendPhoto not ok:", JSON.stringify(tgJson));
        }
      } catch (err) {
        console.error("[Telegram] sendPhoto failed:", err);
      }
    }

    // 6. Insert one pending_purchase row per module
    await db.insert(pendingPurchasesTable).values(
      moduleIds.map((moduleId) => ({
        id: crypto.randomUUID(),
        userId,
        moduleId,
        imageUrl: telegramFileId || "pending",
        status: "pending" as const,
        sessionId,
        ...(telegramMessageId != null ? { telegramMessageId } : {}),
      }))
    );

    // 7. Clear the user's cart
    await db.delete(cartTable).where(eq(cartTable.userId, userId));

    res.json({ ok: true, sessionId });
  }
);

// ── GET /purchases/pending ────────────────────────────────────────────────────
// Returns the current user's pending purchase sessions so the frontend can
// show "Pending Review" badges and the Notify Again countdown.
router.get(
  "/purchases/pending",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthedRequest).userId;

    const rows = await db
      .select()
      .from(pendingPurchasesTable)
      .where(
        and(
          eq(pendingPurchasesTable.userId, userId),
          eq(pendingPurchasesTable.status, "pending"),
        ),
      );

    // Group by sessionId
    type SessionGroup = {
      sessionId: string;
      moduleIds: string[];
      lastRemindedAt: string | null;
      createdAt: string;
    };
    const sessions = new Map<string, SessionGroup>();
    for (const row of rows) {
      if (!sessions.has(row.sessionId)) {
        sessions.set(row.sessionId, {
          sessionId: row.sessionId,
          moduleIds: [],
          lastRemindedAt: row.lastRemindedAt?.toISOString() ?? null,
          createdAt: row.createdAt.toISOString(),
        });
      }
      sessions.get(row.sessionId)!.moduleIds.push(row.moduleId);
    }

    res.json([...sessions.values()]);
  },
);

// ── POST /purchases/remind/:sessionId ─────────────────────────────────────────
// Re-sends the original Telegram notification as a reminder.
// Rate-limited by REMIND_COOLDOWN_MS; uses the stored Telegram file_id so no
// re-upload is needed.
router.post(
  "/purchases/remind/:sessionId",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthedRequest).userId;
    const { sessionId } = req.params as { sessionId: string };

    const pending = await db
      .select()
      .from(pendingPurchasesTable)
      .where(
        and(
          eq(pendingPurchasesTable.sessionId, sessionId),
          eq(pendingPurchasesTable.userId, userId),
          eq(pendingPurchasesTable.status, "pending"),
        ),
      );

    if (pending.length === 0) {
      res.status(404).json({ error: "Session not found or no longer pending" });
      return;
    }

    const firstRow = pending[0];
    const now = new Date();
    const lastReminded = firstRow.lastRemindedAt;

    if (lastReminded && now.getTime() - lastReminded.getTime() < REMIND_COOLDOWN_MS) {
      const remainingMs = REMIND_COOLDOWN_MS - (now.getTime() - lastReminded.getTime());
      res.status(429).json({ error: "Too soon to remind", remainingMs });
      return;
    }

    // Also enforce cooldown from createdAt on the very first reminder
    const createdAt = firstRow.createdAt;
    if (!lastReminded && now.getTime() - createdAt.getTime() < REMIND_COOLDOWN_MS) {
      const remainingMs = REMIND_COOLDOWN_MS - (now.getTime() - createdAt.getTime());
      res.status(429).json({ error: "Too soon to remind", remainingMs });
      return;
    }

    // Fetch module names
    const allModules = await db.select().from(modulesTable);
    const moduleMap = new Map(allModules.map((m) => [m.id, m]));
    const moduleIds = pending.map((p) => p.moduleId);
    const moduleNames = moduleIds.map((id) => moduleMap.get(id)?.title ?? id);

    // Get user info from Clerk
    const user = await clerkClient.users.getUser(userId);
    const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "Unknown";
    const email =
      user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
        ?.emailAddress ??
      user.emailAddresses[0]?.emailAddress ??
      "Unknown";

    if (BOT_TOKEN && CHAT_ID) {
      const caption = [
        `<b>🔔 Reminder: Pending Purchase Request</b>`,
        ``,
        `<b>Student:</b> ${escapeHtml(name)}`,
        `<b>Email:</b> ${escapeHtml(email)}`,
        `<b>Modules:</b>`,
        ...moduleNames.map((n) => `  • ${escapeHtml(n)}`),
        ``,
        `<code>session: ${sessionId}</code>`,
      ].join("\n");

      const replyMarkup = JSON.stringify({
        inline_keyboard: [
          [
            { text: "✅ Approve", callback_data: `approve:${sessionId}` },
            { text: "❌ Reject", callback_data: `reject:${sessionId}` },
          ],
        ],
      });

      const imageFileId = firstRow.imageUrl;

      if (imageFileId && imageFileId !== "pending") {
        // Reuse stored file_id — no re-upload needed
        try {
          const tgRes = await fetch(
            `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: CHAT_ID,
                photo: imageFileId,
                caption,
                parse_mode: "HTML",
                reply_markup: replyMarkup,
              }),
            },
          );
          const tgJson = (await tgRes.json()) as { ok: boolean };
          if (!tgJson.ok) {
            console.error("[Telegram] remind sendPhoto not ok:", JSON.stringify(tgJson));
          }
        } catch (err) {
          console.error("[Telegram] remind sendPhoto failed:", err);
        }
      }
    }

    // Update lastRemindedAt for all rows in this session
    await db
      .update(pendingPurchasesTable)
      .set({ lastRemindedAt: now })
      .where(eq(pendingPurchasesTable.sessionId, sessionId));

    res.json({ ok: true });
  },
);

// ── POST /purchases/telegram-webhook ──────────────────────────────────────────
router.post(
  "/purchases/telegram-webhook",
  async (req: Request, res: Response): Promise<void> => {
    // Respond 200 immediately so Telegram doesn't retry
    res.json({ ok: true });

    if (!BOT_TOKEN) return;

    const body = req.body as {
      callback_query?: {
        id: string;
        data: string;
        message?: { message_id: number; chat: { id: number } };
      };
    };

    const cq = body?.callback_query;
    if (!cq) return;

    const colonIdx = cq.data.indexOf(":");
    if (colonIdx === -1) return;
    const action = cq.data.slice(0, colonIdx);
    const sessionId = cq.data.slice(colonIdx + 1);
    if (!sessionId || action === "noop") return;

    const msgId = cq.message?.message_id;
    const chatId = cq.message?.chat?.id;

    if (action === "approve") {
      const pending = await db
        .select()
        .from(pendingPurchasesTable)
        .where(
          and(
            eq(pendingPurchasesTable.sessionId, sessionId),
            eq(pendingPurchasesTable.status, "pending")
          )
        );

      if (pending.length > 0) {
        const { userId } = pending[0];
        const moduleIds = pending.map((p) => p.moduleId);

        await db
          .insert(purchasedTable)
          .values(moduleIds.map((moduleId) => ({ userId, moduleId })))
          .onConflictDoNothing();

        await db
          .update(pendingPurchasesTable)
          .set({ status: "approved" })
          .where(eq(pendingPurchasesTable.sessionId, sessionId));

        // Notify the student their purchase was approved
        const allModules = await db.select().from(modulesTable);
        const moduleMap = new Map(allModules.map((m) => [m.id, m]));
        const moduleNames = moduleIds.map((id) => moduleMap.get(id)?.title ?? id);
        await db.insert(notificationsTable).values({
          id: crypto.randomUUID(),
          userId,
          type: "purchase_approved",
          title: "Purchase Approved! 🎉",
          body: moduleNames.length === 1
            ? `${moduleNames[0]} is now unlocked.`
            : `${moduleNames.slice(0, -1).join(", ")} and ${moduleNames.at(-1)} are now unlocked.`,
          moduleId: moduleIds[0] ?? null,
        });
      }

      await tgAnswer(cq.id, "✅ Purchase approved!");
      if (chatId && msgId) await tgEditMarkup(chatId, msgId, "✅ APPROVED");
    } else if (action === "reject") {
      await db
        .update(pendingPurchasesTable)
        .set({ status: "rejected" })
        .where(eq(pendingPurchasesTable.sessionId, sessionId));

      await tgAnswer(cq.id, "❌ Purchase rejected");
      if (chatId && msgId) await tgEditMarkup(chatId, msgId, "❌ REJECTED");
    }
  }
);

// ── GET /admin/purchases ───────────────────────────────────────────────────────
router.get(
  "/admin/purchases",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    const rows = await db
      .select()
      .from(pendingPurchasesTable)
      .orderBy(pendingPurchasesTable.createdAt);

    const allModules = await db.select().from(modulesTable);
    const moduleMap = new Map(allModules.map((m) => [m.id, m]));

    type Group = {
      sessionId: string;
      userId: string;
      imageUrl: string;
      status: string;
      createdAt: string;
      modules: string[];
      telegramMessageId: number | null;
    };
    const groups = new Map<string, Group>();

    for (const row of rows) {
      if (!groups.has(row.sessionId)) {
        groups.set(row.sessionId, {
          sessionId: row.sessionId,
          userId: row.userId,
          imageUrl: row.imageUrl,
          status: row.status,
          createdAt: row.createdAt.toISOString(),
          modules: [],
          telegramMessageId: row.telegramMessageId ?? null,
        });
      }
      const g = groups.get(row.sessionId)!;
      g.modules.push(moduleMap.get(row.moduleId)?.title ?? row.moduleId);
      // pending beats everything; approved beats rejected
      if (row.status === "pending") g.status = "pending";
      else if (row.status === "approved" && g.status === "rejected")
        g.status = "approved";
    }

    // Enrich with Clerk user info
    const userIds = [...new Set(rows.map((r) => r.userId))];
    const resolved = await Promise.allSettled(
      userIds.map(async (uid) => {
        const u = await clerkClient.users.getUser(uid);
        const em =
          u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId)
            ?.emailAddress ?? "";
        return {
          id: uid,
          name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || em,
          email: em,
        };
      })
    );
    const userMap = new Map(
      resolved
        .filter(
          (r): r is PromiseFulfilledResult<{ id: string; name: string; email: string }> =>
            r.status === "fulfilled"
        )
        .map((r) => [r.value.id, r.value])
    );

    const result = [...groups.values()].map((g) => ({
      ...g,
      studentName: userMap.get(g.userId)?.name ?? "Unknown",
      studentEmail: userMap.get(g.userId)?.email ?? "",
    }));

    // Most recent first
    result.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    res.json(result);
  }
);

// ── GET /admin/purchases/receipt/:sessionId ────────────────────────────────────
// Proxies the receipt image from Telegram — opens a valid temp URL redirect.
router.get(
  "/admin/purchases/receipt/:sessionId",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const { sessionId } = req.params as { sessionId: string };

    const [row] = await db
      .select()
      .from(pendingPurchasesTable)
      .where(eq(pendingPurchasesTable.sessionId, sessionId))
      .limit(1);

    if (!row || !row.imageUrl || row.imageUrl === "pending" || !BOT_TOKEN) {
      res.status(404).json({ error: "Receipt not found" });
      return;
    }

    try {
      const r = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${row.imageUrl}`
      );
      const j = (await r.json()) as { ok: boolean; result?: { file_path: string } };
      if (!j.ok || !j.result?.file_path) {
        res.status(404).json({ error: "Could not retrieve file" });
        return;
      }
      res.redirect(
        `https://api.telegram.org/file/bot${BOT_TOKEN}/${j.result.file_path}`
      );
    } catch {
      res.status(500).json({ error: "Failed to fetch receipt" });
    }
  }
);

// ── Helpers ────────────────────────────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function tgAnswer(callbackQueryId: string, text: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
}

async function tgEditMarkup(
  chatId: number,
  messageId: number,
  label: string
): Promise<void> {
  await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/editMessageReplyMarkup`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
          inline_keyboard: [[{ text: label, callback_data: "noop" }]],
        },
      }),
    }
  );
}

export default router;
