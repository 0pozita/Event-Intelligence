import type { Verdict, ClaimType } from "./types";

export function determineVerdict(
  trustScore: number,
  claimType: ClaimType,
  sourcesAvailable: boolean,
  supportCount: number,
  contradictCount: number,
): Verdict {
  // Non-verifiable claim types are always UNVERIFIED
  if (claimType !== "Fact Claim") return "UNVERIFIED";

  // No real sources found — cannot verify
  if (!sourcesAvailable || (supportCount === 0 && contradictCount === 0)) {
    return "UNVERIFIED";
  }

  const total = supportCount + contradictCount;
  const supportRatio = total > 0 ? supportCount / total : 0.5;

  if (trustScore >= 80 && supportRatio >= 0.7 && supportCount >= 1) return "TRUE";
  if (trustScore >= 65 && supportRatio >= 0.55 && supportCount >= 1) return "MOSTLY TRUE";
  if (trustScore >= 40) return "MIXED";
  if (supportRatio < 0.35 && contradictCount >= 1) return "MISLEADING";
  return "FALSE";
}

export function mapVerdictToClaimStatus(verdict: Verdict): string {
  switch (verdict) {
    case "TRUE": return "verified";
    case "MOSTLY TRUE": return "partially_verified";
    case "MIXED": return "partially_verified";
    case "MISLEADING": return "false";
    case "FALSE": return "false";
    default: return "unverified";
  }
}
