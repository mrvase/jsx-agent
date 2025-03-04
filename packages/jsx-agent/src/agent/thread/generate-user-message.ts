import type { ThreadState } from "../../context/internal";
import type { PromptJSX } from "../../jsx";
import { render, type ResolvedElement } from "../../runtime/render";
import type {
  VirtualTextMessage,
  VirtualUserMessage,
} from "../virtual-message";

export const generateUserMessage = async (
  app: PromptJSX.Element,
  state: ThreadState
) => {
  const message: VirtualUserMessage = {
    role: "user" as const,
    content: [],
    virtual: true,
  };

  const output = await render(app, {
    thread: state.thread,
    threadIndex: state.threadIndex,
    latest: state.latest,
  });

  message.content.push(toVirtualTextMessage(output.elements));

  return { message, actions: output.actions };
};

function toVirtualTextMessage(
  result: (string | ResolvedElement)[]
): VirtualTextMessage {
  return {
    type: "text",
    text: result,
  };
}
