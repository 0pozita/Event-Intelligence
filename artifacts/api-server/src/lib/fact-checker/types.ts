export type ClaimType = "Fact Claim" | "Opinion" | "Question" | "Prediction";
export type Verdict = "TRUE" | "MOSTLY TRUE" | "MIXED" | "UNVERIFIED" | "MISLEADING" | "FALSE";
export type TrustRating = "Low" | "Medium" | "High";

export interface FactCheckSource {
  title: string;
  url: string;
  publisher: string;
  snippet: string;
  supportsClaim: boolean;
  credibilityScore: number;
}

export interface FactCheckEvidenceItem {
  text: string;
  source: FactCheckSource;
}

export interface FactCheckTimelineItem {
  date: string;
  event: string;
}

export interface RawAnalysis {
  claimType: ClaimType;
  claimTypeReason: string;
  summary: string;
  supportingEvidence: FactCheckEvidenceItem[];
  contradictingEvidence: FactCheckEvidenceItem[];
  timeline: FactCheckTimelineItem[];
  aiConfidence: number;
  sourcesAvailable: boolean;
  reasoning: string;
}

export interface PipelineResult {
  verdict: Verdict;
  trustScore: number;
  trustRating: TrustRating;
  reasoning: string;
  claimType: ClaimType;
  summary: string;
  supportingEvidence: FactCheckEvidenceItem[];
  contradictingEvidence: FactCheckEvidenceItem[];
  sources: FactCheckSource[];
  timeline: FactCheckTimelineItem[];
  evidenceSummary: string;
  provider: string;
}
