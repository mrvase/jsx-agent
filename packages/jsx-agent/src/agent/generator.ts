import type { CoreAssistantMessage, CoreMessage, Tool } from "ai";

export type GeneratorInput = {
  messages: CoreMessage[];
  tools: Record<string, Tool<any, any>>;
};

export type AssistantResponseGenerator = (options: GeneratorInput) => Promise<{
  text: string;
  message: CoreAssistantMessage;
}>;
