import { pgTable, text, timestamp, primaryKey } from "drizzle-orm/pg-core";

export const progressTable = pgTable("progress", {
  userId: text("user_id").notNull(),
  lessonId: text("lesson_id").notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.lessonId] })]);
