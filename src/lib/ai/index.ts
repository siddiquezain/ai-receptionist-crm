import type { AIProvider, AIProviderSettings } from "./types";
import { OpenAIProvider } from "./providers/openai";
import { AnthropicProvider } from "./providers/anthropic";
import { GeminiProvider } from "./providers/gemini";
import { GrokProvider } from "./providers/grok";

export function getAIProvider(settings: AIProviderSettings): AIProvider {
  switch (settings.provider) {
    case "openai":
      return new OpenAIProvider();
    case "anthropic":
      return new AnthropicProvider();
    case "gemini":
      return new GeminiProvider();
    case "grok":
      return new GrokProvider();
    default:
      return new OpenAIProvider();
  }
}

export type { AIMessage, AIResponse, AIProvider, AIProviderSettings } from "./types";
export { estimateCostUsd } from "./pricing";
