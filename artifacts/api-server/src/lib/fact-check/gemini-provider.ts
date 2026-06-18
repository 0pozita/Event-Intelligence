import { type FactCheckProvider, type FactCheckResult } from "./types";
import { getTrustRating } from "../trust-score";

interface GeminiPart {
  text: string;
}

interface GeminiContent {
  parts: GeminiPart[];
}

interface GeminiCandidate {
  content: GeminiContent;
}

interface GeminiResponse {
  candidates: GeminiCandidate[];
}

const PROMPT_TEMPLATE = `You are an expert fact-checker and information verification analyst.
Analyze the following claim and return a JSON object with this exact structure:
{
  "verdict": "True" | "False" | "Partially True" | "Unverified",
  "trustScore": <number 0-100>,
  "reasoning": "<clear explanation>",
  "evidenceSummary": "<evidence summary>"
}

Claim: "{CLAIM}"

Return ONLY valid JSON, no other text.`;

export class GeminiFactCheckProvider implements FactCheckProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async analyzeClaim(claimText: string): Promise<FactCheckResult> {
    const prompt = PROMPT_TEMPLATE.replace("{CLAIM}", claimText);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 500 },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = (await response.json()) as GeminiResponse;
    const text = data.candidates[0]?.content?.parts[0]?.text ?? "{}";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const content = jsonMatch ? jsonMatch[0] : "{}";

    const parsed = JSON.parse(content) as {
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
      provider: "gemini",
    };
  }
}
