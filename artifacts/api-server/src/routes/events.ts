import { Router, type IRouter } from "express";
import { eq, ilike, or, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  eventsTable,
  sourcesTable,
  claimsTable,
  evidenceTable,
} from "@workspace/db";

import {
  ListEventsQueryParams,
  ListTrendingEventsQueryParams,
  GetEventParams,
  UpdateEventParams,
  UpdateEventBody,
  DeleteEventParams,
  CreateEventBody,
} from "@workspace/api-zod";

import { calculateTrustScore } from "../lib/trust-score";

const router: IRouter = Router();


router.get("/events", async (req, res): Promise<void> => {
  const params = ListEventsQueryParams.safeParse(req.query);

  if (!params.success) {
    res.status(400).json({
      error: params.error.message,
    });
    return;
  }

  const {
    search,
    category,
    limit = 20,
    offset = 0,
  } = params.data;


  let query = db
    .select()
    .from(eventsTable)
    .$dynamic();


  if (search) {
    query = query.where(
      or(
        ilike(eventsTable.title, `%${search}%`),
        ilike(eventsTable.description, `%${search}%`)
      )
    );
  }


  if (category) {
    query = query.where(
      eq(eventsTable.category, category)
    );
  }


  const events = await query
    .orderBy(desc(eventsTable.createdAt))
    .limit(limit)
    .offset(offset);


  res.json({
    events,
    total: events.length,
  });

});



router.get("/events/trending", async (req, res): Promise<void> => {

  const params = ListTrendingEventsQueryParams.safeParse(req.query);


  if (!params.success) {
    res.status(400).json({
      error: params.error.message,
    });
    return;
  }


  const limit = params.data.limit ?? 10;


  const events = await db
    .select()
    .from(eventsTable)
    .orderBy(desc(eventsTable.updatedAt))
    .limit(limit);


  res.json({
    events,
    total: events.length,
  });

});



router.get("/events/:id", async (req, res): Promise<void> => {

  const params = GetEventParams.safeParse(req.params);


  if (!params.success) {
    res.status(400).json({
      error: params.error.message,
    });

    return;
  }


  const [event] = await db
    .select()
    .from(eventsTable)
    .where(
      eq(eventsTable.id, params.data.id)
    );


  if (!event) {
    res.status(404).json({
      error: "Event not found",
    });

    return;
  }


  const sources = await db
    .select()
    .from(sourcesTable)
    .where(
      eq(sourcesTable.eventId, params.data.id)
    );


  const claims = await db
    .select()
    .from(claimsTable)
    .where(
      eq(claimsTable.eventId, params.data.id)
    );


  const allEvidence =
    claims.length > 0
      ? await db
          .select()
          .from(evidenceTable)
          .where(
            eq(
              evidenceTable.claimId,
              claims[0].id
            )
          )
      : [];



  const crossSourceAgreement =
    sources.length > 1
      ? Math.min(1, sources.length / 5)
      : sources.length > 0
      ? 0.8
      : 0.5;



  const {
    trustScore,
    trustRating,
  } = calculateTrustScore(
    sources,
    allEvidence,
    crossSourceAgreement
  );



  res.json({
    ...event,
    sources,
    claims,
    trustScore,
    trustRating,
  });

});



router.post("/events", async (req, res): Promise<void> => {

  const parsed = CreateEventBody.safeParse(req.body);


  if (!parsed.success) {
    res.status(400).json({
      error: parsed.error.message,
    });

    return;
  }


  const [event] = await db
    .insert(eventsTable)
    .values({
      title: parsed.data.title,
      description: parsed.data.description,
      summary: parsed.data.summary,
      location: parsed.data.location,
      category: parsed.data.category ?? "general",
    })
    .returning();


  res.status(201).json(event);

});



router.put("/events/:id", async (req, res): Promise<void> => {

  const params = UpdateEventParams.safeParse(req.params);


  if (!params.success) {
    res.status(400).json({
      error: params.error.message,
    });

    return;
  }


  const parsed = UpdateEventBody.safeParse(req.body);


  if (!parsed.success) {
    res.status(400).json({
      error: parsed.error.message,
    });

    return;
  }



  const [event] = await db
    .update(eventsTable)
    .set(parsed.data)
    .where(
      eq(eventsTable.id, params.data.id)
    )
    .returning();



  if (!event) {
    res.status(404).json({
      error: "Event not found",
    });

    return;
  }


  res.json(event);

});



router.delete("/events/:id", async (req, res): Promise<void> => {

  const params = DeleteEventParams.safeParse(req.params);


  if (!params.success) {
    res.status(400).json({
      error: params.error.message,
    });

    return;
  }



  const [event] = await db
    .delete(eventsTable)
    .where(
      eq(eventsTable.id, params.data.id)
    )
    .returning();



  if (!event) {
    res.status(404).json({
      error: "Event not found",
    });

    return;
  }


  res.sendStatus(204);

});



export default router;
