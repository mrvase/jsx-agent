import { internal } from "./context/internal";
import { useCacheContext } from "./state/hooks";

export const useThread = (): [string, (value: string) => void] => {
  const state = internal.useThreadState();
  return [
    state.thread,
    (thread: string) => {
      const actionContext = internal.useActionContext();
      return (actionContext.current = {
        action: "redirect",
        thread,
      });
    },
  ];
};

export const useCache = <T>(value: T): T => {
  const hookIndex = internal.useHookIndex();
  return useCacheContext(hookIndex, value);
};

export const terminate = (response?: unknown) => {
  const state = internal.useActionContext();
  state.current = {
    action: "terminate",
    response,
  };
};
