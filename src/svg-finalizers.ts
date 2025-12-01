import React from "react";
import { accumulateTransforms, shouldRecurseIntoChildren, SvgElem } from "./jsx-flatten";
import { localToGlobal, parseTransform } from "./svg-transform";
import { assert } from "./utils";
import { Vec2, Vec2able } from "./vec2";

/**
 * A reference to a point in an element's local coordinate system.
 * The point will be resolved to global coordinates after the tree is built.
 */
export type PointRef = {
  elementId: string;
  localPos: Vec2;
};

/**
 * Collects deferred rendering functions that need to run after the SVG tree is assembled.
 * Finalizers receive the completed tree and can resolve point references to draw
 * connecting lines, paths, etc.
 */
export class Finalizers {
  private fns: ((tree: SvgElem) => SvgElem)[] = [];

  push(fn: (tree: SvgElem) => SvgElem) {
    this.fns.push(fn);
  }

  resolve(tree: SvgElem): SvgElem[] {
    return this.fns.map((fn) => fn(tree));
  }
}

/**
 * Creates a reference to a point in an element's local coordinate system.
 */
export function pointRef(elementId: string, localPos: Vec2able): PointRef {
  return {
    elementId,
    localPos: Vec2(localPos),
  };
}

/**
 * Finds an element by ID in the SVG tree.
 */
function findElementById(tree: SvgElem, id: string): SvgElem | null {
  const props = tree.props as any;
  if (props.id === id) {
    return tree;
  }

  if (shouldRecurseIntoChildren(tree)) {
    const children = React.Children.toArray(props.children);
    for (const child of children) {
      if (React.isValidElement(child)) {
        const found = findElementById(child as SvgElem, id);
        if (found) return found;
      }
    }
  }

  return null;
}

/**
 * Resolves a point reference to global coordinates by:
 * 1. Finding the element with the given ID in the tree
 * 2. Reading its accumulated transform
 * 3. Converting the local point to global coordinates
 */
export function resolvePointRef(ref: PointRef, tree: SvgElem): Vec2 {
  assert(!!ref, "PointRef is undefined");

  const accumulated = accumulateTransforms(tree);
  const element = findElementById(accumulated, ref.elementId);

  if (!element) {
    throw new Error(
      `Cannot resolve point ref: element with id "${ref.elementId}" not found`
    );
  }

  const transformStr =
    (element.props as any)["data-accumulated-transform"] || "";
  const transforms = parseTransform(transformStr);
  return localToGlobal(transforms, ref.localPos);
}
