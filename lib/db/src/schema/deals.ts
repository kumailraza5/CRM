import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  numeric,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { leadsTable } from "./leads";
import { usersTable } from "./users";

export const paymentStatusEnum = pgEnum("payment_status", [
  "Paid",
  "Pending",
  "Partial",
]);

export const dealsTable = pgTable("deals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => usersTable.id)
    .notNull(),
  leadId: integer("lead_id").references(() => leadsTable.id, {
    onDelete: "set null",
  }),
  clientName: text("client_name").notNull(),
  serviceSold: text("service_sold").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  dealDate: text("deal_date").notNull(),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("Pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertDealSchema = createInsertSchema(dealsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDeal = z.infer<typeof insertDealSchema>;
export type Deal = typeof dealsTable.$inferSelect;
