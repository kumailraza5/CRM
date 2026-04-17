import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, templatesTable } from "@workspace/db";
import {
  ListTemplatesResponse,
  CreateTemplateBody,
  UpdateTemplateParams,
  UpdateTemplateBody,
  UpdateTemplateResponse,
  DeleteTemplateParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function mapTemplate(t: typeof templatesTable.$inferSelect) {
  return {
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

router.get("/templates", async (_req, res): Promise<void> => {
  const templates = await db.select().from(templatesTable).orderBy(templatesTable.createdAt);
  res.json(ListTemplatesResponse.parse(templates.map(mapTemplate)));
});

router.post("/templates", async (req, res): Promise<void> => {
  const body = CreateTemplateBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [template] = await db.insert(templatesTable).values({
    title: body.data.title,
    category: body.data.category,
    subject: body.data.subject ?? null,
    content: body.data.content,
  }).returning();

  res.status(201).json(mapTemplate(template));
});

router.put("/templates/:id", async (req, res): Promise<void> => {
  const params = UpdateTemplateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateTemplateBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const data = body.data as any;
  const updateData: Record<string, any> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.subject !== undefined) updateData.subject = data.subject;
  if (data.content !== undefined) updateData.content = data.content;

  const [template] = await db.update(templatesTable).set(updateData).where(eq(templatesTable.id, params.data.id)).returning();

  if (!template) {
    res.status(404).json({ error: "Template not found" });
    return;
  }

  res.json(UpdateTemplateResponse.parse(mapTemplate(template)));
});

router.delete("/templates/:id", async (req, res): Promise<void> => {
  const params = DeleteTemplateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [t] = await db.delete(templatesTable).where(eq(templatesTable.id, params.data.id)).returning();
  if (!t) {
    res.status(404).json({ error: "Template not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
