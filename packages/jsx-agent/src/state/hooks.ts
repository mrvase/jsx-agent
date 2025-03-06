import { reactive } from "@reactively/core";
import { internal, type State } from "../context/internal";
import { getRunningContext } from "../context/running-context";

const useStateContext = <T>(
  hookIndex: number,
  fn: T | (() => T),
  manualDeps: unknown[] | null = null
) => {
  const comp = internal.useComponentState();

  let state = comp.state[hookIndex] as State<T>;
  if (!state) {
    state = manualDeps
      ? { type: "manual", value: toFunction(fn)(undefined), manualDeps }
      : {
          type: "signal",
          signal: reactive<T>(fn),
        };
    comp.state[hookIndex] = state as State<unknown>;
  }

  return state;
};

export const useCacheContext = <T>(hookIndex: number, value: T) => {
  const comp = internal.useComponentState();

  let cache = comp.cached[hookIndex] as T;

  if (!(hookIndex in comp.cached)) {
    cache = value;
    comp.cached[hookIndex] = cache;
  }

  return cache;
};

export const useSignal = <T>(
  initialValue: T | (() => T)
): [() => T, (value: T | ((state: T) => T)) => void] => {
  const hookIndex = internal.useHookIndex();
  const state = useStateContext(hookIndex, initialValue, null);

  if (state.type !== "signal") {
    throw new Error("Order or number of hooks has changed.");
  }

  const value = useCacheContext(hookIndex, state.signal.value);

  return [
    () => value,
    (value) => (state.signal.value = toFunction(value)(state.signal.value)),
  ];
};

export const useComputed = <T>(fn: () => T): (() => T) => {
  return useSignal(fn)[0];
};

export const useState = <T>(
  initialValue: T | (() => T)
): [T, (value: T | ((state: T) => T)) => void] => {
  const [value, setter] = useSignal(initialValue);
  return [value(), setter];
};

export const useMemo = <T>(fn: () => T, dependencies: unknown[]): T => {
  const hookIndex = internal.useHookIndex();
  const state = useStateContext(hookIndex, fn, dependencies);

  if (state.type !== "manual") {
    throw new Error("Order or number of hooks has changed.");
  }

  if (!arraysAreEqual(state.manualDeps, dependencies)) {
    state.manualDeps = dependencies;
    state.value = fn();
  }

  return useCacheContext(hookIndex, state.value);
};

export const useInput = <T = unknown>() => {
  const hookIndex = internal.useHookIndex();
  const value = getRunningContext().input as T;
  return useCacheContext(hookIndex, value);
};

const toFunction = <T, U>(fn: T | ((state: U) => T)): ((state: U) => T) => {
  return typeof fn === "function" ? (fn as (state: U) => T) : () => fn;
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
