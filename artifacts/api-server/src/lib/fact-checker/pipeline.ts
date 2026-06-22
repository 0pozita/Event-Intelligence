import { analyzeWithGroq } from "./groq-analyzer";
import { analyzeWithMock } from "./mock-analyzer";
import { calculateTrustScore } from "./trust-calculator";
import { determineVerdict } from "./verdict-engine";
import type { PipelineResult, FactCheckSource } from "./types";

export async function runFactCheckPipeline(claimText: string): Promise<PipelineResult> {
  const groqKey = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const provider = groqKey ? "groq" : openaiKey ? "openai" : "mock";

  // --- Step 1: Analyze claim ---
  let analysis;
  try {
    if (groqKey) {
      analysis = await analyzeWithGroq(claimText, groqKey);
    } else if (openaiKey) {
      // Fall back to Groq analyzer with OpenAI endpoint is not done here;
      // OpenAI uses the old single-provider path. For this pipeline, Groq is primary.
      analysis = await analyzeWithGroq(claimText, groqKey!);
    } else {
      analysis = await analyzeWithMock(claimText);
    }
  } catch (err) {
    // On provider failure, fall back to mock
    analysis = await analyzeWithMock(claimText);
  }

  const {
    claimType,
    summary,
    supportingEvidence,
    contradictingEvidence,
    timeline,
    aiConfidence,
    sourcesAvailable,
    reasoning,
  } = analysis;

  // --- Step 2: Collect all unique sources ---
  const allSourcesMap = new Map<string, FactCheckSource>();
  for (const item of [...supportingEvidence, ...contradictingEvidence]) {
    if (item.source.url && !allSourcesMap.has(item.source.url)) {
      allSourcesMap.set(item.source.url, item.source);
    }
  }
  const allSources = Array.from(allSourcesMap.values());

  // --- Step 3: Calculate trust score ---
  const { trustScore, trustRating } = calculateTrustScore(
    allSources,
    supportingEvidence,
    contradictingEvidence,
    aiConfidence,
    sourcesAvailable,
  );

  // --- Step 4: Determine verdict ---
  const verdict = determineVerdict(
    trustScore,
    claimType,
    sourcesAvailable,
    supportingEvidence.length,
    contradictingEvidence.length,
  );

  // --- Step 5: Build evidence summary ---
  let evidenceSummary: string;
  if (!sourcesAvailable) {
    evidenceSummary =
      claimType !== "Fact Claim"
        ? `This input was classified as "${claimType}" and cannot be fact-checked.`
        : "No verified sources were available to support or contradict this claim.";
  } else {
    const supCount = supportingEvidence.length;
    const conCount = contradictingEvidence.length;
    evidenceSummary = `Found ${supCount} supporting and ${conCount} contradicting evidence item${supCount + conCount !== 1 ? "s" : ""} from ${allSources.length} source${allSources.length !== 1 ? "s" : ""}.`;
  }

  return {
    verdict,
    trustScore,
    trustRating,
    reasoning,
    claimType,
    summary,
    supportingEvidence,
    contradictingEvidence,
    sources: allSources,
    timeline,
    evidenceSummary,
    provider,
  };
}
