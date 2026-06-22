import { type FactCheckProvider } from "./types";
import { MockFactCheckProvider } from "./mock-provider";
import { OpenAIFactCheckProvider } from "./openai-provider";
import { GroqFactCheckProvider } from "./groq-provider";

export function getFactCheckProvider(): FactCheckProvider {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    return new OpenAIFactCheckProvider(openaiKey);
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    return new GroqFactCheckProvider(groqKey);
  }

  return new MockFactCheckProvider();
}

export type { FactCheckProvider, FactCheckResult, Verdict } from "./types";
