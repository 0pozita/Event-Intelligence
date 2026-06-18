export type Verdict = "True" | "False" | "Partially True" | "Unverified";

export interface FactCheckResult {
  verdict: Verdict;
  trustScore: number;
  trustRating: string;
  reasoning: string;
  evidenceSummary: string;
  provider: string;
}

export interface FactCheckProvider {
  analyzeClaim(claimText: string): Promise<FactCheckResult>;
}
