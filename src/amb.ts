/**
 * Nondeterministic computation using the "amb" operator.
 *
 * The amb operator takes an array of options and conceptually "returns all of them at once".
 * In reality, it throws a special error that causes the computation to branch into multiple
 * executions, one for each option.
 */

import { Draft, produce } from "immer";

class AmbError extends Error {
  constructor(public options: any[]) {
    super("Ambiguous choice");
    this.name = "AmbError";
  }
}

class FailError extends Error {
  constructor() {
    super("amb fail");
    this.name = "FailError";
  }
}

/**
 * Global state tracking the current execution path through amb choices.
 * This is reset for each execution in runAmb.
 */
let currentPath: number[] = [];
let currentAmbIndex = 0;

/**
 * The amb operator: nondeterministically choose one of the given options.
 *
 * On first encounter, throws an AmbError to signal branching is needed.
 * On subsequent executions (controlled by runAmb), returns the predetermined choice.
 */
export function amb<T>(options: T[]): T {
  if (options.length === 0) {
    throw new Error("amb called with empty options array");
  }

  const myIndex = currentAmbIndex++;

  // If we have a predetermined choice for this amb call, use it
  if (myIndex < currentPath.length) {
    return options[currentPath[myIndex]];
  }

  // Otherwise, we need to branch - throw to signal this
  throw new AmbError(options);
}

/**
 * A generator that yields results one at a time as execution paths are explored.
 * More memory efficient for large result sets.
 */
export function* runAmbGenerator<T>(fn: () => T): Generator<T> {
  const pathsToExplore: number[][] = [[]];

  while (pathsToExplore.length > 0) {
    const path = pathsToExplore.shift()!;

    currentPath = path;
    currentAmbIndex = 0;

    try {
      const result = fn();
      yield result;
    } catch (error) {
      if (error instanceof AmbError) {
        for (let i = 0; i < error.options.length; i++) {
          pathsToExplore.push([...path, i]);
        }
      } else if (error instanceof FailError) {
        // This path failed - just skip it
        continue;
      } else {
        throw error;
      }
    }
  }
}

/**
 * Run a function that uses amb, exploring all possible execution paths.
 * Returns an array of all possible results.
 */
export function runAmb<T>(fn: () => T): T[] {
  return [...runAmbGenerator(fn)];
}

/**
 * Helper to fail a computation path (like Prolog's fail).
 * Throws an error that will cause runAmb to abandon this path.
 */
export function fail(): never {
  throw new FailError();
}

/**
 * Require that a condition is true, otherwise fail this path.
 */
export function require(condition: boolean): void {
  if (!condition) {
    fail();
  }
}

/**
 * Combines amb with immer's produce for nondeterministic immutable updates.
 * Returns all possible versions of the base object that result from different
 * amb choices in the recipe function.
 */
export function produceAmb<T>(base: T, recipe: (draft: Draft<T>) => void): T[] {
  return runAmb(() => {
    return produce(base, (draft) => {
      recipe(draft);
    });
  });
}
