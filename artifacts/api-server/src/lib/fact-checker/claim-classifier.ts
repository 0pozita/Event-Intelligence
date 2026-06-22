import type { ClaimType } from "./types";

const CLASSIFY_PROMPT = `You are a claim classifier. Classify the following input as exactly one of:

- "Fact Claim" — an objective, verifiable statement about the world (e.g. "Russia invaded Ukraine in 2022")
- "Opinion" — a subjective belief, value judgment, or preference (e.g. "I think X is bad")
- "Question" — a question, not a statement (e.g. "Did X happen?")
- "Prediction" — a claim about the future that cannot be verified yet (e.g. "X will happen by 2030")

INPUT: "{CLAIM}"

Return ONLY this JSON (no markdown):
{"claimType":"Fact Claim","reason":"one sentence explanation"}`;

interface GroqResponse {
  choices: Array<{ message: { content: string } }>;
}

export async function classifyClaim(
  claimText: string,
  groqKey: string,
): Promise<{ claimType: ClaimType; reason: string }> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are a precise classifier. Return ONLY valid JSON, no code blocks.",
        },
        { role: "user", content: CLASSIFY_PROMPT.replace("{CLAIM}", claimText) },
      ],
      temperature: 0.1,
      max_tokens: 100,
    }),
  });

  if (!res.ok) throw new Error(`Groq classify error: ${res.status}`);

  const data = (await res.json()) as GroqResponse;
  const raw = data.choices[0]?.message?.content ?? "{}";
  const jsonStr = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

  const parsed = JSON.parse(jsonStr) as { claimType?: string; reason?: string };

  const valid: ClaimType[] = ["Fact Claim", "Opinion", "Question", "Prediction"];
  const claimType: ClaimType = valid.includes(parsed.claimType as ClaimType)
    ? (parsed.claimType as ClaimType)
    : "Fact Claim";

  return { claimType, reason: String(parsed.reason ?? "") };
}

/** Rule-based fallback — no API call needed */
export function classifyClaimSync(claimText: string): { claimType: ClaimType; reason: string } {
  const t = claimText.toLowerCase().trim();

  if (t.endsWith("?")) {
    return { claimType: "Question", reason: "Input is phrased as a question." };
  }
  if (
    /\b(i think|i believe|i feel|in my opinion|should|better|worse|evil|great|terrible|amazing|awful|beautiful|ugly|love|hate)\b/.test(
      t,
    )
  ) {
    return { claimType: "Opinion", reason: "Contains subjective language or personal judgment." };
  }
  if (
    /\b(will|going to|would|predict|forecast|by \d{4}|next year|in the future|eventually|soon)\b/.test(
      t,
    )
  ) {
    return { claimType: "Prediction", reason: "Makes a claim about future events." };
  }

  return { claimType: "Fact Claim", reason: "Declarative statement about a factual matter." };
}
