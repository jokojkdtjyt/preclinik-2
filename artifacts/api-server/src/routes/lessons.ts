import { Router, type IRouter } from "express";
import { eq, and, inArray } from "drizzle-orm";
import { db, lessonsTable, questionsTable } from "@workspace/db";
import {
  ListLessonsParams,
  CreateLessonParams,
  CreateLessonBody,
  GetLessonParams,
  UpdateLessonParams,
  UpdateLessonBody,
  DeleteLessonParams,
} from "@workspace/api-zod";
import { sql } from "drizzle-orm";
import { isAdminRequest } from "../lib/isAdminRequest";

const router: IRouter = Router();

async function withQuestionCount(lesson: typeof lessonsTable.$inferSelect) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(questionsTable)
    .where(eq(questionsTable.lessonId, lesson.id));
  return { ...lesson, questionCount: Number(row?.count ?? 0) };
}

// ── GET /modules/:moduleId/lessons ─────────────────────────────────────────────
// Admins see all lessons (including draft). Students only see published ones.
router.get("/modules/:moduleId/lessons", async (req, res): Promise<void> => {
  const params = ListLessonsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const admin = await isAdminRequest(req);

  const conditions = [eq(lessonsTable.moduleId, params.data.moduleId)];
  if (!admin) {
    // Students (and admins in student-preview mode) only see published lessons
    conditions.push(eq(lessonsTable.published, true));
  }

  const lessons = await db
    .select()
    .from(lessonsTable)
    .where(and(...conditions))
    .orderBy(lessonsTable.sortOrder);

  const lessonIds = lessons.map((l) => l.id);
  const questionCounts = lessonIds.length > 0
    ? await db
        .select({
          lessonId: questionsTable.lessonId,
          count: sql<number>`count(*)::int`,
        })
        .from(questionsTable)
        .where(inArray(questionsTable.lessonId, lessonIds))
        .groupBy(questionsTable.lessonId)
    : [];

  const countMap = new Map<string, number>();
  for (const row of questionCounts) {
    countMap.set(row.lessonId, Number(row.count));
  }

  const result = lessons.map((l) => ({ ...l, questionCount: countMap.get(l.id) ?? 0 }));
  res.json(result);
});

router.post("/modules/:moduleId/lessons", async (req, res): Promise<void> => {
  const params = CreateLessonParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateLessonBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [lesson] = await db
    .insert(lessonsTable)
    .values({ ...parsed.data, moduleId: params.data.moduleId })
    .returning();

  res.status(201).json({ ...lesson, questionCount: 0 });
});

// ── GET /modules/:moduleId/lessons/:lessonId ───────────────────────────────────
// Draft lessons are 404 for students (and admins in student-preview mode).
router.get("/modules/:moduleId/lessons/:lessonId", async (req, res): Promise<void> => {
  const params = GetLessonParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const admin = await isAdminRequest(req);

  const conditions = [
    eq(lessonsTable.id, params.data.lessonId),
    eq(lessonsTable.moduleId, params.data.moduleId),
  ];
  if (!admin) {
    conditions.push(eq(lessonsTable.published, true));
  }

  const [lesson] = await db
    .select()
    .from(lessonsTable)
    .where(and(...conditions));

  if (!lesson) {
    res.status(404).json({ error: "Lesson not found" });
    return;
  }

  res.json(await withQuestionCount(lesson));
});

router.patch("/modules/:moduleId/lessons/:lessonId", async (req, res): Promise<void> => {
  const params = UpdateLessonParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateLessonBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [lesson] = await db
    .update(lessonsTable)
    .set(parsed.data)
    .where(
      and(
        eq(lessonsTable.id, params.data.lessonId),
        eq(lessonsTable.moduleId, params.data.moduleId)
      )
    )
    .returning();

  if (!lesson) {
    res.status(404).json({ error: "Lesson not found" });
    return;
  }

  res.json(await withQuestionCount(lesson));
});

router.delete("/modules/:moduleId/lessons/:lessonId", async (req, res): Promise<void> => {
  const params = DeleteLessonParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [lesson] = await db
    .delete(lessonsTable)
    .where(
      and(
        eq(lessonsTable.id, params.data.lessonId),
        eq(lessonsTable.moduleId, params.data.moduleId)
      )
    )
    .returning();

  if (!lesson) {
    res.status(404).json({ error: "Lesson not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
