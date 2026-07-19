import { pgTable, text, integer, serial, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const questionsTable = pgTable("qbank_questions", {
  id: serial("id").primaryKey(),
  lessonId: text("lesson_id").notNull(),
  question: text("question").notNull(),
  options: jsonb("options").$type<string[]>().notNull().default([]),
  correct: integer("correct").notNull().default(0),
  comment: text("comment").notNull().default(""),
});

export const insertQuestionSchema = createInsertSchema(questionsTable).omit({ id: true });
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type DbQuestion = typeof questionsTable.$inferSelect;
