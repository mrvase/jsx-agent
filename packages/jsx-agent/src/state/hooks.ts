import { internal } from "../context/internal";
import { getCache, getState } from "./state-context";

const useStateContext = <T>(
  fn: T | (() => T),
  manualDeps: unknown[] | null = null,
  options: { crossThread?: boolean } = {}
) => {
  const { threadIndex: index, thread, latest } = internal.useThreadState();
  const componentId = internal.useComponentId();
  const hookIndex = internal.useHookIndex();

  const state = getState<T>(fn, manualDeps, {
    threadName: options.crossThread ? null : thread,
    componentId,
    hookIndex,
  });

  const cache = getCache<T>(thread, componentId, hookIndex);

  return {
    state,
    cache,
    index,
  };
};

export const useSignal = <T>(
  initialValue: T | (() => T),
  options: { crossThread?: boolean } = {}
): [() => T, (value: T | ((state: T) => T)) => void] => {
  const { state, cache, index } = useStateContext(initialValue, null, options);

  if (state.type !== "signal") {
    throw new Error("Order or number of hooks has changed.");
  }

  const isLatest = !cache.has(index);

  if (isLatest) {
    cache.set(index, state.signal.value);
  }

  return [
    () => (isLatest ? state.signal.value : (cache.get(index) as T)),
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

export const useMemo = <T>(
  fn: () => T,
  dependencies: unknown[]
): [T, (value: T | ((state: T) => T)) => void] => {
  const { state, cache, index } = useStateContext(fn, dependencies);

  if (state.type !== "manual") {
    throw new Error("Order or number of hooks has changed.");
  }

  if (!arraysAreEqual(state.manualDeps, dependencies)) {
    state.manualDeps = dependencies;
    state.value = fn();
  }

  const isLatest = !cache.has(index);

  if (isLatest) {
    cache.set(index, state.value);
  }

  return [
    isLatest ? state.value : (cache.get(index) as T),
    (value) => toFunction(value)(state.value),
  ];
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
