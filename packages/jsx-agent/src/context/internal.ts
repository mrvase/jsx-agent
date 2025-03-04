import { createContext, useContext } from "./context";

export type ThreadState = {
  threadIndex: number;
  readonly thread: string;
  readonly latest: number;
};

type ComponentId = string;
type HookIndex = number;

type Mutable<T> = { current: T };

// render contexts
const ComponentIdContext = createContext<ComponentId | null>(null);
const HookIndexContext = createContext<Mutable<HookIndex> | null>(null);
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

const useComponentId = () => {
  const ctx = useContext(ComponentIdContext);
  if (!ctx) {
    throw new Error(RENDER_ERROR_MESSAGE);
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

const useThreadState = () => {
  const ctx = useContext(ThreadStateContext);
  if (!ctx) {
    throw new Error(RENDER_ERROR_MESSAGE);
  }
  return ctx;
};

export const internal = {
  ActionContext,
  ComponentIdContext,
  HookIndexContext,
  ThreadStateContext,
  useActionContext,
  useComponentId,
  useHookIndex,
  useThreadState,
};
