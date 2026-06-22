import type { FactCheckEvidenceItem, FactCheckTimelineItem, FactCheckSource } from "./types";
import type { SearchResult } from "./source-search";
import { getSourceCredibility } from "./source-credibility";

interface EvidenceAnalysis {
  index: number;
  stance: "SUPPORTS" | "CONTRADICTS" | "NEUTRAL";
  evidenceText: string;
  isRelevant: boolean;
}

interface ExtractorOutput {
  supportingEvidence: FactCheckEvidenceItem[];
  contradictingEvidence: FactCheckEvidenceItem[];
  summary: string;
  timeline: FactCheckTimelineItem[];
  aiConfidence: number;
  reasoning: string;
}

interface GroqResponse {
  choices: Array<{ message: { content: string } }>;
}

function buildPrompt(claimText: string, results: SearchResult[]): string {
  const resultsBlock = results
    .map(
      (r, i) =>
        `[${i}] TITLE: ${r.title}\n    URL: ${r.url}\n    PUBLISHER: ${r.publisher}\n    SNIPPET: ${r.snippet}`,
    )
    .join("\n\n");

  return `You are a rigorous fact-checker analyzing real web search results.

CLAIM TO VERIFY: "${claimText}"

REAL SEARCH RESULTS (all URLs are real — do NOT invent additional ones):
${resultsBlock}

TASK:
1. For each search result, determine whether its snippet SUPPORTS, CONTRADICTS, or is NEUTRAL toward the claim.
2. Extract the most relevant sentence or phrase from the snippet as evidence text.
3. Only mark a result as relevant if its snippet actually addresses the claim.
4. Build a timeline from the snippets if they describe a sequence of events.
5. Write an overall summary and reasoning based ONLY on the search results above.

RULES:
- Do NOT add any source URLs that are not in the list above.
- evidenceText must be a direct quote or close paraphrase from the snippet — never invented.
- If a snippet is not relevant to the claim, set isRelevant: false.
- aiConfidence reflects how confident you are about the verdict (0-100).

Return ONLY valid JSON (no code blocks, no markdown):
{
  "analyses": [
    {
      "index": 0,
      "stance": "SUPPORTS",
      "evidenceText": "direct quote or paraphrase from snippet",
      "isRelevant": true
    }
  ],
  "summary": "one-paragraph neutral summary based ONLY on the search results",
  "timeline": [
    { "date": "YYYY-MM-DD", "event": "brief description from the sources" }
  ],
  "aiConfidence": 80,
  "reasoning": "detailed analysis of the evidence and why the claim is supported, contradicted, or mixed"
}`;
}

export async function extractEvidence(
  claimText: string,
  searchResults: SearchResult[],
  groqKey: string,
): Promise<ExtractorOutput> {
  if (searchResults.length === 0) {
    return {
      supportingEvidence: [],
      contradictingEvidence: [],
      summary: "No search results were available to analyze.",
      timeline: [],
      aiConfidence: 0,
      reasoning: "Insufficient evidence to verify this claim.",
    };
  }

  const prompt = buildPrompt(claimText, searchResults);

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "You are a fact-checking analyst. Return ONLY valid JSON. Never add sources not provided to you.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.15,
      max_tokens: 2500,
    }),
  });

  if (!res.ok) throw new Error(`Groq evidence extraction error: ${res.status}`);

  const data = (await res.json()) as GroqResponse;
  const raw = data.choices[0]?.message?.content ?? "{}";
  const jsonStr = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
  const parsed = JSON.parse(jsonStr) as {
    analyses?: unknown[];
    summary?: string;
    timeline?: unknown[];
    aiConfidence?: number;
    reasoning?: string;
  };

  const analyses = Array.isArray(parsed.analyses) ? parsed.analyses : [];
  const supporting: FactCheckEvidenceItem[] = [];
  const contradicting: FactCheckEvidenceItem[] = [];

  for (const analysis of analyses) {
    if (
      typeof analysis !== "object" ||
      analysis === null ||
      !(analysis as EvidenceAnalysis).isRelevant
    )
      continue;

    const a = analysis as EvidenceAnalysis;
    const idx = typeof a.index === "number" ? a.index : -1;
    if (idx < 0 || idx >= searchResults.length) continue;
    if (!a.evidenceText || typeof a.evidenceText !== "string") continue;

    const sr = searchResults[idx];
    const source: FactCheckSource = {
      title: sr.title,
      url: sr.url,
      publisher: sr.publisher,
      snippet: sr.snippet,
      supportsClaim: a.stance === "SUPPORTS",
      credibilityScore: getSourceCredibility(sr.url),
    };

    const item: FactCheckEvidenceItem = { text: a.evidenceText, source };

    if (a.stance === "SUPPORTS") supporting.push(item);
    else if (a.stance === "CONTRADICTS") contradicting.push(item);
  }

  // Parse timeline
  const timeline: FactCheckTimelineItem[] = [];
  if (Array.isArray(parsed.timeline)) {
    for (const entry of parsed.timeline) {
      if (
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as FactCheckTimelineItem).date === "string" &&
        typeof (entry as FactCheckTimelineItem).event === "string"
      ) {
        timeline.push({
          date: (entry as FactCheckTimelineItem).date,
          event: (entry as FactCheckTimelineItem).event,
        });
      }
    }
  }

  return {
    supportingEvidence: supporting,
    contradictingEvidence: contradicting,
    summary: String(parsed.summary ?? ""),
    timeline,
    aiConfidence: Math.min(100, Math.max(0, Number(parsed.aiConfidence ?? 50))),
    reasoning: String(parsed.reasoning ?? "Analysis based on retrieved sources."),
  };
}
