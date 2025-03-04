import {
  type LanguageModelV1,
  generateText,
  type CoreAssistantMessage,
  type CoreMessage,
} from "ai";
import { mapMessages } from "./thread/mappers";
import { generateThread, type Thread } from "./thread/generate-thread";
import {
  createDefaultGenerator,
  type AssistantResponseGenerator,
  type CallSettings,
} from "./generator";
import type { PromptJSX } from "../jsx";
import { createStateContext, setStateContext } from "../state/state-context";

const getThreadRecord = (threads: Map<string, Thread>) => {
  return Object.fromEntries(
    Array.from(threads.values()).map((thread) => [
      thread.name,
      mapMessages(thread.messages),
    ])
  );
};

type BaseOptions = {
  prompt: PromptJSX.Element;
  maxSteps?: number;
  onStep?: (cb: Record<string, CoreMessage[]>) => Promise<void> | void;
};

export async function createAgent(
  options:
    | (BaseOptions & {
        model: LanguageModelV1;
        settings?: CallSettings;
      })
    | (BaseOptions & {
        generator: AssistantResponseGenerator;
      })
) {
  const generator =
    "generator" in options
      ? options.generator
      : createDefaultGenerator(options);

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
        generateThread({ prompt: options.prompt, generator }, currentThread)
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

      await options.onStep?.(getThreadRecord(threads));

      if (options.maxSteps && ++i >= options.maxSteps) {
        break;
      }
    }
  };

  return { run };
}
