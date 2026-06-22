import type { FactCheckEvidenceItem, FactCheckSource, TrustRating } from "./types";

export interface TrustCalculation {
  trustScore: number;
  trustRating: TrustRating;
  breakdown: {
    sourceCredibility: number;
    sourceAgreement: number;
    evidenceStrength: number;
    aiConfidence: number;
  };
}

export function calculateTrustScore(
  allSources: FactCheckSource[],
  supportingEvidence: FactCheckEvidenceItem[],
  contradictingEvidence: FactCheckEvidenceItem[],
  aiConfidence: number,
  sourcesAvailable: boolean,
): TrustCalculation {
  // If no real sources found, cap at 50 to signal unverified
  if (!sourcesAvailable || allSources.length === 0) {
    const cappedScore = Math.min(50, Math.round(aiConfidence * 0.5));
    return {
      trustScore: cappedScore,
      trustRating: getTrustRating(cappedScore),
      breakdown: { sourceCredibility: 0, sourceAgreement: 0, evidenceStrength: 0, aiConfidence },
    };
  }

  // 40% — average credibility of cited sources (0-100)
  const avgCredibility =
    allSources.reduce((sum, s) => sum + s.credibilityScore, 0) / allSources.length;

  // 30% — ratio of supporting to total evidence (0-100)
  const totalEvidence = supportingEvidence.length + contradictingEvidence.length;
  const supportRatio = totalEvidence > 0 ? supportingEvidence.length / totalEvidence : 0.5;
  const sourceAgreement = supportRatio * 100;

  // 20% — evidence quantity quality: each piece of evidence adds 20 points, capped at 100
  const evidenceStrength = Math.min(100, totalEvidence * 20);

  // 10% — AI's self-reported confidence
  const aiConf = Math.min(100, Math.max(0, aiConfidence));

  const raw =
    avgCredibility * 0.4 +
    sourceAgreement * 0.3 +
    evidenceStrength * 0.2 +
    aiConf * 0.1;

  const trustScore = Math.round(Math.min(100, Math.max(0, raw)));

  return {
    trustScore,
    trustRating: getTrustRating(trustScore),
    breakdown: {
      sourceCredibility: Math.round(avgCredibility),
      sourceAgreement: Math.round(sourceAgreement),
      evidenceStrength: Math.round(evidenceStrength),
      aiConfidence: Math.round(aiConf),
    },
  };
}

export function getTrustRating(score: number): TrustRating {
  if (score >= 70) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}
