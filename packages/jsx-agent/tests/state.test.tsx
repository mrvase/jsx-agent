import { it, expect } from "vitest";
import { Fragment, jsx, type PromptJSX } from "../src/jsx";
import { render, stringify, useState, type ResolvedElement } from "../src";

it("caches state", async () => {
  function App() {
    const [state] = useState("hello");

    return [state];
  }

  const output1 = await render(jsx(App));

  const element1 = output1.element as Exclude<
    ResolvedElement,
    { type: string }
  >;

  expect(element1._state?.state.length).toBe(1);
  expect(element1._state?.cached.length).toBe(1);
  expect(element1._state?.cached[0]).toBe("hello");

  const state = element1._state?.state[0];

  if (state?.type === "signal") {
    state.signal.set("world");
  }

  const output2 = await output1.rerender();
  const element2 = output2.element as Exclude<
    ResolvedElement,
    { type: string }
  >;

  expect(element2._state?.state.length).toBe(1);
  expect(element2._state?.cached.length).toBe(1);
  expect(element2._state?.cached[0]).toBe("world");
});

it("handles state deeply nested in tree", async () => {
  function Noop({ children }: { children?: PromptJSX.Node }) {
    return children;
  }

  let setter: (value: string) => void = () => {};

  function App() {
    const [state, setState] = useState("hello");
    setter = setState;
    return state;
  }

  const output1 = await render(
    jsx(Noop, { children: jsx(Noop, { children: [jsx(App)] }) })
  );
  expect(stringify(output1.element).prompt).toBe("hello");

  setter?.("world");

  const output2 = await output1.rerender();
  expect(stringify(output2.element).prompt).toBe("world");
});

it("does not preserve state for displaced element without key", async () => {
  function Noop({ children }: { children?: PromptJSX.Node }) {
    return jsx("div", { children });
  }

  let stateSetter: ((value: string) => void) | undefined = () => {};

  function App() {
    const [state, setState] = useState("hello");
    stateSetter = setState;
    return state;
  }

  let isSwitchedSetter: (value: boolean) => void = () => {};

  function Switcher() {
    const [isSwitched, setIsSwitched] = useState(false);
    isSwitchedSetter = setIsSwitched;

    return jsx(Fragment, {
      children: isSwitched ? [jsx("div"), jsx(App)] : [jsx(App), jsx("div")],
    });
  }

  const output1 = await render(jsx(Noop, { children: jsx(Switcher) }));
  expect(stringify(output1.element).prompt).toBe("hello");

  stateSetter?.("world");
  isSwitchedSetter?.(true);

  const output2 = await output1.rerender();
  expect(stringify(output2.element).prompt).toBe("hello");
});

it("preserves state for displaced element with key", async () => {
  function Noop({ children }: { children?: PromptJSX.Node }) {
    return jsx("div", { children });
  }

  let stateSetter: (value: string) => void = () => {};

  function App() {
    const [state, setState] = useState("hello");
    stateSetter = setState;
    return state;
  }

  let isSwitchedSetter: (value: boolean) => void = () => {};

  function Switcher() {
    const [isSwitched, setIsSwitched] = useState(false);
    isSwitchedSetter = setIsSwitched;

    return jsx(Fragment, {
      children: isSwitched
        ? [jsx("div"), jsx(App, undefined, "test")]
        : [jsx(App, undefined, "test"), jsx("div")],
    });
  }

  const output1 = await render(jsx(Noop, { children: jsx(Switcher) }));
  expect(stringify(output1.element).prompt).toBe("hello");

  stateSetter?.("world");
  isSwitchedSetter?.(true);

  const output2 = await output1.rerender();
  expect(stringify(output2.element).prompt).toBe("world");
});
