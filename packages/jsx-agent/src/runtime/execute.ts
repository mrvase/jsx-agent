import type { ActionType } from "../jsx";
import {
  createComponentContext,
  setComponentContext,
} from "../context/component-context";
import { internal, type ActionState } from "../context/internal";

export function execute(
  actions: Record<string, ActionType>,
  tool: { toolName: string; args: unknown }
) {
  const action = actions[tool.toolName];

  if (!action) {
    throw new Error(`Action ${tool.toolName} not found`);
  }

  const context = createComponentContext();

  const actionContext: { current: ActionState } = {
    current: { action: "continue" },
  };

  context.set(internal.ActionContext, actionContext);

  setComponentContext(context, () => action?.execute(tool.args));

  return actionContext.current;
}
