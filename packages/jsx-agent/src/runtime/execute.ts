import type { ActionType } from "../jsx";
import { createGlobalContext, setGlobalContext } from "../context/context";
import { internal } from "../context/internal";

export function execute(
  actions: Record<string, ActionType>,
  tool: { toolName: string; args: unknown }
) {
  const action = actions[tool.toolName];
  const context = createGlobalContext();

  const actionContext = {
    nextThread: null as string | null,
    terminated: false,
  };

  context.set(internal.ActionContext, actionContext);

  setGlobalContext(context, () => action?.execute(tool.args));

  return actionContext;
}
