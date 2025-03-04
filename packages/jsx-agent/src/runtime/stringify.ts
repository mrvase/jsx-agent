import type { PromptJSX } from "../jsx";

type ResolvedElement = Extract<PromptJSX.Element, { type: string }>;

type StringifyContext = {
  actionIdPath: string[];
  system: string[];
  actions: string[];
};

export function stringify(value: (string | ResolvedElement)[]) {
  const system: string[] = [];
  const actions: string[] = [];

  const result = stringifyArrayWithBlockJoin(value, {
    actionIdPath: [],
    system,
    actions,
  });

  return {
    prompt: result,
    system: join(system, "\n\n"),
    actions,
  };
}

function join(strings: string[], separator: string = ""): string {
  return strings
    .filter((el) => typeof el === "number" || Boolean(el))
    .join(separator);
}

function stringifyElement(
  value: ResolvedElement,
  context: StringifyContext
): string[] {
  const { type, props } = value;

  if (type === "system") {
    context.system.push(...stringifyArray(props.children, context));
    return [];
  }

  if (type === "a") {
    return [
      `[${props.href}](${join(stringifyArray(props.children, context))})`,
    ];
  }

  if (type === "br") {
    return [`\n`];
  }

  if (type.startsWith("x-")) {
    const { children, tag, ...rest } = props;

    let attributes = [];
    for (let [key, value] of Object.entries(rest)) {
      if (key === "id") {
        attributes.push(`${key}="${value}"`);
      }
      if (key.startsWith("x-")) {
        attributes.push(`${key.slice(2)}="${value}"`);
      }
    }

    const tagName = tag ?? type.slice(2);

    const tagify = (el?: string) =>
      `<${[tagName, ...attributes].join(" ")}>${
        el ? `\n${el}\n` : ""
      }</${tagName}>`;

    const nextPath = [
      ...context.actionIdPath,
      [tagName, props.id].filter(Boolean).join("#"),
    ];

    const normalizedChildren = stringifyArrayWithBlockJoin(children, {
      ...context,
      actionIdPath: nextPath,
    });

    return [tagify(normalizedChildren)];
  }

  if (type === "p" || type === "li") {
    return [join(stringifyArray(props.children, context))];
  }

  if (type === "ul") {
    const children = stringifyArray(props.children, context);
    return [
      children
        .map((el: string) => (el.match(/^\s*\-\s/) ? `  ${el}` : `- ${el}`))
        .join("\n"),
    ];
  }

  if (type === "ol") {
    const children = stringifyArray(props.children, context);
    return [
      children
        .map((el: string, index: number) => `${index + 1}. ${el}`)
        .join("\n"),
    ];
  }

  if (type === "div") {
    return [
      stringifyArrayWithBlockJoin(props.children, context, props.gap || 2),
    ];
  }

  if (type === "action") {
    context.actions.push(props.action.name);
    if (props.render !== true) {
      return [];
    }
    return [
      `<related-action name="${props.action.name}">\n${props.action.description}\n</related-action>`,
    ];
  }

  throw new Error("Unknown type");
}

function stringifyArray(
  value: (string | ResolvedElement)[],
  context: StringifyContext
): string[] {
  return value
    .map((el) => (typeof el === "string" ? el : stringifyElement(el, context)))
    .flat(1);
}

const blockElements = ["p", "li"];

const isBlockElement = (el: ResolvedElement) =>
  blockElements.includes(el.type) || el.type.startsWith("x-");

function stringifyArrayWithBlockJoin(
  value: (string | ResolvedElement)[],
  context: StringifyContext,
  gap: number = 2
): string {
  let string = ``;

  let previousIsBlock = false;
  let i = 0;

  const separator = "\n".repeat(gap);

  for (let el of value) {
    if (typeof el === "string") {
      string += previousIsBlock ? separator : "";
      string += el;

      previousIsBlock = false;
    } else {
      const elementIsBlock: boolean = isBlockElement(el);

      string += (previousIsBlock || elementIsBlock) && i > 0 ? separator : "";
      string += stringifyElement(el, context);

      previousIsBlock = elementIsBlock;
    }
    i++;
  }

  return string;
}
