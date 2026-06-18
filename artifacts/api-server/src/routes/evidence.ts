import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, evidenceTable } from "@workspace/db";
import {
  ListEvidenceQueryParams,
  CreateEvidenceBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/evidence", async (req, res): Promise<void> => {
  const params = ListEvidenceQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  let evidence;
  if (params.data.claimId !== undefined) {
    evidence = await db
      .select()
      .from(evidenceTable)
      .where(eq(evidenceTable.claimId, params.data.claimId));
  } else {
    evidence = await db.select().from(evidenceTable);
  }

  res.json(evidence);
});

router.post("/evidence", async (req, res): Promise<void> => {
  const parsed = CreateEvidenceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [ev] = await db
    .insert(evidenceTable)
    .values({
      claimId: parsed.data.claimId,
      sourceId: parsed.data.sourceId ?? null,
      text: parsed.data.text,
      strength: parsed.data.strength,
      url: parsed.data.url ?? null,
    })
    .returning();

  res.status(201).json(ev);
});

export default router;
