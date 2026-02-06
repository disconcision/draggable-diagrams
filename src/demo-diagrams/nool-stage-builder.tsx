// Stage Builder: construct algebraic expressions by dragging blocks from a toolkit onto holes
// Based on the "clone from store" pattern from insert-and-remove

import { produce } from "immer";
import _ from "lodash";
import { Tree } from "../asts";
import { andThen, floating } from "../DragSpec";
import { Drag, Manipulable } from "../manipulable";
import { Svgx } from "../svgx";
import { translate } from "../svgx/helpers";

export namespace NoolStageBuilder {
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
    { label: "→", arity: 2 },
    { label: "+", arity: 2 },
    { label: "×", arity: 2 },
    { label: "-", arity: 1 },
    { label: "0", arity: 0 },
    { label: "1", arity: 0 },
    { label: "⛅", arity: 0 },
    { label: "🍄", arity: 0 },
    { label: "🎲", arity: 0 },
    { label: "🦠", arity: 0 },
    { label: "🐝", arity: 0 },
  ];

  function isRewriteArrow(label: string): boolean {
    return label === "→";
  }

  export const state1: State = {
    tree: { id: "root", label: "□", children: [] },
    toolkit: BLOCK_DEFS.map((def, i) => ({
      key: `tk-${i}`,
      label: def.label,
    })),
    gutter: [],
  };

  // # Helpers

  function findAllHoles(tree: Tree): string[] {
    if (tree.label === "□") return [tree.id];
    return tree.children.flatMap(findAllHoles);
  }

  function replaceNode(tree: Tree, targetId: string, replacement: Tree): Tree {
    if (tree.id === targetId) return replacement;
    const newChildren = tree.children.map((c) =>
      replaceNode(c, targetId, replacement)
    );
    if (newChildren.every((c, i) => c === tree.children[i])) return tree;
    return { ...tree, children: newChildren };
  }

  function makeExpansion(blockKey: string, blockLabel: string): Tree {
    const def = BLOCK_DEFS.find((d) => d.label === blockLabel);
    const arity = def?.arity ?? 0;
    return {
      id: blockKey,
      label: blockLabel,
      children: _.range(arity).map((i) => ({
        id: `${blockKey}-c${i}`,
        label: "□",
        children: [],
      })),
    };
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

  let nextPickupId = 0;
  let nextCloneId = 0;

  function cloneTreeWithFreshIds(tree: Tree): Tree {
    return {
      id: `clone-${nextCloneId++}`,
      label: tree.label,
      children: tree.children.map(cloneTreeWithFreshIds),
    };
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

  // Generate all gutter insertion targets for a given subtree
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

  // Compute tree size without rendering (for toolkit layout)
  function treeSize(tree: Tree): { w: number; h: number } {
    const childSizes = tree.children.map(treeSize);
    const innerW =
      T_LABEL_WIDTH +
      (childSizes.length > 0 ? T_GAP + _.max(childSizes.map((c) => c.w))! : 0);
    const innerH =
      childSizes.length > 0
        ? _.sumBy(childSizes, (c) => c.h) + T_GAP * (childSizes.length - 1)
        : T_LABEL_MIN_HEIGHT;
    return { w: innerW + T_PADDING * 2, h: innerH + T_PADDING * 2 };
  }

  // # Tree rendering

  function renderTree(
    tree: Tree,
    opts?: {
      // For tree nodes: enables pick-up drag (move/erase/swap)
      pickUp?: { drag: Drag<State>; fullState: State };
      // For toolkit/gutter blocks: disables pointer events on text
      pointerEventsNone?: boolean;
      // For toolkit/gutter blocks: attaches drag handler to the root <g>
      rootOnDrag?: ReturnType<Drag<State>>;
      // Transform applied to the root <g> (puts position on the id-bearing element
      // so variable-count containers don't need non-id wrapper <g> elements)
      rootTransform?: string;
      // Depth in tree (for z-index: children drawn on top of parents)
      depth?: number;
      // Visual opacity (applied to the id-bearing <g> so it survives hoisting)
      opacity?: number;
      // When true, all nodes get z-index 0 (parent drawn on top, captures clicks)
      flatZIndex?: boolean;
      // When true, this node is inside a rewrite arrow — holes get purple tinting
      insideArrow?: boolean;
    }
  ): {
    element: Svgx;
    w: number;
    h: number;
  } {
    const isHole = tree.label === "□";
    const isArrow = isRewriteArrow(tree.label);
    const depth = opts?.depth ?? 0;

    // Children inherit opts but NOT rootOnDrag/rootTransform (only root gets those)
    const childOpts = opts
      ? {
          ...opts,
          rootOnDrag: undefined,
          rootTransform: undefined,
          depth: depth + 1,
          insideArrow: opts.insideArrow || isArrow,
        }
      : undefined;
    const renderedChildren = tree.children.map((child) =>
      renderTree(child, childOpts)
    );

    const renderedChildrenElements: Svgx[] = [];
    let childY = 0;
    for (const childR of renderedChildren) {
      renderedChildrenElements.push(
        <g transform={translate(0, childY)}>{childR.element}</g>
      );
      childY += childR.h + T_GAP;
    }

    const innerW =
      T_LABEL_WIDTH +
      (renderedChildren.length > 0
        ? T_GAP + _.max(renderedChildren.map((c) => c.w))!
        : 0);
    const innerH =
      renderedChildren.length > 0
        ? _.sumBy(renderedChildren, (c) => c.h) +
          T_GAP * (renderedChildren.length - 1)
        : T_LABEL_MIN_HEIGHT;

    const w = innerW + T_PADDING * 2;
    const h = innerH + T_PADDING * 2;
    const rx = isHole
      ? (h - 6) / 2
      : Math.min(14, 0.3 * Math.min(w, h));

    // Pick-up drag: non-hole tree nodes can be grabbed, moved, swapped, or erased
    const pickUpDrag =
      opts?.pickUp && !isHole
        ? opts.pickUp.drag(({ altKey }) => {
            const { fullState } = opts.pickUp!;
            const nodeId = tree.id;
            const parentInfo = findParentAndIndex(fullState.tree, nodeId);

            // Alt-drag: duplicate (clone stays at original position)
            if (altKey) {
              const clone = cloneTreeWithFreshIds(tree);
              const stateWithClone: State = {
                ...fullState,
                tree: replaceNode(fullState.tree, nodeId, clone),
              };
              // Holes NOT inside the clone (avoid recursive nesting)
              const cloneHoles = new Set(findAllHoles(clone));
              const availableHoles = findAllHoles(stateWithClone.tree).filter(
                (hId) => !cloneHoles.has(hId)
              );
              const placeTargets = availableHoles.map((hId) => ({
                ...stateWithClone,
                tree: replaceNode(stateWithClone.tree, hId, tree),
              }));
              const gutterTargets = gutterInsertionTargets(
                stateWithClone,
                tree
              );
              return floating(
                [...placeTargets, ...gutterTargets, fullState],
                { backdrop: stateWithClone }
              );
            }

            // Backdrop: fresh hole at vacated position (unique ID that
            // doesn't collide with any real hole)
            const pickupHoleId = `pickup-${nextPickupId++}`;
            const stateWithout: State = {
              ...fullState,
              tree: replaceNode(fullState.tree, nodeId, {
                id: pickupHoleId,
                label: "□",
                children: [],
              }),
            };

            // Placement targets: drop in any hole in the modified tree
            // (pickup hole excluded — it's not a real placement target)
            const holes = findAllHoles(stateWithout.tree).filter(
              (hId) => hId !== pickupHoleId
            );
            const placeTargets = holes.map((hId) => ({
              ...stateWithout,
              tree: replaceNode(stateWithout.tree, hId, tree),
            }));

            // Swap targets: exchange with non-hole siblings
            const swapTargets: State[] = [];
            if (parentInfo) {
              const { parent, index } = parentInfo;
              for (let i = 0; i < parent.children.length; i++) {
                if (i !== index && parent.children[i].label !== "□") {
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

            // Gutter targets: park in the gutter
            const gutterTargets = gutterInsertionTargets(stateWithout, tree);

            // Erase target: node parks in trash area, vanishes on release
            const eraseState: State = { ...stateWithout, trashed: tree };
            const cleanState: State = { ...stateWithout, trashed: undefined };

            return floating(
              [
                ...placeTargets,
                ...swapTargets,
                ...gutterTargets,
                fullState, // "put back" at original position
                andThen(eraseState, cleanState),
              ],
              { backdrop: stateWithout }
            );
          })
        : undefined;

    const zIndex = opts?.flatZIndex ? 0 : depth;

    const element = (
      <g
        id={tree.id}
        transform={opts?.rootTransform}
        data-on-drag={opts?.rootOnDrag || pickUpDrag}
        data-z-index={zIndex}
        opacity={opts?.opacity}
      >
        <rect
          x={isHole ? 3 : 0}
          y={isHole ? 3 : 0}
          width={isHole ? w - 6 : w}
          height={isHole ? h - 6 : h}
          rx={rx}
          stroke={isHole ? (opts?.insideArrow ? "#c4b5fd" : "#bbb") : isArrow ? "#7c3aed" : "gray"}
          strokeWidth={isArrow ? 2 : 1}
          fill={isHole ? (opts?.insideArrow ? "#ede9fe" : "#eee") : "transparent"}
        />
        <text
          x={T_PADDING + T_LABEL_WIDTH / 2}
          y={T_PADDING + innerH / 2}
          dominantBaseline="middle"
          textAnchor="middle"
          fontSize={isHole ? 0 : 20}
          fill={isHole ? "#999" : isArrow ? "#7c3aed" : "black"}
          pointerEvents={opts?.pointerEventsNone ? "none" : undefined}
        >
          {tree.label}
        </text>
        {renderedChildren.length > 0 && (
          <g
            transform={translate(T_PADDING + T_LABEL_WIDTH + T_GAP, T_PADDING)}
          >
            {renderedChildrenElements}
          </g>
        )}
      </g>
    );

    return { element, w, h };
  }

  // # Main layout constants

  const BLOCK_GAP = 8;
  const TOOLKIT_PADDING = 8;
  const ZONE_GAP = 15;
  const GUTTER_MIN_WIDTH = 46;
  const TRASH_SIZE = 30;

  // # Manipulable

  export const manipulable: Manipulable<State> = ({ state, drag }) => {
    // Compute toolkit item sizes for layout
    const toolkitItemData = state.toolkit.map((block) => {
      const expansion = makeExpansion(block.key, block.label);
      return { block, expansion, size: treeSize(expansion) };
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

    const holeIds = findAllHoles(state.tree);

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

    // Trash zone: positioned to the right of the tree
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

        {/* Toolkit blocks - rendered with renderTree so SVG structure
            matches the placed version (avoids lerp child count mismatch) */}
        {toolkitItemData.map(({ block, expansion }, idx) => (
          <g transform={translate(TOOLKIT_PADDING, toolkitPositions[idx])}>
            {
              renderTree(expansion, {
                pointerEventsNone: true,
                opacity: holeIds.length > 0 ? undefined : 0.35,
                rootOnDrag:
                  holeIds.length > 0
                    ? drag(() => {
                        // Clone pattern: refresh toolkit slot key
                        const stateWithout = produce(state, (draft) => {
                          draft.toolkit[idx].key += "-r";
                        });

                        const targetStates = holeIds.map((holeId) => ({
                          ...stateWithout,
                          tree: replaceNode(
                            stateWithout.tree,
                            holeId,
                            makeExpansion(block.key, block.label)
                          ),
                        }));

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

        {/* Gutter items — rootTransform puts position on the id-bearing element
            so no wrapper <g> is needed (avoids variable child count in lerp) */}
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
                  const holes = findAllHoles(stateWithClone.tree);
                  const placeTargets = holes.map((hId) => ({
                    ...stateWithClone,
                    tree: replaceNode(stateWithClone.tree, hId, block),
                  }));
                  const gutterTargets = gutterInsertionTargets(
                    stateWithClone,
                    block
                  );
                  return floating(
                    [...placeTargets, ...gutterTargets, state],
                    { backdrop: stateWithClone }
                  );
                }

                // Remove from gutter
                const stateWithout = produce(state, (draft) => {
                  draft.gutter.splice(idx, 1);
                });

                // Place in any hole in the tree
                const holes = findAllHoles(stateWithout.tree);
                const placeTargets = holes.map((hId) => ({
                  ...stateWithout,
                  tree: replaceNode(stateWithout.tree, hId, block),
                }));

                // Reorder within gutter (includes "put back" at original position)
                const reorderTargets = gutterInsertionTargets(
                  stateWithout,
                  block
                );

                // Erase
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

        {/* Trash zone - subtle indicator to the right */}
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
