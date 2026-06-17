const PRICING: Record<string, { prompt: number; completion: number }> = {
  "openai:gpt-4o": { prompt: 0.005, completion: 0.015 },
  "openai:gpt-4o-mini": { prompt: 0.00015, completion: 0.0006 },
  "openai:gpt-4-turbo": { prompt: 0.01, completion: 0.03 },
  "anthropic:claude-3-5-sonnet-20241022": { prompt: 0.003, completion: 0.015 },
  "anthropic:claude-3-haiku-20240307": { prompt: 0.00025, completion: 0.00125 },
  "gemini:gemini-1.5-pro": { prompt: 0.00125, completion: 0.005 },
  "gemini:gemini-1.5-flash": { prompt: 0.000075, completion: 0.0003 },
  "grok:grok-2": { prompt: 0.002, completion: 0.01 },
};

export function estimateCostUsd(
  provider: string,
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const key = `${provider}:${model}`;
  const rates = PRICING[key] ?? { prompt: 0.005, completion: 0.015 };
  return (
    (promptTokens / 1000) * rates.prompt +
    (completionTokens / 1000) * rates.completion
  );
}
