import { Router, type IRouter } from "express";
import { ilike, or, desc } from "drizzle-orm";
import { db, eventsTable, searchHistoryTable } from "@workspace/db";
import { SearchEventsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/search", async (req, res): Promise<void> => {
  const params = SearchEventsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { q, limit = 10 } = params.data;

  const events = await db
    .select()
    .from(eventsTable)
    .where(
      or(
        ilike(eventsTable.title, `%${q}%`),
        ilike(eventsTable.description, `%${q}%`),
        ilike(eventsTable.summary, `%${q}%`),
        ilike(eventsTable.location, `%${q}%`),
      ),
    )
    .orderBy(desc(eventsTable.updatedAt))
    .limit(limit);

  await db
    .insert(searchHistoryTable)
    .values({ query: q, resultCount: events.length })
    .catch(() => {});

  res.json({ query: q, events, total: events.length });
});

export default router;
