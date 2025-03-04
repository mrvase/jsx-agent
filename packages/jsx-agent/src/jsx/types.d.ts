import { ActionType } from "./action";

type JsxElementConstructor<P = any> = (
  props: P
) => PromptNode | Promise<PromptNode>;

interface PromptElement {
  type: string | JsxElementConstructor<any>;
  props: Record<string, any>;
  key: string | number | undefined;
}

type AwaitedPromptNode =
  | null
  | undefined
  | boolean
  | number
  | PromptElement
  | Iterable<PromptNode>;

type PromptNode =
  | null
  | undefined
  | boolean
  | number
  | PromptElement
  | Iterable<PromptNode>
  | Promise<AwaitedPromptNode>;

export namespace PromptJSX {
  type Node = PromptNode;

  type Attributes = { key?: string | number | null | undefined };
  type ElementType = string | JsxElementConstructor<any>;
  interface Element extends PromptElement {}
  interface IntrinsicAttributes extends Attributes {}
  interface IntrinsicClassAttributes extends Attributes {}
  interface IntrinsicElements {
    [key: `x-${string}`]: {
      id?: string;
      children?: Node;
    };
    action: { action: ActionType<any>; render?: boolean };
    br: { children?: Node };
    ul: { children?: Node };
    ol: { children?: Node };
    li: { children?: Node };
    p: { children?: Node };
    div: {
      gap?: number;
      children?: Node;
    };
    a: { href: string; children?: Node };
  }
  interface ElementAttributesProperty {
    props: {};
  }
  interface ElementChildrenAttribute {
    children: {};
  }
}
