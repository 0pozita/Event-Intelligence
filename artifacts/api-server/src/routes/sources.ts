import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, sourcesTable } from "@workspace/db";
import {
  ListSourcesQueryParams,
  GetSourceParams,
  CreateSourceBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/sources", async (req, res): Promise<void> => {
  const params = ListSourcesQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  let sources;
  if (params.data.eventId !== undefined) {
    sources = await db
      .select()
      .from(sourcesTable)
      .where(eq(sourcesTable.eventId, params.data.eventId));
  } else {
    sources = await db.select().from(sourcesTable);
  }

  res.json(sources);
});

router.get("/sources/:id", async (req, res): Promise<void> => {
  const params = GetSourceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [source] = await db
    .select()
    .from(sourcesTable)
    .where(eq(sourcesTable.id, params.data.id));

  if (!source) {
    res.status(404).json({ error: "Source not found" });
    return;
  }

  res.json(source);
});

router.post("/sources", async (req, res): Promise<void> => {
  const parsed = CreateSourceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [source] = await db
    .insert(sourcesTable)
    .values({
      eventId: parsed.data.eventId,
      name: parsed.data.name,
      url: parsed.data.url,
      type: parsed.data.type,
      publishedAt: parsed.data.publishedAt
        ? new Date(parsed.data.publishedAt)
        : null,
      credibilityScore: parsed.data.credibilityScore ?? 50,
    })
    .returning();

  res.status(201).json(source);
});

export default router;
