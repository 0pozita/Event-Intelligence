import { type FactCheckProvider, type FactCheckResult } from "./types";
import { getTrustRating } from "../trust-score";

interface ChatMessage {
  role: string;
  content: string;
}

interface ChatChoice {
  message: ChatMessage;
}

interface ChatResponse {
  choices: ChatChoice[];
}

const SYSTEM_PROMPT = `You are an expert fact-checker and information verification analyst.
Analyze the given claim and return a JSON object with the following structure:
{
  "verdict": "True" | "False" | "Partially True" | "Unverified",
  "trustScore": <number 0-100>,
  "reasoning": "<clear explanation of your analysis>",
  "evidenceSummary": "<summary of evidence supporting your verdict>"
}

Be objective and evidence-based. If you cannot verify, return "Unverified".
Return ONLY valid JSON, no other text.`;

export class GroqFactCheckProvider implements FactCheckProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async analyzeClaim(claimText: string): Promise<FactCheckResult> {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `Analyze this claim: "${claimText}"` },
          ],
          temperature: 0.3,
          max_tokens: 500,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = (await response.json()) as ChatResponse;
    const content = data.choices[0]?.message?.content ?? "{}";

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : "{}";

    const parsed = JSON.parse(jsonStr) as {
      verdict?: string;
      trustScore?: number;
      reasoning?: string;
      evidenceSummary?: string;
    };

    const trustScore = Math.round(
      Math.min(100, Math.max(0, parsed.trustScore ?? 50)),
    );
    const validVerdicts = ["True", "False", "Partially True", "Unverified"];
    const verdict = validVerdicts.includes(parsed.verdict ?? "")
      ? (parsed.verdict as FactCheckResult["verdict"])
      : "Unverified";

    return {
      verdict,
      trustScore,
      trustRating: getTrustRating(trustScore),
      reasoning: parsed.reasoning ?? "Analysis completed.",
      evidenceSummary: parsed.evidenceSummary ?? "See reasoning above.",
      provider: "groq",
    };
  }
}
