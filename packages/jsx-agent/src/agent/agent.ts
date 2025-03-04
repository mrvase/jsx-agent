import type { CoreMessage } from "ai";
import { mapMessages } from "./thread/mappers";
import { generateThread, type Thread } from "./thread/generate-thread";
import type { AssistantResponseGenerator } from "./generator";
import type { PromptJSX } from "../jsx";
import { createStateContext, setStateContext } from "../state/state-context";

const getState = (threads: Map<string, Thread>) => {
  return Array.from(threads.values()).map((thread) => ({
    name: thread.name,
    messages: mapMessages(thread.messages),
  }));
};

export async function createAgent({
  prompt,
  generator,
  limit = 20,
  onStep,
}: {
  prompt: PromptJSX.Element;
  generator: AssistantResponseGenerator;
  limit?: number;
  onStep?: (
    cb: {
      name: string;
      messages: CoreMessage[];
    }[]
  ) => Promise<void> | void;
}) {
  const stateContext = createStateContext();

  const initialThread: Thread = {
    name: "main",
    messages: [],
  };

  const threads = new Map<string, Thread>();
  threads.set(initialThread.name, initialThread);

  let currentThread = initialThread;
  let i = 0;

  const run = async () => {
    while (true) {
      const {
        messages,
        nextThread: nextThreadName,
        terminated,
      } = await setStateContext(stateContext, () =>
        generateThread({ prompt, generator }, currentThread)
      );

      currentThread.messages = messages;

      if (terminated) {
        break;
      }

      let nextThread = threads.get(nextThreadName);
      if (!nextThread) {
        nextThread = {
          name: nextThreadName,
          messages: [],
        };
        threads.set(nextThreadName, nextThread);
      }

      currentThread = nextThread;

      await onStep?.(getState(threads));

      if (i++ >= limit) {
        break;
      }
    }

    return getState(threads);
  };

  return { run };
}
