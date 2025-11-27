// Use Unicode private use area to encode (original_char + color_index) into single characters
// Each color index gets 256 code points for ASCII range
const BASE_START = 0xe000;
const RANGE_SIZE = 256;
const MAX_COLOR_INDEX = 15; // Support 0-15 (16 colors)

/**
 * Embeds secret color information into a string WITHOUT changing its length.
 * Each character is replaced with a private-use Unicode character that encodes both:
 * - The original character (via offset within the range)
 * - The color index (via which range it's in)
 *
 * Example: "42" with colorIndex 1
 * - '4' (char code 52) -> \uE134 (0xE100 + 52)
 * - '2' (char code 50) -> \uE132 (0xE100 + 50)
 *
 * @param text The text to colorize (must be ASCII only, char codes 0-255)
 * @param colorIndex A number from 0 to 15 indicating which color to use
 */
export function colorizeSecret(text: string, colorIndex: number): string {
  if (colorIndex < 0 || colorIndex > MAX_COLOR_INDEX) {
    throw new Error(
      `colorIndex must be between 0 and ${MAX_COLOR_INDEX}, got ${colorIndex}`,
    );
  }

  if (text.length === 0) {
    return text;
  }

  const base = BASE_START + colorIndex * RANGE_SIZE;
  let result = "";

  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);

    // Check that character is in ASCII/extended ASCII range
    if (charCode >= RANGE_SIZE) {
      throw new Error(
        `Character at index ${i} has code ${charCode}, which exceeds the supported range of 0-${RANGE_SIZE - 1}. Only ASCII characters are supported.`,
      );
    }

    // Encode: base + original char code
    result += String.fromCharCode(base + charCode);
  }

  return result;
}

/**
 * Expands secret color markers back into original characters with ANSI codes applied.
 * Detects consecutive characters from the same color range and wraps them in ANSI codes.
 *
 * @param text The text with secret color encoding
 * @param ansiCodes Array of ANSI color codes, where index matches colorIndex from colorizeSecret
 * @returns The original text with ANSI color codes inserted
 *
 * Example: "\uE134\uE132" with ansiCodes[1] = "\x1b[33m" -> "\x1b[33m42\x1b[0m"
 */
export function expandSecret(text: string, ansiCodes: string[]): string {
  if (text.length === 0) {
    return text;
  }

  const ANSI_RESET = "\x1b[0m";
  let result = "";
  let i = 0;

  while (i < text.length) {
    const charCode = text.charCodeAt(i);

    // Check if this character is in our encoded range
    if (charCode >= BASE_START && charCode < BASE_START + (MAX_COLOR_INDEX + 1) * RANGE_SIZE) {
      // Found an encoded character - determine its color index
      const colorIndex = Math.floor((charCode - BASE_START) / RANGE_SIZE);
      const rangeBase = BASE_START + colorIndex * RANGE_SIZE;
      const ansiCode = ansiCodes[colorIndex] || "";
      let coloredText = "";

      // Collect consecutive characters from the same color range
      while (i < text.length) {
        const code = text.charCodeAt(i);
        if (code >= rangeBase && code < rangeBase + RANGE_SIZE) {
          // Decode back to original character
          const originalChar = String.fromCharCode(code - rangeBase);
          coloredText += originalChar;
          i++;
        } else {
          break;
        }
      }

      // Wrap in ANSI codes
      result += ansiCode + coloredText + ANSI_RESET;
    } else {
      // Regular character, just copy it
      result += text[i];
      i++;
    }
  }

  return result;
}
