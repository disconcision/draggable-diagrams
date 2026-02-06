// Nool Tree with Macro Recorder: derive rewrite rules by demonstration
// Enter macro mode → freely rearrange the tree → exit → rule derived from diff

import { produce } from "immer";
import _ from "lodash";
import {
  allPossibleRewrites,
  isWildcard,
  Pattern,
  rewr,
  Rewrite,
  Tree,
} from "../asts";
import { ConfigCheckbox, ConfigPanelProps } from "../configurable";
import { configurableManipulable } from "../demos";
import { DragSpec, floating, span, straightTo } from "../DragSpec";
import { Drag } from "../manipulable";
import { Svgx } from "../svgx";
import { translate } from "../svgx/helpers";

export namespace NoolTreeMacro {
  // # State

  export type State = {
    tree: Tree;
    gutter: Tree[];
  };

  export const state1: State = {
    tree: {
      id: "root",
      label: "+",
      children: [
        {
          id: "root-1",
          label: "+",
          children: [
            { id: "root-1-1", label: "⛅", children: [] },
            { id: "root-1-2", label: "🍄", children: [] },
          ],
        },
        { id: "root-2", label: "🎲", children: [] },
      ],
    },
    gutter: [],
  };

  // # Built-in rewrites

  const builtInRewrites: Rewrite[] = [
    rewr("(+ #A #B)", "(+ B A)"),
    rewr("(× #A #B)", "(× B A)"),
  ];

  // # Tree helpers

  function isOp(label: string): boolean {
    return label === "+" || label === "×" || label === "-";
  }

  function expectedArity(label: string): number {
    if (label === "+" || label === "×") return 2;
    if (label === "-") return 1;
    return 0;
  }

  function arityOk(tree: Tree): boolean {
    const expected = expectedArity(tree.label);
    if (expected === 0) return tree.children.length === 0;
    return tree.children.length === expected;
  }

  function treeIsWellFormed(tree: Tree): boolean {
    if (!arityOk(tree)) return false;
    return tree.children.every(treeIsWellFormed);
  }

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

  // # Rule derivation from before/after tree diff

  /**
   * Derive a rewrite rule from a before and after tree.
   *
   * A node is "stable" if it exists in both trees with the same label,
   * same children IDs in the same order, and all children are also stable.
   * Stable subtrees become wildcards; everything else becomes operators.
   */
  function deriveRule(before: Tree, after: Tree): Rewrite | null {
    const beforeMap = new Map<string, Tree>();
    const afterMap = new Map<string, Tree>();
    function collectIds(tree: Tree, map: Map<string, Tree>) {
      map.set(tree.id, tree);
      for (const child of tree.children) collectIds(child, map);
    }
    collectIds(before, beforeMap);
    collectIds(after, afterMap);

    // Determine stability (bottom-up via recursive check)
    const stableIds = new Set<string>();
    function checkStable(nodeId: string): boolean {
      if (stableIds.has(nodeId)) return true;
      const bNode = beforeMap.get(nodeId);
      const aNode = afterMap.get(nodeId);
      if (!bNode || !aNode) return false;
      if (bNode.label !== aNode.label) return false;
      if (bNode.children.length !== aNode.children.length) return false;
      for (let i = 0; i < bNode.children.length; i++) {
        if (bNode.children[i].id !== aNode.children[i].id) return false;
        if (!checkStable(bNode.children[i].id)) return false;
      }
      stableIds.add(nodeId);
      return true;
    }
    for (const id of beforeMap.keys()) checkStable(id);

    // If root is stable, nothing changed
    if (stableIds.has(before.id)) return null;

    // Assign wildcard names to stable subtrees
    let nextWildcard = 0;
    const wildcardNames = new Map<string, string>();
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    function getWildcardName(id: string): string {
      if (!wildcardNames.has(id)) {
        wildcardNames.set(id, letters[nextWildcard++] || `W${nextWildcard}`);
      }
      return wildcardNames.get(id)!;
    }

    // Build pattern from tree, converting stable subtrees to wildcards
    function buildPattern(tree: Tree, isRoot: boolean): Pattern {
      if (stableIds.has(tree.id)) {
        return {
          type: "wildcard",
          id: getWildcardName(tree.id),
          isTrigger: false,
        };
      }
      return {
        type: "op",
        label: tree.label,
        id: tree.label,
        children: tree.children.map((c) => buildPattern(c, false)),
        isTrigger: isRoot,
      };
    }

    // Build LHS first (assigns wildcard names in LHS traversal order)
    const fromPattern = buildPattern(before, true);
    const toPattern = buildPattern(after, false);

    return { from: fromPattern, to: toPattern };
  }

  // # Module-level bridge for config↔state communication

  let _currentTree: Tree | null = null;

  // # Layout constants

  const T_GAP = 10;
  const T_PADDING = 5;
  const T_LABEL_WIDTH = 20;
  const T_LABEL_MIN_HEIGHT = 20;
  const T_EMPTY_CHILD_W = 12;
  const T_EMPTY_CHILD_H = 12;
  const BLOCK_GAP = 8;
  const TOOLKIT_PADDING = 8;
  const ZONE_GAP = 15;
  const GUTTER_MIN_WIDTH = 46;
  const TRASH_SIZE = 30;

  // Toolkit blocks for macro mode
  const TOOLKIT_BLOCKS: { label: string }[] = [
    { label: "+" },
    { label: "×" },
    { label: "-" },
    { label: "0" },
    { label: "⛅" },
    { label: "🍄" },
    { label: "🎲" },
    { label: "🦠" },
    { label: "🐝" },
  ];

  let nextToolkitId = 0;
  let nextPlaceholderId = 0;

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

  // # Config

  type Config = {
    macroMode: boolean;
    beforeTree: Tree | null;
    userRules: Rewrite[];
    enableBuiltInRules: boolean;
    enableEmergeAnimation: boolean;
  };

  const defaultConfig: Config = {
    macroMode: false,
    beforeTree: null,
    userRules: [],
    enableBuiltInRules: true,
    enableEmergeAnimation: true,
  };

  // # Manipulable

  export const manipulable = configurableManipulable<State, Config>(
    { defaultConfig, ConfigPanel, LeftPanel: MacroLeftPanel },
    (config, { state, drag }) => {
      // Bridge: expose current tree to the config panel
      _currentTree = state.tree;

      if (config.macroMode) {
        return renderMacroMode(state, drag, config);
      } else {
        return renderNormalMode(state, drag, config);
      }
    }
  );

  // # Normal mode rendering: rewrite rules

  function renderNormalMode(
    state: State,
    drag: Drag<State>,
    config: Config
  ): Svgx {
    const activeRewrites = [
      ...(config.enableBuiltInRules ? builtInRewrites : []),
      ...config.userRules,
    ];

    function dragTargets(draggedKey: string): DragSpec<State> {
      const newTrees = allPossibleRewrites(
        state.tree,
        activeRewrites,
        draggedKey
      );
      return [
        span(state),
        newTrees.map((t) => straightTo({ ...state, tree: t, gutter: [] })),
      ];
    }

    return renderNormalTree(state.tree, drag, dragTargets, config, 0).element;
  }

  function renderNormalTree(
    tree: Tree,
    drag: Drag<State>,
    dragTargets: (id: string) => DragSpec<State>,
    config: Config,
    depth: number
  ): { element: Svgx; w: number; h: number } {
    const renderedChildren = tree.children.map((child) =>
      renderNormalTree(child, drag, dragTargets, config, depth + 1)
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
    const rx = Math.min(14, 0.3 * Math.min(w, h));

    const element = (
      <g
        id={tree.id}
        data-on-drag={drag(() => dragTargets(tree.id))}
        data-z-index={depth}
        data-emerge-from={
          config.enableEmergeAnimation ? tree.emergeFrom : undefined
        }
        data-emerge-mode={tree.emergeMode}
      >
        <rect
          x={0}
          y={0}
          width={w}
          height={h}
          rx={rx}
          stroke="gray"
          strokeWidth={1}
          fill="transparent"
        />
        <text
          x={T_PADDING + T_LABEL_WIDTH / 2}
          y={T_PADDING + innerH / 2}
          dominantBaseline="middle"
          textAnchor="middle"
          fontSize={20}
          fill="black"
        >
          {tree.label}
        </text>
        {renderedChildren.length > 0 && (
          <g
            transform={translate(
              T_PADDING + T_LABEL_WIDTH + T_GAP,
              T_PADDING
            )}
          >
            {renderedChildrenElements}
          </g>
        )}
      </g>
    );

    return { element, w, h };
  }

  // # Macro mode rendering: freeform editing with toolkit/gutter

  function renderMacroTree(
    tree: Tree,
    drag: Drag<State>,
    fullState: State,
    depth: number,
    opts?: {
      rootOnDrag?: ReturnType<Drag<State>>;
      rootTransform?: string;
      pointerEventsNone?: boolean;
      opacity?: number;
      flatZIndex?: boolean;
    }
  ): { element: Svgx; w: number; h: number } {
    const isOpNode = isOp(tree.label);
    const valid = arityOk(tree);

    const renderedChildren: { element: Svgx; w: number; h: number }[] = [];
    let childY = 0;
    for (const child of tree.children) {
      const r = renderMacroTree(child, drag, fullState, depth + 1, {
        rootTransform: translate(0, childY),
      });
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

    // Pick-up drag for freeform rearrangement
    const pickUpDrag = drag(() => {
      const nodeId = tree.id;
      const parentInfo = findParentAndIndex(fullState.tree, nodeId);

      // Root node: can't remove root, only offer gutter
      if (!parentInfo) {
        const phId = `placeholder-${nextPlaceholderId++}`;
        const stateWithout: State = {
          ...fullState,
          tree: { id: phId, label: "□", children: [] },
        };
        const gutterTargets = gutterInsertionTargets(stateWithout, tree);
        return floating([...gutterTargets, fullState], {
          backdrop: stateWithout,
        });
      }

      // Remove from parent
      const stateWithout: State = {
        ...fullState,
        tree: removeNode(fullState.tree, nodeId),
      };

      // All possible insertion points
      const insertionPoints = allInsertionPoints(stateWithout.tree);
      const insertTargets = insertionPoints.map(({ parentId, index }) => ({
        ...stateWithout,
        tree: insertChild(stateWithout.tree, parentId, index, tree),
      }));

      // Swap targets
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

      return floating(
        [
          ...insertTargets,
          ...swapTargets,
          ...gutterTargets,
          fullState, // put back
        ],
        { backdrop: stateWithout }
      );
    });

    const zIndex = opts?.flatZIndex ? 0 : depth;
    const strokeColor = !valid ? "#dd3333" : "gray";
    const labelColor = !valid ? "#dd3333" : "black";
    const w = innerW + T_PADDING * 2;
    const h = innerH + T_PADDING * 2;
    const rx = Math.min(14, 0.3 * Math.min(w, h));

    const element = (
      <g
        id={tree.id}
        transform={opts?.rootTransform}
        data-on-drag={opts?.rootOnDrag || pickUpDrag}
        data-z-index={zIndex}
        opacity={opts?.opacity}
      >
        <rect
          x={0}
          y={0}
          width={w}
          height={h}
          rx={rx}
          stroke={strokeColor}
          strokeWidth={1}
          fill="transparent"
        />
        <text
          x={T_PADDING + T_LABEL_WIDTH / 2}
          y={T_PADDING + innerH / 2}
          dominantBaseline="middle"
          textAnchor="middle"
          fontSize={20}
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

  function renderMacroMode(
    state: State,
    drag: Drag<State>,
    _config: Config
  ): Svgx {
    // Toolkit
    const toolkitItems = TOOLKIT_BLOCKS.map((block) => {
      const tree: Tree = {
        id: `tk-${block.label}`,
        label: block.label,
        children: [],
      };
      return { block, tree, size: treeSize(tree) };
    });
    const maxToolkitW = _.max(toolkitItems.map((t) => t.size.w)) ?? 30;
    const toolkitWidth = maxToolkitW + TOOLKIT_PADDING * 2;

    let toolkitY = TOOLKIT_PADDING;
    const toolkitPositions = toolkitItems.map((item) => {
      const y = toolkitY;
      toolkitY += item.size.h + BLOCK_GAP;
      return y;
    });
    const toolkitHeight = toolkitY + TOOLKIT_PADDING - BLOCK_GAP;

    const insertionPoints = allInsertionPoints(state.tree);

    // Gutter
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
    const treeR = renderMacroTree(state.tree, drag, state, 0);

    const trashX = treeOffsetX + treeR.w + ZONE_GAP;
    const totalHeight = Math.max(toolkitHeight, gutterHeight, treeR.h);

    return (
      <g>
        {/* Recording indicator border */}
        <rect
          x={-8}
          y={-8}
          width={trashX + TRASH_SIZE + 16}
          height={totalHeight + 16}
          fill="none"
          stroke="#7c3aed"
          strokeWidth={3}
          strokeDasharray="8,4"
          rx={12}
          id="macro-border"
          data-z-index={-20}
        />

        {/* Toolkit */}
        <rect
          x={0}
          y={0}
          width={toolkitWidth}
          height={toolkitHeight}
          fill="#f0f0f0"
          stroke="#ccc"
          strokeWidth={1}
          rx={Math.min(14, 0.3 * Math.min(toolkitWidth, toolkitHeight))}
          id="macro-toolkit-bg"
          data-z-index={-10}
        />
        {toolkitItems.map(({ block, tree }, idx) => (
          <g transform={translate(TOOLKIT_PADDING, toolkitPositions[idx])}>
            {
              renderMacroTree(tree, drag, state, 0, {
                pointerEventsNone: true,
                flatZIndex: true,
                opacity: insertionPoints.length > 0 ? undefined : 0.35,
                rootOnDrag:
                  insertionPoints.length > 0
                    ? drag(() => {
                        const newId = `macro-${block.label}-${nextToolkitId++}`;
                        const newNode: Tree = {
                          id: newId,
                          label: block.label,
                          children: [],
                        };
                        const points = allInsertionPoints(state.tree);
                        const targetStates: State[] = points.map(
                          ({ parentId, index }) => ({
                            ...state,
                            tree: insertChild(
                              state.tree,
                              parentId,
                              index,
                              newNode
                            ),
                          })
                        );
                        return floating(targetStates, { backdrop: state });
                      })
                    : undefined,
              }).element
            }
          </g>
        ))}

        {/* Gutter */}
        <rect
          x={gutterOffsetX}
          y={0}
          width={gutterContentWidth}
          height={Math.max(gutterHeight, toolkitHeight)}
          fill="#f8f8f8"
          stroke="#ddd"
          strokeWidth={1}
          strokeDasharray="4,4"
          rx={Math.min(
            14,
            0.3 *
              Math.min(
                gutterContentWidth,
                Math.max(gutterHeight, toolkitHeight)
              )
          )}
          id="macro-gutter-bg"
          data-z-index={-10}
        />
        {gutterItemData.map(({ block }, idx) =>
          renderMacroTree(block, drag, state, 0, {
            rootTransform: translate(
              gutterOffsetX + TOOLKIT_PADDING,
              gutterPositions[idx]
            ),
            flatZIndex: true,
            rootOnDrag: drag(() => {
              const stateWithout = produce(state, (draft) => {
                draft.gutter.splice(idx, 1);
              });
              const placeTargets: State[] = [];
              const points = allInsertionPoints(stateWithout.tree);
              for (const { parentId, index } of points) {
                placeTargets.push({
                  ...stateWithout,
                  tree: insertChild(
                    stateWithout.tree,
                    parentId,
                    index,
                    block
                  ),
                });
              }
              const reorderTargets = gutterInsertionTargets(
                stateWithout,
                block
              );
              return floating([...placeTargets, ...reorderTargets], {
                backdrop: stateWithout,
              });
            }),
          }).element
        )}

        {/* Trash zone */}
        <g transform={translate(trashX, 0)}>
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
            id="macro-trash-bg"
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
        </g>

        {/* Tree */}
        <g transform={translate(treeOffsetX, 0)}>{treeR.element}</g>
      </g>
    );
  }

  // # Panels

  function MacroLeftPanel({ config, setConfig }: ConfigPanelProps<Config>) {
    if (config.macroMode) {
      const currentTree = _currentTree;
      const wellFormed = currentTree ? treeIsWellFormed(currentTree) : false;

      return (
        <div className="text-xs">
          <div className="flex items-center gap-2 mb-2 text-purple-700 font-medium">
            <span className="inline-block w-2 h-2 bg-purple-600 rounded-full animate-pulse" />
            Recording...
          </div>
          <p className="text-gray-500 mb-3">
            Freely rearrange the tree. Move nodes between operators, add from
            the toolkit, or park in the gutter. When done, stop recording to
            derive a rule.
          </p>
          {!wellFormed && (
            <p className="text-red-500 mb-2">
              Tree has invalid arities (red nodes). Fix before stopping.
            </p>
          )}
          <button
            className={`w-full px-3 py-1.5 rounded text-xs font-medium ${
              wellFormed
                ? "bg-purple-600 text-white hover:bg-purple-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
            disabled={!wellFormed}
            onClick={() => {
              if (!wellFormed || !currentTree || !config.beforeTree) return;
              const rule = deriveRule(config.beforeTree, currentTree);
              setConfig({
                ...config,
                macroMode: false,
                beforeTree: null,
                userRules: rule
                  ? [...config.userRules, rule]
                  : config.userRules,
              });
            }}
          >
            Stop Recording
          </button>
          <button
            className="w-full px-3 py-1.5 mt-2 rounded text-xs font-medium border border-gray-300 text-gray-600 hover:bg-gray-100"
            onClick={() => {
              setConfig({
                ...config,
                macroMode: false,
                beforeTree: null,
              });
            }}
          >
            Cancel
          </button>
        </div>
      );
    }

    return (
      <>
        <ConfigCheckbox
          value={config.enableBuiltInRules}
          onChange={(v) => setConfig({ ...config, enableBuiltInRules: v })}
        >
          <b>Commutativity</b>
          <br />
          Built-in swap rules
        </ConfigCheckbox>
        {config.userRules.length > 0 && (
          <>
            <div className="border-t border-gray-300 my-1" />
            <div className="text-xs font-medium text-gray-700">
              Recorded rules ({config.userRules.length})
            </div>
            {config.userRules.map((rule, i) => (
              <div className="flex items-center justify-between text-xs">
                <span className="text-purple-700 font-mono">
                  {patternToString(rule.from)} → {patternToString(rule.to)}
                </span>
                <button
                  className="text-red-400 hover:text-red-600 ml-1"
                  onClick={() => {
                    const newRules = [...config.userRules];
                    newRules.splice(i, 1);
                    setConfig({ ...config, userRules: newRules });
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </>
        )}
        <div className="border-t border-gray-300 my-1" />
        <button
          className="w-full px-3 py-1.5 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700"
          onClick={() => {
            setConfig({
              ...config,
              macroMode: true,
              beforeTree: _currentTree,
            });
          }}
        >
          Record Macro
        </button>
      </>
    );
  }

  function ConfigPanel({ config, setConfig }: ConfigPanelProps<Config>) {
    return (
      <ConfigCheckbox
        value={config.enableEmergeAnimation}
        onChange={(v) => setConfig({ ...config, enableEmergeAnimation: v })}
      >
        Enable emerge animation
      </ConfigCheckbox>
    );
  }

  // # Helpers

  function patternToString(p: Pattern): string {
    if (isWildcard(p)) {
      return (p.isTrigger ? "#" : "") + p.id;
    }
    const trigger = p.isTrigger ? "#" : "";
    const children = p.children.map(patternToString).join(" ");
    return `${trigger}(${p.label} ${children})`;
  }
}
