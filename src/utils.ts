export function assertNever(_never: never, message?: string): never {
  throw new Error(
    message || `Reached unreachable code: unexpected value ${_never}`,
  );
}

// it's too easy to call clamp with arguments in the wrong order, so
// this one is symmetric
export function clamp(a: number, b: number, c: number): number {
  return a + b + c - Math.max(a, b, c) - Math.min(a, b, c);
}
