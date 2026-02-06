// Stage Builder: construct algebraic expressions by dragging blocks from a toolkit onto holes
// Based on the "clone from store" pattern from insert-and-remove

import _ from "lodash";
import { produce } from "immer";
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

  export const state1: State = {
    tree: { id: "root", label: "□", children: [] },
    toolkit: BLOCK_DEFS.map((def, i) => ({
      key: `tk-${i}`,
      label: def.label,
    })),
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
      (childSizes.length > 0
        ? T_GAP + _.max(childSizes.map((c) => c.w))!
        : 0);
    const innerH =
      childSizes.length > 0
        ? _.sumBy(childSizes, (c) => c.h) +
          T_GAP * (childSizes.length - 1)
        : T_LABEL_MIN_HEIGHT;
    return { w: innerW + T_PADDING * 2, h: innerH + T_PADDING * 2 };
  }

  // # Tree rendering

  function renderTree(
    tree: Tree,
    opts?: {
      // For tree nodes: enables pick-up drag (move/erase/swap)
      pickUp?: { drag: Drag<State>; fullState: State };
      // For toolkit blocks: disables pointer events on text
      pointerEventsNone?: boolean;
      // For toolkit blocks: attaches drag handler to the root <g>
      rootOnDrag?: ReturnType<Drag<State>>;
      // Depth in tree (for z-index: children drawn on top of parents)
      depth?: number;
      // Visual opacity (applied to the id-bearing <g> so it survives hoisting)
      opacity?: number;
    }
  ): {
    element: Svgx;
    w: number;
    h: number;
  } {
    const isHole = tree.label === "□";
    const depth = opts?.depth ?? 0;

    // Children inherit opts but NOT rootOnDrag (only root gets it)
    const childOpts = opts
      ? { ...opts, rootOnDrag: undefined, depth: depth + 1 }
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

    // Pick-up drag: non-hole tree nodes can be grabbed, moved, swapped, or erased
    const pickUpDrag =
      opts?.pickUp && !isHole
        ? opts.pickUp.drag(() => {
            const { fullState } = opts.pickUp!;
            const nodeId = tree.id;
            const parentInfo = findParentAndIndex(fullState.tree, nodeId);

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

            // Erase target: node parks in trash area, vanishes on release
            const eraseState: State = { ...stateWithout, trashed: tree };
            const cleanState: State = { ...stateWithout, trashed: undefined };

            return floating(
              [
                ...placeTargets,
                ...swapTargets,
                fullState, // "put back" at original position
                andThen(eraseState, cleanState),
              ],
              { backdrop: stateWithout }
            );
          })
        : undefined;

    const element = (
      <g id={tree.id} data-on-drag={opts?.rootOnDrag || pickUpDrag} data-z-index={depth} opacity={opts?.opacity}>
        <rect
          x={0}
          y={0}
          width={innerW + T_PADDING * 2}
          height={innerH + T_PADDING * 2}
          stroke={isHole ? "#aaa" : "gray"}
          strokeWidth={1}
          strokeDasharray={isHole ? "4 2" : undefined}
          fill={isHole ? "#f5f5f5" : "transparent"}
        />
        <text
          x={T_PADDING + T_LABEL_WIDTH / 2}
          y={T_PADDING + innerH / 2}
          dominantBaseline="middle"
          textAnchor="middle"
          fontSize={isHole ? 14 : 20}
          fill={isHole ? "#999" : "black"}
          pointerEvents={opts?.pointerEventsNone ? "none" : undefined}
        >
          {tree.label}
        </text>
        {renderedChildren.length > 0 && (
          <g transform={translate(T_PADDING + T_LABEL_WIDTH + T_GAP, T_PADDING)}>
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
  const TOOLKIT_PADDING = 5;
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

    let toolkitY = BLOCK_GAP;
    const toolkitPositions = toolkitItemData.map((item) => {
      const y = toolkitY;
      toolkitY += item.size.h + BLOCK_GAP;
      return y;
    });
    const toolkitHeight = toolkitY;

    const holeIds = findAllHoles(state.tree);

    const treeOffsetX = toolkitWidth + 20;
    const treeR = renderTree(state.tree, {
      pickUp: { drag, fullState: state },
    });

    // Trash zone: positioned to the right of the tree
    const trashX = treeOffsetX + treeR.w + 30;
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
          rx={4}
          id="toolkit-bg"
          data-z-index={-10}
        />

        {/* Toolkit blocks - rendered with renderTree so SVG structure
            matches the placed version (avoids lerp child count mismatch) */}
        {toolkitItemData.map(({ block, expansion }, idx) => (
          <g transform={translate(TOOLKIT_PADDING, toolkitPositions[idx])}>
            {renderTree(expansion, {
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
            }).element}
          </g>
        ))}

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
