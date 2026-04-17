import {
  pgTable,
  text,
  serial,
  timestamp,
  numeric,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const leadStatusEnum = pgEnum("lead_status", [
  "New Lead",
  "Profile Checked",
  "Contacted",
  "Follow-up Sent",
  "Replied",
  "Meeting Scheduled",
  "Proposal Sent",
  "Won",
  "Lost",
]);

export const leadPriorityEnum = pgEnum("lead_priority", [
  "High",
  "Medium",
  "Low",
]);

export const leadSourceEnum = pgEnum("lead_source", [
  "LinkedIn",
  "Referral",
  "Website",
  "Other",
]);

export const leadsTable = pgTable("leads", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  companyName: text("company_name").notNull(),
  linkedinUrl: text("linkedin_url"),
  websiteUrl: text("website_url"),
  email: text("email"),
  phone: text("phone"),
  country: text("country"),
  industry: text("industry"),
  companySize: text("company_size"),
  leadSource: leadSourceEnum("lead_source"),
  status: leadStatusEnum("status").notNull().default("New Lead"),
  priority: leadPriorityEnum("priority").notNull().default("Medium"),
  estimatedBudget: numeric("estimated_budget", { precision: 12, scale: 2 }),
  notes: text("notes"),
  lastContactDate: text("last_contact_date"),
  nextFollowupDate: text("next_followup_date"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertLeadSchema = createInsertSchema(leadsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leadsTable.$inferSelect;
