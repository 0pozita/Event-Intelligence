export type TrustRating = "Low" | "Medium" | "High";

export interface TrustScoreResult {
  trustScore: number;
  trustRating: TrustRating;
}

const STRENGTH_MAP: Record<string, number> = {
  weak: 30,
  medium: 60,
  strong: 100,
};

export function calculateTrustScore(
  sources: { credibilityScore: number }[],
  evidence: { strength: string }[],
  crossSourceAgreement = 1.0,
): TrustScoreResult {
  const sourceCredibility =
    sources.length > 0
      ? sources.reduce((sum, s) => sum + s.credibilityScore, 0) / sources.length
      : 50;

  const evidenceStrength =
    evidence.length > 0
      ? evidence.reduce(
          (sum, e) => sum + (STRENGTH_MAP[e.strength] ?? 60),
          0,
        ) / evidence.length
      : 50;

  const raw =
    sourceCredibility * 0.4 +
    evidenceStrength * 0.4 +
    crossSourceAgreement * 100 * 0.2;

  const trustScore = Math.round(Math.min(100, Math.max(0, raw)));
  const trustRating = getTrustRating(trustScore);

  return { trustScore, trustRating };
}

export function getTrustRating(score: number): TrustRating {
  if (score >= 70) { return "High"; }
  if (score >= 40) { return "Medium"; }
  return "Low";
}
