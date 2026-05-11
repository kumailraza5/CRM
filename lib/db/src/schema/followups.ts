import { pgTable, text, serial, timestamp, integer, pgEnum, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { leadsTable } from "./leads";
import { usersTable } from "./users";

export const followupTypeEnum = pgEnum("followup_type", [
  "call",
  "email",
  "linkedin_message",
  "meeting",
  "proposal",
  "demo",
  "check_in",
  "custom"
]);

export const followupPriorityEnum = pgEnum("followup_priority", [
  "urgent",
  "high",
  "medium",
  "low"
]);

export const followupStatusEnum = pgEnum("followup_status", [
  "pending",
  "completed",
  "skipped",
  "rescheduled"
]);

export const followupsTable = pgTable("followups", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => usersTable.id)
    .notNull(),
  leadId: integer("lead_id")
    .notNull()
    .references(() => leadsTable.id, { onDelete: "cascade" }),
  type: followupTypeEnum("type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  priority: followupPriorityEnum("priority").notNull().default("medium"),
  status: followupStatusEnum("status").notNull().default("pending"),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
  reminderAt: timestamp("reminder_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  isNotified: boolean("is_notified").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertFollowupSchema = createInsertSchema(followupsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
  isNotified: true,
});

export type InsertFollowup = z.infer<typeof insertFollowupSchema>;
export type Followup = typeof followupsTable.$inferSelect;
