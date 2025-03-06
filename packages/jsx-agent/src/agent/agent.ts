import { type LanguageModelV1, type CoreMessage } from "ai";
import { mapMessages } from "./thread/mappers";
import {
  generateThread,
  type RenderStrategy,
  type Thread,
} from "./thread/generate-thread";
import {
  createDefaultGenerator,
  type AssistantResponseGenerator,
  type CallSettings,
} from "./generator";
import type { PromptJSX } from "../jsx";
import {
  createRunningContext,
  setRunningContext,
} from "../context/running-context";
import type { VirtualMessage } from "./virtual-message";

type OptionalArg<T> = unknown extends T
  ? [arg?: unknown]
  : undefined extends T
  ? [arg?: undefined]
  : [arg: T];

type JsxAgent<TInput = unknown, TOutput = unknown> = {
  run: (...arg: OptionalArg<TInput>) => Promise<TOutput | undefined>;
};

type BaseJsxAgentOptions = {
  prompt: PromptJSX.Element;
  maxSteps?: number;
  onStep?: (
    record1: Record<string, CoreMessage[]>,
    record2: Record<string, VirtualMessage[]>
  ) => Promise<void> | void;
  /**
   * With this flag enabled, all previous messages will re-render alongside the next message.
   * This allows for optimizing token usage in previous messages. In order to avoid unnecessary
   * recomputations or re-fetches, use `useMemo` in your components.
   */
  enablePromptOptimization?: boolean;
};

type JsxAgentOptions =
  | (BaseJsxAgentOptions & {
      model: LanguageModelV1;
      settings?: CallSettings;
    })
  | (BaseJsxAgentOptions & {
      generator: AssistantResponseGenerator;
    });

export function createAgent<TInput = unknown, TOutput = unknown>(
  options: JsxAgentOptions
): JsxAgent<TInput, TOutput> {
  const generator =
    "generator" in options
      ? options.generator
      : createDefaultGenerator(options);

  const stateContext = createRunningContext();

  const initialThread: Thread = {
    name: "main",
    messages: [],
    actions: {},
  };

  const threads = new Map<string, Thread>();
  threads.set(initialThread.name, initialThread);

  let currentThread = initialThread;
  let stepIndex = 0;

  const run = async (input?: unknown) => {
    while (true) {
      const strategy: RenderStrategy = options.enablePromptOptimization
        ? {
            type: "mutable",
            startIndex: 0,
          }
        : {
            type: "static",
            actions: currentThread.actions,
          };

      const result = await setRunningContext(
        {
          ...stateContext,
          input,
        },
        () =>
          generateThread(
            { prompt: options.prompt, generator },
            currentThread,
            strategy
          )
      );

      currentThread.messages = result.messages;
      currentThread.actions = result.actions;

      await options.onStep?.(
        getThreadRecord(threads),
        getThreadVirtualRecord(threads)
      );

      if (result.action === "terminate") {
        return result.response as TOutput | undefined;
      }

      if (result.action === "redirect") {
        let nextThread = threads.get(result.thread);
        if (!nextThread) {
          nextThread = {
            name: result.thread,
            messages: [],
            actions: {},
          };
          threads.set(result.thread, nextThread);
        }

        currentThread = nextThread;
      }

      if (options.maxSteps && ++stepIndex >= options.maxSteps) {
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

function getThreadVirtualRecord(threads: Map<string, Thread>) {
  return Object.fromEntries(
    Array.from(threads.values()).map((thread) => [thread.name, thread.messages])
  );
}
