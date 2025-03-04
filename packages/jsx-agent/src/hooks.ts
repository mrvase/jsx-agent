import { internal } from "./context/internal";

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

export const terminate = (response?: unknown) => {
  const state = internal.useActionContext();
  state.current = {
    action: "terminate",
    response,
  };
};
