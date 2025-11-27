import { describe, expect, it } from "vitest";
import { colorizeSecret, expandSecret } from "./secret-colorize";

// ANSI color codes for testing
const ANSI = [
  "\x1b[32m", // 0: green (string)
  "\x1b[33m", // 1: yellow (number)
  "\x1b[35m", // 2: magenta (boolean)
  "\x1b[90m", // 3: gray (null)
  "\x1b[36m", // 4: cyan (key)
  "\x1b[34m", // 5: blue (keyword)
];

describe("colorizeSecret and expandSecret", () => {
  it("should encode and decode single character with color index 1", () => {
    const input = "5";
    const secret = colorizeSecret(input, 1);
    const output = expandSecret(secret, ANSI);

    expect(secret.length).toBe(1);
    expect(output).toBe("\x1b[33m5\x1b[0m");
  });

  it("should encode and decode two characters with color index 1", () => {
    const input = "42";
    const secret = colorizeSecret(input, 1);
    const output = expandSecret(secret, ANSI);

    expect(secret.length).toBe(2);
    expect(output).toBe("\x1b[33m42\x1b[0m");
  });

  it("should encode and decode string with color index 0", () => {
    const input = "hello";
    const secret = colorizeSecret(input, 0);
    const output = expandSecret(secret, ANSI);

    expect(secret.length).toBe(5);
    expect(output).toBe("\x1b[32mhello\x1b[0m");
  });

  it("should encode and decode with color index 2", () => {
    const input = "true";
    const secret = colorizeSecret(input, 2);
    const output = expandSecret(secret, ANSI);

    expect(secret.length).toBe(4);
    expect(output).toBe("\x1b[35mtrue\x1b[0m");
  });

  it("should encode and decode with color index 3", () => {
    const input = "null";
    const secret = colorizeSecret(input, 3);
    const output = expandSecret(secret, ANSI);

    expect(secret.length).toBe(4);
    expect(output).toBe("\x1b[90mnull\x1b[0m");
  });

  it("should encode and decode with color index 4", () => {
    const input = "myKey";
    const secret = colorizeSecret(input, 4);
    const output = expandSecret(secret, ANSI);

    expect(secret.length).toBe(5);
    expect(output).toBe("\x1b[36mmyKey\x1b[0m");
  });

  it("should encode and decode with color index 5", () => {
    const input = "new";
    const secret = colorizeSecret(input, 5);
    const output = expandSecret(secret, ANSI);

    expect(secret.length).toBe(3);
    expect(output).toBe("\x1b[34mnew\x1b[0m");
  });

  it("should handle mixed colored and uncolored content", () => {
    const input =
      "[" + colorizeSecret("42", 1) + ", " + colorizeSecret('"hello"', 0) + "]";
    const output = expandSecret(input, ANSI);

    expect(input.length).toBe(13); // [ + 2 + , + space + 7 + ]
    expect(output).toBe('[\x1b[33m42\x1b[0m, \x1b[32m"hello"\x1b[0m]');
  });

  it("should handle empty string", () => {
    const input = "";
    const secret = colorizeSecret(input, 1);
    const output = expandSecret(secret, ANSI);

    expect(secret).toBe("");
    expect(output).toBe("");
  });

  it("should preserve original text when stripped of ANSI codes", () => {
    const input = "test123";
    const secret = colorizeSecret(input, 1);
    const expanded = expandSecret(secret, ANSI);
    const stripped = expanded.replace(/\x1b\[\d+m/g, "");

    expect(stripped).toBe(input);
  });

  it("should throw error for color index out of range", () => {
    expect(() => colorizeSecret("test", -1)).toThrow(
      "colorIndex must be between 0 and 15",
    );
    expect(() => colorizeSecret("test", 16)).toThrow(
      "colorIndex must be between 0 and 15",
    );
  });

  it("should handle color index at boundaries", () => {
    const input = "x";
    const secret0 = colorizeSecret(input, 0);
    const secret15 = colorizeSecret(input, 15);

    expect(secret0.length).toBe(1);
    expect(secret15.length).toBe(1);
  });

  it("should throw error for non-ASCII characters", () => {
    expect(() => colorizeSecret("hello™", 0)).toThrow(
      "Character at index 5 has code 8482",
    );
    expect(() => colorizeSecret("hello\u0100", 0)).toThrow(
      "Character at index 5 has code 256",
    );
    expect(() => colorizeSecret("🎉", 0)).toThrow("Character at index 0");
  });

  it("should accept extended ASCII (0-255)", () => {
    const input = "\x00\x7F\xFF"; // null, DEL, max extended ASCII
    const secret = colorizeSecret(input, 0);
    const output = expandSecret(secret, ANSI);

    expect(secret.length).toBe(3);
    expect(output).toBe("\x1b[32m\x00\x7F\xFF\x1b[0m");
  });
});
