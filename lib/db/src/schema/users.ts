import { pgTable, text, timestamp, serial, boolean } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  supabaseId: text("supabase_id").unique().notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  // password and isEmailVerified are now owned by Supabase Auth
  password: text("password"),
  isEmailVerified: boolean("is_email_verified").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

