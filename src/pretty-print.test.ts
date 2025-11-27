import { describe, expect, it } from "vitest";
import { prettyPrintToString } from "./pretty-print";

describe("prettyPrintToString", () => {
  it("should format with and without ANSI codes", () => {
    const longArray = Array.from({ length: 20 }, (_, i) => i);

    const withoutAnsi = prettyPrintToString(longArray, 200, false);
    const withAnsi = prettyPrintToString(longArray, 200, true);

    console.log("WITHOUT ANSI (printWidth: 200):");
    console.log(withoutAnsi);
    console.log("Length:", withoutAnsi.length);
    console.log("---");

    console.log("WITH ANSI (printWidth: 200):");
    console.log(withAnsi);
    console.log("Length:", withAnsi.length);
    console.log("Raw with escapes visible:", JSON.stringify(withAnsi));
    console.log("---");

    // Count ANSI escape sequences
    const ansiMatches = withAnsi.match(/\x1b\[\d+m/g);
    console.log("Number of ANSI codes:", ansiMatches?.length);
    console.log("ANSI codes add characters:", withAnsi.length - withoutAnsi.length);
  });

  it("should format long arrays inline with wide printWidth", () => {
    const longArray = Array.from({ length: 20 }, (_, i) => i);
    const result = prettyPrintToString(longArray, 200, false);

    console.log("printWidth: 200");
    console.log("longArray result:");
    console.log(result);
    console.log("---");

    // With width 200, this should be all on one line
    expect(result).not.toContain("\n");
  });

  it("should format long arrays with line breaks when narrow", () => {
    const longArray = Array.from({ length: 20 }, (_, i) => i);
    const result = prettyPrintToString(longArray, 40, false);

    console.log("printWidth: 40");
    console.log("longArray result:");
    console.log(result);
    console.log("---");

    // With width 40, this should break across multiple lines
    expect(result).toContain("\n");
  });

  it("should format objects with wide printWidth", () => {
    const obj = {
      a: 1,
      b: 2,
      c: 3,
      d: 4,
      e: 5,
      f: 6,
      g: 7,
      h: 8,
    };
    const result = prettyPrintToString(obj, 200, false);

    console.log("printWidth: 200");
    console.log("object result:");
    console.log(result);
    console.log("---");

    // Should be relatively compact
    expect(result.split("\n").length).toBeLessThan(10);
  });

  it("should format nested structures", () => {
    const nested = {
      users: [
        { id: 1, name: "Alice", age: 30 },
        { id: 2, name: "Bob", age: 25 },
        { id: 3, name: "Charlie", age: 35 },
      ],
    };

    const wide = prettyPrintToString(nested, 200, false);
    const narrow = prettyPrintToString(nested, 40, false);

    console.log("printWidth: 200 (wide)");
    console.log(wide);
    console.log("---");
    console.log("printWidth: 40 (narrow)");
    console.log(narrow);
    console.log("---");

    // Wide version should have fewer line breaks
    expect(wide.split("\n").length).toBeLessThan(narrow.split("\n").length);
  });

  it("should handle very long arrays", () => {
    const veryLongArray = Array.from({ length: 50 }, (_, i) => i + 1);

    const wide = prettyPrintToString(veryLongArray, 300, false);
    const narrow = prettyPrintToString(veryLongArray, 60, false);

    console.log("printWidth: 300 (wide) - 50 element array");
    console.log(wide);
    console.log("---");
    console.log("printWidth: 60 (narrow) - 50 element array");
    console.log(narrow);
    console.log("---");

    // Both should contain all elements
    expect(wide).toContain("49");
    expect(narrow).toContain("49");

    // Narrow should have more line breaks
    expect(narrow.split("\n").length).toBeGreaterThan(wide.split("\n").length);
  });
});
