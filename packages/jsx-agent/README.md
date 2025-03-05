# JSX Agent

**JSX Agent** lets you build AI agents with **stateful and reactive JSX components**. Inspired by React, it lets you focus on designing the agent's behavior declaratively, without worrying about the underlying execution.

Here's how it works:

1. You define prompts as a function of state with JSX
2. The LLM updates state through "event handlers"
3. The next message automatically renders based on updated state

> 🚧 **Work in Progress:** This library is still in its early stages. Expect breaking changes. Contributions and feedback are welcome!

## Getting started

```shell
npm install jsx-agent
```

Install [AI SDK](https://www.npmjs.com/package/ai) as well for easy integration with LLMs:

```shell
npm install ai
```

Next, in your `tsconfig.json`, specify the jsx import source:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "jsx-agent"
  }
}
```

## Build an LLM interface

Let's build a simple **number guessing game** using JSX Agent.

The AI will guess a number between 1 and 100, and we'll use state to track its attempts.

```tsx
import { Action, SystemPrompt, terminate, useState } from "jsx-agent";
import { z } from "zod";

type Input = {
  number: number;
};

export function NumberGame() {
  // the number AI has to guess is provided as input when running the agent
  const { number } = useInput<Input>();
  const [guess, setGuess] = useState<number | null>(null);

  const text = !guess
    ? "Guess a number"
    : guess < number
    ? `Your guess is lower than the number`
    : `Your guess is higher than the number`;

  return (
    <>
      {/* Provide AI with system prompt */}
      <SystemPrompt>
        You are supposed to guess a number between 1 and 100. Good luck!
      </SystemPrompt>

      {/* Display AI's guess in JSX */}
      <x-guess>{text}</x-guess>

      {/* AI can trigger this action to submit a new guess */}
      <Action
        name="guessANumber"
        description="Pick a number that is your next guess"
        parameters={z.object({ number: z.number() })}
        execute={({ number: nextGuess }) => {
          if (nextGuess === number) {
            terminate();
            setGuess(null);
          } else {
            setGuess(nextGuess);
          }
        }}
      />
    </>
  );
}
```

The content of `SystemPrompt` will automatically be hoisted to the system prompt, similarly to the behavior of `Head` in React. The `Action` element becomes a tool that the LLM can make use of.

The `x-guess` element becomes part of the current user prompt and compiles to

```
<guess>
Guess a number
</guess>
```

When the AI submits a guess, the state updates, and a new prompt is rendered reflecting the AI's response:

```
<guess>
Your guess is higher than the number
</guess>
```

To run it, simply create an agent with `createAgent` and a model from [AI SDK](https://www.npmjs.com/package/ai):

```tsx
import { createAgent } from "jsx-agent";
import { openai } from "@ai-sdk/openai";

const agent = createAgent<Input>({
  prompt: <NumberGame />,
  model: openai("gpt-4o"),
  maxSteps: 20,
});

// the argument provided here is picked up by `useInput`
await agent.run({ number: 34 });
```

When the agent terminates, you can call `agent.run` again with a new number. It will continue from where it left off and render the next message using the new input from the `useInput` hook.

## Async Resources

Your JSX components can be asynchronous, which makes it easy to integrate your app with APIs or the file system:

```tsx
async function Directory() {
  const files = await getFilePaths();

  return (
    <x-files>
      {files.map((path) => (
        <x-file>{path}</x-file>
      ))}
    </x-files>
  );
}

async function FileContent({ path }: { path: string }) {
  const content = await readFile(path);

  return (
    <>
      <x-file-path>{path}</x-file-path>
      <x-file-content>{content}</x-file-content>
    </>
  );
}
```

These can then be consumed like ordinary JSX components (see next section).

## Routing

With stateful components you can easily build an LLM interface that the LLM can navigate through to obtain a specific goal.

We can use the file components from above to create a simple application that lets the LLM navigate through files in a directory.

```tsx
import { Action, SystemPrompt, terminate, useState } from "jsx-agent";
import { z } from "zod";

async function FileSearchApp({ request }: { request: string }) {
  const [path, setPath] = useState<string | null>(null);

  return (
    <>
      <SystemPrompt>
        You are a file assistant. Your goal is to help find the file that best
        matches the user's request. Navigate the directory, open relevant files,
        and identify the correct one based on its contents. Once you find the
        correct file, report its path. The user's request: {request}
      </SystemPrompt>
      {path ? <FileContent path={path} /> : <Directory />}
      <Action
        name="openFile"
        description="Open the file"
        parameters={z.object({ path: z.string() })}
        execute={({ path }) => {
          setPath(path);
        }}
      />
      <Action
        name="returnFilePath"
        description="Respond with the path of the correct file"
        parameters={z.object({ path: z.string() })}
        execute={({ path }) => {
          terminate(path);
        }}
      />
    </>
  );
}
```

Note that the `terminate` function takes an argument. This will be the return value of `agent.run()`:

```tsx
const agent = createAgent<string>({
  prompt: <FileSearchApp request="..." />,
  model: openai("gpt-4o"),
});

const filePath = await agent.run();
```
