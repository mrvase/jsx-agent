import { internal } from "../context/internal";
import { getCache, getState, getStateContext } from "./state-context";

const useStateContext = <T>(
  fn: T | (() => T),
  manualDeps: unknown[] | null = null,
  options: { crossThread?: boolean } = {}
) => {
  const { thread } = internal.useThreadState();
  const componentId = internal.useComponentId();
  const hookIndex = internal.useHookIndex();

  const state = getState<T>(fn, manualDeps, {
    threadName: options.crossThread ? null : thread,
    componentId,
    hookIndex,
  });

  return state;
};

export const useCache = <T>(value: T) => {
  const { threadIndex, toolCallIndex, thread } = internal.useThreadState();
  const componentId = internal.useComponentId();
  const hookIndex = internal.useHookIndex();

  const cache = getCache<T>(thread, componentId, hookIndex);

  const index = `${threadIndex}:${toolCallIndex}` as const;

  const isLatest = !cache.has(index);

  if (isLatest) {
    cache.set(index, value);
  }

  return isLatest ? value : (cache.get(index) as T);
};

export const useSignal = <T>(
  initialValue: T | (() => T),
  options: { crossThread?: boolean } = {}
): [() => T, (value: T | ((state: T) => T)) => void] => {
  const state = useStateContext(initialValue, null, options);

  if (state.type !== "signal") {
    throw new Error("Order or number of hooks has changed.");
  }

  const value = useCache(state.signal.value);

  return [
    () => value,
    (value) => (state.signal.value = toFunction(value)(state.signal.value)),
  ];
};

export const useComputed = <T>(
  fn: () => T,
  options: { crossThread?: boolean } = {}
): (() => T) => {
  return useSignal(fn, options)[0];
};

export const useState = <T>(
  initialValue: T | (() => T)
): [T, (value: T | ((state: T) => T)) => void] => {
  const [value, setter] = useSignal(initialValue);
  return [value(), setter];
};

export const useMemo = <T>(fn: () => T, dependencies: unknown[]): T => {
  const state = useStateContext(fn, dependencies);

  if (state.type !== "manual") {
    throw new Error("Order or number of hooks has changed.");
  }

  const isFirstRun = state.manualDeps === dependencies;

  if (isFirstRun || !arraysAreEqual(state.manualDeps, dependencies)) {
    state.manualDeps = dependencies;
    state.value = fn();
  }

  return useCache(state.value);
};

export const useInput = <T = unknown>() => {
  const value = getStateContext().input as T;
  return useCache(value);
};

const toFunction = <T>(fn: T | ((state: T) => T)): ((state: T) => T) => {
  return typeof fn === "function" ? (fn as (state: T) => T) : () => fn;
};

const arraysAreEqual = (a: unknown[], b: unknown[]): boolean => {
  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }

  return true;
};
