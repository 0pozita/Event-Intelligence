import type { RawAnalysis } from "./types";

export async function analyzeWithMock(claimText: string): Promise<RawAnalysis> {
  // Deterministic classification based on content signals
  const lower = claimText.toLowerCase();

  const isOpinion =
    /\b(i think|i believe|i feel|in my opinion|should|better|worse|evil|good|bad|best|worst|beautiful|ugly)\b/.test(lower);
  const isQuestion = claimText.trim().endsWith("?");
  const isPrediction =
    /\b(will|going to|predict|forecast|future|next year|by \d{4}|eventually)\b/.test(lower);

  if (isOpinion) {
    return {
      claimType: "Opinion",
      claimTypeReason: "The statement expresses a subjective judgment or personal belief.",
      summary:
        "This is a subjective opinion and cannot be verified as true or false. Opinions reflect personal values and perspectives, not objective facts.",
      supportingEvidence: [],
      contradictingEvidence: [],
      timeline: [],
      aiConfidence: 0,
      sourcesAvailable: false,
      reasoning:
        "Opinions, values, and subjective judgments are not fact-checkable. This statement reflects a personal or ideological position rather than an objective, verifiable claim.",
    };
  }

  if (isQuestion) {
    return {
      claimType: "Question",
      claimTypeReason: "The input is phrased as a question, not a declarative claim.",
      summary: "This is a question rather than a claim, and therefore cannot be verified.",
      supportingEvidence: [],
      contradictingEvidence: [],
      timeline: [],
      aiConfidence: 0,
      sourcesAvailable: false,
      reasoning:
        "Questions cannot be fact-checked. Please rephrase as a declarative statement to verify.",
    };
  }

  if (isPrediction) {
    return {
      claimType: "Prediction",
      claimTypeReason: "The statement makes a claim about future events, which cannot be verified against current evidence.",
      summary: "This statement is a prediction about the future. Predictions cannot be verified until the predicted time arrives.",
      supportingEvidence: [],
      contradictingEvidence: [],
      timeline: [],
      aiConfidence: 0,
      sourcesAvailable: false,
      reasoning:
        "Predictions about future events fall outside the scope of fact-checking. The claim may be evaluated for plausibility but not verified as true or false.",
    };
  }

  // Default: treat as Fact Claim with mock evidence
  return {
    claimType: "Fact Claim",
    claimTypeReason: "The statement is a declarative assertion about a factual matter.",
    summary:
      "This claim has been analyzed using the mock fact-check engine. Configure GROQ_API_KEY or OPENAI_API_KEY to enable real source-backed verification.",
    supportingEvidence: [],
    contradictingEvidence: [],
    timeline: [],
    aiConfidence: 50,
    sourcesAvailable: false,
    reasoning:
      "No AI provider is configured. The system cannot retrieve real sources without a valid API key (GROQ_API_KEY or OPENAI_API_KEY). The verdict is UNVERIFIED because verification requires real evidence from credible sources.",
  };
}
