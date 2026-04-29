import { Router, type IRouter } from "express";
import { eq, and, gte, lte, isNull, sql, ilike, or } from "drizzle-orm";
import { db, leadsTable, leadNotesTable, activitiesTable } from "@workspace/db";
import {
  ListLeadsQueryParams,
  CreateLeadBody,
  GetLeadParams,
  GetLeadResponse,
  UpdateLeadParams,
  UpdateLeadBody,
  UpdateLeadResponse,
  DeleteLeadParams,
  ListLeadsResponse,
  GetLeadScoreParams,
  GetLeadScoreResponse,
  CompleteFollowupParams,
  CompleteFollowupBody,
  CompleteFollowupResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// Helper: add days to a date string
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function mapLead(lead: typeof leadsTable.$inferSelect) {
  return {
    ...lead,
    estimatedBudget: lead.estimatedBudget ? Number(lead.estimatedBudget) : null,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  };
}

// List leads
router.get("/leads", async (req, res): Promise<void> => {
  const params = ListLeadsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { status, priority, country, industry, search, minBudget, maxBudget, noWebsite } = params.data;

  const conditions = [];

  if (status) conditions.push(eq(leadsTable.status, status as any));
  if (priority) conditions.push(eq(leadsTable.priority, priority as any));
  if (country) conditions.push(eq(leadsTable.country, country));
  if (industry) conditions.push(eq(leadsTable.industry, industry));
  if (minBudget != null) conditions.push(gte(leadsTable.estimatedBudget, String(minBudget)));
  if (maxBudget != null) conditions.push(lte(leadsTable.estimatedBudget, String(maxBudget)));
  if (noWebsite) conditions.push(isNull(leadsTable.websiteUrl));
  if (search) {
    conditions.push(
      or(
        ilike(leadsTable.fullName, `%${search}%`),
        ilike(leadsTable.companyName, `%${search}%`),
        ilike(leadsTable.email, `%${search}%`)
      )
    );
  }

  conditions.push(eq(leadsTable.userId, req.userId!));

  const where = and(...conditions);
  const leads = await db.select().from(leadsTable).where(where).orderBy(sql`${leadsTable.createdAt} DESC`);
  res.json(ListLeadsResponse.parse(leads.map(mapLead)));
});

// Create lead
router.post("/leads", async (req, res): Promise<void> => {
  const parsed = CreateLeadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data as any;

  const [lead] = await db.insert(leadsTable).values({
    userId: req.userId!,
    fullName: data.fullName,
    companyName: data.companyName,
    linkedinUrl: data.linkedinUrl ?? null,
    websiteUrl: data.websiteUrl ?? null,
    email: data.email ?? null,
    phone: data.phone ?? null,
    country: data.country ?? null,
    industry: data.industry ?? null,
    companySize: data.companySize ?? null,
    leadSource: data.leadSource ?? null,
    status: data.status ?? "New Lead",
    priority: data.priority ?? "Medium",
    estimatedBudget: data.estimatedBudget != null ? String(data.estimatedBudget) : null,
    notes: data.notes ?? null,
    lastContactDate: data.lastContactDate ?? null,
    nextFollowupDate: data.nextFollowupDate ?? null,
  }).returning();

  // Log activity
  await db.insert(activitiesTable).values({
    userId: req.userId!,
    leadId: lead.id,
    leadName: lead.fullName,
    type: "lead_created",
    description: `New lead added: ${lead.fullName} from ${lead.companyName}`,
  });

  // Auto-add timeline note
  await db.insert(leadNotesTable).values({
    userId: req.userId!,
    leadId: lead.id,
    type: "added",
    content: `Lead added from ${lead.leadSource ?? "LinkedIn"}`,
  });

  res.status(201).json(GetLeadResponse.parse(mapLead(lead)));
});

// Get single lead
router.get("/leads/:id", async (req, res): Promise<void> => {
  const params = GetLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [lead] = await db.select().from(leadsTable).where(
    and(
      eq(leadsTable.id, params.data.id),
      eq(leadsTable.userId, req.userId!)
    )
  );
  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  res.json(GetLeadResponse.parse(mapLead(lead)));
});

// Update lead
router.put("/leads/:id", async (req, res): Promise<void> => {
  const params = UpdateLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateLeadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data as any;
  const updateData: Record<string, any> = {};

  if (data.fullName !== undefined) updateData.fullName = data.fullName;
  if (data.companyName !== undefined) updateData.companyName = data.companyName;
  if (data.linkedinUrl !== undefined) updateData.linkedinUrl = data.linkedinUrl;
  if (data.websiteUrl !== undefined) updateData.websiteUrl = data.websiteUrl;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.country !== undefined) updateData.country = data.country;
  if (data.industry !== undefined) updateData.industry = data.industry;
  if (data.companySize !== undefined) updateData.companySize = data.companySize;
  if (data.leadSource !== undefined) updateData.leadSource = data.leadSource;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.estimatedBudget !== undefined) updateData.estimatedBudget = data.estimatedBudget != null ? String(data.estimatedBudget) : null;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.lastContactDate !== undefined) updateData.lastContactDate = data.lastContactDate;
  if (data.nextFollowupDate !== undefined) updateData.nextFollowupDate = data.nextFollowupDate;

  const [lead] = await db.update(leadsTable)
    .set(updateData)
    .where(
      and(
        eq(leadsTable.id, params.data.id),
        eq(leadsTable.userId, req.userId!)
      )
    )
    .returning();

  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  // Log status change activity
  if (data.status) {
    await db.insert(activitiesTable).values({
      userId: req.userId!,
      leadId: lead.id,
      leadName: lead.fullName,
      type: "status_changed",
      description: `Status updated to "${data.status}" for ${lead.fullName}`,
    });
  }

  res.json(UpdateLeadResponse.parse(mapLead(lead)));
});

// Delete lead
router.delete("/leads/:id", async (req, res): Promise<void> => {
  const params = DeleteLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [lead] = await db.delete(leadsTable).where(
    and(
      eq(leadsTable.id, params.data.id),
      eq(leadsTable.userId, req.userId!)
    )
  ).returning();
  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  res.sendStatus(204);
});

// AI Lead Score
router.get("/leads/:id/score", async (req, res): Promise<void> => {
  const params = GetLeadScoreParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [lead] = await db.select().from(leadsTable).where(
    and(
      eq(leadsTable.id, params.data.id),
      eq(leadsTable.userId, req.userId!)
    )
  );
  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  // Score calculation
  let score = 0;
  const tips: string[] = [];

  // Company size score
  const sizeMap: Record<string, number> = {
    "1-10": 5,
    "11-50": 10,
    "51-200": 15,
    "201-500": 20,
    "500+": 25,
    "1000+": 25,
  };
  score += sizeMap[lead.companySize ?? ""] ?? 5;

  // Has website?
  if (lead.websiteUrl) {
    score += 10;
    tips.push("Lead has a website — potential for redesign or SEO pitch.");
  } else {
    score += 20;
    tips.push("No website found — high priority for web development pitch!");
  }

  // Budget
  const budget = lead.estimatedBudget ? Number(lead.estimatedBudget) : 0;
  if (budget >= 5000) score += 25;
  else if (budget >= 2000) score += 15;
  else if (budget >= 500) score += 10;
  else tips.push("No budget set — consider qualifying budget in next message.");

  // High priority countries
  const highValueCountries = ["US", "USA", "United States", "UK", "United Kingdom", "Canada", "Australia", "Germany"];
  if (lead.country && highValueCountries.some(c => lead.country!.toLowerCase().includes(c.toLowerCase()))) {
    score += 15;
    tips.push("High-value market country — prioritize this lead.");
  }

  // Priority bonus
  if (lead.priority === "High") score += 10;
  else if (lead.priority === "Medium") score += 5;

  // Has email
  if (lead.email) score += 5;
  else tips.push("Add email for better outreach options.");

  // Status bonus
  const statusScore: Record<string, number> = {
    "Replied": 15,
    "Meeting Scheduled": 20,
    "Proposal Sent": 25,
    "Won": 30,
  };
  score += statusScore[lead.status] ?? 0;

  // Cap at 100
  score = Math.min(100, score);

  let label = "Cold";
  let bestFollowupTime = "Try Monday or Tuesday morning.";

  if (score >= 80) {
    label = "Hot";
    bestFollowupTime = "Follow up within 24 hours. Strike while the iron is hot!";
    tips.push("High-priority lead! Move fast before they find another developer.");
  } else if (score >= 60) {
    label = "Warm";
    bestFollowupTime = "Follow up within 2–3 days. Send a personalized message.";
    tips.push("Good potential. Personalize your pitch with their company context.");
  } else if (score >= 40) {
    label = "Lukewarm";
    bestFollowupTime = "Follow up in 5–7 days. Nurture with valuable content.";
    tips.push("Share a relevant case study to build trust.");
  } else {
    tips.push("Low-priority lead. Focus on warmer leads first.");
    tips.push("Consider a value-add message (tip, resource) to warm them up.");
  }

  res.json(GetLeadScoreResponse.parse({ score, label, tips, bestFollowupTime }));
});

// Follow-ups
router.get("/followups/today", async (req, res): Promise<void> => {
  const today = todayStr();
  const leads = await db.select().from(leadsTable).where(
    and(
      eq(leadsTable.nextFollowupDate, today),
      eq(leadsTable.userId, req.userId!)
    )
  );
  res.json(leads.map(mapLead));
});

router.get("/followups/overdue", async (req, res): Promise<void> => {
  const today = todayStr();
  const leads = await db.select().from(leadsTable)
    .where(and(
      eq(leadsTable.userId, req.userId!),
      sql`${leadsTable.nextFollowupDate} IS NOT NULL`,
      sql`${leadsTable.nextFollowupDate} < ${today}`,
      sql`${leadsTable.status} NOT IN ('Won', 'Lost')`
    ));
  res.json(leads.map(mapLead));
});

router.get("/followups/upcoming", async (req, res): Promise<void> => {
  const today = todayStr();
  const nextWeek = addDays(today, 7);
  const leads = await db.select().from(leadsTable)
    .where(and(
      eq(leadsTable.userId, req.userId!),
      sql`${leadsTable.nextFollowupDate} IS NOT NULL`,
      sql`${leadsTable.nextFollowupDate} > ${today}`,
      sql`${leadsTable.nextFollowupDate} <= ${nextWeek}`
    ));
  res.json(leads.map(mapLead));
});

router.post("/leads/:id/followup/complete", async (req, res): Promise<void> => {
  const params = CompleteFollowupParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = CompleteFollowupBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const today = todayStr();
  const nextFollowupDate = body.data.rescheduleInDays
    ? addDays(today, body.data.rescheduleInDays)
    : null;

  const [lead] = await db.update(leadsTable)
    .set({
      lastContactDate: today,
      nextFollowupDate: nextFollowupDate ?? undefined,
    })
    .where(
      and(
        eq(leadsTable.id, params.data.id),
        eq(leadsTable.userId, req.userId!)
      )
    )
    .returning();

  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  await db.insert(leadNotesTable).values({
    userId: req.userId!,
    leadId: lead.id,
    type: "follow-up",
    content: `Follow-up completed${nextFollowupDate ? `, rescheduled for ${nextFollowupDate}` : ""}`,
  });

  await db.insert(activitiesTable).values({
    userId: req.userId!,
    leadId: lead.id,
    leadName: lead.fullName,
    type: "followup_completed",
    description: `Follow-up completed with ${lead.fullName}`,
  });

  res.json(CompleteFollowupResponse.parse(mapLead(lead)));
});

export default router;
