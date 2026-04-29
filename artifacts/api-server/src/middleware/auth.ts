import type { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../lib/supabase-admin";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    // Look up our internal user ID by supabaseId
    const [dbUser] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.supabaseId, user.id));

    if (!dbUser) {
      res.status(401).json({ error: "User record not found" });
      return;
    }

    req.userId = dbUser.id;
    next();
  } catch (error) {
    res.status(500).json({ error: "Internal server error during authentication" });
  }
}
