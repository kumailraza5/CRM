import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, leadsTable, followupsTable, activitiesTable, notificationsTable } from "@workspace/db";

const router: IRouter = Router();

// Generate AI-powered follow-up suggestions based on lead score and status
router.post("/leads/:id/ai-suggestions", async (req, res): Promise<void> => {
  const leadId = parseInt(req.params.id);
  if (isNaN(leadId)) {
    res.status(400).json({ error: "Invalid lead ID" });
    return;
  }

  try {
    // Get lead with AI score
    const [lead] = await db.select().from(leadsTable).where(
      and(
        eq(leadsTable.id, leadId),
        eq(leadsTable.userId, req.userId!)
      )
    );

    if (!lead) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }

    // Calculate AI score (simplified version - in real app this would call the same logic as the score endpoint)
    let score = 0;
    const suggestions: string[] = [];
    let recommendedAction = "";
    let suggestedDays = 3;

    // Company size scoring
    const sizeMap: Record<string, number> = {
      "1-10": 5, "11-50": 10, "51-200": 15, "201-500": 20, "500+": 25, "1000+": 25,
    };
    score += sizeMap[lead.companySize ?? ""] ?? 5;

    // Website presence
    if (lead.websiteUrl) {
      score += 10;
      suggestions.push("Lead has a website - good for portfolio review");
    } else {
      score += 20;
      suggestions.push("No website - high priority for web development pitch");
      recommendedAction = "Send portfolio and web development proposal";
    }

    // Budget
    const budget = lead.estimatedBudget ? Number(lead.estimatedBudget) : 0;
    if (budget >= 5000) {
      score += 25;
      suggestedDays = 1;
      recommendedAction = "High-value lead - schedule discovery call ASAP";
    } else if (budget >= 2000) {
      score += 15;
      suggestedDays = 2;
      recommendedAction = "Good budget potential - send detailed proposal";
    } else if (budget >= 500) {
      score += 10;
      suggestedDays = 5;
      recommendedAction = "Moderate budget - send case studies and pricing";
    } else {
      suggestions.push("No budget set - qualify budget in next message");
      recommendedAction = "Send qualification email to discuss budget and needs";
    }

    // High priority countries
    const highValueCountries = ["US", "USA", "United States", "UK", "United Kingdom", "Canada", "Australia", "Germany"];
    if (lead.country && highValueCountries.some(c => lead.country!.toLowerCase().includes(c.toLowerCase()))) {
      score += 15;
      suggestedDays = Math.max(1, suggestedDays - 1);
      suggestions.push("High-value market country - prioritize this lead");
    }

    // Priority bonus
    if (lead.priority === "High") {
      score += 10;
      suggestedDays = Math.max(1, suggestedDays - 1);
    } else if (lead.priority === "Medium") {
      score += 5;
    }

    // Has email
    if (lead.email) {
      score += 5;
    } else {
      suggestions.push("Add email for better outreach options");
      recommendedAction = "Find contact information and send connection request";
    }

    // Status-based suggestions
    const statusSuggestions: Record<string, { action: string; days: number; tips: string[] }> = {
      "New Lead": {
        action: "Send personalized introduction and portfolio",
        days: 1,
        tips: ["Research their company first", "Mention specific projects relevant to their industry"]
      },
      "Profile Checked": {
        action: "Send initial outreach message",
        days: 1,
        tips: ["Reference their recent activity", "Ask about current challenges"]
      },
      "Contacted": {
        action: "Follow up if no response",
        days: 3,
        tips: ["Provide additional value", "Share relevant case study"]
      },
      "Follow-up Sent": {
        action: "Second follow-up with different angle",
        days: 5,
        tips: ["Try different communication channel", "Offer free consultation"]
      },
      "Replied": {
        action: "Schedule discovery call",
        days: 1,
        tips: ["Prepare questions about their needs", "Have calendar ready"]
      },
      "Meeting Scheduled": {
        action: "Prepare and send meeting agenda",
        days: 1,
        tips: ["Research their competitors", "Prepare tailored solutions"]
      },
      "Proposal Sent": {
        action: "Follow up on proposal",
        days: 2,
        tips: ["Address potential concerns", "Offer to answer questions"]
      }
    };

    const statusSuggestion = statusSuggestions[lead.status];
    if (statusSuggestion) {
      recommendedAction = statusSuggestion.action;
      suggestedDays = statusSuggestion.days;
      suggestions.push(...statusSuggestion.tips);
    }

    // Cap at 100
    score = Math.min(100, score);

    let label = "Cold";
    if (score >= 80) {
      label = "Hot";
      suggestedDays = 1;
    } else if (score >= 60) {
      label = "Warm";
      suggestedDays = Math.min(suggestedDays, 2);
    } else if (score >= 40) {
      label = "Lukewarm";
    }

    // Create follow-up suggestion if no active follow-ups exist
    const existingFollowups = await db.select()
      .from(followupsTable)
      .where(and(
        eq(followupsTable.leadId, leadId),
        eq(followupsTable.userId, req.userId!),
        eq(followupsTable.status, "pending"),
        sql`${followupsTable.scheduledFor} > NOW()`
      ))
      .limit(1);

    let createdFollowup = null;
    if (existingFollowups.length === 0 && recommendedAction) {
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + suggestedDays);
      scheduledDate.setHours(10, 0, 0, 0); // Schedule for 10 AM

      [createdFollowup] = await db.insert(followupsTable).values({
        userId: req.userId!,
        leadId,
        type: lead.email ? "email" : "linkedin_message",
        title: `AI Suggested: ${recommendedAction}`,
        description: `AI-generated suggestion based on lead score ${score}/100 (${label})`,
        priority: score >= 60 ? "high" : "medium",
        scheduledFor: scheduledDate,
        reminderAt: new Date(scheduledDate.getTime() - 60 * 60 * 1000), // 1 hour before
        notes: `AI Score: ${score}/100\nRecommendations:\n${suggestions.join("\n")}`,
      }).returning();

      // Update lead's next follow-up date
      await db.update(leadsTable)
        .set({ nextFollowupDate: scheduledDate.toISOString().split('T')[0] })
        .where(eq(leadsTable.id, leadId));

      // Log activity
      await db.insert(activitiesTable).values({
        userId: req.userId!,
        leadId,
        leadName: lead.fullName,
        type: "followup_scheduled",
        description: `AI scheduled follow-up: ${recommendedAction}`,
      });

      // Create notification
      await db.insert(notificationsTable).values({
        userId: req.userId!,
        type: "followup_due",
        title: `AI Follow-up Scheduled`,
        message: `${recommendedAction} for ${lead.fullName}`,
        priority: score >= 60 ? "high" : "medium",
        leadId,
        actionUrl: `/leads/${leadId}`,
        actionText: "View Lead",
        expiresAt: scheduledDate,
      });
    }

    res.json({
      score,
      label,
      recommendedAction,
      suggestedDays,
      suggestions,
      createdFollowup: createdFollowup ? {
        ...createdFollowup,
        scheduledFor: createdFollowup.scheduledFor.toISOString(),
        reminderAt: createdFollowup.reminderAt?.toISOString(),
        createdAt: createdFollowup.createdAt.toISOString(),
      } : null,
    });

  } catch (error) {
    console.error("AI suggestion error:", error);
    res.status(500).json({ error: "Failed to generate AI suggestions" });
  }
});

// Generate data enrichment tasks for incomplete profiles
router.post("/leads/:id/enrichment-tasks", async (req, res): Promise<void> => {
  const leadId = parseInt(req.params.id);
  if (isNaN(leadId)) {
    res.status(400).json({ error: "Invalid lead ID" });
    return;
  }

  try {
    const [lead] = await db.select().from(leadsTable).where(
      and(
        eq(leadsTable.id, leadId),
        eq(leadsTable.userId, req.userId!)
      )
    );

    if (!lead) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }

    const missingFields = [];
    const enrichmentTasks = [];

    // Check for missing critical fields
    if (!lead.email) {
      missingFields.push("email");
      enrichmentTasks.push({
        title: "Find email address",
        description: "Search for contact email using company website, LinkedIn, or email finder tools",
        priority: "high" as const,
        type: "research" as const,
      });
    }

    if (!lead.linkedinUrl) {
      missingFields.push("LinkedIn URL");
      enrichmentTasks.push({
        title: "Find LinkedIn profile",
        description: "Search LinkedIn for the person's profile to verify identity and gather more info",
        priority: "high" as const,
        type: "research" as const,
      });
    }

    if (!lead.websiteUrl) {
      missingFields.push("website URL");
      enrichmentTasks.push({
        title: "Find company website",
        description: "Search for the company's official website to assess their online presence",
        priority: "medium" as const,
        type: "research" as const,
      });
    }

    if (!lead.industry) {
      missingFields.push("industry");
      enrichmentTasks.push({
        title: "Identify industry",
        description: "Research the company's industry to tailor outreach and proposals",
        priority: "medium" as const,
        type: "research" as const,
      });
    }

    if (!lead.companySize) {
      missingFields.push("company size");
      enrichmentTasks.push({
        title: "Determine company size",
        description: "Find number of employees to assess project scope and budget potential",
        priority: "low" as const,
        type: "research" as const,
      });
    }

    if (!lead.estimatedBudget) {
      missingFields.push("budget");
      enrichmentTasks.push({
        title: "Qualify budget",
        description: "Initiate conversation to understand project budget and timeline",
        priority: "high" as const,
        type: "outreach" as const,
      });
    }

    // Create follow-up tasks for high-priority enrichment
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 1); // Schedule for tomorrow
    scheduledDate.setHours(11, 0, 0, 0);

    for (const task of enrichmentTasks.filter(t => t.priority === "high")) {
      await db.insert(followupsTable).values({
        userId: req.userId!,
        leadId,
        type: task.type === "research" ? "call" : "email",
        title: task.title,
        description: task.description,
        priority: task.priority,
        scheduledFor: scheduledDate,
        reminderAt: new Date(scheduledDate.getTime() - 60 * 60 * 1000),
        notes: `Data enrichment task for incomplete profile`,
      });
    }

    // Create notification for data enrichment needed
    if (missingFields.length > 0) {
      await db.insert(notificationsTable).values({
        userId: req.userId!,
        type: "data_enrichment_needed",
        title: "Complete Lead Profile",
        message: `${lead.fullName} is missing ${missingFields.join(", ")}`,
        priority: missingFields.includes("email") || missingFields.includes("linkedinUrl") ? "high" : "medium",
        leadId,
        actionUrl: `/leads/${leadId}`,
        actionText: "Complete Profile",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      });
    }

    res.json({
      missingFields,
      enrichmentTasks,
      tasksCreated: enrichmentTasks.filter(t => t.priority === "high").length,
    });

  } catch (error) {
    console.error("Enrichment task error:", error);
    res.status(500).json({ error: "Failed to create enrichment tasks" });
  }
});

export default router;
