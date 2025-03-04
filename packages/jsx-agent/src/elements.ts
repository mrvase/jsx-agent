import type { z } from "zod";
import { jsx } from "./jsx";
import type { ActionType, PromptJSX } from "./jsx";

export const Action = <T extends z.ZodTypeAny>(
  props: ActionType<T> & { render?: boolean }
) => {
  const { render, ...action } = props;
  return jsx("action", { action, render });
};

export const SystemPrompt = (props: { children?: PromptJSX.Node }) => {
  return jsx("system", props);
};
