import type { ActionState, ThreadState } from "../../context/internal";
import type { ActionType, PromptJSX } from "../../jsx";
import { render, type ResolvedElement } from "../../runtime/render";
import type {
  VirtualTextMessage,
  VirtualUserMessage,
} from "../virtual-message";

export const generateUserMessage = async (
  app: PromptJSX.Element,
  state: ThreadState
): Promise<
  ActionState & {
    message: VirtualUserMessage;
    actions: Record<string, ActionType>;
  }
> => {
  const message: VirtualUserMessage = {
    role: "user" as const,
    content: [],
    virtual: true,
  };

  const output = await render(app, {
    thread: state.thread,
    threadIndex: state.threadIndex,
    toolCallIndex: 0,
    latestThreadIndex: state.latestThreadIndex,
  });

  message.content.push(toVirtualTextMessage(output.elements));

  return {
    action: "continue",
    message,
    actions: output.actions,
  };
};

function toVirtualTextMessage(
  result: (string | ResolvedElement)[]
): VirtualTextMessage {
  return {
    type: "text",
    text: result,
  };
}
