import { pgTable, text, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const lessonsTable = pgTable("lessons", {
  id: text("id").primaryKey(), // slug-style id like "cv-l1"
  moduleId: text("module_id").notNull(),
  title: text("title").notNull(),
  duration: text("duration").notNull(),
  type: text("type").notNull().default("Video"), // Video | Reading | Quiz
  published: boolean("published").notNull().default(false),
  summary: text("summary"),
  videoTitle: text("video_title"),
  videoUrl: text("video_url"),
  bunnyVideoId: text("bunny_video_id"),
  youtubeUrl: text("youtube_url"),
  isFree: boolean("is_free").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertLessonSchema = createInsertSchema(lessonsTable);
export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type DbLesson = typeof lessonsTable.$inferSelect;
