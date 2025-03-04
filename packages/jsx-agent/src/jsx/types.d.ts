import { ActionType } from "./action";

type Context<T> = (({
  children,
  value,
}: {
  children?: PromptJSX.Node;
  value: T;
}) => PromptJSX.Node) & {
  value: T;
};

type ContextType<T> = Context<T>;

type Attributes = { key?: string | number | null | undefined };

export namespace PromptJSX {
  interface ElementAttributesProperty {
    props: {};
  }
  interface ElementChildrenAttribute {
    children: {};
  }

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

  type Element =
    | {
        type: string;
        props: Record<string, any>;
        key: string | number | undefined;
      }
    | {
        type: (props: Record<string, any>) => Node;
        props: Record<string, any>;
        key: string | number | undefined;
      };

  type Node =
    | null
    | undefined
    | boolean
    | number
    | Element
    | Iterable<Node>
    | Promise<Node>;
}
