import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { RegisterBody } from "@workspace/api-zod";
import { isAuthenticated } from "../middleware/auth";

const router: IRouter = Router();

// Register Profile (called after Supabase signup)
router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, name, supabaseId } = parsed.data;

  // Check if user exists
  const [existingUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email));

  if (existingUser) {
    res.status(400).json({ error: "User already exists" });
    return;
  }

  const [user] = await db
    .insert(usersTable)
    .values({
      email,
      name,
      supabaseId,
      isEmailVerified: false,
    })
    .returning();

  res.status(201).json({
    id: user.id,
    name: user.name,
    email: user.email,
  });
});

// Current User (called by frontend using JWT)
router.get("/auth/user", isAuthenticated, async (req, res): Promise<void> => {
  // isAuthenticated middleware ensures req.userId is set
  if (!req.userId) {
    res.status(401).json({ error: "Not logged in" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.userId));

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
  });
});

// Logout (just returns 200, frontend clears Supabase session)
router.post("/auth/logout", (req, res) => {
  res.json({ message: "Logged out" });
});

export default router;
