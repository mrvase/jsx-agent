import type { ToolCallPart } from "ai";
import type {
  VirtualToolMessage,
  VirtualToolResultMessage,
} from "../virtual-message";
import type { ActionType, PromptJSX } from "../../jsx";
import type { ActionState, ThreadState } from "../../context/internal";
import { execute } from "../../runtime/execute";
import {
  render,
  type RenderReference,
  type ResolvedElement,
} from "../../runtime/render";

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
  },
  references: RenderReference[]
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

  let reference: RenderReference | undefined = references[0];

  let i = -1;
  console.log("START TOOL CALLING", {
    executedToolCallsCount,
    references: references.map((el) => el.mode),
  });
  for (const toolCall of toolCalls) {
    i++;
    if (
      // state.threadIndex === state.latestThreadIndex &&
      i >= executedToolCallsCount
    ) {
      console.log("execute", toolCall);
      const result = execute(actions, toolCall);

      console.log("execute reusult", result);

      if (result.action !== "continue") {
        console.log("PREMATURE EXIT");
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

    console.log("render from tool call", toolCall.toolCallId);
    const output = await render(
      prompt,
      {
        thread: state.thread,
        threadIndex: state.threadIndex,
        toolCallIndex: i,
      },
      reference
    );

    reference = references[i + 1] ?? { mode: "next", element: output.element };

    message.content.push(toVirtualToolResultMessage(output.element, toolCall));

    nextActions = output.actions;
  }

  console.log("ORDINARY EXIT");
  return { action: "continue", message, actions: nextActions };
};

function toVirtualToolResultMessage(
  result: ResolvedElement,
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
