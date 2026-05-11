import { pgTable, text, serial, timestamp, integer, pgEnum, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const notificationTypeEnum = pgEnum("notification_type", [
  "followup_due",
  "followup_overdue",
  "lead_score_change",
  "data_enrichment_needed",
  "pipeline_bottleneck",
  "revenue_milestone",
  "system"
]);

export const notificationPriorityEnum = pgEnum("notification_priority", [
  "urgent",
  "high",
  "medium",
  "low"
]);

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => usersTable.id)
    .notNull(),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  priority: notificationPriorityEnum("priority").notNull().default("medium"),
  isRead: boolean("is_read").notNull().default(false),
  leadId: integer("lead_id"), // Optional reference to related lead
  actionUrl: text("action_url"), // Optional URL for action button
  actionText: text("action_text"), // Optional text for action button
  expiresAt: timestamp("expires_at", { withTimezone: true }), // Auto-dismiss time
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  readAt: timestamp("read_at", { withTimezone: true }),
});

export const insertNotificationSchema = createInsertSchema(notificationsTable).omit({
  id: true,
  createdAt: true,
  readAt: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notificationsTable.$inferSelect;
