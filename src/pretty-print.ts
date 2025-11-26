import * as prettier from "prettier";

const { group, indent, line, softline, ifBreak } = prettier.doc.builders;

type Doc = prettier.Doc;

// ANSI color codes for terminal output
const ansiColors = {
  reset: "\x1b[0m",
  string: "\x1b[32m", // green
  number: "\x1b[33m", // yellow
  boolean: "\x1b[35m", // magenta
  null: "\x1b[90m", // gray
  key: "\x1b[36m", // cyan
  keyword: "\x1b[34m", // blue
};

function colorize(text: string, colorType: keyof typeof ansiColors): string {
  return ansiColors[colorType] + text + ansiColors.reset;
}

// ANSI to CSS color mapping for browser console
const ansiToCSS: { [key: string]: string } = {
  "0": "", // reset
  "32": "color: #22c55e", // green (strings)
  "33": "color: #eab308", // yellow (numbers)
  "34": "color: #3b82f6", // blue (keywords)
  "35": "color: #a855f7", // magenta (booleans)
  "36": "color: #06b6d4", // cyan (keys)
  "90": "color: #6b7280", // gray (null)
};

/**
 * Converts ANSI color codes to browser console %c format with CSS styles.
 */
export function prettyPrintForBrowser(
  value: unknown,
  printWidth: number = 80,
): [string, ...string[]] {
  const textWithAnsi = prettyPrintToString(value, printWidth, true);
  const ansiRegex = /\x1b\[(\d+)m/g;
  const parts: string[] = [];
  const styles: string[] = [];
  let lastIndex = 0;
  let currentStyle = "";
  let match;

  while ((match = ansiRegex.exec(textWithAnsi)) !== null) {
    const textBefore = textWithAnsi.slice(lastIndex, match.index);
    if (textBefore) {
      parts.push("%c" + textBefore);
      styles.push(currentStyle);
    }
    currentStyle = ansiToCSS[match[1]] || "";
    lastIndex = match.index + match[0].length;
  }

  const remaining = textWithAnsi.slice(lastIndex);
  if (remaining) {
    parts.push("%c" + remaining);
    styles.push(currentStyle);
  }

  return [parts.join(""), ...styles];
}

/**
 * Pretty-print a value to the browser console with colors.
 * This is the easiest way to use the pretty-printer in browser code.
 */
export function prettyLog(value: unknown, printWidth: number = 120): void {
  console.log(...prettyPrintForBrowser(value, printWidth));
}

/**
 * Pretty-print a JavaScript value using Prettier's doc builder API.
 * Returns a Doc that can be printed with prettier.printDocToString()
 */
export function prettyPrint(value: unknown, useColor: boolean = true): Doc {
  // Handle primitives
  if (value === null) return useColor ? colorize("null", "null") : "null";
  if (value === undefined)
    return useColor ? colorize("undefined", "null") : "undefined";

  if (typeof value === "string") {
    const str = JSON.stringify(value);
    return useColor ? colorize(str, "string") : str;
  }

  if (typeof value === "number") {
    const str = String(value);
    return useColor ? colorize(str, "number") : str;
  }

  if (typeof value === "boolean") {
    const str = String(value);
    return useColor ? colorize(str, "boolean") : str;
  }

  if (typeof value === "function") {
    return value.name ? `[Function: ${value.name}]` : "[Function]";
  }

  if (typeof value === "symbol") {
    return value.toString();
  }

  if (typeof value === "bigint") {
    const str = `${value}n`;
    return useColor ? colorize(str, "number") : str;
  }

  // Handle arrays
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "[]";
    }

    const elements = value.map((item) => prettyPrint(item, useColor));

    // Use commas when inline, line breaks when multi-line
    const withSeparators: Doc[] = [];
    for (let i = 0; i < elements.length; i++) {
      withSeparators.push(elements[i]);
      if (i < elements.length - 1) {
        withSeparators.push(ifBreak(line, ", "));
      }
    }

    return group(["[", indent([softline, ...withSeparators]), softline, "]"]);
  }

  // Handle objects
  if (typeof value === "object") {
    // Handle special objects
    if (value instanceof Date) {
      const keyword = useColor ? colorize("new", "keyword") : "new";
      const ctor = useColor ? colorize("Date", "keyword") : "Date";
      const str = useColor
        ? colorize(`"${value.toISOString()}"`, "string")
        : `"${value.toISOString()}"`;
      return [keyword, " ", ctor, "(", str, ")"];
    }

    if (value instanceof RegExp) {
      const str = value.toString();
      return useColor ? colorize(str, "string") : str;
    }

    if (value instanceof Map) {
      if (value.size === 0) {
        const keyword = useColor ? colorize("new", "keyword") : "new";
        const ctor = useColor ? colorize("Map", "keyword") : "Map";
        return [keyword, " ", ctor, "()"];
      }
      const keyword = useColor ? colorize("new", "keyword") : "new";
      const ctor = useColor ? colorize("Map", "keyword") : "Map";
      const entries = Array.from(value.entries()).map(([k, v]) => [
        "[",
        prettyPrint(k, useColor),
        ", ",
        prettyPrint(v, useColor),
        "]",
      ]);

      const withSeparators: Doc[] = [];
      for (let i = 0; i < entries.length; i++) {
        withSeparators.push(entries[i]);
        if (i < entries.length - 1) {
          withSeparators.push(ifBreak(line, ", "));
        }
      }

      return group([
        keyword,
        " ",
        ctor,
        "([",
        indent([softline, ...withSeparators]),
        softline,
        "])",
      ]);
    }

    if (value instanceof Set) {
      if (value.size === 0) {
        const keyword = useColor ? colorize("new", "keyword") : "new";
        const ctor = useColor ? colorize("Set", "keyword") : "Set";
        return [keyword, " ", ctor, "()"];
      }
      const keyword = useColor ? colorize("new", "keyword") : "new";
      const ctor = useColor ? colorize("Set", "keyword") : "Set";
      const items = Array.from(value).map((v) => prettyPrint(v, useColor));

      const withSeparators: Doc[] = [];
      for (let i = 0; i < items.length; i++) {
        withSeparators.push(items[i]);
        if (i < items.length - 1) {
          withSeparators.push(ifBreak(line, ", "));
        }
      }

      return group([
        keyword,
        " ",
        ctor,
        "([",
        indent([softline, ...withSeparators]),
        softline,
        "])",
      ]);
    }

    // Handle plain objects
    const entries = Object.entries(value);

    if (entries.length === 0) {
      return "{}";
    }

    // Check if object has a "type" field
    const typeEntry = entries.find(([key]) => key === "type");
    const typeValue = typeEntry?.[1];
    const remainingEntries = typeEntry
      ? entries.filter(([key]) => key !== "type")
      : entries;

    const props = remainingEntries.map(([key, val]) => {
      const keyStr = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)
        ? key
        : JSON.stringify(key);
      const coloredKey = useColor ? colorize(keyStr, "key") : keyStr;
      return [coloredKey, ": ", prettyPrint(val, useColor)];
    });

    // Use commas when inline, line breaks when multi-line
    const withSeparators: Doc[] = [];
    for (let i = 0; i < props.length; i++) {
      withSeparators.push(props[i]);
      if (i < props.length - 1) {
        withSeparators.push(ifBreak(line, ", "));
      }
    }

    // Build the object with optional type prefix
    const prefix =
      typeValue && typeof typeValue === "string"
        ? [useColor ? colorize(typeValue, "keyword") : typeValue, " "]
        : [];

    return group([
      ...prefix,
      "{",
      remainingEntries.length > 0 ? indent([softline, ...withSeparators]) : "",
      remainingEntries.length > 0 ? softline : "",
      "}",
    ]);
  }

  return "[Unknown]";
}

/**
 * Pretty-print a JavaScript value to a string.
 * @param value The value to pretty-print
 * @param printWidth Maximum line width (default: 80)
 * @param useColor Whether to include colors (default: true)
 */
export function prettyPrintToString(
  value: unknown,
  printWidth: number = 80,
  useColor: boolean = true,
): string {
  const doc = prettyPrint(value, useColor);
  return prettier.doc.printer.printDocToString(doc, {
    printWidth,
    tabWidth: 2,
    useTabs: false,
  }).formatted;
}

// Shared test data
export const testData = {
  primitives: { number: 42, string: "hello", bool: true, nil: null },
  arrays: [1, 2, 3],
  longArray: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  object: { a: 1, b: 2 },
  typePrefix: { type: "person", first: "Albert", last: "Einstein" },
  nested: {
    users: [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
    ],
  },
};

// Test runner (only when file is executed directly in Node.js)
declare const process: any;
if (
  typeof process !== "undefined" &&
  process.argv?.[1] &&
  import.meta.url === `file://${process.argv[1]}`
) {
  console.log("=== Pretty Print Tests ===\n");
  console.log(prettyPrintToString(testData, 120));
  console.log("\n--- Compact (width=40) ---");
  console.log(prettyPrintToString(testData, 40));
}
