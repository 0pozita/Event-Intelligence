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

  const parsed = ListEventsQueryParams.safeParse(req.query);

  if (!parsed.success) {
    res.status(400).json({
      error: parsed.error.message,
    });
    return;
  }


  const {
    search,
    category,
    limit = 20,
    offset = 0,
  } = parsed.data;


  let events;


  if (search && category) {

    events = await db
      .select()
      .from(eventsTable)
      .where(
        or(
          ilike(eventsTable.title, `%${search}%`),
          ilike(eventsTable.description, `%${search}%`)
        )
      )
      .orderBy(desc(eventsTable.createdAt))
      .limit(limit)
      .offset(offset);


  } else if (search) {


    events = await db
      .select()
      .from(eventsTable)
      .where(
        or(
          ilike(eventsTable.title, `%${search}%`),
          ilike(eventsTable.description, `%${search}%`)
        )
      )
      .orderBy(desc(eventsTable.createdAt))
      .limit(limit)
      .offset(offset);


  } else if (category) {


    events = await db
      .select()
      .from(eventsTable)
      .where(
        eq(eventsTable.category, category)
      )
      .orderBy(desc(eventsTable.createdAt))
      .limit(limit)
      .offset(offset);


  } else {


    events = await db
      .select()
      .from(eventsTable)
      .orderBy(desc(eventsTable.createdAt))
      .limit(limit)
      .offset(offset);

  }


  res.json({
    events,
    total: events.length,
  });

});





router.get("/events/trending", async (req,res): Promise<void> => {


  const parsed =
    ListTrendingEventsQueryParams.safeParse(req.query);


  if(!parsed.success){

    res.status(400).json({
      error: parsed.error.message
    });

    return;
  }


  const limit = parsed.data.limit ?? 10;


  const events = await db
    .select()
    .from(eventsTable)
    .orderBy(desc(eventsTable.updatedAt))
    .limit(limit);


  res.json({
    events,
    total: events.length
  });


});





router.get("/events/:id", async(req,res):Promise<void>=>{


 const parsed =
   GetEventParams.safeParse(req.params);


 if(!parsed.success){

   res.status(400).json({
     error: parsed.error.message
   });

   return;
 }



 const [event] = await db
   .select()
   .from(eventsTable)
   .where(
     eq(eventsTable.id, parsed.data.id)
   );



 if(!event){

   res.status(404).json({
     error:"Event not found"
   });

   return;
 }



 const sources = await db
   .select()
   .from(sourcesTable)
   .where(
     eq(
       sourcesTable.eventId,
       parsed.data.id
     )
   );



 const claims = await db
   .select()
   .from(claimsTable)
   .where(
     eq(
       claimsTable.eventId,
       parsed.data.id
     )
   );



 let allEvidence:
   typeof evidenceTable.$inferSelect[] = [];



 for(const claim of claims){

   const evidence =
     await db
     .select()
     .from(evidenceTable)
     .where(
       eq(
        evidenceTable.claimId,
        claim.id
       )
     );


   allEvidence.push(...evidence);

 }



 const agreement =
   sources.length > 1
   ? Math.min(1, sources.length / 5)
   : sources.length > 0
   ? 0.8
   : 0.5;



 const {
   trustScore,
   trustRating

 } = calculateTrustScore(
    sources,
    allEvidence,
    agreement
 );



 res.json({

   ...event,

   sources,

   claims,

   trustScore,

   trustRating

 });


});






router.post("/events", async(req,res):Promise<void>=>{


 const parsed =
  CreateEventBody.safeParse(req.body);


 if(!parsed.success){

   res.status(400).json({
     error: parsed.error.message
   });

   return;

 }



 const [event] =
 await db
 .insert(eventsTable)
 .values({

   title: parsed.data.title,

   description: parsed.data.description,

   summary: parsed.data.summary,

   location: parsed.data.location,

   category:
     parsed.data.category ?? "general"

 })
 .returning();



 res.status(201).json(event);


});







router.put("/events/:id", async(req,res):Promise<void>=>{


 const params =
 UpdateEventParams.safeParse(req.params);


 if(!params.success){

  res.status(400).json({
    error: params.error.message
  });

  return;

 }



 const body =
 UpdateEventBody.safeParse(req.body);



 if(!body.success){

  res.status(400).json({
    error: body.error.message
  });

  return;

 }



 const updateData = {

   ...body.data

 };



 const [event] =
 await db
 .update(eventsTable)
 .set(updateData)
 .where(
   eq(
    eventsTable.id,
    params.data.id
   )
 )
 .returning();



 if(!event){

  res.status(404).json({
    error:"Event not found"
  });

  return;

 }



 res.json(event);


});






router.delete("/events/:id", async(req,res):Promise<void>=>{


 const params =
 DeleteEventParams.safeParse(req.params);



 if(!params.success){

  res.status(400).json({
    error: params.error.message
  });

  return;

 }



 const [event] =
 await db
 .delete(eventsTable)
 .where(
   eq(
    eventsTable.id,
    params.data.id
   )
 )
 .returning();



 if(!event){

  res.status(404).json({
    error:"Event not found"
  });

  return;

 }



 res.sendStatus(204);


});



export default router;
