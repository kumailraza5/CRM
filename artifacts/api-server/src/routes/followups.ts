import { Router, type IRouter } from "express";
import { eq, and, gte, lte, isNull, sql, desc, asc } from "drizzle-orm";
import { db, followupsTable, leadsTable, notificationsTable, activitiesTable } from "@workspace/db";

const router: IRouter = Router();

// Helper functions
function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function nowUTC(): Date {
  return new Date();
}

function addHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

// List all follow-ups for a lead
router.get("/leads/:leadId/followups", async (req, res): Promise<void> => {
  const leadId = parseInt(req.params.leadId);
  if (isNaN(leadId)) {
    res.status(400).json({ error: "Invalid lead ID" });
    return;
  }

  const followups = await db.select()
    .from(followupsTable)
    .where(and(
      eq(followupsTable.leadId, leadId),
      eq(followupsTable.userId, req.userId!)
    ))
    .orderBy(desc(followupsTable.scheduledFor));

  res.json(followups.map(f => ({
    ...f,
    scheduledFor: f.scheduledFor.toISOString(),
    reminderAt: f.reminderAt?.toISOString(),
    completedAt: f.completedAt?.toISOString(),
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  })));
});

// Create new follow-up
router.post("/leads/:leadId/followups", async (req, res): Promise<void> => {
  const leadId = parseInt(req.params.leadId);
  if (isNaN(leadId)) {
    res.status(400).json({ error: "Invalid lead ID" });
    return;
  }

  const { type, title, description, priority, scheduledFor, reminderAt, notes } = req.body;

  if (!type || !title || !scheduledFor) {
    res.status(400).json({ error: "Type, title, and scheduledFor are required" });
    return;
  }

  try {
    const scheduledDate = new Date(scheduledFor);
    const reminderDate = reminderAt ? new Date(reminderAt) : addHours(scheduledDate, -1);

    const [followup] = await db.insert(followupsTable).values({
      userId: req.userId!,
      leadId,
      type,
      title,
      description: description || null,
      priority: priority || "medium",
      scheduledFor: scheduledDate,
      reminderAt: reminderDate,
      notes: notes || null,
    }).returning();

    // Update lead's next follow-up date if this is the earliest
    await db.update(leadsTable)
      .set({ nextFollowupDate: scheduledDate.toISOString().split('T')[0] })
      .where(and(
        eq(leadsTable.id, leadId),
        eq(leadsTable.userId, req.userId!),
        sql`(${leadsTable.nextFollowupDate} IS NULL OR ${leadsTable.nextFollowupDate} > ${scheduledDate.toISOString().split('T')[0]})`
      ));

    // Log activity
    await db.insert(activitiesTable).values({
      userId: req.userId!,
      leadId,
      leadName: (await db.select().from(leadsTable).where(eq(leadsTable.id, leadId)))[0]?.fullName || "Unknown",
      type: "followup_scheduled",
      description: `Follow-up scheduled: ${title}`,
    });

    // Create notification
    await db.insert(notificationsTable).values({
      userId: req.userId!,
      type: "followup_due",
      title: `Follow-up Due: ${title}`,
      message: `Scheduled for ${scheduledDate.toLocaleDateString()}`,
      priority: priority === "urgent" ? "urgent" : priority === "high" ? "high" : "medium",
      leadId,
      actionUrl: `/leads/${leadId}`,
      actionText: "View Lead",
      expiresAt: scheduledDate,
    });

    res.status(201).json({
      ...followup,
      scheduledFor: followup.scheduledFor.toISOString(),
      reminderAt: followup.reminderAt?.toISOString(),
      createdAt: followup.createdAt.toISOString(),
      updatedAt: followup.updatedAt.toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to create follow-up" });
  }
});

// Complete follow-up
router.post("/followups/:id/complete", async (req, res): Promise<void> => {
  const followupId = parseInt(req.params.id);
  if (isNaN(followupId)) {
    res.status(400).json({ error: "Invalid follow-up ID" });
    return;
  }

  const { notes, rescheduleInDays } = req.body;

  try {
    const [updatedFollowup] = await db.update(followupsTable)
      .set({
        status: "completed",
        completedAt: nowUTC(),
        notes: notes,
      })
      .where(and(
        eq(followupsTable.id, followupId),
        eq(followupsTable.userId, req.userId!)
      ))
      .returning();

    if (!updatedFollowup) {
      res.status(404).json({ error: "Follow-up not found" });
      return;
    }

    // Update lead's last contact date
    await db.update(leadsTable)
      .set({ lastContactDate: todayStr() })
      .where(eq(leadsTable.id, updatedFollowup.leadId));

    // Log activity
    await db.insert(activitiesTable).values({
      userId: req.userId!,
      leadId: updatedFollowup.leadId,
      leadName: (await db.select().from(leadsTable).where(eq(leadsTable.id, updatedFollowup.leadId)))[0]?.fullName || "Unknown",
      type: "followup_completed",
      description: `Completed: ${updatedFollowup.title}`,
    });

    // Auto-reschedule if requested
    if (rescheduleInDays && rescheduleInDays > 0) {
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + rescheduleInDays);

      await db.insert(followupsTable).values({
        userId: req.userId!,
        leadId: updatedFollowup.leadId,
        type: updatedFollowup.type,
        title: `Follow-up: ${updatedFollowup.title}`,
        description: updatedFollowup.description,
        priority: updatedFollowup.priority,
        scheduledFor: nextDate,
        reminderAt: addHours(nextDate, -1),
        notes: `Auto-rescheduled from completed follow-up`,
      });

      // Update lead's next follow-up date
      await db.update(leadsTable)
        .set({ nextFollowupDate: nextDate.toISOString().split('T')[0] })
        .where(eq(leadsTable.id, updatedFollowup.leadId));
    }

    res.json({
      ...updatedFollowup,
      scheduledFor: updatedFollowup.scheduledFor.toISOString(),
      reminderAt: updatedFollowup.reminderAt?.toISOString(),
      completedAt: updatedFollowup.completedAt!.toISOString(),
      createdAt: updatedFollowup.createdAt.toISOString(),
      updatedAt: updatedFollowup.updatedAt.toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to complete follow-up" });
  }
});

// Get upcoming follow-ups (for dashboard)
router.get("/followups/upcoming", async (req, res): Promise<void> => {
  const now = nowUTC();
  const nextWeek = addHours(now, 24 * 7);

  const followups = await db.select({
    followup: followupsTable,
    lead: leadsTable,
  })
    .from(followupsTable)
    .innerJoin(leadsTable, eq(followupsTable.leadId, leadsTable.id))
    .where(and(
      eq(followupsTable.userId, req.userId!),
      eq(followupsTable.status, "pending"),
      gte(followupsTable.scheduledFor, now),
      lte(followupsTable.scheduledFor, nextWeek)
    ))
    .orderBy(asc(followupsTable.scheduledFor));

  res.json(followups.map(({ followup, lead }) => ({
    ...followup,
    scheduledFor: followup.scheduledFor.toISOString(),
    reminderAt: followup.reminderAt?.toISOString(),
    lead: {
      id: lead.id,
      fullName: lead.fullName,
      companyName: lead.companyName,
      status: lead.status,
    },
  })));
});

// Get overdue follow-ups
router.get("/followups/overdue", async (req, res): Promise<void> => {
  const now = nowUTC();

  const followups = await db.select({
    followup: followupsTable,
    lead: leadsTable,
  })
    .from(followupsTable)
    .innerJoin(leadsTable, eq(followupsTable.leadId, leadsTable.id))
    .where(and(
      eq(followupsTable.userId, req.userId!),
      eq(followupsTable.status, "pending"),
      sql`${followupsTable.scheduledFor} < ${now}`
    ))
    .orderBy(asc(followupsTable.scheduledFor));

  res.json(followups.map(({ followup, lead }) => ({
    ...followup,
    scheduledFor: followup.scheduledFor.toISOString(),
    reminderAt: followup.reminderAt?.toISOString(),
    lead: {
      id: lead.id,
      fullName: lead.fullName,
      companyName: lead.companyName,
      status: lead.status,
    },
  })));
});

export default router;
