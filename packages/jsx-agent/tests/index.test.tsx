import { it, expect } from "vitest";
import { Fragment, jsx } from "../src/jsx";
import { render, stringify } from "../src";

it("concatenates text", async () => {
  function App() {
    return ["Hello", " ", "world!"];
  }
  const output = await render(jsx(App));
  const { prompt } = stringify(output.elements);

  expect(prompt).toBe("Hello world!");
});

it("concatenates blocks with newlines", async () => {
  function App() {
    return [jsx("p", { children: "Hello" }), jsx("p", { children: "world!" })];
  }
  const output = await render(jsx(App));
  const { prompt } = stringify(output.elements);

  expect(prompt).toBe("Hello\n\nworld!");
});

it("renders `x-${string}` components", async () => {
  function App() {
    return jsx("x-message", { children: "Hello world!" });
  }
  const output = await render(jsx(App));
  const { prompt } = stringify(output.elements);

  expect(prompt).toBe(
    `
<message>
Hello world!
</message>
`.trim()
  );
});

it("renders adjacent block elements with newlines in between", async () => {
  function App() {
    return jsx(Fragment, {
      children: [
        jsx("x-message-1", { children: "Hello world!" }),
        jsx("x-message-2", { children: "Hello world!" }),
      ],
    });
  }
  const output = await render(jsx(App));
  const { prompt } = stringify(output.elements);

  expect(prompt).toBe(
    `
<message-1>
Hello world!
</message-1>

<message-2>
Hello world!
</message-2>
`.trim()
  );
});

it("encloses children elements with one newline between content and tag", async () => {
  function App() {
    return jsx("x-chat", {
      children: [
        jsx("x-message-1", { children: "Hello world!" }),
        jsx("x-message-2", { children: "Hello world!" }),
      ],
    });
  }
  const output = await render(jsx(App));
  const { prompt } = stringify(output.elements);

  expect(prompt).toBe(
    `
<chat>
<message-1>
Hello world!
</message-1>

<message-2>
Hello world!
</message-2>
</chat>
`.trim()
  );
});

it("renders mix of string and blocks as expected", async () => {
  function App() {
    return jsx(Fragment, {
      children: [
        "hello",
        1,
        jsx("x-block", { children: "x" }),
        jsx("x-block", { children: "x" }),
        "world",
        2,
        jsx("p", { children: "x" }),
        3,
      ],
    });
  }
  const output = await render(jsx(App));
  const { prompt } = stringify(output.elements);

  expect(prompt).toBe(
    `
hello1

<block>
x
</block>

<block>
x
</block>

world2

x

3
`.trim()
  );
});
