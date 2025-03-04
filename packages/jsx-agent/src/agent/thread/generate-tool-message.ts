import type { ToolCallPart } from "ai";
import type {
  VirtualToolMessage,
  VirtualToolResultMessage,
} from "../virtual-message";
import type { ActionType, PromptJSX } from "../../jsx";
import type { ThreadState } from "../../context/internal";
import { execute } from "../../runtime/execute";
import { render, type ResolvedElement } from "../../runtime/render";

export const generateToolMessage = async (
  prompt: PromptJSX.Element,
  state: ThreadState,
  {
    toolCalls,
    actions,
    executedToolCallsCount,
  }: {
    toolCalls: ToolCallPart[];
    actions: Record<string, ActionType>;
    executedToolCallsCount: number;
  }
): Promise<
  | {
      message: VirtualToolMessage;
      actions: Record<string, ActionType>;
    }
  | {
      message: VirtualToolMessage;
      nextThread: string | null;
    }
> => {
  const message: VirtualToolMessage = {
    role: "tool",
    content: [],
    virtual: true,
  };
  let nextActions: Record<string, ActionType> = {};

  let i = -1;
  for (const toolCall of toolCalls) {
    i++;
    if (state.threadIndex === state.latest && i >= executedToolCallsCount) {
      const { nextThread, terminated } = execute(actions, toolCall);

      if (nextThread || terminated) {
        // we return incomplete message to signal that executedToolCallsCount
        // can be incremented
        return {
          nextThread,
          message: {
            ...message,
            incomplete: true,
          },
        };
      }
    }

    const output = await render(prompt, {
      thread: state.thread,
      threadIndex: state.threadIndex,
      latest: state.latest,
    });

    message.content.push(toVirtualToolResultMessage(output.elements, toolCall));

    nextActions = output.actions;
  }

  return { message, actions: nextActions };
};

function toVirtualToolResultMessage(
  result: (string | ResolvedElement)[],
  tool: {
    toolCallId: string;
    toolName: string;
  }
): VirtualToolResultMessage {
  return {
    type: "tool-result",
    toolCallId: tool.toolCallId,
    toolName: tool.toolName,
    result,
  };
}
