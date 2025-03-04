import type { CoreAssistantMessage } from "ai";
import type { ResolvedElement } from "../runtime/render";

export type VirtualTextMessage = {
  type: "text";
  text: (string | ResolvedElement)[];
};

export type VirtualToolResultMessage = {
  type: "tool-result";
  toolCallId: string;
  toolName: string;
  result: (string | ResolvedElement)[];
};

export type VirtualUserMessage = {
  role: "user";
  content: Array<VirtualTextMessage>;
  virtual: true;
};

export type VirtualToolMessage = {
  role: "tool";
  content: Array<VirtualToolResultMessage>;
  virtual: true;
  incomplete?: true;
};

export type VirtualAssistantMessage = Pick<
  CoreAssistantMessage,
  "role" | "content"
>;

export type VirtualMessage =
  | VirtualUserMessage
  | VirtualToolMessage
  | VirtualAssistantMessage;
