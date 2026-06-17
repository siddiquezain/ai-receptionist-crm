export interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AIResponse {
  content: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  model: string;
  provider: string;
}

export interface AIProviderSettings {
  provider: string;
  model: string;
  temperature: number;
  maxTokens: number;
  apiKey?: string;
}

export interface AIProvider {
  chat(messages: AIMessage[], settings: AIProviderSettings): Promise<AIResponse>;
}
