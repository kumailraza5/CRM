import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, leadNotesTable, activitiesTable, leadsTable } from "@workspace/db";
import {
  ListNotesParams,
  ListNotesResponse,
  CreateNoteParams,
  CreateNoteBody,
  DeleteNoteParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// List notes for a lead
router.get("/leads/:leadId/notes", async (req, res): Promise<void> => {
  const params = ListNotesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const notes = await db
    .select()
    .from(leadNotesTable)
    .where(
      and(
        eq(leadNotesTable.leadId, params.data.leadId),
        eq(leadNotesTable.userId, req.userId!)
      )
    )
    .orderBy(leadNotesTable.createdAt);

  res.json(ListNotesResponse.parse(notes.map(n => ({
    ...n,
    createdAt: n.createdAt.toISOString(),
  }))));
});

// Create note
router.post("/leads/:leadId/notes", async (req, res): Promise<void> => {
  const params = CreateNoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = CreateNoteBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [note] = await db.insert(leadNotesTable).values({
    userId: req.userId!,
    leadId: params.data.leadId,
    type: body.data.type as any,
    content: body.data.content,
  }).returning();

  // Get lead name for activity
  const [lead] = await db.select().from(leadsTable).where(
    and(
      eq(leadsTable.id, params.data.leadId),
      eq(leadsTable.userId, req.userId!)
    )
  );

  await db.insert(activitiesTable).values({
    userId: req.userId!,
    leadId: params.data.leadId,
    leadName: lead?.fullName ?? null,
    type: "note_added",
    description: `Note added for ${lead?.fullName ?? "lead"}: ${body.data.content.slice(0, 60)}`,
  });

  res.status(201).json({
    ...note,
    createdAt: note.createdAt.toISOString(),
  });
});

// Delete note
router.delete("/notes/:id", async (req, res): Promise<void> => {
  const params = DeleteNoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [note] = await db.delete(leadNotesTable).where(
    and(
      eq(leadNotesTable.id, params.data.id),
      eq(leadNotesTable.userId, req.userId!)
    )
  ).returning();
  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
