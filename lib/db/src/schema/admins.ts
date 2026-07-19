import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const adminsTable = pgTable("admins", {
  email: text("email").primaryKey(),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DbAdmin = typeof adminsTable.$inferSelect;
