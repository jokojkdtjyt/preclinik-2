import { pgTable, text, timestamp, primaryKey, integer } from "drizzle-orm/pg-core";

export const cartTable = pgTable("cart", {
  userId: text("user_id").notNull(),
  moduleId: text("module_id").notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.moduleId] })]);

export const purchasedTable = pgTable("purchased", {
  userId: text("user_id").notNull(),
  moduleId: text("module_id").notNull(),
  purchasedAt: timestamp("purchased_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.moduleId] })]);

export const pendingPurchasesTable = pgTable("pending_purchases", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  moduleId: text("module_id").notNull(),
  imageUrl: text("image_url").notNull(),
  status: text("status").notNull().default("pending"),
  sessionId: text("session_id").notNull(),
  telegramMessageId: integer("telegram_message_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
