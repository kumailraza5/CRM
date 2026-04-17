import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, dealsTable, activitiesTable } from "@workspace/db";
import {
  ListDealsResponse,
  CreateDealBody,
  UpdateDealParams,
  UpdateDealBody,
  UpdateDealResponse,
  DeleteDealParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function mapDeal(d: typeof dealsTable.$inferSelect) {
  return {
    ...d,
    amount: Number(d.amount),
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

router.get("/deals", async (_req, res): Promise<void> => {
  const deals = await db.select().from(dealsTable).orderBy(dealsTable.dealDate);
  res.json(ListDealsResponse.parse(deals.map(mapDeal)));
});

router.post("/deals", async (req, res): Promise<void> => {
  const body = CreateDealBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const data = body.data as any;

  const [deal] = await db.insert(dealsTable).values({
    leadId: data.leadId ?? null,
    clientName: data.clientName,
    serviceSold: data.serviceSold,
    amount: String(data.amount),
    currency: data.currency ?? "USD",
    dealDate: data.dealDate,
    paymentStatus: data.paymentStatus ?? "Pending",
    notes: data.notes ?? null,
  }).returning();

  await db.insert(activitiesTable).values({
    leadId: data.leadId ?? null,
    leadName: data.clientName,
    type: "deal_won",
    description: `Deal closed: ${data.serviceSold} for ${data.clientName} — $${data.amount}`,
  });

  res.status(201).json(mapDeal(deal));
});

router.put("/deals/:id", async (req, res): Promise<void> => {
  const params = UpdateDealParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateDealBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const data = body.data as any;
  const updateData: Record<string, any> = {};
  if (data.leadId !== undefined) updateData.leadId = data.leadId;
  if (data.clientName !== undefined) updateData.clientName = data.clientName;
  if (data.serviceSold !== undefined) updateData.serviceSold = data.serviceSold;
  if (data.amount !== undefined) updateData.amount = String(data.amount);
  if (data.currency !== undefined) updateData.currency = data.currency;
  if (data.dealDate !== undefined) updateData.dealDate = data.dealDate;
  if (data.paymentStatus !== undefined) updateData.paymentStatus = data.paymentStatus;
  if (data.notes !== undefined) updateData.notes = data.notes;

  const [deal] = await db.update(dealsTable).set(updateData).where(eq(dealsTable.id, params.data.id)).returning();

  if (!deal) {
    res.status(404).json({ error: "Deal not found" });
    return;
  }

  res.json(UpdateDealResponse.parse(mapDeal(deal)));
});

router.delete("/deals/:id", async (req, res): Promise<void> => {
  const params = DeleteDealParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deal] = await db.delete(dealsTable).where(eq(dealsTable.id, params.data.id)).returning();
  if (!deal) {
    res.status(404).json({ error: "Deal not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
