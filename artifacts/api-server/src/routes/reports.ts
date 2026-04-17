import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db, leadsTable, dealsTable } from "@workspace/db";
import {
  GetConversionReportResponse,
  GetReportByCountryResponse,
  GetReportByIndustryResponse,
  GetWeeklyLeadsReportResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// Conversion report
router.get("/reports/conversion", async (_req, res): Promise<void> => {
  const [won] = await db.select({ count: sql<number>`count(*)::int` }).from(leadsTable)
    .where(sql`${leadsTable.status} = 'Won'`);
  const [lost] = await db.select({ count: sql<number>`count(*)::int` }).from(leadsTable)
    .where(sql`${leadsTable.status} = 'Lost'`);
  const [inProgress] = await db.select({ count: sql<number>`count(*)::int` }).from(leadsTable)
    .where(sql`${leadsTable.status} NOT IN ('Won', 'Lost')`);
  const [revenueResult] = await db.select({ total: sql<number>`COALESCE(SUM(amount::numeric), 0)` }).from(dealsTable);

  const total = won.count + lost.count;
  const conversionRate = total > 0 ? Math.round((won.count / total) * 100) : 0;

  res.json(GetConversionReportResponse.parse({
    won: won.count,
    lost: lost.count,
    inProgress: inProgress.count,
    conversionRate,
    totalRevenue: Number(revenueResult.total),
  }));
});

// Leads by country
router.get("/reports/by-country", async (_req, res): Promise<void> => {
  const results = await db
    .select({
      name: sql<string>`COALESCE(${leadsTable.country}, 'Unknown')`,
      count: sql<number>`count(*)::int`,
    })
    .from(leadsTable)
    .groupBy(leadsTable.country)
    .orderBy(sql`count(*) DESC`)
    .limit(10);

  // Get revenue per country via leads-deals join
  const withRevenue = await Promise.all(
    results.map(async r => {
      const [rev] = await db.select({ total: sql<number>`COALESCE(SUM(d.amount::numeric), 0)` })
        .from(dealsTable)
        .leftJoin(leadsTable, sql`${leadsTable.id} = ${dealsTable.leadId}`)
        .where(sql`COALESCE(${leadsTable.country}, 'Unknown') = ${r.name}`);
      return { name: r.name, count: r.count, revenue: Number(rev.total) };
    })
  );

  res.json(GetReportByCountryResponse.parse(withRevenue));
});

// Leads by industry
router.get("/reports/by-industry", async (_req, res): Promise<void> => {
  const results = await db
    .select({
      name: sql<string>`COALESCE(${leadsTable.industry}, 'Unknown')`,
      count: sql<number>`count(*)::int`,
    })
    .from(leadsTable)
    .groupBy(leadsTable.industry)
    .orderBy(sql`count(*) DESC`)
    .limit(10);

  const withRevenue = await Promise.all(
    results.map(async r => {
      const [rev] = await db.select({ total: sql<number>`COALESCE(SUM(d.amount::numeric), 0)` })
        .from(dealsTable)
        .leftJoin(leadsTable, sql`${leadsTable.id} = ${dealsTable.leadId}`)
        .where(sql`COALESCE(${leadsTable.industry}, 'Unknown') = ${r.name}`);
      return { name: r.name, count: r.count, revenue: Number(rev.total) };
    })
  );

  res.json(GetReportByIndustryResponse.parse(withRevenue));
});

// Weekly leads
router.get("/reports/weekly", async (_req, res): Promise<void> => {
  const weeks: Array<{ week: string; count: number }> = [];

  for (let i = 7; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    const weekStart = new Date(d);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const startStr = weekStart.toISOString();
    const endStr = weekEnd.toISOString();

    const [result] = await db.select({ count: sql<number>`count(*)::int` })
      .from(leadsTable)
      .where(sql`${leadsTable.createdAt} >= ${startStr}::timestamptz AND ${leadsTable.createdAt} <= ${endStr}::timestamptz`);

    const label = `${weekStart.toLocaleString("default", { month: "short" })} ${weekStart.getDate()}`;
    weeks.push({ week: label, count: result.count });
  }

  res.json(GetWeeklyLeadsReportResponse.parse(weeks));
});

export default router;
