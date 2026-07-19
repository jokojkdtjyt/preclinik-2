import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, questionsTable } from "@workspace/db";
import {
  ListQuestionsParams,
  CreateQuestionParams,
  CreateQuestionBody,
  UpdateQuestionParams,
  UpdateQuestionBody,
  DeleteQuestionParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/modules/:moduleId/lessons/:lessonId/questions", async (req, res): Promise<void> => {
  const params = ListQuestionsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.lessonId, params.data.lessonId))
    .orderBy(questionsTable.id);

  res.json(questions);
});

router.post("/modules/:moduleId/lessons/:lessonId/questions", async (req, res): Promise<void> => {
  const params = CreateQuestionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateQuestionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [question] = await db
    .insert(questionsTable)
    .values({ ...parsed.data, lessonId: params.data.lessonId })
    .returning();

  res.status(201).json(question);
});

router.patch("/modules/:moduleId/lessons/:lessonId/questions/:questionId", async (req, res): Promise<void> => {
  const params = UpdateQuestionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateQuestionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [question] = await db
    .update(questionsTable)
    .set(parsed.data)
    .where(
      and(
        eq(questionsTable.id, params.data.questionId),
        eq(questionsTable.lessonId, params.data.lessonId)
      )
    )
    .returning();

  if (!question) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  res.json(question);
});

router.delete("/modules/:moduleId/lessons/:lessonId/questions/:questionId", async (req, res): Promise<void> => {
  const params = DeleteQuestionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [question] = await db
    .delete(questionsTable)
    .where(
      and(
        eq(questionsTable.id, params.data.questionId),
        eq(questionsTable.lessonId, params.data.lessonId)
      )
    )
    .returning();

  if (!question) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
