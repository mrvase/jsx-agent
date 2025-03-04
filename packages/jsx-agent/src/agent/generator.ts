import {
  generateText,
  type CoreAssistantMessage,
  type CoreMessage,
  type LanguageModelV1,
  type Tool,
} from "ai";

export type GeneratorInput = {
  messages: CoreMessage[];
  tools: Record<string, Tool<any, any>>;
};

export type AssistantResponseGenerator = (options: GeneratorInput) => Promise<{
  text: string;
  message: CoreAssistantMessage;
}>;

export type CallSettings = {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  stopSequences?: string[];
  seed?: number;
  maxRetries?: number;
  abortSignal?: AbortSignal;
  headers?: Record<string, string | undefined>;
};

export const createDefaultGenerator =
  (options: {
    model: LanguageModelV1;
    settings?: CallSettings;
  }): AssistantResponseGenerator =>
  async (input) => {
    const { text, response } = await generateText({
      model: options.model,
      ...options.settings,
      messages: input.messages,
      tools: input.tools,
    });

    return {
      text,
      message: response.messages[0] as CoreAssistantMessage,
    };
  };
