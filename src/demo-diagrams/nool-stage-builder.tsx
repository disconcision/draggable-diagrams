// Unified Stage Builder: construct algebraic expressions with holes-based and/or variadic ops.
// Three toggleable sections with draggable icons to reorder.
//
// TODO: Palette could behave as the same kind of list container as the stage
// (same rootTransform-based hoisting, same insertion targets). Currently palette
// items can be reordered and dragged to stage/holes/trash, but brush items can't
// be dragged directly into the palette. Consider unifying.
//
// TODO: "Spring" — when a user drops far below a column, the item should animate
// into the last slot. This already works via floating-drag proximity, but if the
// drop point is below the SVG viewport the user can't reach it. May need dynamic
// SVG height or scroll-into-view behavior.

import { produce } from "immer";
import _ from "lodash";
import { Pattern, Rewrite, Tree } from "../asts";
import { andThen, floating, span } from "../DragSpec";
import { Drag, Manipulable } from "../manipulable";
import { Svgx } from "../svgx";
import { translate } from "../svgx/helpers";

export namespace NoolStageBuilder {
  // # Types

  type Section = "atoms" | "holes" | "variadic";

  type ToolkitBlock = {
    key: string;
    label: string;
    section: Section;
  };

  export type State = {
    trees: Tree[];
    toolkit: ToolkitBlock[];
    palette: Tree[];
    trashed?: Tree;
    showAtoms: boolean;
    showHolesOps: boolean;
    showVariadicOps: boolean;
    sectionOrder: Section[];
  };

  // # Section metadata

  const SECTION_ICONS: Record<Section, string> = {
    holes: "◯ →",
    variadic: "◎ →",
    atoms: "⊙ →",
  };

  const SECTION_STATE_KEYS: Record<
    Section,
    "showHolesOps" | "showVariadicOps" | "showAtoms"
  > = {
    holes: "showHolesOps",
    variadic: "showVariadicOps",
    atoms: "showAtoms",
  };

  // # Block definitions

  const ATOM_LABELS = ["0", "1", "⛅", "🍄", "🎲", "🦠", "🐝"];

  const OP_DEFS: { label: string; arity: number }[] = [
    { label: "→", arity: 2 },
    { label: "+", arity: 2 },
    { label: "×", arity: 2 },
    { label: "-", arity: 1 },
  ];

  // Brush rules for holes ops
  const holePattern: Pattern = {
    type: "op",
    label: "◯",
    id: "◯",
    children: [],
    isTrigger: true,
  };

  function brushRule(label: string, arity: number): Rewrite {
    const children: Pattern[] = _.range(arity).map((i) => ({
      type: "op" as const,
      label: "◯",
      id: `◯-${label}-${i}`,
      children: [],
      isTrigger: false,
    }));
    return {
      from: holePattern,
      to: { type: "op", label, id: label, children, isTrigger: false },
    };
  }

  const BRUSH_RULES: Rewrite[] = OP_DEFS.map((d) =>
    brushRule(d.label, d.arity)
  );

  // Full toolkit: holes ops + variadic ops + atoms
  const ALL_TOOLKIT: ToolkitBlock[] = [
    ...OP_DEFS.map((d, i) => ({
      key: `tk-h-${i}`,
      label: d.label,
      section: "holes" as Section,
    })),
    ...OP_DEFS.map((d, i) => ({
      key: `tk-v-${i}`,
      label: d.label,
      section: "variadic" as Section,
    })),
    ...ATOM_LABELS.map((label, i) => ({
      key: `tk-a-${i}`,
      label,
      section: "atoms" as Section,
    })),
  ];

  // # Helpers

  function isRewriteArrow(label: string): boolean {
    return label === "→";
  }

  function expectedArity(label: string): number {
    return OP_DEFS.find((d) => d.label === label)?.arity ?? 0;
  }

  function isOp(label: string): boolean {
    return expectedArity(label) > 0;
  }

  function arityOk(tree: Tree): boolean {
    const expected = expectedArity(tree.label);
    if (expected === 0) return tree.children.length === 0;
    return tree.children.length === expected;
  }

  function findAllHoles(tree: Tree): string[] {
    if (tree.label === "◯") return [tree.id];
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
    const rule = BRUSH_RULES.find(
      (r) => r.to.type === "op" && r.to.label === blockLabel
    );
    const arity = rule && rule.to.type === "op" ? rule.to.children.length : 0;
    return {
      id: blockKey,
      label: blockLabel,
      children: _.range(arity).map((i) => ({
        id: `${blockKey}-c${i}`,
        label: "◯",
        children: [],
      })),
    };
  }

  function makeNodeForItem(block: ToolkitBlock): Tree {
    if (block.section === "holes") return makeExpansion(block.key, block.label);
    return { id: block.key, label: block.label, children: [] };
  }

  function findParentAndIndex(
    tree: Tree,
    nodeId: string
  ): { parent: Tree; index: number } | null {
    for (let i = 0; i < tree.children.length; i++) {
      if (tree.children[i].id === nodeId)
        return { parent: tree, index: i };
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

  // Find all positions in op child lists where a new child could be inserted
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

  function allInsertionPointsInTrees(
    trees: Tree[]
  ): { treeIdx: number; parentId: string; index: number }[] {
    return trees.flatMap((tree, treeIdx) =>
      allInsertionPoints(tree).map((pt) => ({ treeIdx, ...pt }))
    );
  }

  function paletteInsertionTargets(baseState: State, subtree: Tree): State[] {
    return _.range(baseState.palette.length + 1).map((insertIdx) =>
      produce(baseState, (draft) => {
        draft.palette.splice(insertIdx, 0, subtree);
      })
    );
  }

  function stageInsertionTargets(baseState: State, newTree: Tree): State[] {
    return _.range(baseState.trees.length + 1).map((insertIdx) =>
      produce(baseState, (draft) => {
        draft.trees.splice(insertIdx, 0, newTree);
      })
    );
  }

  function findAllHolesInTrees(
    trees: Tree[]
  ): { treeIdx: number; holeId: string }[] {
    return trees.flatMap((tree, treeIdx) =>
      findAllHoles(tree).map((holeId) => ({ treeIdx, holeId }))
    );
  }

  function replaceInTrees(
    trees: Tree[],
    treeIdx: number,
    targetId: string,
    replacement: Tree
  ): Tree[] {
    return trees.map((t, i) =>
      i === treeIdx ? replaceNode(t, targetId, replacement) : t
    );
  }

  function insertInTrees(
    trees: Tree[],
    treeIdx: number,
    parentId: string,
    index: number,
    child: Tree
  ): Tree[] {
    return trees.map((t, i) =>
      i === treeIdx ? insertChild(t, parentId, index, child) : t
    );
  }

  // Remove bare root-level holes from the stage (leftover after node removal).
  // Only removes trees whose root is a bare ◯ — not op nodes with hole children
  // (like +(◯, ◯)) which represent real structure being built.
  function removeStageHoles(s: State): State {
    const cleaned = s.trees.filter(
      (t) => !(t.label === "◯" && t.children.length === 0)
    );
    if (cleaned.length === s.trees.length) return s;
    return { ...s, trees: cleaned };
  }

  // # Initial state

  export const state1: State = {
    trees: [],
    toolkit: ALL_TOOLKIT,
    palette: [],
    showAtoms: true,
    showHolesOps: true,
    showVariadicOps: false,
    sectionOrder: ["holes", "variadic", "atoms"],
  };

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
      pickUp?: {
        drag: Drag<State>;
        fullState: State;
        treeIdx: number;
        variadicEnabled: boolean;
      };
      pointerEventsNone?: boolean;
      rootOnDrag?: ReturnType<Drag<State>>;
      rootTransform?: string;
      depth?: number;
      opacity?: number;
      flatZIndex?: boolean;
      insideArrow?: boolean;
    }
  ): { element: Svgx; w: number; h: number } {
    const isHole = tree.label === "◯";
    const isArrow = isRewriteArrow(tree.label);
    const isOpNode = isOp(tree.label);
    const depth = opts?.depth ?? 0;
    const valid = arityOk(tree);

    // Children use rootTransform for positioning (variadic-safe: no non-id wrapper)
    const baseChildOpts = opts
      ? {
          ...opts,
          rootOnDrag: undefined,
          rootTransform: undefined,
          depth: depth + 1,
          insideArrow: opts.insideArrow || isArrow,
        }
      : undefined;
    const renderedChildren: { element: Svgx; w: number; h: number }[] = [];
    let childY = 0;
    for (const child of tree.children) {
      const r = renderTree(
        child,
        baseChildOpts
          ? { ...baseChildOpts, rootTransform: translate(0, childY) }
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

    const w = innerW + T_PADDING * 2;
    const h = innerH + T_PADDING * 2;
    const rx = isHole ? (h - 6) / 2 : Math.min(14, 0.3 * Math.min(w, h));

    // Pick-up drag
    const pickUpDrag =
      opts?.pickUp && !isHole
        ? opts.pickUp.drag(({ altKey }) => {
            const { fullState, treeIdx, variadicEnabled } = opts.pickUp!;
            const nodeId = tree.id;
            const thisTree = fullState.trees[treeIdx];
            const parentInfo = findParentAndIndex(thisTree, nodeId);

            if (altKey) {
              const clone = cloneTreeWithFreshIds(tree);
              const stateWithClone: State = {
                ...fullState,
                trees: replaceInTrees(
                  fullState.trees,
                  treeIdx,
                  nodeId,
                  clone
                ),
              };
              const cloneHoles = new Set(findAllHoles(clone));
              const availableHoles = findAllHolesInTrees(
                stateWithClone.trees
              ).filter(({ holeId }) => !cloneHoles.has(holeId));
              const holeTargets = availableHoles.map(
                ({ treeIdx: ti, holeId }) =>
                  removeStageHoles({
                    ...stateWithClone,
                    trees: replaceInTrees(
                      stateWithClone.trees,
                      ti,
                      holeId,
                      tree
                    ),
                  })
              );
              const insertTargets = variadicEnabled
                ? allInsertionPointsInTrees(stateWithClone.trees).map(
                    ({ treeIdx: ti, parentId, index }) =>
                      removeStageHoles({
                        ...stateWithClone,
                        trees: insertInTrees(
                          stateWithClone.trees,
                          ti,
                          parentId,
                          index,
                          tree
                        ),
                      })
                  )
                : [];
              const paletteTargets = paletteInsertionTargets(
                stateWithClone,
                tree
              ).map(removeStageHoles);
              const stageTargets = stageInsertionTargets(
                stateWithClone,
                tree
              ).map(removeStageHoles);
              return floating(
                [
                  ...holeTargets,
                  ...insertTargets,
                  ...paletteTargets,
                  ...stageTargets,
                  fullState,
                ],
                { backdrop: stateWithClone }
              );
            }

            // Backdrop: fresh hole at vacated position
            const pickupHoleId = `pickup-${nextPickupId++}`;
            const hole: Tree = {
              id: pickupHoleId,
              label: "◯",
              children: [],
            };
            const stateWithout: State = {
              ...fullState,
              trees: replaceInTrees(
                fullState.trees,
                treeIdx,
                nodeId,
                hole
              ),
            };

            const allHoles = findAllHolesInTrees(stateWithout.trees).filter(
              ({ holeId }) => holeId !== pickupHoleId
            );
            const holeTargets = allHoles.map(({ treeIdx: ti, holeId }) =>
              removeStageHoles({
                ...stateWithout,
                trees: replaceInTrees(stateWithout.trees, ti, holeId, tree),
              })
            );

            const insertTargets = variadicEnabled
              ? allInsertionPointsInTrees(stateWithout.trees).map(
                  ({ treeIdx: ti, parentId, index }) =>
                    removeStageHoles({
                      ...stateWithout,
                      trees: insertInTrees(
                        stateWithout.trees,
                        ti,
                        parentId,
                        index,
                        tree
                      ),
                    })
                )
              : [];

            const swapTargets: State[] = [];
            if (parentInfo) {
              const { parent, index } = parentInfo;
              for (let i = 0; i < parent.children.length; i++) {
                if (i !== index && parent.children[i].label !== "◯") {
                  swapTargets.push({
                    ...fullState,
                    trees: fullState.trees.map((t, ti) =>
                      ti === treeIdx
                        ? swapChildrenAtParent(t, parent.id, index, i)
                        : t
                    ),
                  });
                }
              }
            }

            const paletteTargets = paletteInsertionTargets(
              stateWithout,
              tree
            ).map(removeStageHoles);
            // Stage reordering: clean up the bare pickup hole, then
            // generate all positions where the tree can be re-inserted.
            const cleanedWithout = removeStageHoles(stateWithout);
            const stageReorderTargets = stageInsertionTargets(
              cleanedWithout,
              tree
            ).map(removeStageHoles);
            const eraseState: State = { ...stateWithout, trashed: tree };
            const cleanState: State = {
              ...stateWithout,
              trashed: undefined,
            };

            return floating(
              [
                ...holeTargets,
                ...insertTargets,
                ...swapTargets,
                ...paletteTargets,
                ...stageReorderTargets,
                fullState,
                andThen(
                  removeStageHoles(eraseState),
                  removeStageHoles(cleanState)
                ),
              ],
              { backdrop: cleanedWithout }
            );
          })
        : undefined;

    const zIndex = opts?.flatZIndex ? 0 : depth;

    // Arity-aware styling
    const strokeColor = isHole
      ? opts?.insideArrow
        ? "#c4b5fd"
        : "#bbb"
      : !valid
      ? "#dd3333"
      : isArrow
      ? "#7c3aed"
      : "gray";
    const labelColor = isHole
      ? "#999"
      : !valid
      ? "#dd3333"
      : isArrow
      ? "#7c3aed"
      : "black";

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
          stroke={strokeColor}
          strokeWidth={isArrow ? 2 : 1}
          fill={
            isHole ? (opts?.insideArrow ? "#ede9fe" : "#eee") : "transparent"
          }
        />
        <text
          x={T_PADDING + T_LABEL_WIDTH / 2}
          y={T_PADDING + innerH / 2}
          dominantBaseline="middle"
          textAnchor="middle"
          fontSize={isHole ? 0 : 20}
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

    return { element, w, h };
  }

  // # Main layout constants

  const BLOCK_GAP = 8;
  const LANE_PADDING = 8;
  const COL_GAP = 12;
  const SEP_INSET = 4;
  const PALETTE_MIN_WIDTH = 46;
  const STAGE_MIN_WIDTH = 46;
  const TRASH_SIZE = 30;
  const SECTION_GAP = 12;
  const ICON_FONT_SIZE = 14;
  const ICON_COL_WIDTH = 48;

  // # Manipulable

  export const manipulable: Manipulable<State> = ({
    state,
    drag,
    setState,
  }) => {
    // Filter toolkit items by active sections, ordered by sectionOrder
    const visibleItems = state.toolkit.filter(
      (b) =>
        (b.section === "atoms" && state.showAtoms) ||
        (b.section === "holes" && state.showHolesOps) ||
        (b.section === "variadic" && state.showVariadicOps)
    );

    const sectionOrder = state.sectionOrder;
    const orderedItems: { block: ToolkitBlock; sectionStart: boolean }[] = [];
    let firstSection = true;
    for (const sec of sectionOrder) {
      const items = visibleItems.filter((b) => b.section === sec);
      if (items.length > 0) {
        items.forEach((b, i) => {
          orderedItems.push({
            block: b,
            sectionStart: i === 0 && !firstSection,
          });
        });
        firstSection = false;
      }
    }

    // -- Brush kit layout --
    const brushKitItemData = orderedItems.map(({ block, sectionStart }) => {
      const displayTree = makeNodeForItem(block);
      return {
        block,
        displayTree,
        size: treeSize(displayTree),
        sectionStart,
      };
    });

    const brushKitContentW =
      brushKitItemData.length > 0
        ? _.max(brushKitItemData.map((t) => t.size.w))!
        : 30;
    const brushKitWidth = LANE_PADDING + brushKitContentW + LANE_PADDING;

    // Compute (x, y) positions for brush kit items.
    // Atoms are paired two-per-row to save vertical space.
    let brushKitY = LANE_PADDING;
    let atomCol = 0; // 0 = left, 1 = right within atom pair
    const brushKitPositions: number[] = [];
    const brushKitXOffsets: number[] = [];

    brushKitItemData.forEach((item, idx) => {
      if (item.sectionStart) {
        // Flush unpaired atom from previous section
        if (atomCol === 1) {
          brushKitY += brushKitItemData[idx - 1].size.h + BLOCK_GAP;
          atomCol = 0;
        }
        brushKitY += SECTION_GAP;
      }

      if (item.block.section === "atoms") {
        if (atomCol === 0) {
          brushKitPositions.push(brushKitY);
          brushKitXOffsets.push(0);
          atomCol = 1;
        } else {
          // Right atom — same Y as left atom
          brushKitPositions.push(brushKitPositions[brushKitPositions.length - 1]);
          brushKitXOffsets.push(brushKitItemData[idx - 1].size.w + BLOCK_GAP);
          const rowH = Math.max(item.size.h, brushKitItemData[idx - 1].size.h);
          brushKitY += rowH + BLOCK_GAP;
          atomCol = 0;
        }
      } else {
        if (atomCol === 1) {
          brushKitY += brushKitItemData[idx - 1].size.h + BLOCK_GAP;
          atomCol = 0;
        }
        brushKitPositions.push(brushKitY);
        brushKitXOffsets.push(0);
        brushKitY += item.size.h + BLOCK_GAP;
      }
    });

    // Flush final unpaired atom
    if (atomCol === 1) {
      brushKitY +=
        brushKitItemData[brushKitItemData.length - 1].size.h + BLOCK_GAP;
    }
    const brushKitHeight = brushKitY + LANE_PADDING - BLOCK_GAP;

    // Section dividers (thin horizontal lines between sections)
    const brushDividers: { id: string; y: number }[] = [];
    brushKitItemData.forEach((item, idx) => {
      if (item.sectionStart) {
        brushDividers.push({
          id: `brush-div-${brushDividers.length}`,
          y: brushKitPositions[idx] - (BLOCK_GAP + SECTION_GAP) / 2,
        });
      }
    });

    const allHoles = findAllHolesInTrees(state.trees);
    const allInsertPts = allInsertionPointsInTrees(state.trees);

    // -- Palette layout --
    const paletteItems = state.palette.map((block) => ({
      block,
      size: treeSize(block),
    }));
    const paletteContentW =
      paletteItems.length > 0
        ? _.max(paletteItems.map((p) => p.size.w))!
        : 0;
    const paletteWidth = Math.max(
      PALETTE_MIN_WIDTH,
      paletteContentW + LANE_PADDING * 2
    );

    let paletteY = LANE_PADDING;
    const palettePositions = paletteItems.map((item) => {
      const y = paletteY;
      paletteY += item.size.h + BLOCK_GAP;
      return y;
    });
    const paletteHeight = Math.max(
      paletteY + LANE_PADDING - BLOCK_GAP,
      LANE_PADDING * 2 + PALETTE_MIN_WIDTH
    );

    // -- Stage layout --
    const variadicEnabled = state.showVariadicOps;
    const stageRendered = state.trees.map((tree, treeIdx) =>
      renderTree(tree, {
        pickUp: { drag, fullState: state, treeIdx, variadicEnabled },
      })
    );
    const stageContentW =
      stageRendered.length > 0
        ? _.max(stageRendered.map((r) => r.w))!
        : STAGE_MIN_WIDTH;
    const stageWidth = Math.max(
      STAGE_MIN_WIDTH,
      stageContentW + LANE_PADDING * 2
    );

    let stageY = LANE_PADDING;
    const stagePositions = stageRendered.map((r) => {
      const y = stageY;
      stageY += r.h + BLOCK_GAP;
      return y;
    });
    const stageHeight = Math.max(
      stageY + LANE_PADDING - BLOCK_GAP,
      LANE_PADDING * 2 + STAGE_MIN_WIDTH
    );

    // -- Horizontal positions --
    const iconsX = 0;
    const brushKitX = ICON_COL_WIDTH + COL_GAP;
    const paletteX = brushKitX + brushKitWidth + COL_GAP;
    const stageX = paletteX + paletteWidth + COL_GAP;
    const trashX = stageX + stageWidth + COL_GAP;

    // -- Separator lines --
    const sep0X = ICON_COL_WIDTH + COL_GAP / 2;
    const sep1X = brushKitX + brushKitWidth + COL_GAP / 2;
    const sep2X = paletteX + paletteWidth + COL_GAP / 2;
    const sep3X = stageX + stageWidth + COL_GAP / 2;

    // -- Icon column: click to toggle, drag to reorder --
    const iconDefs = sectionOrder.map((section, idx) => {
      const stateKey = SECTION_STATE_KEYS[section];
      return {
        id: `icon-${section}`,
        icon: SECTION_ICONS[section],
        active: state[stateKey],
        stateKey,
        section,
        y:
          LANE_PADDING +
          idx * (ICON_FONT_SIZE + BLOCK_GAP) +
          ICON_FONT_SIZE / 2,
      };
    });

    return (
      <g>
        {/* CSS for icon hover */}
        <defs>
          <style>{`
            [data-section-active], [data-section-inactive] {
              transition: fill 0.1s;
              cursor: pointer;
            }
            [data-section-active]:hover {
              fill: #111 !important;
            }
            [data-section-inactive]:hover {
              fill: #999 !important;
            }
          `}</style>
        </defs>

        {/* Icon column — click to toggle, drag to reorder (uses dragThreshold) */}
        {iconDefs.map(({ id, icon, active, stateKey, section, y }) => (
          <g
            id={id}
            transform={translate(iconsX + LANE_PADDING, y)}
            data-on-drag={drag(() => {
              const others = sectionOrder.filter((s) => s !== section);
              const targets = _.range(others.length + 1).map((pos) => ({
                ...state,
                sectionOrder: [
                  ...others.slice(0, pos),
                  section,
                  ...others.slice(pos),
                ],
              }));
              return span(targets);
            })}
            data-z-index={-5}
            onClick={() =>
              setState(
                { ...state, [stateKey]: !active },
                { seconds: 0, immediate: true }
              )
            }
          >
            <text
              textAnchor="start"
              dominantBaseline="middle"
              fontSize={ICON_FONT_SIZE}
              fill={active ? "#333" : "#ccc"}
              {...(active
                ? { "data-section-active": true }
                : { "data-section-inactive": true })}
            >
              {icon}
            </text>
          </g>
        ))}

        {/* Separator lines */}
        {[
          {
            x: sep0X,
            h: Math.max(
              brushKitHeight,
              ICON_FONT_SIZE * 3 + BLOCK_GAP * 2 + LANE_PADDING * 2
            ),
          },
          { x: sep1X, h: Math.max(brushKitHeight, paletteHeight) },
          { x: sep2X, h: Math.max(paletteHeight, stageHeight) },
          { x: sep3X, h: Math.max(stageHeight, TRASH_SIZE) },
        ].map(({ x, h }, idx) => (
          <line
            x1={x}
            y1={SEP_INSET}
            x2={x}
            y2={h - SEP_INSET}
            stroke="#ddd"
            strokeWidth={1}
            strokeLinecap="round"
            id={`sep-${idx}`}
            data-z-index={-10}
          />
        ))}

        {/* Section dividers (horizontal lines between brush kit sections) */}
        {brushDividers.map(({ id, y }) => (
          <line
            id={id}
            x1={brushKitX + LANE_PADDING}
            y1={y}
            x2={brushKitX + brushKitWidth - LANE_PADDING}
            y2={y}
            stroke="#ddd"
            strokeWidth={1}
            data-z-index={-10}
          />
        ))}

        {/* Brush kit items */}
        {brushKitItemData.map(({ block, displayTree }, idx) => {
          const toolkitIdx = state.toolkit.indexOf(block);

          return (
            <g
              id={`brush-item-${block.key}`}
              transform={translate(
                brushKitX + LANE_PADDING + brushKitXOffsets[idx],
                brushKitPositions[idx]
              )}
            >
              {
                renderTree(displayTree, {
                  pointerEventsNone: true,
                  rootOnDrag: drag(() => {
                    const stateWithout = produce(state, (draft) => {
                      draft.toolkit[toolkitIdx].key += "-r";
                    });
                    const node = makeNodeForItem(block);

                    // Hole targets (for any section)
                    const holeTargets = allHoles.map(
                      ({ treeIdx, holeId }) =>
                        removeStageHoles({
                          ...stateWithout,
                          trees: replaceInTrees(
                            stateWithout.trees,
                            treeIdx,
                            holeId,
                            node
                          ),
                        })
                    );

                    // Variadic insertion targets
                    const insertTargets =
                      block.section === "variadic" ||
                      block.section === "atoms"
                        ? allInsertPts.map(
                            ({ treeIdx, parentId, index }) =>
                              removeStageHoles({
                                ...stateWithout,
                                trees: insertInTrees(
                                  stateWithout.trees,
                                  treeIdx,
                                  parentId,
                                  index,
                                  node
                                ),
                              })
                          )
                        : [];

                    // Stage insertion targets (add as new tree)
                    const stageTargets = stageInsertionTargets(
                      stateWithout,
                      node
                    ).map(removeStageHoles);

                    return floating(
                      [
                        ...holeTargets,
                        ...insertTargets,
                        ...stageTargets,
                      ],
                      { backdrop: stateWithout }
                    );
                  }),
                }).element
              }
            </g>
          );
        })}

        {/* Palette items */}
        {paletteItems.map(({ block }, idx) =>
          renderTree(block, {
            rootTransform: translate(
              paletteX + LANE_PADDING,
              palettePositions[idx]
            ),
            pointerEventsNone: true,
            flatZIndex: true,
            rootOnDrag: drag(({ altKey }) => {
              if (altKey) {
                const stateWithClone = produce(state, (draft) => {
                  draft.palette[idx] = cloneTreeWithFreshIds(block);
                });
                const holes = findAllHolesInTrees(stateWithClone.trees);
                const placeTargets = holes.map(
                  ({ treeIdx: ti, holeId }) =>
                    removeStageHoles({
                      ...stateWithClone,
                      trees: replaceInTrees(
                        stateWithClone.trees,
                        ti,
                        holeId,
                        block
                      ),
                    })
                );
                const palTargets = paletteInsertionTargets(
                  stateWithClone,
                  block
                );
                const stageTargets = stageInsertionTargets(
                  stateWithClone,
                  block
                ).map(removeStageHoles);
                return floating(
                  [...placeTargets, ...palTargets, ...stageTargets, state],
                  { backdrop: stateWithClone }
                );
              }

              const stateWithout = produce(state, (draft) => {
                draft.palette.splice(idx, 1);
              });
              const holes = findAllHolesInTrees(stateWithout.trees);
              const placeTargets = holes.map(
                ({ treeIdx: ti, holeId }) =>
                  removeStageHoles({
                    ...stateWithout,
                    trees: replaceInTrees(
                      stateWithout.trees,
                      ti,
                      holeId,
                      block
                    ),
                  })
              );
              const reorderTargets = paletteInsertionTargets(
                stateWithout,
                block
              );
              const stageTargets = stageInsertionTargets(
                stateWithout,
                block
              ).map(removeStageHoles);
              const eraseState: State = { ...stateWithout, trashed: block };
              const cleanState: State = {
                ...stateWithout,
                trashed: undefined,
              };
              return floating(
                [
                  ...placeTargets,
                  ...reorderTargets,
                  ...stageTargets,
                  andThen(
                    removeStageHoles(eraseState),
                    removeStageHoles(cleanState)
                  ),
                ],
                { backdrop: stateWithout }
              );
            }),
          }).element
        )}

        {/* Stage trees — using rootTransform so root elements are hoisted directly */}
        {stageRendered.map((_, idx) =>
          renderTree(state.trees[idx], {
            pickUp: {
              drag,
              fullState: state,
              treeIdx: idx,
              variadicEnabled,
            },
            rootTransform: translate(
              stageX + LANE_PADDING,
              stagePositions[idx]
            ),
          }).element
        )}

        {/* Trash zone — bare icon */}
        <g transform={translate(trashX, 0)}>
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
      </g>
    );
  };
}
