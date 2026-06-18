import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, claimsTable } from "@workspace/db";
import {
  ListClaimsQueryParams,
  GetClaimParams,
  CreateClaimBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/claims", async (req, res): Promise<void> => {
  const params = ListClaimsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const conditions = [];
  if (params.data.eventId !== undefined) {
    conditions.push(eq(claimsTable.eventId, params.data.eventId));
  }
  if (params.data.status !== undefined) {
    conditions.push(eq(claimsTable.status, params.data.status));
  }

  const claims =
    conditions.length > 0
      ? await db
          .select()
          .from(claimsTable)
          .where(and(...conditions))
      : await db.select().from(claimsTable);

  res.json(claims);
});

router.get("/claims/:id", async (req, res): Promise<void> => {
  const params = GetClaimParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [claim] = await db
    .select()
    .from(claimsTable)
    .where(eq(claimsTable.id, params.data.id));

  if (!claim) {
    res.status(404).json({ error: "Claim not found" });
    return;
  }

  res.json(claim);
});

router.post("/claims", async (req, res): Promise<void> => {
  const parsed = CreateClaimBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [claim] = await db
    .insert(claimsTable)
    .values({
      eventId: parsed.data.eventId,
      text: parsed.data.text,
      status: parsed.data.status ?? "unverified",
      confidence: parsed.data.confidence ?? 0,
    })
    .returning();

  res.status(201).json(claim);
});

export default router;
