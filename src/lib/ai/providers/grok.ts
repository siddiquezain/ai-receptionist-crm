import OpenAI from "openai";
import type { AIMessage, AIProvider, AIProviderSettings, AIResponse } from "../types";

export class GrokProvider implements AIProvider {
  async chat(messages: AIMessage[], settings: AIProviderSettings): Promise<AIResponse> {
    const client = new OpenAI({
      apiKey: settings.apiKey ?? process.env.GROK_API_KEY,
      baseURL: "https://api.x.ai/v1",
    });

    const response = await client.chat.completions.create({
      model: settings.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: settings.temperature,
      max_completion_tokens: settings.maxTokens,
    });

    const choice = response.choices[0];
    const usage = response.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    return {
      content: choice.message.content ?? "",
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      model: settings.model,
      provider: "grok",
    };
  }
}
