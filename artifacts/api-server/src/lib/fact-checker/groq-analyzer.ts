import type { RawAnalysis, ClaimType, FactCheckSource, FactCheckEvidenceItem, FactCheckTimelineItem } from "./types";

const ANALYSIS_PROMPT = `You are an expert fact-checker and intelligence analyst. Analyze the following claim through a structured verification process.

CLAIM: "{CLAIM}"

Your task:
1. Classify the claim as exactly one of: "Fact Claim", "Opinion", "Question", "Prediction"
2. If it is a "Fact Claim": gather evidence from your training knowledge
   - List ONLY real sources you are highly confident exist
   - NEVER invent URLs or publication details
   - If you cannot cite real, known sources: set sourcesAvailable to false, leave evidence arrays empty
   - Provide BOTH supporting AND contradicting evidence for balance
   - Add a timeline of key events if the claim involves a sequence of events

CRITICAL RULES:
- Do NOT fabricate source URLs or publisher names
- Only cite sources you are very confident are real (major news outlets, official .gov sites, established research institutions, Wikipedia)
- If uncertain about a URL, omit that source entirely
- Opinions, predictions, and questions cannot be fact-checked — leave evidence empty for those
- Provide honest analysis, not just what the user wants to hear

Return ONLY valid JSON (no markdown, no code blocks) matching this exact schema:
{
  "claimType": "Fact Claim" | "Opinion" | "Question" | "Prediction",
  "claimTypeReason": "brief explanation of classification",
  "summary": "one-paragraph neutral summary of the claim and context",
  "supportingEvidence": [
    {
      "text": "specific evidence text that supports the claim",
      "source": {
        "title": "article or page title",
        "url": "https://real-url.com/real-path",
        "publisher": "Publisher Name",
        "snippet": "relevant excerpt or context from the source",
        "supportsClaim": true,
        "credibilityScore": 85
      }
    }
  ],
  "contradictingEvidence": [
    {
      "text": "specific evidence that contradicts or complicates the claim",
      "source": {
        "title": "article or page title",
        "url": "https://real-url.com/real-path",
        "publisher": "Publisher Name",
        "snippet": "relevant excerpt or context",
        "supportsClaim": false,
        "credibilityScore": 80
      }
    }
  ],
  "timeline": [
    { "date": "YYYY-MM-DD", "event": "brief description of what happened" }
  ],
  "aiConfidence": 75,
  "sourcesAvailable": true,
  "reasoning": "detailed analytical reasoning explaining your verdict and the weight of evidence"
}`;

interface GroqChatMessage {
  role: string;
  content: string;
}

interface GroqChatChoice {
  message: GroqChatMessage;
}

interface GroqChatResponse {
  choices: GroqChatChoice[];
}

function safeParseEvidence(arr: unknown): FactCheckEvidenceItem[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(
      (item): item is { text: string; source: Record<string, unknown> } =>
        item !== null &&
        typeof item === "object" &&
        typeof (item as Record<string, unknown>).text === "string" &&
        typeof (item as Record<string, unknown>).source === "object",
    )
    .map((item) => {
      const s = item.source as Record<string, unknown>;
      const source: FactCheckSource = {
        title: String(s.title ?? "Unknown"),
        url: String(s.url ?? ""),
        publisher: String(s.publisher ?? "Unknown"),
        snippet: String(s.snippet ?? ""),
        supportsClaim: Boolean(s.supportsClaim),
        credibilityScore: Math.min(100, Math.max(0, Number(s.credibilityScore ?? 70))),
      };
      return { text: item.text, source };
    })
    .filter((item) => item.source.url.startsWith("http"));
}

function safeParseTimeline(arr: unknown): FactCheckTimelineItem[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(
      (item): item is { date: string; event: string } =>
        item !== null &&
        typeof item === "object" &&
        typeof (item as Record<string, unknown>).date === "string" &&
        typeof (item as Record<string, unknown>).event === "string",
    )
    .map((item) => ({ date: item.date, event: item.event }));
}

export async function analyzeWithGroq(
  claimText: string,
  apiKey: string,
): Promise<RawAnalysis> {
  const prompt = ANALYSIS_PROMPT.replace("{CLAIM}", claimText);

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "You are a rigorous fact-checking system. Return ONLY valid JSON with no markdown formatting, no code blocks, no explanation outside the JSON.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as GroqChatResponse;
  const raw = data.choices[0]?.message?.content ?? "{}";

  // Strip any markdown code fences if present
  const jsonStr = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

  const parsed = JSON.parse(jsonStr) as Record<string, unknown>;

  const validClaimTypes: ClaimType[] = ["Fact Claim", "Opinion", "Question", "Prediction"];
  const claimType: ClaimType = validClaimTypes.includes(parsed.claimType as ClaimType)
    ? (parsed.claimType as ClaimType)
    : "Fact Claim";

  const supportingEvidence = safeParseEvidence(parsed.supportingEvidence);
  const contradictingEvidence = safeParseEvidence(parsed.contradictingEvidence);
  const timeline = safeParseTimeline(parsed.timeline);

  // sourcesAvailable is true only if AI said so AND we actually have evidence with valid URLs
  const hasRealEvidence = supportingEvidence.length > 0 || contradictingEvidence.length > 0;
  const sourcesAvailable =
    (parsed.sourcesAvailable === true || parsed.sourcesAvailable === "true") && hasRealEvidence;

  return {
    claimType,
    claimTypeReason: String(parsed.claimTypeReason ?? ""),
    summary: String(parsed.summary ?? ""),
    supportingEvidence,
    contradictingEvidence,
    timeline,
    aiConfidence: Math.min(100, Math.max(0, Number(parsed.aiConfidence ?? 50))),
    sourcesAvailable,
    reasoning: String(parsed.reasoning ?? "Analysis completed."),
  };
}
