import type { Reactive } from "@reactively/core";
import { createContext, useContext } from "./component-context";

export type ThreadState = {
  readonly thread: string;
  threadIndex: number;
  toolCallIndex: number;
};

export type State<T = unknown> =
  | { type: "manual"; value: T; manualDeps: unknown[] }
  | { type: "signal"; signal: Reactive<T> };

export type ComponentState = {
  state: State<unknown>[];
  cached: unknown[];
};

type Mutable<T> = { current: T };

// render contexts
const HookIndexContext = createContext<Mutable<number> | null>(null);
const ComponentStateContext = createContext<ComponentState | null>(null);
const ThreadStateContext = createContext<ThreadState | null>(null);

export type ActionState =
  | {
      action: "continue";
    }
  | {
      action: "redirect";
      thread: string;
    }
  | {
      action: "terminate";
      response: unknown;
    };

// action contexts
const ActionContext = createContext<Mutable<ActionState> | null>(null);

const RENDER_ERROR_MESSAGE = "Internal context is used outside render context";
const ACTION_ERROR_MESSAGE = "Internal context is used outside action context";

const useActionContext = () => {
  const ctx = useContext(ActionContext);
  if (!ctx) {
    throw new Error(ACTION_ERROR_MESSAGE);
  }
  return ctx;
};

const useHookIndex = () => {
  const ctx = useContext(HookIndexContext);
  if (!ctx) {
    throw new Error(RENDER_ERROR_MESSAGE);
  }
  return ctx.current++;
};

const useComponentState = () => {
  const ctx = useContext(ComponentStateContext);
  if (!ctx) {
    throw new Error(RENDER_ERROR_MESSAGE);
  }
  return ctx;
};

const useThreadState = () => {
  const ctx = useContext(ThreadStateContext);
  if (!ctx) {
    throw new Error(RENDER_ERROR_MESSAGE);
  }
  return ctx;
};

export const internal = {
  ActionContext,
  HookIndexContext,
  ComponentStateContext,
  ThreadStateContext,
  useActionContext,
  useHookIndex,
  useComponentState,
  useThreadState,
};
