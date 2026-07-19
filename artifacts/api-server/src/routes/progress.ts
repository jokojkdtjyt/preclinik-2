import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, progressTable } from "@workspace/db";
import { MarkProgressParams, MarkProgressBody } from "@workspace/api-zod";
import { requireAuth, AuthedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/progress", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).userId;
  const rows = await db
    .select()
    .from(progressTable)
    .where(eq(progressTable.userId, userId));

  const map: Record<string, boolean> = {};
  for (const row of rows) {
    map[row.lessonId] = true;
  }
  res.json(map);
});

router.put(
  "/progress/:lessonId",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = (req as AuthedRequest).userId;
    const params = MarkProgressParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = MarkProgressBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const { lessonId } = params.data;
    const { completed } = parsed.data;

    if (completed) {
      await db
        .insert(progressTable)
        .values({ userId, lessonId })
        .onConflictDoNothing();
    } else {
      await db
        .delete(progressTable)
        .where(
          and(
            eq(progressTable.userId, userId),
            eq(progressTable.lessonId, lessonId),
          ),
        );
    }

    const rows = await db
      .select()
      .from(progressTable)
      .where(eq(progressTable.userId, userId));

    const map: Record<string, boolean> = {};
    for (const row of rows) {
      map[row.lessonId] = true;
    }
    res.json(map);
  },
);

export default router;
