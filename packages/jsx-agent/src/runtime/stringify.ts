import type {
  ResolvedElement,
  ResolvedFunctionElement,
  ResolvedIntrinsicElement,
  ResolvedNode,
} from "./render";

type StringifyContext = {
  actionIdPath: string[];
  system: StringOutput[];
};

type StringOutput =
  | {
      type: "inline" | "block" | "block-left" | "block-right";
      value: string;
    }
  | {
      type: null;
    };

export function stringify(value: ResolvedElement) {
  const system: StringOutput[] = [];

  const result = stringifyElement(value, {
    actionIdPath: [],
    system,
  });

  return {
    prompt: result.type === null ? "" : result.value,
    system: join(system, 2),
  };
}

function joinBlocks(
  value: { type: "block"; value: string }[],
  gap: number = 2
) {
  return value.map((el) => el.value).join("\n".repeat(gap));
}

function join(value: StringOutput[], gap: number = 2) {
  return joinBlocks(getBlocks(value), gap);
}

/**
 * This function merges strings into one string where information about
 * the "openness" of its edges is kept.
 */
function reduce(
  value: StringOutput[],
  gap: number = 2
): Exclude<StringOutput, { type: null }> {
  let string = ``;

  let isBlockLeft = false;
  let isBlockRight = false;

  let previousIsBlock = false;
  let i = 0;

  const separator = "\n".repeat(gap);

  for (let el of value) {
    if (el.type === null) {
      continue;
    }

    if (i === 0) {
      string += separator;
      isBlockLeft = el.type === "block" || el.type === "block-left";
      previousIsBlock = el.type === "block" || el.type === "block-right";
    } else if (
      el.type === "block" ||
      el.type === "block-left" ||
      previousIsBlock
    ) {
      string += separator;
    }

    string += el.value;
    previousIsBlock = el.type === "block" || el.type === "block-right";
    i++;
  }
  isBlockRight = previousIsBlock;

  return {
    type:
      isBlockLeft && isBlockRight
        ? "block"
        : isBlockLeft
        ? "block-left"
        : isBlockRight
        ? "block-right"
        : "inline",
    value: string.trim(),
  };
}

/**
 * This function merges strings into blocks. It is only intended to be used within a block
 * since information about the "openness" of the edges is lost.
 */
function getBlocks(value: StringOutput[]) {
  const blocks: {
    type: "block";
    value: string;
  }[] = [
    {
      type: "block",
      value: "",
    },
  ];

  let previousIsBlock = false;
  let i = 0;

  for (let el of value) {
    if (el.type === null) {
      continue;
    }

    if (
      i !== 0 &&
      (el.type === "block" || el.type === "block-left" || previousIsBlock)
    ) {
      blocks.push({
        type: "block",
        value: "",
      });
    }

    blocks[blocks.length - 1].value += el.value;
    previousIsBlock = el.type === "block" || el.type === "block-right";
    i++;
  }

  return blocks;
}

function stringifyNodeOutput(
  value: ResolvedNode,
  context: StringifyContext
): StringOutput[] {
  if (Array.isArray(value)) {
    let strings: StringOutput[] = [];
    for (let node of value) {
      strings.push(...stringifyNodeOutput(node, context));
    }
    return strings;
  }
  if (typeof value === "object") {
    return [stringifyElement(value, context)];
  }
  return [{ type: "inline", value }];
}

function stringifyElement(
  node_: ResolvedElement,
  context: StringifyContext
): StringOutput {
  if (typeof node_.type === "function") {
    const node = node_ as ResolvedFunctionElement;
    return reduce(stringifyNodeOutput(node._resolved, context));
  }
  const node = node_ as ResolvedIntrinsicElement;

  if (node.type === "system") {
    context.system.push(...stringifyNodeOutput(node._resolved, context));
    return {
      type: null,
    };
  }

  if (node.type === "a") {
    const children = stringifyNodeOutput(node._resolved, context);
    return {
      type: "inline",
      value: `[${node._props.href}](${join(children, 0)})`,
    };
  }

  if (node.type === "br") {
    return {
      type: "inline",
      value: `\n`,
    };
  }

  if (node.type.startsWith("x-")) {
    const { children: _, tag, ...rest } = node._props;

    let attributes = [];
    for (let [key, value] of Object.entries(rest)) {
      if (key === "id") {
        attributes.push(`${key}="${value}"`);
      }
      if (key.startsWith("x-")) {
        attributes.push(`${key.slice(2)}="${value}"`);
      }
    }

    const tagName = tag ?? node.type.slice(2);

    const tagify = (el?: string) =>
      `<${[tagName, ...attributes].join(" ")}>${
        el ? `\n${el}\n` : ""
      }</${tagName}>`;

    const nextPath = [
      ...context.actionIdPath,
      [tagName, node._props.id].filter(Boolean).join("#"),
    ];

    const children = stringifyNodeOutput(node._resolved, {
      ...context,
      actionIdPath: nextPath,
    });

    return {
      type: "block",
      value: tagify(join(children)),
    };
  }

  if (node.type === "p" || node.type === "li") {
    const children = stringifyNodeOutput(node._resolved, context);

    return {
      type: "block",
      value: join(children, 2),
    };
  }

  if (node.type === "ul") {
    const children = stringifyNodeOutput(node._resolved, context);
    const blocks = getBlocks(children);

    return {
      type: "block",
      value: joinBlocks(
        blocks.map((el, index) => {
          return stringifyListElement(el, { string: "-", pattern: "-" });
        }),
        1
      ),
    };
  }

  if (node.type === "ol") {
    const children = stringifyNodeOutput(node._resolved, context);
    const blocks = getBlocks(children);

    return {
      type: "block",
      value: joinBlocks(
        blocks.map((el, index) => {
          return stringifyListElement(el, {
            string: `${index + 1}.`,
            pattern: "\\d+\\.",
          });
        }),
        1
      ),
    };
  }

  if (node.type === "div") {
    const children = stringifyNodeOutput(node._resolved, context);

    const gap = node._props.gap || 2;
    return {
      type: "block",
      value: join(children, gap),
    };
  }

  if (node.type === "action") {
    if (node._props.render !== true) {
      return {
        type: null,
      };
    }
    return {
      type: "block",
      value: `<related-action name="${node._props.action.name}">\n${node._props.action.description}\n</related-action>`,
    };
  }

  throw new Error("Unknown type");
}

function stringifyListElement(
  el: { type: "block"; value: string },
  bullet: {
    string: string;
    pattern: string;
  }
) {
  let value = el.value;
  const startsWithChildren = value.match(new RegExp(`^${bullet.pattern} `));
  if (startsWithChildren) {
    value = `${bullet.string} \n` + value;
  } else {
    value = `${bullet.string} ` + value;
  }
  return {
    type: "block" as const,
    value: value
      .replace(new RegExp(`\n+(${bullet.pattern}) `, "g"), `\n$1 `) // make sure a nested list is adjacent to preceding block
      .replace(new RegExp("(\n*)\n", "g"), "$1\n    "), // make sure that nested blocks remains indented
  };
}
