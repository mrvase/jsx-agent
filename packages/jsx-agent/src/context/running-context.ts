import { AsyncLocalStorage } from "node:async_hooks";

const context = new AsyncLocalStorage();

type RunningContext = {
  input: unknown;
};

export const createRunningContext = (): RunningContext => {
  return {
    input: null,
  };
};

export const getRunningContext = (): RunningContext => {
  return context.getStore() as RunningContext;
};

export const setRunningContext = <T>(value: RunningContext, func: () => T) => {
  return context.run(value, func);
};
