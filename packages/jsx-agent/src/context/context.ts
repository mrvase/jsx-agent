import { AsyncLocalStorage } from "node:async_hooks";
import type { PromptJSX } from "../jsx";

export const ContextSymbol = Symbol("context");

export type ContextInstance<T> = {
  value: T;
  [ContextSymbol]: true;
};

export type Context<T> = (({
  children,
  value,
}: {
  children?: PromptJSX.Node;
  value: T;
}) => PromptJSX.Node) &
  ContextInstance<T>;

export function createContextInstance<T>(value: T): ContextInstance<T> {
  return {
    [ContextSymbol]: true,
    value,
  };
}

export function createContext<T>(value: T): Context<T> {
  return Object.assign(
    ({ children }: { children?: PromptJSX.Node; value: T }) => {
      return children ?? null;
    },
    createContextInstance(value)
  );
}

type ContextMap = Omit<
  Map<ContextInstance<unknown>, unknown>,
  "get" | "set"
> & {
  get: <T>(ctx: ContextInstance<T>) => T | undefined;
  set: <T>(ctx: ContextInstance<T>, value: NoInfer<T>) => void;
};

const context = new AsyncLocalStorage();

export const createGlobalContext = (): ContextMap => {
  return new Map() as ContextMap;
};

export const getGlobalContext = (): ContextMap => {
  return context.getStore() as ContextMap;
};

export const getClonedGlobalContext = (): ContextMap => {
  return new Map(getGlobalContext()) as ContextMap;
};

export const setGlobalContext = <T>(value: ContextMap, func: () => T) => {
  return context.run(value, func);
};

export function useContext<T>(ctx: ContextInstance<T>) {
  return (getGlobalContext()?.get(ctx) as T | undefined) ?? ctx.value;
}
