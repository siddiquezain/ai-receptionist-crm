import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIMessage, AIProvider, AIProviderSettings, AIResponse } from "../types";

export class GeminiProvider implements AIProvider {
  async chat(messages: AIMessage[], settings: AIProviderSettings): Promise<AIResponse> {
    const genAI = new GoogleGenerativeAI(
      settings.apiKey ?? process.env.GOOGLE_AI_API_KEY!
    );
    const model = genAI.getGenerativeModel({ model: settings.model });

    const systemMsg = messages.find((m) => m.role === "system");
    const conversationMessages = messages.filter((m) => m.role !== "system");

    const history = conversationMessages.slice(0, -1).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const lastMessage = conversationMessages[conversationMessages.length - 1];
    const userInput = lastMessage?.content ?? "";

    const chat = model.startChat({
      history,
      generationConfig: {
        temperature: settings.temperature,
        maxOutputTokens: settings.maxTokens,
      },
      systemInstruction: systemMsg?.content,
    });

    const result = await chat.sendMessage(userInput);
    const text = result.response.text();
    const usage = result.response.usageMetadata;

    return {
      content: text,
      promptTokens: usage?.promptTokenCount ?? 0,
      completionTokens: usage?.candidatesTokenCount ?? 0,
      totalTokens: usage?.totalTokenCount ?? 0,
      model: settings.model,
      provider: "gemini",
    };
  }
}
