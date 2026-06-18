import { type FactCheckProvider } from "./types";
import { MockFactCheckProvider } from "./mock-provider";
import { OpenAIFactCheckProvider } from "./openai-provider";
import { GeminiFactCheckProvider } from "./gemini-provider";

export function getFactCheckProvider(): FactCheckProvider {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    return new OpenAIFactCheckProvider(openaiKey);
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    return new GeminiFactCheckProvider(geminiKey);
  }

  return new MockFactCheckProvider();
}

export type { FactCheckProvider, FactCheckResult, Verdict } from "./types";
