import { type FactCheckProvider, type FactCheckResult } from "./types";
import { getTrustRating } from "../trust-score";

const VERDICTS = ["True", "False", "Partially True", "Unverified"] as const;

const MOCK_REASONINGS: Record<string, string> = {
  True:
    "Multiple independent sources corroborate this claim. The evidence provided is consistent with verified reporting and official statements.",
  False:
    "This claim is contradicted by multiple credible sources. Evidence suggests the core assertion does not align with documented facts.",
  "Partially True":
    "This claim contains elements of truth but omits important context or contains inaccuracies in specific details. Partial corroboration found.",
  Unverified:
    "Insufficient evidence is currently available to verify or refute this claim. Further investigation is required.",
};

export class MockFactCheckProvider implements FactCheckProvider {
  async analyzeClaim(claimText: string): Promise<FactCheckResult> {
    const hash = claimText
      .split("")
      .reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const verdict = VERDICTS[hash % VERDICTS.length];
    const baseScore = 40 + (hash % 50);
    const trustScore = Math.round(Math.min(100, Math.max(0, baseScore)));
    const trustRating = getTrustRating(trustScore);

    return {
      verdict,
      trustScore,
      trustRating,
      reasoning: MOCK_REASONINGS[verdict],
      evidenceSummary:
        "Mock analysis performed. No real AI provider configured. Set OPENAI_API_KEY or GEMINI_API_KEY to enable live fact checking.",
      provider: "mock",
    };
  }
}
