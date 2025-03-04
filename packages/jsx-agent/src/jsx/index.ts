import type { PromptJSX } from "./types";

export const jsx = (
  type: string | ((props: Record<string, any>) => PromptJSX.Node),
  { key, ...props }: Record<string, any> & PromptJSX.IntrinsicAttributes = {}
): PromptJSX.Element => {
  return {
    type,
    props,
    key: key ?? undefined,
  } as PromptJSX.Element;
};

export const Fragment = ({ children }: { children?: PromptJSX.Node }) => {
  return children;
};

export type { PromptJSX } from "./types";
export type { ActionType } from "./action";
