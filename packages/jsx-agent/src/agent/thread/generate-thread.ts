import type { CoreAssistantMessage, TextPart, ToolCallPart } from "ai";
import type {
  VirtualMessage,
  VirtualToolMessage,
  VirtualUserMessage,
} from "../virtual-message";
import { mapActions, mapMessages } from "./mappers";
import { generateToolMessage } from "./generate-tool-message";
import { generateUserMessage } from "./generate-user-message";
import type { AssistantResponseGenerator } from "../generator";
import type { ActionType, PromptJSX } from "../../jsx";
import type { ThreadState } from "../../context/internal";

export type Thread = {
  name: string;
  messages: VirtualMessage[];
};

export async function generateThread(
  app: {
    prompt: PromptJSX.Element;
    generator: AssistantResponseGenerator;
  },
  thread: Thread
) {
  const previousMaxThreadIndex =
    thread.messages.filter(isCompleteVirtualMessage).length - 1;
  const nextMaxThreadIndex = previousMaxThreadIndex + 1;

  const state: ThreadState = {
    threadIndex: 0,
    thread: thread.name,
    // "latest" represents the lowest index we have not visited yet
    latest: nextMaxThreadIndex,
  };

  const messages: VirtualMessage[] = [];
  let toolCalls: ToolCallPart[] | null = null;
  let terminated = false;
  let actions: Record<string, ActionType> = {};

  for (let index = 0; index <= nextMaxThreadIndex; index++) {
    state.threadIndex = index;

    const messageIndex = index * 2;
    const responseIndex = 1 + index * 2;

    const existingMessage = thread.messages[messageIndex] as
      | VirtualToolMessage
      | undefined;
    const existingResponse = thread.messages[responseIndex] as
      | CoreAssistantMessage
      | undefined;

    let result:
      | {
          message: VirtualToolMessage | VirtualUserMessage;
          actions: Record<string, ActionType>;
        }
      | {
          message: VirtualToolMessage;
          nextThread: string | null;
        };

    if (toolCalls) {
      // if there is no generated response, then it comes from a thread redirect
      // we add one to the length, because it will not have rendered the message yet
      // for the incomplete tool call, even though it has executed
      const executedToolCallsCount = existingMessage
        ? existingMessage.content.length + 1
        : 0;
      result = await generateToolMessage(app.prompt, state, {
        toolCalls,
        actions,
        executedToolCallsCount,
      });
    } else {
      result = await generateUserMessage(app.prompt, state);
    }

    if ("nextThread" in result) {
      if (result.nextThread === null) {
        // is terminated
        return { nextThread: thread.name, terminated: true, messages };
      }
      messages.push(result.message);
      return { nextThread: result.nextThread, terminated, messages };
    } else {
      messages.push(result.message);
      actions = result.actions;
    }

    const response =
      existingResponse ??
      (
        await app.generator({
          messages: mapMessages(messages),
          tools: mapActions(actions),
        })
      )?.message;

    messages.push(response);

    if (isToolCall(response)) {
      toolCalls = response.content.filter(
        (el): el is ToolCallPart => el.type === "tool-call"
      );
    } else {
      terminated = true;
      break;
    }
  }

  return { nextThread: thread.name, terminated, messages };
}

const isToolCall = (
  message: CoreAssistantMessage
): message is {
  role: "assistant";
  content: (TextPart | ToolCallPart)[];
} => {
  return (
    message.role === "assistant" &&
    Array.isArray(message.content) &&
    message.content.length > 0 &&
    message.content.some((el) => el.type === "tool-call")
  );
};

const isCompleteVirtualMessage = (
  message: CoreAssistantMessage | VirtualMessage
): message is VirtualMessage => {
  return (
    "virtual" in message &&
    message.virtual &&
    !("incomplete" in message && message.incomplete)
  );
};
