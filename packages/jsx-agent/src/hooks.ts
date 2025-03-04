import { internal } from "./context/internal";

export const useThread = (): [string, (value: string) => void] => {
  const state = internal.useThreadState();
  return [
    state.thread,
    (newThread: string) => {
      const actionContext = internal.useActionContext();
      return (actionContext.nextThread = newThread);
    },
  ];
};

export const terminate = () => {
  const state = internal.useActionContext();
  state.terminated = true;
};
