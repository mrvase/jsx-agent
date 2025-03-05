import { internal, type ThreadState } from "../context/internal";
import {
  ContextSymbol,
  type Context,
  setGlobalContext,
  getClonedGlobalContext,
  createGlobalContext,
} from "../context/context";
import type { ActionType, PromptJSX } from "../jsx";
import type { JsxElementConstructor } from "../jsx/types";

type RenderContext = {
  state: ThreadState;
  actionIdPath: string[];
  componentKey: (string | number)[];
  actions: Record<string, ActionType>;
};

export type ResolvedElement = Omit<PromptJSX.Element, "type"> & {
  type: string;
};

export async function render(
  node: PromptJSX.Element,
  state: ThreadState = {
    thread: "main",
    threadIndex: 0,
    toolCallIndex: 0,
    latestThreadIndex: 0,
  }
): Promise<{
  elements: (string | ResolvedElement)[];
  actions: Record<string, ActionType>;
}> {
  const context = createGlobalContext();
  const actions: Record<string, ActionType<any>> = {};

  const elements = await setGlobalContext(context, () =>
    resolveElement(node, {
      state,
      componentKey: [],
      actionIdPath: [],
      actions,
    })
  );

  return {
    elements,
    actions,
  };
}

async function resolveNode(
  node: PromptJSX.Node,
  context: RenderContext
): Promise<(ResolvedElement | string)[]> {
  return resolveNodeWithIndex(node, context);

  async function resolveNodeWithIndex(
    node: PromptJSX.Node,
    context: RenderContext,
    index?: number
  ) {
    if (node instanceof Promise) {
      const awaited = await (node as PromptJSX.Node);
      return resolveNodeWithIndex(awaited, context, index);
    }
    if (node !== null && typeof node === "object" && !("type" in node)) {
      let promises: Promise<(ResolvedElement | string)[]>[] = [];
      let i = 0;
      for (let child of node) {
        const nextIndex = (index ?? 0) * 100 + i++;
        promises.push(resolveNodeWithIndex(child, context, nextIndex));
      }
      return (await Promise.all(promises)).flat(1);
    }
    if (typeof node === "string") {
      return [node];
    }
    if (typeof node === "number") {
      return [String(node)];
    }
    if (node !== null && typeof node === "object" && "type" in node) {
      return await resolveElement(node, context, index);
    }
    return [];
  }
}

async function resolveElement(
  node: PromptJSX.Element,
  context: RenderContext,
  index = 0
): Promise<(ResolvedElement | string)[]> {
  const { type, props, key } = node;
  const nextGlobalContext = getClonedGlobalContext();
  const nextRenderContext = { ...context };

  const nextKey = [...context.componentKey, key ?? index];

  if (typeof type === "function") {
    // ensure that different components are tracked as different state boundaries
    nextKey.push(getElementConstructorId(type));
  }

  nextGlobalContext.set(internal.ComponentIdContext, nextKey.join("#"));

  if (typeof type === "function") {
    const fn = type as JsxElementConstructor | Context<any>;

    if (ContextSymbol in fn) {
      const value = props.value;
      nextGlobalContext.set(fn, value);
    }

    nextGlobalContext.set(internal.HookIndexContext, { current: 0 });
    nextGlobalContext.set(internal.ThreadStateContext, context.state);
    nextRenderContext.componentKey = nextKey;

    return await setGlobalContext(nextGlobalContext, () =>
      resolveNode(
        fn(props as { children?: PromptJSX.Node; value: any }),
        nextRenderContext
      )
    );
    // return await childrenArray(fn(props), context);
  }

  if (type.startsWith("x-")) {
    const tagName = props.tag ?? type.slice(2);

    const nextPath = [
      ...context.actionIdPath,
      [tagName, props.id].filter(Boolean).join("#"),
    ];

    const children = await resolveNode(props.children, {
      ...context,
      actionIdPath: nextPath,
    });

    return [
      {
        type,
        props: {
          ...props,
          children,
        },
        key,
      },
    ];
  }

  if (type === "action") {
    const action = {
      ...props.action,
      name: getActionName(context.actionIdPath, props.action?.name),
    };
    context.actions[action.name] = action;
    return [
      {
        type,
        props: {
          ...props,
          action,
        },
        key,
      },
    ];
  }

  return [
    {
      type,
      props: {
        ...props,
        children: await resolveNode(props.children, context),
      },
      key,
    },
  ];
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

const ElementConstructorIdMap = new WeakMap<JsxElementConstructor, string>();

function getElementConstructorId(constructor: JsxElementConstructor) {
  let id = ElementConstructorIdMap.get(constructor);
  if (id) {
    return id;
  }
  id = Math.random().toString(36).slice(2, 8);
  ElementConstructorIdMap.set(constructor, id);
  return id;
}
