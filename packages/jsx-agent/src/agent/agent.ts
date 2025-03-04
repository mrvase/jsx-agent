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

type JsxAgent<T> = {
  run: () => Promise<T | undefined>;
};

type BaseJsxAgentOptions = {
  prompt: PromptJSX.Element;
  maxSteps?: number;
  onStep?: (cb: Record<string, CoreMessage[]>) => Promise<void> | void;
};

type JsxAgentOptions =
  | (BaseJsxAgentOptions & {
      model: LanguageModelV1;
      settings?: CallSettings;
    })
  | (BaseJsxAgentOptions & {
      generator: AssistantResponseGenerator;
    });

export function createAgent<TResponse>(
  options: JsxAgentOptions
): JsxAgent<TResponse> {
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
      const result = await setStateContext(stateContext, () =>
        generateThread({ prompt: options.prompt, generator }, currentThread)
      );

      console.log("RUN", result);

      currentThread.messages = result.messages;

      await options.onStep?.(getThreadRecord(threads));

      if (result.action === "terminate") {
        return result.response as TResponse | undefined;
      }

      if (result.action === "redirect") {
        let nextThread = threads.get(result.thread);
        if (!nextThread) {
          nextThread = {
            name: result.thread,
            messages: [],
          };
          threads.set(result.thread, nextThread);
        }

        currentThread = nextThread;
      }

      if (options.maxSteps && ++i >= options.maxSteps) {
        break;
      }
    }
  };

  return { run };
}

function getThreadRecord(threads: Map<string, Thread>) {
  return Object.fromEntries(
    Array.from(threads.values()).map((thread) => [
      thread.name,
      mapMessages(thread.messages),
    ])
  );
}
