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
import type { ActionState, ThreadState } from "../../context/internal";

export type Thread = {
  name: string;
  messages: VirtualMessage[];
};

export type RenderStrategy =
  | {
      /**
       * The mutable render strategy allows previous steps to be revisited.
       */
      type: "mutable";
      /**
       * A positive value indicates the absolute index to start from.
       * A negative value indicates the index to start from relative to the end.
       */
      startIndex: number;
    }
  | {
      /**
       * The static render strategy only renders the next non-rendered message
       */
      type: "static";
      actions: Record<string, ActionType>;
    };

export async function generateThread(
  app: {
    prompt: PromptJSX.Element;
    generator: AssistantResponseGenerator;
  },
  thread: Thread,
  strategy: RenderStrategy
): Promise<
  ActionState & {
    messages: VirtualMessage[];
    actions: Record<string, ActionType>;
  }
> {
  const getMessage = (index: number) =>
    thread.messages[getMessageIndex(index)] as VirtualToolMessage | undefined;

  const getResponse = (index: number) =>
    thread.messages[getResponseIndex(index)] as
      | CoreAssistantMessage
      | undefined;

  const previousMaxThreadIndex =
    thread.messages.filter(isCompleteVirtualMessage).length - 1;
  const nextMaxThreadIndex = previousMaxThreadIndex + 1;

  const state: ThreadState = {
    threadIndex: 0,
    thread: thread.name,
    toolCallIndex: 0,
    // "latestThreadIndex" represents the lowest index we have not visited yet
    latestThreadIndex: nextMaxThreadIndex,
  };

  const absoluteStartIndex =
    strategy.type === "mutable"
      ? strategy.startIndex < 0
        ? nextMaxThreadIndex + strategy.startIndex
        : strategy.startIndex
      : nextMaxThreadIndex;

  const messages: VirtualMessage[] = thread.messages.slice(
    0,
    // We want to get the messages up to and including the response from the previous step.
    // So we get its index + 1 because slice is exclusive of the end index.
    getResponseIndex(absoluteStartIndex - 1) + 1
  );

  let actions: Record<string, ActionType> =
    strategy.type === "static" ? strategy.actions : {};

  for (
    let stepIndex = absoluteStartIndex;
    stepIndex <= nextMaxThreadIndex;
    stepIndex++
  ) {
    state.threadIndex = stepIndex;

    const previousResponse = getResponse(stepIndex - 1);

    const toolCalls =
      previousResponse && isToolCall(previousResponse)
        ? previousResponse.content.filter(
            (el): el is ToolCallPart => el.type === "tool-call"
          )
        : null;

    const existingMessage = getMessage(stepIndex);
    const existingResponse = getResponse(stepIndex);

    let result: ActionState & {
      message: VirtualToolMessage | VirtualUserMessage;
      actions: Record<string, ActionType>;
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

    messages.push(result.message);
    actions = result.actions;

    if (result.action !== "continue") {
      return { ...result, messages };
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

    if (!isToolCall(response)) {
      return { action: "terminate", response: undefined, messages, actions };
    }
  }

  return { action: "continue", messages, actions };
}

const getMessageIndex = (index: number) => index * 2;
const getResponseIndex = (index: number) => 1 + index * 2;

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
