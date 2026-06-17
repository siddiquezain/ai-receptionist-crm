import Anthropic from "@anthropic-ai/sdk";
import type { AIMessage, AIProvider, AIProviderSettings, AIResponse } from "../types";

export class AnthropicProvider implements AIProvider {
  async chat(messages: AIMessage[], settings: AIProviderSettings): Promise<AIResponse> {
    const client = new Anthropic({
      apiKey: settings.apiKey ?? process.env.ANTHROPIC_API_KEY,
    });

    const systemMessage = messages.find((m) => m.role === "system")?.content;
    const userMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const response = await client.messages.create({
      model: settings.model,
      max_tokens: settings.maxTokens,
      system: systemMessage,
      messages: userMessages,
    });

    const textBlock = response.content.find((b) => b.type === "text");

    return {
      content: textBlock?.type === "text" ? textBlock.text : "",
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      model: settings.model,
      provider: "anthropic",
    };
  }
}
