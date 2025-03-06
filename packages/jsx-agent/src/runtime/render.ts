import {
  internal,
  type ComponentState,
  type ThreadState,
} from "../context/internal";
import {
  ContextSymbol,
  type Context,
  setComponentContext,
  getClonedComponentContext,
  createComponentContext,
} from "../context/component-context";
import type { ActionType, PromptJSX } from "../jsx";
import type { JsxElementConstructor } from "../jsx/types";

type RenderContext = {
  mode: "cached" | "next";
  state: ThreadState;
  actionIdPath: string[];
  actions: Record<string, ActionType>;
};

export type ResolvedFunctionElement = {
  type: JsxElementConstructor<any>;
  key?: string | number | undefined;
  /**
   * Props are consumed by the function and therefore removed
   */
  // _props: Record<string, never>;
  /**
   * This is the resolved _function_
   */
  _resolved: ResolvedNode;
  _state: ComponentState;
};

export type ResolvedIntrinsicElement = {
  type: string;
  key?: string | number | undefined;
  /**
   * props.children are resolved and therefore removed from props
   */
  _props: Record<string, any>;
  /**
   * This is the resolved _children_
   */
  _resolved: ResolvedNode;
};

export type ResolvedElement =
  | ResolvedFunctionElement
  | ResolvedIntrinsicElement;

export type ResolvedNode = ResolvedElement | string | ResolvedNode[];

type RenderOutput = {
  element: ResolvedElement;
  actions: Record<string, ActionType>;
  rerender: () => Promise<RenderOutput>;
};

export type RenderReference = {
  mode: "cached" | "next";
  element: ResolvedElement;
};

export async function render(
  node: PromptJSX.Element,
  state: ThreadState = {
    thread: "main",
    threadIndex: 0,
    toolCallIndex: 0,
  },
  reference?: RenderReference
): Promise<RenderOutput> {
  const context = createComponentContext();
  const actions: Record<string, ActionType<any>> = {};

  const element = await setComponentContext(context, () =>
    resolveElement(
      node,
      {
        mode: reference?.mode ?? "next",
        state,
        actionIdPath: [],
        actions,
      },
      reference?.element
    )
  );

  return {
    element,
    actions,
    rerender: () => {
      const threadIndex = state.threadIndex + 1;
      return render(
        node,
        {
          ...state,
          threadIndex,
        },
        {
          mode: "next",
          element,
        }
      );
    },
  };
}

const isObject = <T>(node: T): node is Extract<T, object> =>
  node !== null && typeof node === "object";

const isElement = <T>(
  node: T
): node is Extract<T, PromptJSX.Element | ResolvedElement> =>
  isObject(node) && "type" in node;

const elementsAreEqual = (
  el1: TypedElement | ResolvedElement,
  el2: TypedElement | ResolvedElement
) => el1.type === el2.type && el1.key === el2.key;

const isIterable = <T>(node: T): node is Extract<T, Iterable<any>> =>
  isObject(node) && !("type" in node);

async function resolveNode(
  node: PromptJSX.Node,
  context: RenderContext,
  reference?: ResolvedNode
): Promise<ResolvedNode> {
  if (node instanceof Promise) {
    const awaited = await (node as PromptJSX.Node);
    // same resolved output
    return resolveNode(awaited, context, reference);
  }

  if (isElement(node)) {
    return await resolveElement(node, context, reference);
  }

  if (isIterable(node)) {
    // Iterator
    const matchingPrevious = Array.isArray(reference) ? reference : [];

    let promises: Promise<ResolvedNode>[] = [];
    let i = 0;
    const noPromiseElements = await Promise.all(node);
    for (let child of noPromiseElements) {
      const key = isElement(child) ? child.key : undefined;
      const nextMatch = key
        ? matchingPrevious.find((el) => isElement(el) && el.key === key)
        : matchingPrevious[i];

      promises.push(resolveNode(child, context, nextMatch));

      i++;
    }
    return await Promise.all(promises);
  }

  if (typeof node === "string") {
    return node;
  }

  if (typeof node === "number") {
    return String(node);
  }

  return [];
}

type TypedElement =
  | {
      [Key in keyof PromptJSX.IntrinsicElements]: {
        type: Key;
        props: PromptJSX.IntrinsicElements[Key];
        key?: string | number | undefined;
      };
    }[keyof PromptJSX.IntrinsicElements]
  | {
      type: JsxElementConstructor<any>;
      props: Record<string, any>;
      key?: string | number | undefined;
    };

const isXElement = (
  node: TypedElement
): node is Extract<TypedElement, { type: `x-${string}` }> => {
  return typeof node.type === "string" && node.type.startsWith("x-");
};

async function resolveElement(
  node_: PromptJSX.Element,
  context: RenderContext,
  reference?: ResolvedNode
): Promise<ResolvedElement> {
  const node = node_ as TypedElement;
  const nextRenderContext = { ...context };

  if (typeof node.type === "function") {
    // PromptElement
    const matchingPrevious =
      isElement(reference) && elementsAreEqual(reference, node)
        ? (reference as ResolvedFunctionElement)
        : undefined;

    const prevState = matchingPrevious?._state;

    const nextState = {
      state: [...(prevState?.state ?? [])],
      cached: context.mode === "cached" ? [...(prevState?.cached ?? [])] : [],
    };

    const nextComponentContext = getClonedComponentContext();

    const fn = node.type as JsxElementConstructor | Context<any>;
    if (ContextSymbol in fn) {
      const value = node.props.value;
      nextComponentContext.set(fn, value);
    }

    nextComponentContext.set(internal.HookIndexContext, { current: 0 });
    nextComponentContext.set(internal.ComponentStateContext, nextState);
    nextComponentContext.set(internal.ThreadStateContext, context.state);

    return {
      type: node.type,
      key: node.key,
      _props: {}, // already consumed
      _resolved: await setComponentContext(nextComponentContext, () => {
        return resolveNode(
          node.type(node.props),
          nextRenderContext,
          matchingPrevious?._resolved
        );
      }),
      _state: nextState,
    };
  }

  const matchingPrevious =
    isElement(reference) && elementsAreEqual(reference, node)
      ? (reference as ResolvedIntrinsicElement)
      : undefined;

  if (isXElement(node)) {
    nextRenderContext.actionIdPath = [
      ...context.actionIdPath,
      [node.type.slice(2), node.props.id].filter(Boolean).join("#"),
    ];

    const { children, ..._props } = node.props;

    return {
      type: node.type,
      key: node.key,
      _props,
      _resolved: await resolveNode(
        children,
        nextRenderContext,
        matchingPrevious?._resolved
      ),
    };
  }

  if (node.type === "action") {
    const action: ActionType = {
      ...node.props.action,
      name: getActionName(context.actionIdPath, node.props.action?.name),
    };
    context.actions[action.name] = action;
    return {
      type: node.type,
      key: node.key,
      _props: {
        ...node.props,
        action,
      },
      _resolved: [],
    };
  }

  if ("children" in node.props) {
    const { children, ..._props } = node.props;

    return {
      type: node.type,
      key: node.key,
      _props,
      _resolved: await resolveNode(
        children,
        context,
        matchingPrevious?._resolved
      ),
    };
  }

  return {
    type: node.type,
    key: node.key,
    _props: node.props,
    _resolved: [],
  };
}

function getActionName(path: string[], elementName: string) {
  const ids = path
    .filter((el) => el.includes("#"))
    .map((el) => el.split("#")[1]);
  const name = [ids.filter(Boolean).join("_").toLowerCase(), elementName]
    .filter(Boolean)
    .join("_")
    .replace(/[^a-zA-Z0-9-]/g, "_")
    .replace(/__+/g, "-")
    .replace(/^_/, "")
    .replace(/_$/, "");
  return name;
}
