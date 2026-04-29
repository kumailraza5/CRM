import { Router, type IRouter } from "express";
import { sql, eq, and } from "drizzle-orm";
import { db, leadsTable, dealsTable, activitiesTable } from "@workspace/db";
import {
  GetDashboardSummaryResponse,
  GetDashboardPipelineResponse,
  GetDashboardMonthlyResponse,
  ListActivitiesResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

// Dashboard summary
router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const today = todayStr();

  const [totalResult] = await db.select({ count: sql<number>`count(*)::int` }).from(leadsTable)
    .where(eq(leadsTable.userId, req.userId!));
  const [newResult] = await db.select({ count: sql<number>`count(*)::int` }).from(leadsTable)
    .where(and(eq(leadsTable.userId, req.userId!), eq(leadsTable.status, "New Lead")));
  const [followupsResult] = await db.select({ count: sql<number>`count(*)::int` }).from(leadsTable)
    .where(and(eq(leadsTable.userId, req.userId!), eq(leadsTable.nextFollowupDate, today)));
  const [repliesResult] = await db.select({ count: sql<number>`count(*)::int` }).from(leadsTable)
    .where(and(eq(leadsTable.userId, req.userId!), eq(leadsTable.status, "Replied")));
  const [dealsResult] = await db.select({ count: sql<number>`count(*)::int` }).from(dealsTable)
    .where(eq(dealsTable.userId, req.userId!));
  const [revenueResult] = await db.select({ total: sql<number>`COALESCE(SUM(amount::numeric), 0)` }).from(dealsTable)
    .where(eq(dealsTable.userId, req.userId!));
  const [overdueResult] = await db.select({ count: sql<number>`count(*)::int` }).from(leadsTable)
    .where(and(
      eq(leadsTable.userId, req.userId!),
      sql`${leadsTable.nextFollowupDate} IS NOT NULL AND ${leadsTable.nextFollowupDate} < ${today} AND ${leadsTable.status} NOT IN ('Won', 'Lost')`
    ));

  res.json(GetDashboardSummaryResponse.parse({
    totalLeads: totalResult.count,
    newLeads: newResult.count,
    followupsDueToday: followupsResult.count,
    repliesReceived: repliesResult.count,
    dealsWon: dealsResult.count,
    revenueClosed: Number(revenueResult.total),
    overdueFollowups: overdueResult.count,
  }));
});

// Pipeline stage counts
router.get("/dashboard/pipeline", async (req, res): Promise<void> => {
  const results = await db
    .select({
      status: leadsTable.status,
      count: sql<number>`count(*)::int`,
    })
    .from(leadsTable)
    .where(eq(leadsTable.userId, req.userId!))
    .groupBy(leadsTable.status);

  res.json(GetDashboardPipelineResponse.parse(
    results.map(r => ({ status: r.status, count: r.count }))
  ));
});

// Monthly data (last 6 months)
router.get("/dashboard/monthly", async (req, res): Promise<void> => {
  const months: Array<{ month: string; count: number; revenue: number }> = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const monthStr = `${year}-${String(month).padStart(2, "0")}`;
    const monthLabel = d.toLocaleString("default", { month: "short" });

    const [leadsCount] = await db.select({ count: sql<number>`count(*)::int` })
      .from(leadsTable)
      .where(and(
        eq(leadsTable.userId, req.userId!),
        sql`TO_CHAR(${leadsTable.createdAt}, 'YYYY-MM') = ${monthStr}`
      ));

    const [revenueResult] = await db.select({ total: sql<number>`COALESCE(SUM(amount::numeric), 0)` })
      .from(dealsTable)
      .where(and(
        eq(dealsTable.userId, req.userId!),
        sql`LEFT(${dealsTable.dealDate}, 7) = ${monthStr}`
      ));

    months.push({
      month: monthLabel,
      count: leadsCount.count,
      revenue: Number(revenueResult.total),
    });
  }

  res.json(GetDashboardMonthlyResponse.parse(months));
});

// Activities feed
router.get("/activities", async (req, res): Promise<void> => {
  const activities = await db
    .select()
    .from(activitiesTable)
    .where(eq(activitiesTable.userId, req.userId!))
    .orderBy(sql`${activitiesTable.createdAt} DESC`)
    .limit(20);

  res.json(ListActivitiesResponse.parse(
    activities.map(a => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    }))
  ));
});

export default router;
