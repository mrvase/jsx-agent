import type { CoreMessage, Tool } from "ai";
import type { VirtualMessage } from "../virtual-message";
import { stringify } from "../../runtime/stringify";
import type { ActionType } from "../../jsx";

export const mapMessages = (messages: VirtualMessage[]): CoreMessage[] => {
  let system: string = "";

  const coreMessages = messages.map((el): CoreMessage => {
    let nextActions: Set<string> | null = null;

    if ("virtual" in el) {
      if (el.role === "user") {
        return {
          ...el,
          content: el.content.map((el) => {
            const result = stringify(el.text);
            system = result.system;
            if (!nextActions) nextActions = new Set();
            result.actions.forEach((el) => nextActions!.add(el));
            return {
              ...el,
              text: result.prompt,
            };
          }),
        };
      } else if (el.role === "tool") {
        return {
          ...el,
          content: el.content.map((el) => {
            const result = stringify(el.result);
            system = result.system;
            if (!nextActions) nextActions = new Set();
            result.actions.forEach((el) => nextActions!.add(el));
            return {
              ...el,
              result: result.prompt,
            };
          }),
        };
      }
    }

    return el;
  });

  coreMessages.unshift({
    role: "system",
    content: system,
  });

  return coreMessages;
};

export function mapActions(
  actions: Record<string, ActionType>
): Record<string, Tool> {
  return Object.fromEntries(
    Object.entries(actions).map(([name, { description, parameters }]) => [
      name,
      {
        description,
        parameters,
      } satisfies Tool,
    ])
  );
}
