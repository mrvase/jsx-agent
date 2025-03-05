import { AsyncLocalStorage } from "node:async_hooks";
import { Reactive, reactive } from "@reactively/core";

export type ComponentId = string;
export type ThreadIndex = number;
export type ToolCallIndex = number;
export type HookIndex = number;
export type ThreadName = string;
export type Value = unknown;
export type CacheKey = `${ThreadIndex}:${ToolCallIndex}`;

type State<T = Value> =
  | { type: "manual"; value: T; manualDeps: unknown[] }
  | { type: "signal"; signal: Reactive<T> };

type StateMap = Map<ThreadName | null, Map<ComponentId, Map<HookIndex, State>>>;
type CacheMap = Map<
  ThreadName,
  Map<ComponentId, Map<HookIndex, Map<CacheKey, Value>>>
>;

const context = new AsyncLocalStorage();

type StateContext = {
  store: StateMap;
  cache: CacheMap;
  input: unknown;
};

export const createStateContext = (): StateContext => {
  return {
    store: new Map(),
    cache: new Map(),
    input: null,
  } as StateContext;
};

export const getStateContext = (): StateContext => {
  return context.getStore() as StateContext;
};

export const setStateContext = <T>(value: StateContext, func: () => T) => {
  return context.run(value, func);
};

export const getState = <T>(
  initialValue: T | (() => T),
  manualDeps: unknown[] | null,
  source: {
    threadName: ThreadName | null;
    componentId: ComponentId;
    hookIndex: HookIndex;
  }
) => {
  const stateMap = getStateContext().store;

  let componentMap = stateMap.get(source.threadName);
  if (!componentMap) {
    componentMap = new Map();
    stateMap.set(source.threadName, componentMap);
  }
  let hookMap = componentMap.get(source.componentId);
  if (!hookMap) {
    hookMap = new Map();
    componentMap.set(source.componentId, hookMap);
  }
  let state = hookMap.get(source.hookIndex);
  if (!state) {
    state = manualDeps
      ? { type: "manual", value: initialValue, manualDeps }
      : {
          type: "signal",
          signal: reactive<Value>(initialValue),
        };
    hookMap.set(source.hookIndex, state);
  }
  return state as State<T>;
};

export const getCache = <T>(
  theadName: ThreadName,
  componentId: ComponentId,
  hookIndex: HookIndex
) => {
  const cacheMap = getStateContext().cache;

  let componentMap = cacheMap.get(theadName);
  if (!componentMap) {
    componentMap = new Map();
    cacheMap.set(theadName, componentMap);
  }
  let hookMap = componentMap.get(componentId);
  if (!hookMap) {
    hookMap = new Map();
    componentMap.set(componentId, hookMap);
  }
  let cache = hookMap.get(hookIndex);
  if (!cache) {
    cache = new Map();
    hookMap.set(hookIndex, cache);
  }
  return cache;
};
