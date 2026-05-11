import { Router, type IRouter } from "express";
import { eq, and, isNull, sql, desc } from "drizzle-orm";
import { db, notificationsTable, followupsTable, leadsTable } from "@workspace/db";

const router: IRouter = Router();

// Get notifications for user
router.get("/notifications", async (req, res): Promise<void> => {
  const { unreadOnly, limit = 50 } = req.query;

  let whereConditions = [eq(notificationsTable.userId, req.userId!)];
  
  if (unreadOnly === 'true') {
    whereConditions.push(eq(notificationsTable.isRead, false));
  }

  // Filter out expired notifications
  whereConditions.push(sql`(${notificationsTable.expiresAt} IS NULL OR ${notificationsTable.expiresAt} > NOW())`);

  const notifications = await db.select()
    .from(notificationsTable)
    .where(and(...whereConditions))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(parseInt(limit as string));

  res.json(notifications.map(n => ({
    ...n,
    createdAt: n.createdAt.toISOString(),
    readAt: n.readAt?.toISOString(),
    expiresAt: n.expiresAt?.toISOString(),
  })));
});

// Mark notification as read
router.post("/notifications/:id/read", async (req, res): Promise<void> => {
  const notificationId = parseInt(req.params.id);
  if (isNaN(notificationId)) {
    res.status(400).json({ error: "Invalid notification ID" });
    return;
  }

  const [notification] = await db.update(notificationsTable)
    .set({ 
      isRead: true,
      readAt: new Date()
    })
    .where(and(
      eq(notificationsTable.id, notificationId),
      eq(notificationsTable.userId, req.userId!)
    ))
    .returning();

  if (!notification) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }

  res.json({
    ...notification,
    createdAt: notification.createdAt.toISOString(),
    readAt: notification.readAt.toISOString(),
    expiresAt: notification.expiresAt?.toISOString(),
  });
});

// Mark all notifications as read
router.post("/notifications/read-all", async (req, res): Promise<void> => {
  await db.update(notificationsTable)
    .set({ 
      isRead: true,
      readAt: new Date()
    })
    .where(and(
      eq(notificationsTable.userId, req.userId!),
      eq(notificationsTable.isRead, false)
    ));

  res.json({ success: true });
});

// Delete notification
router.delete("/notifications/:id", async (req, res): Promise<void> => {
  const notificationId = parseInt(req.params.id);
  if (isNaN(notificationId)) {
    res.status(400).json({ error: "Invalid notification ID" });
    return;
  }

  const [notification] = await db.delete(notificationsTable)
    .where(and(
      eq(notificationsTable.id, notificationId),
      eq(notificationsTable.userId, req.userId!)
    ))
    .returning();

  if (!notification) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }

  res.status(204).send();
});

// Get notification counts
router.get("/notifications/counts", async (req, res): Promise<void> => {
  const userId = req.userId!;

  const [unreadCount] = await db.select({ count: sql<number>`count(*)::int` })
    .from(notificationsTable)
    .where(and(
      eq(notificationsTable.userId, userId),
      eq(notificationsTable.isRead, false),
      sql`(${notificationsTable.expiresAt} IS NULL OR ${notificationsTable.expiresAt} > NOW())`
    ));

  const [urgentCount] = await db.select({ count: sql<number>`count(*)::int` })
    .from(notificationsTable)
    .where(and(
      eq(notificationsTable.userId, userId),
      eq(notificationsTable.isRead, false),
      eq(notificationsTable.priority, 'urgent'),
      sql`(${notificationsTable.expiresAt} IS NULL OR ${notificationsTable.expiresAt} > NOW())`
    ));

  const [followupCount] = await db.select({ count: sql<number>`count(*)::int` })
    .from(followupsTable)
    .where(and(
      eq(followupsTable.userId, userId),
      eq(followupsTable.status, 'pending'),
      sql`${followupsTable.scheduledFor} <= NOW()`
    ));

  res.json({
    unread: unreadCount.count,
    urgent: urgentCount.count,
    overdueFollowups: followupCount.count,
  });
});

// Auto-generate notifications (this would typically be called by a cron job)
router.post("/notifications/generate", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const now = new Date();

  // Find follow-ups that need reminders
  const followupsNeedingReminder = await db.select({
    followup: followupsTable,
    lead: leadsTable,
  })
    .from(followupsTable)
    .innerJoin(leadsTable, eq(followupsTable.leadId, leadsTable.id))
    .where(and(
      eq(followupsTable.userId, userId),
      eq(followupsTable.status, 'pending'),
      sql`${followupsTable.reminderAt} <= ${now} AND ${followupsTable.reminderAt} > ${followupsTable.createdAt}`,
      eq(followupsTable.isNotified, false)
    ));

  for (const { followup, lead } of followupsNeedingReminder) {
    // Check if notification already exists
    const existingNotification = await db.select()
      .from(notificationsTable)
      .where(and(
        eq(notificationsTable.userId, userId),
        eq(notificationsTable.leadId, followup.leadId),
        eq(notificationsTable.type, 'followup_due'),
        sql`${notificationsTable.createdAt} > ${followup.reminderAt}`
      ))
      .limit(1);

    if (existingNotification.length === 0) {
      await db.insert(notificationsTable).values({
        userId,
        type: 'followup_due',
        title: `Follow-up Due: ${followup.title}`,
        message: `Scheduled for ${followup.scheduledFor.toLocaleDateString()} at ${followup.scheduledFor.toLocaleTimeString()}`,
        priority: followup.priority === 'urgent' ? 'urgent' : followup.priority === 'high' ? 'high' : 'medium',
        leadId: followup.leadId,
        actionUrl: `/leads/${followup.leadId}`,
        actionText: 'View Lead',
        expiresAt: followup.scheduledFor,
      });

      // Mark follow-up as notified
      await db.update(followupsTable)
        .set({ isNotified: true })
        .where(eq(followupsTable.id, followup.id));
    }
  }

  // Find overdue follow-ups
  const overdueFollowups = await db.select({
    followup: followupsTable,
    lead: leadsTable,
  })
    .from(followupsTable)
    .innerJoin(leadsTable, eq(followupsTable.leadId, leadsTable.id))
    .where(and(
      eq(followupsTable.userId, userId),
      eq(followupsTable.status, 'pending'),
      sql`${followupsTable.scheduledFor} < ${now}`
    ));

  for (const { followup, lead } of overdueFollowups) {
    const existingNotification = await db.select()
      .from(notificationsTable)
      .where(and(
        eq(notificationsTable.userId, userId),
        eq(notificationsTable.leadId, followup.leadId),
        eq(notificationsTable.type, 'followup_overdue'),
        sql`${notificationsTable.createdAt} > ${followup.scheduledFor}`
      ))
      .limit(1);

    if (existingNotification.length === 0) {
      await db.insert(notificationsTable).values({
        userId,
        type: 'followup_overdue',
        title: `Overdue Follow-up: ${followup.title}`,
        message: `Was due on ${followup.scheduledFor.toLocaleDateString()}`,
        priority: 'urgent',
        leadId: followup.leadId,
        actionUrl: `/leads/${followup.leadId}`,
        actionText: 'Complete Now',
        expiresAt: addHours(now, 24), // Expire in 24 hours
      });
    }
  }

  res.json({ success: true, notificationsCreated: followupsNeedingReminder.length + overdueFollowups.length });
});

function addHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

export default router;
