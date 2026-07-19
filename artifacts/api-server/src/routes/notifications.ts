import { Router, type IRouter, type Request, type Response } from "express";
import { db, notificationsTable, notificationReadsTable } from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";
import { isNull, or, eq } from "drizzle-orm";

const router: IRouter = Router();

// ── GET /notifications ─────────────────────────────────────────────────────────
// Returns all unread notifications for the current user: user-specific ones
// (purchase approved) plus global ones (new module / new lesson).
router.get(
  "/notifications",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthedRequest).userId;

    // IDs the user has already read
    const reads = await db
      .select({ notificationId: notificationReadsTable.notificationId })
      .from(notificationReadsTable)
      .where(eq(notificationReadsTable.userId, userId));
    const readIds = new Set(reads.map((r) => r.notificationId));

    // User-specific + global notifications
    const all = await db
      .select()
      .from(notificationsTable)
      .where(
        or(
          eq(notificationsTable.userId, userId),
          isNull(notificationsTable.userId),
        ),
      )
      .orderBy(notificationsTable.createdAt);

    const unread = all.filter((n) => !readIds.has(n.id));

    res.json(
      unread.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        moduleId: n.moduleId ?? null,
        createdAt: n.createdAt.toISOString(),
      })),
    );
  },
);

// ── POST /notifications/mark-read ─────────────────────────────────────────────
router.post(
  "/notifications/mark-read",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthedRequest).userId;
    const { ids } = req.body as { ids?: string[] };

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: "ids array required" });
      return;
    }

    await db
      .insert(notificationReadsTable)
      .values(ids.map((notificationId) => ({ userId, notificationId })))
      .onConflictDoNothing();

    res.json({ ok: true });
  },
);

export default router;
