import type { ToolCallPart } from "ai";
import type {
  VirtualToolMessage,
  VirtualToolResultMessage,
} from "../virtual-message";
import type { ActionType, PromptJSX } from "../../jsx";
import type { ActionState, ThreadState } from "../../context/internal";
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
  ActionState & {
    message: VirtualToolMessage;
    actions: Record<string, ActionType>;
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
    if (
      state.threadIndex === state.latestThreadIndex &&
      i >= executedToolCallsCount
    ) {
      const result = execute(actions, toolCall);

      if (result.action !== "continue") {
        return {
          ...result,
          message: {
            ...message,
            incomplete: true,
          },
          actions,
        };
      }
    }

    const output = await render(prompt, {
      thread: state.thread,
      threadIndex: state.threadIndex,
      toolCallIndex: i,
      latestThreadIndex: state.latestThreadIndex,
    });

    message.content.push(toVirtualToolResultMessage(output.elements, toolCall));

    nextActions = output.actions;
  }

  return { action: "continue", message, actions: nextActions };
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
