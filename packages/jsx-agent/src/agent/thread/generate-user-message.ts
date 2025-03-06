import type { ActionState, ThreadState } from "../../context/internal";
import type { ActionType, PromptJSX } from "../../jsx";
import {
  render,
  type RenderReference,
  type ResolvedElement,
} from "../../runtime/render";
import type {
  VirtualTextMessage,
  VirtualUserMessage,
} from "../virtual-message";

export const generateUserMessage = async (
  app: PromptJSX.Element,
  state: ThreadState,
  references: RenderReference[]
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

  const reference: RenderReference | undefined = references[0];

  const output = await render(
    app,
    {
      thread: state.thread,
      threadIndex: state.threadIndex,
      toolCallIndex: 0,
    },
    reference
  );

  message.content.push(toVirtualTextMessage(output.element));

  return {
    action: "continue",
    message,
    actions: output.actions,
  };
};

function toVirtualTextMessage(result: ResolvedElement): VirtualTextMessage {
  return {
    type: "text",
    text: result,
  };
}
