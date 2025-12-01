import _ from "lodash";
import { ConfigCheckbox } from "./config-controls";
import { ConfigPanelProps } from "./Demo";
import { span } from "./DragSpec";
import { SvgElem } from "./jsx-flatten";
import { overlapIntervals } from "./layout";
import { Manipulable, translate } from "./manipulable";
import {
  buildHasseDiagram,
  HasseDiagram,
  tree3,
  tree7,
  TreeMorph,
  TreeNode,
} from "./trees";
import { Vec2, Vec2able } from "./vec2";

export namespace OrderPreserving {
  export type State = {
    domainTree: TreeNode;
    codomainTree: TreeNode;
    hasseDiagram: HasseDiagram;
    curMorphIdx: number;
    yForTradRep: number;
  };

  export type Config = {
    showTradRep: boolean;
  };

  export const defaultConfig: Config = {
    showTradRep: false,
  };

  export const manipulable: Manipulable<State, Config> = ({
    state,
    drag,
    config,
  }) => {
    const morph = state.hasseDiagram.nodes[state.curMorphIdx];
    const elements: SvgElem[] = [];
    const finalizers = new Finalizers();

    const r = drawBgTree(
      state.codomainTree,
      state.domainTree,
      morph,
      finalizers,
      state,
      drag
    );
    elements.push(r.element);

    if (config.showTradRep) {
      const domNodeCenters: Record<string, PointInGroup> = {};
      const domR = drawTree(
        state.domainTree,
        "domain",
        "fg",
        domNodeCenters,
        finalizers
      );
      elements.push(
        <g transform={translate(0, state.yForTradRep)}>{domR.element}</g>
      );

      const codNodeCenters: Record<string, PointInGroup> = {};
      const codR = drawTree(
        state.codomainTree,
        "codomain",
        "bg",
        codNodeCenters,
        finalizers
      );
      elements.push(
        <g transform={translate(domR.w + 40, state.yForTradRep)}>
          {codR.element}
        </g>
      );

      for (const [domElem, codElem] of Object.entries(morph)) {
        finalizers.push(() => {
          const from = resolvePoint(domNodeCenters[domElem]);
          const to = resolvePoint(codNodeCenters[codElem]);
          const fromAdjusted = from.towards(to, FG_NODE_SIZE / 2);
          const mid = from.lerp(to, 0.5).add(Vec2(0, -10));

          return (
            <path
              id={`morphism-arrow-${domElem}`}
              d={`M ${fromAdjusted.x} ${fromAdjusted.y} Q ${mid.x} ${mid.y} ${to.x} ${to.y}`}
              fill="none"
              stroke="#4287f5"
              strokeWidth={2}
              data-z-index={-1}
            />
          );
        });
      }
    }

    return <g>{[...elements, ...finalizers.resolve()]}</g>;
  };

  export const state1: State = {
    domainTree: tree3,
    codomainTree: tree3,
    hasseDiagram: buildHasseDiagram(tree3, tree3),
    curMorphIdx: 0,
    yForTradRep: 300,
  };

  export const state2: State = {
    domainTree: tree7,
    codomainTree: tree7,
    hasseDiagram: buildHasseDiagram(tree7, tree7),
    curMorphIdx: 0,
    yForTradRep: 500,
  };

  export function ConfigPanel({ config, setConfig }: ConfigPanelProps<Config>) {
    return (
      <ConfigCheckbox
        value={config.showTradRep}
        onChange={(newValue) => setConfig({ ...config, showTradRep: newValue })}
      >
        Show traditional representation
      </ConfigCheckbox>
    );
  }

  // # Deferred rendering system

  type PointInGroup = {
    group: GroupContext;
    localPos: Vec2;
  };

  type GroupContext = {
    parent: GroupContext | null;
    offset: Vec2;
  };

  class Finalizers {
    private fns: (() => SvgElem)[] = [];

    push(fn: () => SvgElem) {
      this.fns.push(fn);
    }

    resolve(): SvgElem[] {
      return this.fns.map((fn) => fn());
    }
  }

  function pointInGroup(group: GroupContext, localPos: Vec2able): PointInGroup {
    return {
      group,
      localPos: Vec2(localPos),
    };
  }

  function resolvePoint(point: PointInGroup): Vec2 {
    let pos = point.localPos;
    let ctx: GroupContext | null = point.group;
    while (ctx) {
      pos = pos.add(ctx.offset);
      ctx = ctx.parent;
    }
    return pos;
  }

  function createGroupContext(
    parent: GroupContext | null,
    offset: Vec2able
  ): GroupContext {
    return {
      parent,
      offset: Vec2(offset),
    };
  }

  // # Drawing constants

  const BG_NODE_PADDING = 10;
  const BG_NODE_GAP = 40;
  const FG_NODE_SIZE = 40;
  const FG_NODE_GAP = 20;

  // # Main drawing functions

  function drawBgTree(
    bgNode: TreeNode,
    fgNode: TreeNode,
    morph: TreeMorph,
    finalizers: Finalizers,
    state: State,
    drag: any
  ): { element: SvgElem; w: number; h: number } {
    const rootCtx = createGroupContext(null, Vec2(0));
    const result = drawBgSubtree(
      bgNode,
      [fgNode],
      morph,
      {},
      finalizers,
      rootCtx,
      state,
      drag
    );
    return {
      element: result.element,
      w: result.w,
      h: result.h,
    };
  }

  function drawBgSubtree(
    bgNode: TreeNode,
    fgNodes: TreeNode[],
    morph: TreeMorph,
    fgNodeCenters: Record<string, PointInGroup>,
    finalizers: Finalizers,
    parentCtx: GroupContext,
    state: State,
    drag: any
  ): {
    element: SvgElem;
    w: number;
    h: number;
    rootCenter: PointInGroup;
  } {
    const elements: SvgElem[] = [];

    const [fgNodesHere, fgNodesBelow] = _.partition(
      fgNodes,
      (n) => morph[n.id] === bgNode.id
    );

    const bgNodeR = drawBgNodeWithFgNodesInside(
      morph,
      bgNode,
      fgNodesHere,
      fgNodeCenters,
      finalizers,
      parentCtx,
      state,
      drag
    );

    fgNodesBelow.push(...bgNodeR.fgNodesBelow);

    if (bgNode.children.length === 0) {
      return {
        element: bgNodeR.element,
        w: bgNodeR.w,
        h: bgNodeR.h,
        rootCenter: bgNodeR.rootCenter,
      };
    }

    const childCtx = createGroupContext(parentCtx, Vec2(0));
    const childRs = bgNode.children.map((child) =>
      drawBgSubtree(
        child,
        fgNodesBelow,
        morph,
        fgNodeCenters,
        finalizers,
        childCtx,
        state,
        drag
      )
    );

    const childrenWidth =
      _.sumBy(childRs, (r) => r.w) + BG_NODE_GAP * (childRs.length - 1);

    const params = {
      aLength: bgNodeR.w,
      aAnchor: bgNodeR.w / 2,
      bLength: childrenWidth,
      bAnchor: childrenWidth / 2,
    };
    const { aOffset, bOffset, length: width } = overlapIntervals(params);

    elements.push(<g transform={translate(aOffset, 0)}>{bgNodeR.element}</g>);

    let x = bOffset;
    const y = bgNodeR.h + BG_NODE_GAP;
    let maxY = bgNodeR.h;

    for (const [i, childR] of childRs.entries()) {
      const child = bgNode.children[i];
      const childOffset = Vec2(x, y);
      elements.push(
        <g id={`bg-child-${child.id}`} transform={translate(childOffset)}>
          {childR.element}
        </g>
      );

      x += childR.w + BG_NODE_GAP;
      maxY = Math.max(maxY, y + childR.h);

      const childCtxWithOffset = createGroupContext(parentCtx, childOffset);
      const resolvedChildCenter = {
        ...childR.rootCenter,
        group: childCtxWithOffset,
      };

      finalizers.push(() => {
        const from = resolvePoint(bgNodeR.rootCenter);
        const to = resolvePoint(resolvedChildCenter);
        return (
          <line
            id={`bg-edge-${bgNode.id}-${child.id}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="lightgray"
            strokeWidth={12}
            data-z-index={-1}
          />
        );
      });
    }

    return {
      element: <g>{elements}</g>,
      w: width,
      h: maxY,
      rootCenter: {
        ...bgNodeR.rootCenter,
        group: createGroupContext(parentCtx, Vec2(aOffset, 0)),
      },
    };
  }

  function drawBgNodeWithFgNodesInside(
    morph: TreeMorph,
    bgNode: TreeNode,
    fgNodesHere: TreeNode[],
    fgNodeCenters: Record<string, PointInGroup>,
    finalizers: Finalizers,
    parentCtx: GroupContext,
    state: State,
    drag: any
  ): {
    element: SvgElem;
    w: number;
    h: number;
    fgNodesBelow: TreeNode[];
    rootCenter: PointInGroup;
  } {
    const elementsInRect: SvgElem[] = [];

    let x = BG_NODE_PADDING;
    let y = BG_NODE_PADDING;
    let maxX = x + 10;
    let maxY = y + 10;
    const fgNodesBelow: TreeNode[] = [];

    const rectCtx = createGroupContext(parentCtx, Vec2(0));

    for (const fgNode of fgNodesHere) {
      const fgCtx = createGroupContext(rectCtx, Vec2(x, y));
      const r = drawFgSubtreeInBgNode(
        fgNode,
        bgNode.id,
        morph,
        fgNodeCenters,
        finalizers,
        fgCtx,
        state,
        drag
      );
      elementsInRect.push(
        <g
          id={`drawBgNodeWithFgNodesInside-fg-child-${fgNode.id}`}
          transform={translate(x, y)}
        >
          {r.element}
        </g>
      );

      x += r.w + FG_NODE_GAP;
      maxX = Math.max(maxX, x - FG_NODE_GAP);
      maxY = Math.max(maxY, y + r.h);

      fgNodesBelow.push(...r.fgNodesBelow);
    }

    maxX += BG_NODE_PADDING;
    maxY += BG_NODE_PADDING;

    const nodeCenterInRect = Vec2(maxX / 2, maxY / 2);
    const circleRadius = nodeCenterInRect.len();
    const nodeCenterInCircle = Vec2(circleRadius);
    const offset = nodeCenterInCircle.sub(nodeCenterInRect);

    const finalCtx = createGroupContext(parentCtx, offset);

    return {
      element: (
        <g>
          <circle
            id={`bg-circle-${bgNode.id}`}
            cx={nodeCenterInCircle.x}
            cy={nodeCenterInCircle.y}
            r={circleRadius}
            fill="lightgray"
            data-z-index={-1}
          />
          <g transform={translate(offset)}>{elementsInRect}</g>
        </g>
      ),
      w: 2 * circleRadius,
      h: 2 * circleRadius,
      fgNodesBelow,
      rootCenter: pointInGroup(finalCtx, nodeCenterInCircle),
    };
  }

  function drawFgSubtreeInBgNode(
    fgNode: TreeNode,
    bgNodeId: string,
    morph: TreeMorph,
    fgNodeCenters: Record<string, PointInGroup>,
    finalizers: Finalizers,
    parentCtx: GroupContext,
    state: State,
    drag: any
  ): {
    element: SvgElem;
    fgNodesBelow: TreeNode[];
    w: number;
    h: number;
  } {
    const childrenElements: SvgElem[] = [];
    const fgNodesBelow: TreeNode[] = [];
    let childrenX = 0;
    let childrenMaxH = 0;
    const childrenCtx = createGroupContext(
      parentCtx,
      Vec2(0, FG_NODE_SIZE + FG_NODE_GAP)
    );

    for (const [i, child] of fgNode.children.entries()) {
      if (i > 0) {
        childrenX += FG_NODE_GAP;
      }

      const edgeKey = `${fgNode.id}->${child.id}`;
      if (morph[child.id] === bgNodeId) {
        const childCtx = createGroupContext(childrenCtx, Vec2(childrenX, 0));
        const r = drawFgSubtreeInBgNode(
          child,
          bgNodeId,
          morph,
          fgNodeCenters,
          finalizers,
          childCtx,
          state,
          drag
        );
        childrenElements.push(
          <g
            id={`drawFgSubtreeInBgNode-fg-child-${child.id}`}
            transform={translate(childrenX, 0)}
          >
            {r.element}
          </g>
        );
        fgNodesBelow.push(...r.fgNodesBelow);
        childrenX += r.w;
        childrenMaxH = Math.max(childrenMaxH, r.h);

        const resolvedChildCenter = { ...fgNodeCenters[child.id] };
        finalizers.push(() => {
          const from = resolvePoint(fgNodeCenters[fgNode.id]);
          const to = resolvePoint(resolvedChildCenter);
          return (
            <path
              id={edgeKey}
              d={`M ${from.x} ${from.y} Q ${from.x} ${from.y} ${to.x} ${to.y}`}
              fill="none"
              stroke="black"
              strokeWidth={2}
            />
          );
        });
      } else {
        fgNodesBelow.push(child);

        const childrenXBefore = childrenX;
        finalizers.push(() => {
          const myCenter = fgNodeCenters[fgNode.id];
          const intermediate = resolvePoint({
            group: childrenCtx,
            localPos: Vec2(childrenXBefore, 0),
          });
          const childCenter = fgNodeCenters[child.id];
          const from = resolvePoint(myCenter);
          const to = resolvePoint(childCenter);
          return (
            <path
              id={edgeKey}
              d={`M ${from.x} ${from.y} Q ${intermediate.x} ${intermediate.y} ${to.x} ${to.y}`}
              fill="none"
              stroke="black"
              strokeWidth={2}
            />
          );
        });
      }
    }

    let nodeX;
    const childrenContainer = (
      <g transform={translate(0, FG_NODE_SIZE + FG_NODE_GAP)}>
        {childrenElements}
      </g>
    );

    if (childrenX < FG_NODE_SIZE) {
      nodeX = FG_NODE_SIZE / 2;
    } else {
      nodeX = childrenX / 2;
    }

    const nodeCenter = Vec2(nodeX, FG_NODE_SIZE / 2);
    fgNodeCenters[fgNode.id] = pointInGroup(parentCtx, nodeCenter);

    return {
      element: (
        <g className="drawFgSubtreeInBgNode">
          <circle
            id={fgNode.id}
            transform={translate(nodeCenter)}
            cx={0}
            cy={0}
            r={FG_NODE_SIZE / 2}
            fill="black"
            data-on-drag={drag(() => {
              const { hasseDiagram, curMorphIdx } = state;
              const curMorph = hasseDiagram.nodes[curMorphIdx];
              const adjMorphIdxes = _.range(hasseDiagram.nodes.length).filter(
                (nodeIdx) => {
                  const morph = hasseDiagram.nodes[nodeIdx];
                  return Object.entries(morph).every(
                    ([domainElem, codomainElem]) =>
                      domainElem === fgNode.id ||
                      curMorph[domainElem] === codomainElem
                  );
                }
              );
              return span(
                adjMorphIdxes.map((idx) => ({
                  ...state,
                  curMorphIdx: idx,
                }))
              );
            })}
          />
          {childrenContainer}
        </g>
      ),
      fgNodesBelow,
      w: Math.max(childrenX, FG_NODE_SIZE),
      h: FG_NODE_SIZE + (childrenMaxH > 0 ? FG_NODE_GAP + childrenMaxH : 0),
    };
  }

  function drawTree(
    node: TreeNode,
    keyPrefix: string,
    style: "fg" | "bg",
    nodeCenters: Record<string, PointInGroup>,
    finalizers: Finalizers
  ): {
    element: SvgElem;
    w: number;
    h: number;
  } {
    const rootCtx = createGroupContext(null, Vec2(0));
    const r = drawSubtree(
      node,
      keyPrefix,
      style,
      nodeCenters,
      finalizers,
      rootCtx
    );
    return {
      element: r.element,
      w: r.w,
      h: r.h,
    };
  }

  function drawSubtree(
    node: TreeNode,
    keyPrefix: string,
    style: "fg" | "bg",
    nodeCenters: Record<string, PointInGroup>,
    finalizers: Finalizers,
    parentCtx: GroupContext
  ): {
    element: SvgElem;
    w: number;
    h: number;
  } {
    const childrenElements: SvgElem[] = [];
    let childrenX = 0;
    let childrenMaxH = 0;
    const childrenCtx = createGroupContext(
      parentCtx,
      Vec2(0, FG_NODE_SIZE + FG_NODE_GAP)
    );

    for (const [i, child] of node.children.entries()) {
      if (i > 0) {
        childrenX += FG_NODE_GAP;
      }
      const childCtx = createGroupContext(childrenCtx, Vec2(childrenX, 0));
      const r = drawSubtree(
        child,
        keyPrefix,
        style,
        nodeCenters,
        finalizers,
        childCtx
      );
      childrenElements.push(
        <g
          id={`subtree-bg-child-${child.id}`}
          transform={translate(childrenX, 0)}
        >
          {r.element}
        </g>
      );
      childrenX += r.w;
      childrenMaxH = Math.max(childrenMaxH, r.h);

      const resolvedChildCenter = { ...nodeCenters[child.id] };
      finalizers.push(() => {
        const from = resolvePoint(nodeCenters[node.id]);
        const to = resolvePoint(resolvedChildCenter);
        return (
          <path
            id={`${keyPrefix}-${node.id}->${child.id}`}
            d={`M ${from.x} ${from.y} Q ${from.x} ${from.y} ${to.x} ${to.y}`}
            fill="none"
            stroke={style === "fg" ? "black" : "lightgray"}
            strokeWidth={style === "fg" ? 2 : 12}
          />
        );
      });
    }

    let nodeX;
    const childrenContainer =
      childrenElements.length > 0 ? (
        <g transform={translate(0, FG_NODE_SIZE + FG_NODE_GAP)}>
          {childrenElements}
        </g>
      ) : null;

    if (childrenX < FG_NODE_SIZE) {
      nodeX = FG_NODE_SIZE / 2;
    } else {
      nodeX = childrenX / 2;
    }

    const nodeCenter = Vec2(nodeX, FG_NODE_SIZE / 2);
    nodeCenters[node.id] = pointInGroup(parentCtx, nodeCenter);

    return {
      element: (
        <g>
          <circle
            id={`${keyPrefix}-${node.id}`}
            transform={translate(nodeCenter)}
            cx={0}
            cy={0}
            r={FG_NODE_SIZE / 2}
            fill={style === "fg" ? "black" : "lightgray"}
          />
          {childrenContainer}
        </g>
      ),
      w: Math.max(childrenX, FG_NODE_SIZE),
      h: FG_NODE_SIZE + (childrenMaxH > 0 ? FG_NODE_GAP + childrenMaxH : 0),
    };
  }
}
