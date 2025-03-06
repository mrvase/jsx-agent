import { it, expect } from "vitest";
import { Fragment, jsx } from "../src/jsx";
import { render, stringify } from "../src";

it("concatenates text", async () => {
  function App() {
    return ["Hello", " ", "world!"];
  }
  const output = await render(jsx(App));
  const { prompt } = stringify(output.element);

  expect(prompt).toBe("Hello world!");
});

it("concatenates blocks with newlines", async () => {
  function App() {
    return [jsx("p", { children: "Hello" }), jsx("p", { children: "world!" })];
  }
  const output = await render(jsx(App));
  const { prompt } = stringify(output.element);

  expect(prompt).toBe("Hello\n\nworld!");
});

it("renders `x-${string}` components", async () => {
  function App() {
    return jsx("x-message", { children: "Hello world!" });
  }
  const output = await render(jsx(App));
  const { prompt } = stringify(output.element);

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
  const { prompt } = stringify(output.element);

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
  const { prompt } = stringify(output.element);

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
  const { prompt } = stringify(output.element);

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

it("renders open-ended components correctly", async () => {
  function OpenLeft() {
    return ["-open", jsx("p", { children: "block" })];
  }
  function OpenRight() {
    return [jsx("p", { children: "block" }), "open-"];
  }

  function App() {
    return jsx(Fragment, {
      children: [
        jsx(OpenLeft),
        "hello",
        jsx(OpenLeft),
        "hello",
        jsx(OpenRight),
        "hello",
        jsx(OpenRight),
      ],
    });
  }
  const output = await render(jsx(App));
  const { prompt } = stringify(output.element);

  expect(prompt).toBe(
    `
-open

block

hello-open

block

hello

block

open-hello

block

open-
`.trim()
  );
});

it("renders list correctly", async () => {
  function App() {
    return jsx("ul", {
      children: [
        jsx("li", { children: "point 1" }),
        jsx("li", { children: "point 2" }),
        jsx("li", {
          children: [
            "point 3",
            jsx("ul", {
              children: [
                jsx("li", { children: "point 3.1" }),
                jsx("li", {
                  children: [
                    "point 3.2",
                    jsx("ul", {
                      children: [
                        jsx("li", { children: "point 3.2.1" }),
                        jsx("li", { children: ["point 3.2.2"] }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),

        jsx("li", {
          children: [
            jsx("ul", {
              children: [
                jsx("li", { children: "point 4.1" }),
                jsx("li", { children: "point 4.2" }),
              ],
            }),
          ],
        }),
        jsx("li", { children: ["point 5", jsx("br"), "hello"] }),
        jsx("li", { children: ["point 6", jsx("p", { children: "hello" })] }),
      ],
    });
  }
  const output = await render(jsx(App));
  const { prompt } = stringify(output.element);

  expect(prompt).toBe(
    `
- point 1
- point 2
- point 3
    - point 3.1
    - point 3.2
        - point 3.2.1
        - point 3.2.2
- 
    - point 4.1
    - point 4.2
- point 5
    hello
- point 6

    hello
`.trim()
  );
});

it("renders ordered list correctly", async () => {
  function App() {
    return jsx("ol", {
      children: [
        jsx("li", { children: "point 1" }),
        jsx("li", { children: "point 2" }),
        jsx("li", {
          children: [
            "point 3",
            jsx("ol", {
              children: [
                jsx("li", { children: "point 3.1" }),
                jsx("li", {
                  children: [
                    "point 3.2",
                    jsx("ol", {
                      children: [
                        jsx("li", { children: "point 3.2.1" }),
                        jsx("li", { children: ["point 3.2.2"] }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),

        jsx("li", {
          children: [
            jsx("ol", {
              children: [
                jsx("li", { children: "point 4.1" }),
                jsx("li", { children: "point 4.2" }),
              ],
            }),
          ],
        }),
        jsx("li", { children: ["point 5", jsx("br"), "hello"] }),
        jsx("li", { children: ["point 6", jsx("p", { children: "hello" })] }),
        jsx("li", { children: ["point 7"] }),
      ],
    });
  }
  const output = await render(jsx(App));
  const { prompt } = stringify(output.element);

  expect(prompt).toBe(
    `
1. point 1
2. point 2
3. point 3
    1. point 3.1
    2. point 3.2
        1. point 3.2.1
        2. point 3.2.2
4. 
    1. point 4.1
    2. point 4.2
5. point 5
    hello
6. point 6

    hello
7. point 7
`.trim()
  );
});
