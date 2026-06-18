import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, claimsTable, factChecksTable } from "@workspace/db";
import { RunFactCheckBody, GetFactCheckParams } from "@workspace/api-zod";
import { getFactCheckProvider } from "../lib/fact-check";
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

  const provider = getFactCheckProvider();

  let result;
  try {
    result = await provider.analyzeClaim(claim.text);
  } catch (err) {
    req.log.error({ err }, "Fact check provider failed, falling back to mock");
    const { MockFactCheckProvider } = await import("../lib/fact-check/mock-provider");
    const mock = new MockFactCheckProvider();
    result = await mock.analyzeClaim(claim.text);
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
    })
    .returning();

  await db
    .update(claimsTable)
    .set({
      status: mapVerdictToStatus(result.verdict),
      confidence: result.trustScore / 100,
    })
    .where(eq(claimsTable.id, parsed.data.claimId));

  logger.info({ claimId: parsed.data.claimId, verdict: result.verdict, provider: result.provider }, "Fact check completed");

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

function mapVerdictToStatus(verdict: string): string {
  switch (verdict) {
    case "True": return "verified";
    case "False": return "false";
    case "Partially True": return "partially_verified";
    default: return "unverified";
  }
}

export default router;
