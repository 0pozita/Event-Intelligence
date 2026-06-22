import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, claimsTable, factChecksTable } from "@workspace/db";
import { RunFactCheckBody, GetFactCheckParams } from "@workspace/api-zod";
import { runFactCheckPipeline } from "../lib/fact-checker/pipeline";
import { mapVerdictToClaimStatus } from "../lib/fact-checker/verdict-engine";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/fact-check", async (req, res): Promise<void> => {
  const parsed = RunFactCheckBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [claim] = await db
    .select()
    .from(claimsTable)
    .where(eq(claimsTable.id, parsed.data.claimId));

  if (!claim) {
    res.status(404).json({ error: "Claim not found" });
    return;
  }

  let result;
  try {
    result = await runFactCheckPipeline(claim.text);
  } catch (err) {
    req.log.error({ err }, "Fact check pipeline failed");
    res.status(500).json({ error: "Fact check analysis failed. Please try again." });
    return;
  }

  const [factCheck] = await db
    .insert(factChecksTable)
    .values({
      claimId: parsed.data.claimId,
      verdict: result.verdict,
      trustScore: result.trustScore,
      trustRating: result.trustRating,
      reasoning: result.reasoning,
      provider: result.provider,
      evidenceSummary: result.evidenceSummary,
      claimType: result.claimType,
      summary: result.summary,
      supportingEvidence: result.supportingEvidence,
      contradictingEvidence: result.contradictingEvidence,
      sources: result.sources,
      timeline: result.timeline,
    })
    .returning();

  await db
    .update(claimsTable)
    .set({
      status: mapVerdictToClaimStatus(result.verdict),
      confidence: result.trustScore / 100,
    })
    .where(eq(claimsTable.id, parsed.data.claimId));

  logger.info(
    {
      claimId: parsed.data.claimId,
      verdict: result.verdict,
      claimType: result.claimType,
      trustScore: result.trustScore,
      provider: result.provider,
      sourcesCount: result.sources.length,
    },
    "Fact check pipeline completed",
  );

  res.status(201).json(factCheck);
});

router.get("/fact-check/:id", async (req, res): Promise<void> => {
  const params = GetFactCheckParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [factCheck] = await db
    .select()
    .from(factChecksTable)
    .where(eq(factChecksTable.id, params.data.id));

  if (!factCheck) {
    res.status(404).json({ error: "Fact check not found" });
    return;
  }

  res.json(factCheck);
});

export default router;
