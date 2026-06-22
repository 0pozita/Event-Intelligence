import { classifyClaim, classifyClaimSync } from "./claim-classifier";
import { searchWeb } from "./source-search";
import { extractEvidence } from "./evidence-extractor";
import { analyzeWithGroq } from "./groq-analyzer";
import { analyzeWithMock } from "./mock-analyzer";
import { calculateTrustScore } from "./trust-calculator";
import { determineVerdict } from "./verdict-engine";
import { getSourceCredibility } from "./source-credibility";
import type {
  PipelineResult,
  FactCheckSource,
  FactCheckEvidenceItem,
  FactCheckTimelineItem,
} from "./types";
import { logger } from "../logger";

interface EvidenceBundle {
  supportingEvidence: FactCheckEvidenceItem[];
  contradictingEvidence: FactCheckEvidenceItem[];
  summary: string;
  timeline: FactCheckTimelineItem[];
  aiConfidence: number;
  reasoning: string;
  provider: string;
}

export async function runFactCheckPipeline(claimText: string): Promise<PipelineResult> {
  const groqKey = process.env.GROQ_API_KEY;
  const hasSearch = !!(
    process.env.TAVILY_API_KEY ||
    process.env.BRAVE_API_KEY ||
    process.env.SERPER_API_KEY
  );

  // ── Step 1: Classify + web search — run in parallel ───────────────────────
  const classifyPromise = groqKey
    ? classifyClaim(claimText, groqKey).catch(() => classifyClaimSync(claimText))
    : Promise.resolve(classifyClaimSync(claimText));

  const searchPromise = hasSearch
    ? searchWeb(claimText, 8).catch((err) => {
        logger.warn({ err }, "Web search failed, falling back to Groq-only");
        return null;
      })
    : Promise.resolve(null);

  const [classification, searchResult] = await Promise.all([classifyPromise, searchPromise]);

  const { claimType } = classification;

  // ── Early exit for non-verifiable inputs ──────────────────────────────────
  if (claimType !== "Fact Claim") {
    const mock = await analyzeWithMock(claimText);
    return {
      verdict: "UNVERIFIED",
      trustScore: 0,
      trustRating: "Low",
      reasoning: mock.reasoning,
      claimType,
      summary: mock.summary,
      supportingEvidence: [],
      contradictingEvidence: [],
      sources: [],
      timeline: [],
      evidenceSummary: `This input was classified as "${claimType}" and cannot be fact-checked.`,
      provider: "classifier",
    };
  }

  // ── Step 2: Build evidence bundle ─────────────────────────────────────────
  let bundle: EvidenceBundle | null = null;

  if (searchResult && searchResult.results.length > 0 && groqKey) {
    // Web-search path: Groq analyzes REAL retrieved snippets only
    try {
      const extracted = await extractEvidence(claimText, searchResult.results, groqKey);
      bundle = {
        supportingEvidence: extracted.supportingEvidence,
        contradictingEvidence: extracted.contradictingEvidence,
        summary: extracted.summary,
        timeline: extracted.timeline,
        aiConfidence: extracted.aiConfidence,
        reasoning: extracted.reasoning,
        provider: `${searchResult.provider}+groq`,
      };
    } catch (err) {
      logger.warn({ err }, "Evidence extraction failed, falling back to Groq-only");
    }
  }

  if (!bundle) {
    // Groq-only fallback (or mock if no key)
    try {
      const analysis = groqKey
        ? await analyzeWithGroq(claimText, groqKey)
        : await analyzeWithMock(claimText);
      bundle = {
        supportingEvidence: analysis.supportingEvidence,
        contradictingEvidence: analysis.contradictingEvidence,
        summary: analysis.summary,
        timeline: analysis.timeline,
        aiConfidence: analysis.aiConfidence,
        reasoning: analysis.reasoning,
        provider: groqKey ? "groq" : "mock",
      };
    } catch {
      const mock = await analyzeWithMock(claimText);
      bundle = {
        supportingEvidence: mock.supportingEvidence,
        contradictingEvidence: mock.contradictingEvidence,
        summary: mock.summary,
        timeline: mock.timeline,
        aiConfidence: mock.aiConfidence,
        reasoning: mock.reasoning,
        provider: "mock",
      };
    }
  }

  const {
    supportingEvidence,
    contradictingEvidence,
    summary,
    timeline,
    aiConfidence,
    reasoning,
    provider,
  } = bundle;

  // ── Step 3: Collect all unique sources ────────────────────────────────────
  const sourceMap = new Map<string, FactCheckSource>();

  for (const item of [...supportingEvidence, ...contradictingEvidence]) {
    if (item.source.url && !sourceMap.has(item.source.url)) {
      sourceMap.set(item.source.url, item.source);
    }
  }

  // If web search ran but evidence extraction produced nothing, add raw results as sources
  if (sourceMap.size === 0 && searchResult && searchResult.results.length > 0) {
    for (const r of searchResult.results) {
      if (!sourceMap.has(r.url)) {
        sourceMap.set(r.url, {
          title: r.title,
          url: r.url,
          publisher: r.publisher,
          snippet: r.snippet,
          supportsClaim: true,
          credibilityScore: getSourceCredibility(r.url),
        });
      }
    }
  }

  const allSources = Array.from(sourceMap.values());
  const sourcesAvailable =
    allSources.length > 0 ||
    supportingEvidence.length > 0 ||
    contradictingEvidence.length > 0;

  // ── Step 4: Trust score ───────────────────────────────────────────────────
  const { trustScore, trustRating } = calculateTrustScore(
    allSources,
    supportingEvidence,
    contradictingEvidence,
    aiConfidence,
    sourcesAvailable,
  );

  // ── Step 5: Verdict ───────────────────────────────────────────────────────
  const verdict = determineVerdict(
    trustScore,
    claimType,
    sourcesAvailable,
    supportingEvidence.length,
    contradictingEvidence.length,
  );

  // ── Step 6: Summary line ──────────────────────────────────────────────────
  const supCount = supportingEvidence.length;
  const conCount = contradictingEvidence.length;
  const searchNote = searchResult ? ` via ${searchResult.provider} web search` : "";
  const evidenceSummary = sourcesAvailable
    ? `Found ${supCount} supporting and ${conCount} contradicting evidence item${supCount + conCount !== 1 ? "s" : ""} from ${allSources.length} source${allSources.length !== 1 ? "s" : ""}${searchNote}.`
    : "No verified sources were available to support or contradict this claim.";

  logger.info(
    {
      claimType,
      verdict,
      trustScore,
      sources: allSources.length,
      supporting: supCount,
      contradicting: conCount,
      provider,
      webSearch: !!searchResult,
    },
    "Fact check pipeline completed",
  );

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
