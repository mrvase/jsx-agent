import type { ActionType } from "./action";

export type JsxElementConstructor<P = any> = (
  props: P
) => PromptNode | Promise<AwaitedPromptNode>;

export interface PromptElement {
  type: string | JsxElementConstructor<any>;
  props: Record<string, any>;
  key: string | number | undefined;
}

export type AwaitedPromptNode =
  | null
  | undefined
  | boolean
  | number
  | PromptElement
  | Iterable<PromptNode>;

export type PromptNode =
  | null
  | undefined
  | boolean
  | number
  | PromptElement
  | Iterable<PromptNode>
  | Promise<AwaitedPromptNode>;

export namespace PromptJSX {
  export type Node = PromptNode;

  export type Attributes = { key?: string | number | null | undefined };
  export type ElementType = string | JsxElementConstructor<any>;
  export interface Element extends PromptElement {}
  export interface IntrinsicAttributes extends Attributes {}
  export interface IntrinsicClassAttributes extends Attributes {}
  export interface IntrinsicElements {
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
  export interface ElementAttributesProperty {
    props: {};
  }
  export interface ElementChildrenAttribute {
    children: {};
  }
}
