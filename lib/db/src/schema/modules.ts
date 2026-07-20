import { pgTable, text, real, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const modulesTable = pgTable("modules", {
  id: text("id").primaryKey(), // slug-style id like "cardio-foundations"
  title: text("title").notNull(),
  category: text("category").notNull(),
  level: text("level").notNull().default("Intermediate"),
  provider: text("provider").notNull().default("PreClinik Faculty"),
  rating: real("rating").notNull().default(0),
  students: integer("students").notNull().default(0),
  price: integer("price").notNull().default(800),
  duration: text("duration").notNull(),
  published: boolean("published").notNull().default(false),
  icon: text("icon").notNull().default("heart"),
  gradient: text("gradient"),
  year: text("year").notNull().default("1"),
  summary: text("summary").notNull().default(""),
  outcomes: jsonb("outcomes").$type<string[]>().notNull().default([]),
  isFree: boolean("is_free").notNull().default(false),
});

export const insertModuleSchema = createInsertSchema(modulesTable);
export type InsertModule = z.infer<typeof insertModuleSchema>;
export type DbModule = typeof modulesTable.$inferSelect;
