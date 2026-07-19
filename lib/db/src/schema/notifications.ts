import { pgTable, text, timestamp, primaryKey } from "drizzle-orm/pg-core";

export const notificationsTable = pgTable("notifications", {
  id: text("id").primaryKey(),
  /** null = global (shown to all students) */
  userId: text("user_id"),
  /** 'purchase_approved' | 'new_module' | 'new_lesson' */
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  moduleId: text("module_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notificationReadsTable = pgTable("notification_reads", {
  userId: text("user_id").notNull(),
  notificationId: text("notification_id").notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.notificationId] })]);
