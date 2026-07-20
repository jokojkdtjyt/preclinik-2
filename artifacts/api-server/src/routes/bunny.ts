/**
 * Bunny Stream integration routes
 *
 * POST /admin/lessons/:lessonId/upload-video
 *   — Requires admin. Accepts multipart `video` field.
 *   — Creates the video in Bunny, uploads the binary, saves bunnyVideoId to DB.
 *
 * GET /modules/:moduleId/lessons/:lessonId/play-url
 *   — Requires any signed-in user who owns the module (or is an admin).
 *   — Returns a signed Bunny embed URL valid for 1 hour.
 *
 * Token signing:
 *   SHA-256(BUNNY_API_KEY + videoId + expiresUnixTimestamp)
 *   — matches Bunny Stream's Token Authentication scheme (enable in Library › Security).
 */

import { Router, type IRouter } from "express";
import multer from "multer";
import crypto from "node:crypto";
import { db, lessonsTable, purchasedTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { requireAdmin } from "../middlewares/requireAdmin";
import { isAdminRequest } from "../lib/isAdminRequest";

const BUNNY_LIBRARY_ID = "706977";
const BUNNY_API_BASE = "https://video.bunnycdn.com";

function getBunnyKey(): string {
  const key = process.env.BUNNY_API_KEY;
  if (!key) throw new Error("BUNNY_API_KEY environment variable is not set");
  return key;
}

const router: IRouter = Router();

// multer: keep file in memory so we can stream it straight to Bunny's PUT.
// For very large files (>500 MB) swap to disk storage and pipe a ReadStream.
const upload = multer({ storage: multer.memoryStorage() });

// ── POST /admin/lessons/:lessonId/upload-video ────────────────────────────────
router.post(
  "/admin/lessons/:lessonId/upload-video",
  requireAdmin,
  upload.single("video"),
  async (req, res): Promise<void> => {
    const lessonId = req.params.lessonId as string;

    if (!req.file) {
      res.status(400).json({ error: "No video file provided (field name: video)" });
      return;
    }

    // 1. Verify lesson exists
    const [lesson] = await db
      .select()
      .from(lessonsTable)
      .where(eq(lessonsTable.id, lessonId));

    if (!lesson) {
      res.status(404).json({ error: "Lesson not found" });
      return;
    }

    const BUNNY_API_KEY = getBunnyKey();

    // 2. Create video entry in Bunny Stream library
    const createRes = await fetch(
      `${BUNNY_API_BASE}/library/${BUNNY_LIBRARY_ID}/videos`,
      {
        method: "POST",
        headers: {
          AccessKey: BUNNY_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: lesson.title }),
      },
    );

    if (!createRes.ok) {
      const text = await createRes.text();
      console.error("[bunny] create failed:", createRes.status, text);
      res.status(502).json({ error: `Bunny create video failed: ${text}` });
      return;
    }

    const { guid: videoId } = (await createRes.json()) as { guid: string };
    console.log(`[bunny] created video ${videoId} for lesson ${lessonId}`);

    // 3. Upload the binary to Bunny
    const uploadRes = await fetch(
      `${BUNNY_API_BASE}/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`,
      {
        method: "PUT",
        headers: {
          AccessKey: BUNNY_API_KEY,
          "Content-Type": "application/octet-stream",
        },
        // Buffer is supported directly as fetch body in Node 18+
        body: req.file.buffer,
      },
    );

    if (!uploadRes.ok) {
      const text = await uploadRes.text();
      console.error("[bunny] upload failed:", uploadRes.status, text);
      // Best-effort delete the dangling video entry
      fetch(`${BUNNY_API_BASE}/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`, {
        method: "DELETE",
        headers: { AccessKey: BUNNY_API_KEY },
      }).catch(() => {});
      res.status(502).json({ error: `Bunny upload failed: ${text}` });
      return;
    }

    console.log(`[bunny] upload complete for video ${videoId}`);

    // 4. Persist bunnyVideoId to the lesson record
    const [updated] = await db
      .update(lessonsTable)
      .set({ bunnyVideoId: videoId })
      .where(eq(lessonsTable.id, lessonId))
      .returning();

    res.json({ bunnyVideoId: videoId, lesson: updated });
  },
);

// ── GET /modules/:moduleId/lessons/:lessonId/play-url ─────────────────────────
router.get(
  "/modules/:moduleId/lessons/:lessonId/play-url",
  async (req, res): Promise<void> => {
    // Must be signed in
    const auth = getAuth(req);
    if (!auth?.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const moduleId = req.params.moduleId as string;
    const lessonId = req.params.lessonId as string;

    // Fetch lesson (always by exact id — published check comes after)
    const [lesson] = await db
      .select()
      .from(lessonsTable)
      .where(
        and(eq(lessonsTable.id, lessonId), eq(lessonsTable.moduleId, moduleId)),
      );

    if (!lesson) {
      res.status(404).json({ error: "Lesson not found" });
      return;
    }

    if (!lesson.bunnyVideoId) {
      res.status(404).json({ error: "No video uploaded for this lesson yet" });
      return;
    }

    // Single admin check — also respects X-Preview-As-Student header so an
    // admin in student-preview mode is treated exactly like a real student.
    const adminAccess = await isAdminRequest(req);

    // Draft lessons are invisible to students (and admins in student-preview)
    if (!lesson.published && !adminAccess) {
      res.status(404).json({ error: "Lesson not found" });
      return;
    }

    // Ownership: admins and free lessons pass unconditionally;
    // students need a purchase record for paid lessons.
    let hasAccess = adminAccess || lesson.isFree;
    if (!hasAccess) {
      const [purchase] = await db
        .select()
        .from(purchasedTable)
        .where(
          and(
            eq(purchasedTable.userId, auth.userId),
            eq(purchasedTable.moduleId, moduleId),
          ),
        );
      hasAccess = !!purchase;
    }

    if (!hasAccess) {
      res.status(403).json({ error: "You do not own this module" });
      return;
    }

    // Build signed embed URL — 1-hour expiry.
    // Include a per-user identifier so Bunny scopes resume-position tracking
    // to the individual viewer, not the browser session.  We hash the Clerk
    // userId for privacy (Bunny never sees internal IDs).
    const BUNNY_API_KEY = getBunnyKey();
    const expires = Math.floor(Date.now() / 1000) + 3600;
    const token = crypto
      .createHash("sha256")
      .update(BUNNY_API_KEY + lesson.bunnyVideoId + expires)
      .digest("hex");

    const bunnyScopedUserId = crypto
      .createHash("sha256")
      .update(auth.userId)
      .digest("hex")
      .substring(0, 32);

    const embedUrl = `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${lesson.bunnyVideoId}?token=${token}&expires=${expires}&autoplay=false&responsive=true&userId=${bunnyScopedUserId}`;

    res.json({ embedUrl, videoId: lesson.bunnyVideoId });
  },
);

export default router;
