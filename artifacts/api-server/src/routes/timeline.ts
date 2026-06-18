import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, eventsTable, timelineEntriesTable } from "@workspace/db";
import { GetEventTimelineParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/events/:id/timeline", async (req, res): Promise<void> => {
  const params = GetEventTimelineParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [event] = await db
    .select()
    .from(eventsTable)
    .where(eq(eventsTable.id, params.data.id));

  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  const entries = await db
    .select()
    .from(timelineEntriesTable)
    .where(eq(timelineEntriesTable.eventId, params.data.id))
    .orderBy(asc(timelineEntriesTable.date));

  res.json(entries);
});

export default router;
