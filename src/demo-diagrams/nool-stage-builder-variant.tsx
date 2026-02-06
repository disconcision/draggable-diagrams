// Stage Builder Variant: variable-arity ops (no holes)
// Operators take any number of children. Red when arity doesn't match expected.

import { produce } from "immer";
import _ from "lodash";
import { Tree } from "../asts";
import { andThen, floating } from "../DragSpec";
import { Drag, Manipulable } from "../manipulable";
import { Svgx } from "../svgx";
import { translate } from "../svgx/helpers";

export namespace NoolStageBuilderVariant {
  type ToolkitBlock = {
    key: string;
    label: string;
  };

  export type State = {
    tree: Tree;
    toolkit: ToolkitBlock[];
    gutter: Tree[];
    trashed?: Tree;
  };

  const BLOCK_DEFS: { label: string; arity: number }[] = [
    { label: "+", arity: 2 },
    { label: "×", arity: 2 },
    { label: "-", arity: 1 },
    { label: "0", arity: 0 },
    { label: "⛅", arity: 0 },
    { label: "🍄", arity: 0 },
    { label: "🎲", arity: 0 },
    { label: "🦠", arity: 0 },
    { label: "🐝", arity: 0 },
  ];

  function expectedArity(label: string): number {
    return BLOCK_DEFS.find((d) => d.label === label)?.arity ?? 0;
  }

  function isOp(label: string): boolean {
    return expectedArity(label) > 0;
  }

  function arityOk(tree: Tree): boolean {
    const expected = expectedArity(tree.label);
    if (expected === 0) return tree.children.length === 0;
    return tree.children.length === expected;
  }

  let nextPlaceholderId = 0;
  let nextCloneId = 0;

  function isPlaceholder(tree: Tree): boolean {
    return tree.label === "□";
  }

  function cloneTreeWithFreshIds(tree: Tree): Tree {
    return {
      id: `clone-${nextCloneId++}`,
      label: tree.label,
      children: tree.children.map(cloneTreeWithFreshIds),
    };
  }

  function replaceNode(tree: Tree, targetId: string, replacement: Tree): Tree {
    if (tree.id === targetId) return replacement;
    const newChildren = tree.children.map((c) =>
      replaceNode(c, targetId, replacement)
    );
    if (newChildren.every((c, i) => c === tree.children[i])) return tree;
    return { ...tree, children: newChildren };
  }

  // Start with a placeholder — drag any block from the toolkit to begin
  export const state1: State = {
    tree: { id: "root", label: "□", children: [] },
    toolkit: BLOCK_DEFS.map((def, i) => ({
      key: `tk-${i}`,
      label: def.label,
    })),
    gutter: [],
  };

  // # Helpers

  // Insert a child at a given index in the node identified by parentId
  function insertChild(
    tree: Tree,
    parentId: string,
    index: number,
    child: Tree
  ): Tree {
    if (tree.id === parentId) {
      const newChildren = [...tree.children];
      newChildren.splice(index, 0, child);
      return { ...tree, children: newChildren };
    }
    const newChildren = tree.children.map((c) =>
      insertChild(c, parentId, index, child)
    );
    if (newChildren.every((c, i) => c === tree.children[i])) return tree;
    return { ...tree, children: newChildren };
  }

  // Remove a child by its id, returning the modified tree
  function removeNode(tree: Tree, nodeId: string): Tree {
    const newChildren = tree.children
      .filter((c) => c.id !== nodeId)
      .map((c) => removeNode(c, nodeId));
    if (
      newChildren.length === tree.children.length &&
      newChildren.every((c, i) => c === tree.children[i])
    )
      return tree;
    return { ...tree, children: newChildren };
  }

  function findParentAndIndex(
    tree: Tree,
    nodeId: string
  ): { parent: Tree; index: number } | null {
    for (let i = 0; i < tree.children.length; i++) {
      if (tree.children[i].id === nodeId) {
        return { parent: tree, index: i };
      }
      const result = findParentAndIndex(tree.children[i], nodeId);
      if (result) return result;
    }
    return null;
  }

  function swapChildrenAtParent(
    tree: Tree,
    parentId: string,
    i: number,
    j: number
  ): Tree {
    if (tree.id === parentId) {
      const newChildren = [...tree.children];
      [newChildren[i], newChildren[j]] = [newChildren[j], newChildren[i]];
      return { ...tree, children: newChildren };
    }
    const newChildren = tree.children.map((c) =>
      swapChildrenAtParent(c, parentId, i, j)
    );
    if (newChildren.every((c, idx) => c === tree.children[idx])) return tree;
    return { ...tree, children: newChildren };
  }

  // Find all op nodes where a child could be inserted
  function allInsertionPoints(
    tree: Tree
  ): { parentId: string; index: number }[] {
    const points: { parentId: string; index: number }[] = [];
    if (isOp(tree.label)) {
      for (let i = 0; i <= tree.children.length; i++) {
        points.push({ parentId: tree.id, index: i });
      }
    }
    for (const child of tree.children) {
      points.push(...allInsertionPoints(child));
    }
    return points;
  }

  function gutterInsertionTargets(baseState: State, subtree: Tree): State[] {
    return _.range(baseState.gutter.length + 1).map((insertIdx) =>
      produce(baseState, (draft) => {
        draft.gutter.splice(insertIdx, 0, subtree);
      })
    );
  }

  // # Tree layout constants

  const T_GAP = 10;
  const T_PADDING = 5;
  const T_LABEL_WIDTH = 20;
  const T_LABEL_MIN_HEIGHT = 20;
  const T_EMPTY_CHILD_W = 12;
  const T_EMPTY_CHILD_H = 12;

  function treeSize(tree: Tree): { w: number; h: number } {
    const childSizes = tree.children.map(treeSize);
    const isOpNode = isOp(tree.label);
    // Ops with no children still reserve a small slot
    const hasChildArea = childSizes.length > 0 || isOpNode;
    const childAreaW =
      childSizes.length > 0
        ? _.max(childSizes.map((c) => c.w))!
        : isOpNode
        ? T_EMPTY_CHILD_W
        : 0;
    const childAreaH =
      childSizes.length > 0
        ? _.sumBy(childSizes, (c) => c.h) + T_GAP * (childSizes.length - 1)
        : isOpNode
        ? T_EMPTY_CHILD_H
        : T_LABEL_MIN_HEIGHT;
    const innerW = T_LABEL_WIDTH + (hasChildArea ? T_GAP + childAreaW : 0);
    const innerH = hasChildArea
      ? Math.max(childAreaH, T_LABEL_MIN_HEIGHT)
      : T_LABEL_MIN_HEIGHT;
    return { w: innerW + T_PADDING * 2, h: innerH + T_PADDING * 2 };
  }

  // # Tree rendering

  function renderTree(
    tree: Tree,
    opts?: {
      pickUp?: { drag: Drag<State>; fullState: State };
      pointerEventsNone?: boolean;
      rootOnDrag?: ReturnType<Drag<State>>;
      rootTransform?: string;
      depth?: number;
      opacity?: number;
      flatZIndex?: boolean;
    }
  ): {
    element: Svgx;
    w: number;
    h: number;
  } {
    const isOpNode = isOp(tree.label);
    const depth = opts?.depth ?? 0;
    const valid = arityOk(tree);

    // Children use rootTransform for positioning (no non-id wrapper <g>)
    // so that variable child counts don't break lerp
    const baseChildOpts = opts
      ? {
          ...opts,
          rootOnDrag: undefined,
          rootTransform: undefined,
          depth: depth + 1,
        }
      : undefined;
    const renderedChildren: { element: Svgx; w: number; h: number }[] = [];
    let childY = 0;
    for (const child of tree.children) {
      const r = renderTree(
        child,
        baseChildOpts
          ? {
              ...baseChildOpts,
              rootTransform: translate(0, childY),
            }
          : undefined
      );
      renderedChildren.push(r);
      childY += r.h + T_GAP;
    }
    const renderedChildrenElements = renderedChildren.map((r) => r.element);

    const hasChildArea = renderedChildren.length > 0 || isOpNode;
    const childAreaW =
      renderedChildren.length > 0
        ? _.max(renderedChildren.map((c) => c.w))!
        : isOpNode
        ? T_EMPTY_CHILD_W
        : 0;
    const childAreaH =
      renderedChildren.length > 0
        ? _.sumBy(renderedChildren, (c) => c.h) +
          T_GAP * (renderedChildren.length - 1)
        : isOpNode
        ? T_EMPTY_CHILD_H
        : T_LABEL_MIN_HEIGHT;
    const innerW = T_LABEL_WIDTH + (hasChildArea ? T_GAP + childAreaW : 0);
    const innerH = hasChildArea
      ? Math.max(childAreaH, T_LABEL_MIN_HEIGHT)
      : T_LABEL_MIN_HEIGHT;

    // Pick-up drag: any non-placeholder node can be grabbed
    const pickUpDrag =
      opts?.pickUp && !isPlaceholder(tree)
        ? opts.pickUp.drag(({ altKey }) => {
            const { fullState } = opts.pickUp!;
            const nodeId = tree.id;
            const parentInfo = findParentAndIndex(fullState.tree, nodeId);

            // Alt-drag: duplicate (clone stays at original position)
            if (altKey) {
              const clone = cloneTreeWithFreshIds(tree);
              if (!parentInfo) {
                // Root alt-drag: clone replaces root, original → gutter
                const stateWithClone: State = {
                  ...fullState,
                  tree: clone,
                };
                const gutterTargets = gutterInsertionTargets(
                  stateWithClone,
                  tree
                );
                return floating([...gutterTargets, fullState], {
                  backdrop: stateWithClone,
                });
              }
              // Non-root alt-drag
              const stateWithClone: State = {
                ...fullState,
                tree: replaceNode(fullState.tree, nodeId, clone),
              };
              const points = allInsertionPoints(stateWithClone.tree);
              const insertTargets = points.map(({ parentId, index }) => ({
                ...stateWithClone,
                tree: insertChild(stateWithClone.tree, parentId, index, tree),
              }));
              const gutterTargets = gutterInsertionTargets(
                stateWithClone,
                tree
              );
              return floating(
                [...insertTargets, ...gutterTargets, fullState],
                { backdrop: stateWithClone }
              );
            }

            // Root node: replace with placeholder, offer gutter/erase/put-back
            if (!parentInfo) {
              const phId = `placeholder-${nextPlaceholderId++}`;
              const stateWithout: State = {
                ...fullState,
                tree: { id: phId, label: "□", children: [] },
              };
              const gutterTargets = gutterInsertionTargets(stateWithout, tree);
              const eraseState: State = { ...stateWithout, trashed: tree };
              const cleanState: State = {
                ...stateWithout,
                trashed: undefined,
              };
              return floating(
                [
                  ...gutterTargets,
                  fullState,
                  andThen(eraseState, cleanState),
                ],
                { backdrop: stateWithout }
              );
            }

          // Remove this node from its parent's child list
          const stateWithout: State = {
            ...fullState,
            tree: removeNode(fullState.tree, nodeId),
          };

          // Insertion targets: all positions in all ops in the modified tree
          const insertionPoints = allInsertionPoints(stateWithout.tree);
          const insertTargets = insertionPoints.map(({ parentId, index }) => ({
            ...stateWithout,
            tree: insertChild(stateWithout.tree, parentId, index, tree),
          }));

          // Swap targets: exchange with non-adjacent siblings
          const swapTargets: State[] = [];
          if (parentInfo) {
            const { parent, index } = parentInfo;
            for (let i = 0; i < parent.children.length; i++) {
              if (i !== index) {
                swapTargets.push({
                  ...fullState,
                  tree: swapChildrenAtParent(
                    fullState.tree,
                    parent.id,
                    index,
                    i
                  ),
                });
              }
            }
          }

          // Gutter targets
          const gutterTargets = gutterInsertionTargets(stateWithout, tree);

          // Erase target
          const eraseState: State = { ...stateWithout, trashed: tree };
          const cleanState: State = { ...stateWithout, trashed: undefined };

          return floating(
            [
              ...insertTargets,
              ...swapTargets,
              ...gutterTargets,
              fullState, // put back
              andThen(eraseState, cleanState),
            ],
            { backdrop: stateWithout }
          );
        })
      : undefined;

    const zIndex = opts?.flatZIndex ? 0 : depth;
    const ph = isPlaceholder(tree);
    const strokeColor = ph ? "#bbb" : valid ? "gray" : "#dd3333";
    const labelColor = ph ? "#999" : valid ? "black" : "#dd3333";
    const w = innerW + T_PADDING * 2;
    const h = innerH + T_PADDING * 2;
    const rx = ph
      ? (h - 6) / 2
      : Math.min(14, 0.3 * Math.min(w, h));

    const element = (
      <g
        id={tree.id}
        transform={opts?.rootTransform}
        data-on-drag={opts?.rootOnDrag || pickUpDrag}
        data-z-index={zIndex}
        opacity={opts?.opacity}
      >
        <rect
          x={ph ? 3 : 0}
          y={ph ? 3 : 0}
          width={ph ? w - 6 : w}
          height={ph ? h - 6 : h}
          rx={rx}
          stroke={strokeColor}
          strokeWidth={1}
          fill={ph ? "#eee" : "transparent"}
        />
        <text
          x={T_PADDING + T_LABEL_WIDTH / 2}
          y={T_PADDING + innerH / 2}
          dominantBaseline="middle"
          textAnchor="middle"
          fontSize={ph ? 0 : 20}
          fill={labelColor}
          pointerEvents={opts?.pointerEventsNone ? "none" : undefined}
        >
          {tree.label}
        </text>
        {hasChildArea && (
          <g
            transform={translate(T_PADDING + T_LABEL_WIDTH + T_GAP, T_PADDING)}
          >
            {renderedChildrenElements}
          </g>
        )}
      </g>
    );

    return {
      element,
      w: innerW + T_PADDING * 2,
      h: innerH + T_PADDING * 2,
    };
  }

  // # Main layout constants

  const BLOCK_GAP = 8;
  const TOOLKIT_PADDING = 8;
  const ZONE_GAP = 15;
  const GUTTER_MIN_WIDTH = 46;
  const TRASH_SIZE = 30;

  // # Manipulable

  export const manipulable: Manipulable<State> = ({ state, drag }) => {
    const toolkitItemData = state.toolkit.map((block) => {
      // In variant mode, ops start with no children (not expanded with holes)
      const tree: Tree = { id: block.key, label: block.label, children: [] };
      return { block, tree, size: treeSize(tree) };
    });

    const maxToolkitW = _.max(toolkitItemData.map((t) => t.size.w)) ?? 30;
    const toolkitWidth = maxToolkitW + TOOLKIT_PADDING * 2;

    let toolkitY = TOOLKIT_PADDING;
    const toolkitPositions = toolkitItemData.map((item) => {
      const y = toolkitY;
      toolkitY += item.size.h + BLOCK_GAP;
      return y;
    });
    const toolkitHeight = toolkitY + TOOLKIT_PADDING - BLOCK_GAP;

    // All insertion points in the tree (positions in op child lists)
    const rootIsPlaceholder = isPlaceholder(state.tree);
    const insertionPoints = allInsertionPoints(state.tree);

    // Compute gutter layout
    const gutterItemData = state.gutter.map((block) => ({
      block,
      size: treeSize(block),
    }));
    const maxGutterW =
      gutterItemData.length > 0
        ? _.max(gutterItemData.map((g) => g.size.w))!
        : 0;
    const gutterContentWidth = Math.max(
      GUTTER_MIN_WIDTH,
      maxGutterW + TOOLKIT_PADDING * 2
    );

    let gutterY = TOOLKIT_PADDING;
    const gutterPositions = gutterItemData.map((item) => {
      const y = gutterY;
      gutterY += item.size.h + BLOCK_GAP;
      return y;
    });
    const gutterHeight = Math.max(
      gutterY + TOOLKIT_PADDING - BLOCK_GAP,
      TOOLKIT_PADDING * 2 + GUTTER_MIN_WIDTH
    );

    const gutterOffsetX = toolkitWidth + ZONE_GAP;
    const treeOffsetX = gutterOffsetX + gutterContentWidth + ZONE_GAP;
    const treeR = renderTree(state.tree, {
      pickUp: { drag, fullState: state },
    });

    const trashX = treeOffsetX + treeR.w + ZONE_GAP;
    const trashY = 0;

    return (
      <g>
        {/* Toolkit background */}
        <rect
          x={0}
          y={0}
          width={toolkitWidth}
          height={toolkitHeight}
          fill="#f0f0f0"
          stroke="#ccc"
          strokeWidth={1}
          rx={Math.min(14, 0.3 * Math.min(toolkitWidth, toolkitHeight))}
          id="toolkit-bg"
          data-z-index={-10}
        />

        {/* Toolkit blocks */}
        {toolkitItemData.map(({ block, tree }, idx) => (
          <g transform={translate(TOOLKIT_PADDING, toolkitPositions[idx])}>
            {
              renderTree(tree, {
                pointerEventsNone: true,
                opacity:
                  insertionPoints.length > 0 || rootIsPlaceholder
                    ? undefined
                    : 0.35,
                rootOnDrag:
                  insertionPoints.length > 0 || rootIsPlaceholder
                    ? drag(() => {
                        const stateWithout = produce(state, (draft) => {
                          draft.toolkit[idx].key += "-r";
                        });
                        const newNode: Tree = {
                          id: block.key,
                          label: block.label,
                          children: [],
                        };
                        const targetStates: State[] = [];
                        // Replace placeholder root
                        if (isPlaceholder(stateWithout.tree)) {
                          targetStates.push({
                            ...stateWithout,
                            tree: newNode,
                          });
                        }
                        // Insert into op child lists
                        const points = allInsertionPoints(stateWithout.tree);
                        for (const { parentId, index } of points) {
                          targetStates.push({
                            ...stateWithout,
                            tree: insertChild(
                              stateWithout.tree,
                              parentId,
                              index,
                              newNode
                            ),
                          });
                        }
                        return floating(targetStates, {
                          backdrop: stateWithout,
                        });
                      })
                    : undefined,
              }).element
            }
          </g>
        ))}

        {/* Gutter background */}
        <rect
          x={gutterOffsetX}
          y={0}
          width={gutterContentWidth}
          height={Math.max(gutterHeight, toolkitHeight)}
          fill="#f8f8f8"
          stroke="#ddd"
          strokeWidth={1}
          strokeDasharray="4,4"
          rx={Math.min(14, 0.3 * Math.min(gutterContentWidth, Math.max(gutterHeight, toolkitHeight)))}
          id="gutter-bg"
          data-z-index={-10}
        />

        {/* Gutter items */}
        {gutterItemData.map(
          ({ block }, idx) =>
            renderTree(block, {
              rootTransform: translate(
                gutterOffsetX + TOOLKIT_PADDING,
                gutterPositions[idx]
              ),
              pointerEventsNone: true,
              flatZIndex: true,
              rootOnDrag: drag(({ altKey }) => {
                if (altKey) {
                  // Duplicate: clone stays in gutter, original moves
                  const stateWithClone = produce(state, (draft) => {
                    draft.gutter[idx] = cloneTreeWithFreshIds(block);
                  });
                  const placeTargets: State[] = [];
                  if (isPlaceholder(stateWithClone.tree)) {
                    placeTargets.push({
                      ...stateWithClone,
                      tree: block,
                    });
                  }
                  const points = allInsertionPoints(stateWithClone.tree);
                  for (const { parentId, index } of points) {
                    placeTargets.push({
                      ...stateWithClone,
                      tree: insertChild(
                        stateWithClone.tree,
                        parentId,
                        index,
                        block
                      ),
                    });
                  }
                  const gutterTargets = gutterInsertionTargets(
                    stateWithClone,
                    block
                  );
                  return floating(
                    [...placeTargets, ...gutterTargets, state],
                    { backdrop: stateWithClone }
                  );
                }

                const stateWithout = produce(state, (draft) => {
                  draft.gutter.splice(idx, 1);
                });
                const placeTargets: State[] = [];
                // Replace placeholder root
                if (isPlaceholder(stateWithout.tree)) {
                  placeTargets.push({
                    ...stateWithout,
                    tree: block,
                  });
                }
                const points = allInsertionPoints(stateWithout.tree);
                for (const { parentId, index } of points) {
                  placeTargets.push({
                    ...stateWithout,
                    tree: insertChild(stateWithout.tree, parentId, index, block),
                  });
                }
                const reorderTargets = gutterInsertionTargets(
                  stateWithout,
                  block
                );
                const eraseState: State = { ...stateWithout, trashed: block };
                const cleanState: State = {
                  ...stateWithout,
                  trashed: undefined,
                };
                return floating(
                  [
                    ...placeTargets,
                    ...reorderTargets,
                    andThen(eraseState, cleanState),
                  ],
                  { backdrop: stateWithout }
                );
              }),
            }).element
        )}

        {/* Trash zone */}
        <g transform={translate(trashX, trashY)}>
          <rect
            x={0}
            y={0}
            width={TRASH_SIZE}
            height={TRASH_SIZE}
            fill="transparent"
            stroke="#ccc"
            strokeWidth={1}
            strokeDasharray="4,4"
            rx={4}
            id="trash-bg"
          />
          <text
            x={TRASH_SIZE / 2}
            y={TRASH_SIZE / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={16}
            fill="#ccc"
            pointerEvents="none"
          >
            🗑
          </text>
          {state.trashed &&
            renderTree(state.trashed, { pointerEventsNone: true }).element}
        </g>

        {/* Tree area */}
        <g transform={translate(treeOffsetX, 0)}>{treeR.element}</g>
      </g>
    );
  };
}
