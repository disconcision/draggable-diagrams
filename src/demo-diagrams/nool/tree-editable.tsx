// Editable copy of nool-tree.tsx for the Nool Playground
// This can be modified independently of the original demo

import _ from "lodash";
import { ReactNode } from "react";
import {
  allPossibleRewrites,
  isWildcard,
  Pattern,
  rewr,
  Rewrite,
  Tree,
} from "../../asts";
import { ConfigCheckbox, ConfigPanelProps } from "../../configurable";
import { configurableManipulable } from "../../demos";
import { DragSpec, span, straightTo } from "../../DragSpec";
import { Drag } from "../../manipulable";
import { Svgx } from "../../svgx";
import { translate } from "../../svgx/helpers";

export namespace NoolTreeEditable {
  // # state etc

  export type State = Tree;

  // Single initial state for the Nool Playground (with emojis!)
  export const state1: State = {
    id: "root",
    label: "+",
    children: [
      {
        id: "root-1",
        label: "+",
        children: [
          {
            id: "root-1-1",
            label: "+",
            children: [
              { id: "root-1-1-1", label: "⛅", children: [] },
              {
                id: "root-1-1-2",
                label: "-",
                children: [{ id: "root-1-1-2-1", label: "🍄", children: [] }],
              },
            ],
          },
          { id: "root-1-2", label: "🍄", children: [] },
        ],
      },
      {
        id: "root-2",
        label: "+",
        children: [
          {
            id: "root-2-1",
            label: "×",
            children: [
              { id: "root-2-1-1", label: "🎲", children: [] },
              { id: "root-2-1-2", label: "🦠", children: [] },
            ],
          },
          {
            id: "root-2-2",
            label: "×",
            children: [
              { id: "root-2-2-1", label: "🎲", children: [] },
              { id: "root-2-2-2", label: "🐝", children: [] },
            ],
          },
        ],
      },
    ],
  };

  type RewriteSet = {
    rewrites: Rewrite[];
    title: ReactNode;
    subtitle?: ReactNode;
    defaultEnabled?: boolean;
  };

  const rewriteSets: RewriteSet[] = [
    {
      title: <>Identity</>,
      rewrites: [rewr("(+ (0) #A)", "A"), rewr("(+ #A (0))", "A")],
      defaultEnabled: true,
    },
    {
      title: <>Identity (reverse)</>,
      rewrites: [rewr("#A", "(+ (0) A)")],
      defaultEnabled: true,
    },
    {
      title: <>Commutativity</>,
      rewrites: [
        rewr("(+ #A #B)", "(+ B A)"),
        rewr("(× #A #B)", "(× B A)"),
        // comment for line break
      ],
      defaultEnabled: true,
    },
    {
      title: <>Associativity</>,
      subtitle: <>Pull up op</>,
      rewrites: [
        rewr("(+2 #(+1 A B) C)", "(+1 A (+2 B C))"),
        rewr("(+1 A #(+2 B C))", "(+2 (+1 A B) C)"),
        rewr("(×2 #(×1 A B) C)", "(×1 A (×2 B C))"),
        rewr("(×1 A #(×2 B C))", "(×2 (×1 A B) C)"),
      ],
    },
    {
      title: <>Associativity</>,
      subtitle: <>Pull down op</>,
      rewrites: [
        rewr("#(+1 A (+2 B C))", "(+2 (+1 A B) C)"),
        rewr("#(+2 (+1 A B) C)", "(+1 A (+2 B C))"),
        rewr("#(×1 A (×2 B C))", "(×2 (×1 A B) C)"),
        rewr("#(×2 (×1 A B) C)", "(×1 A (×2 B C))"),
      ],
    },
    {
      title: <>Associativity</>,
      subtitle: <>Pull up operand</>,
      rewrites: [
        rewr("(+2 (+1 #A B) C)", "(+1 A (+2 B C))"),
        rewr("(+1 A (+2 #B C))", "(+2 (+1 A B) C)"),
        rewr("(×2 (×1 #A B) C)", "(×1 A (×2 B C))"),
        rewr("(×1 A (×2 #B C))", "(×2 (×1 A B) C)"),
      ],
    },
    {
      title: <>Associativity</>,
      subtitle: <>Pull down operand</>,
      rewrites: [
        rewr("(+1 #A (+2 B C))", "(+2 (+1 A B) C)"),
        rewr("(+2 (+1 A B) #C)", "(+1 A (+2 B C))"),
        rewr("(×1 #A (×2 B C))", "(×2 (×1 A B) C)"),
        rewr("(×2 (×1 A B) #C)", "(×1 A (×2 B C))"),
      ],
    },
    {
      title: <>Distributivity</>,
      subtitle: <>Distribute (drag +)</>,
      rewrites: [
        rewr("(× A #(+ B C))", "(+ (× A B) (× A C))"),
        rewr("(× #(+ B C) A)", "(+ (× B A) (× C A))"),
      ],
    },
    {
      title: <>Distributivity</>,
      subtitle: <>Distribute (drag operand)</>,
      rewrites: [
        rewr("(× #A (+ B C))", "(+ (× A B) (× A C))"),
        rewr("(× (+ B C) #A)", "(+ (× B A) (× C A))"),
      ],
    },
    {
      title: <>Distributivity</>,
      subtitle: <>Factor (drag +)</>,
      rewrites: [
        rewr("#(+ (× A B) (× A C))", "(× A (+ B C))"),
        rewr("#(+ (× B A) (× C A))", "(× A (+ B C))"),
      ],
    },
    {
      title: <>Distributivity</>,
      subtitle: <>Factor (drag operand)</>,
      rewrites: [
        rewr("(+ (× #A B) (× A C))", "(× A (+ B C))"),
        rewr("(+ (× A B) (× #A C))", "(× A (+ B C))"),
        rewr("(+ (× B #A) (× C A))", "(× A (+ B C))"),
        rewr("(+ (× B A) (× C #A))", "(× A (+ B C))"),
      ],
    },
    {
      title: <>Associativity</>,
      subtitle: (
        <>
          Pull op sideways
          <br />
          <span className="italic text-red-500">
            (Conflicts with commutativity!)
          </span>
        </>
      ),
      rewrites: [
        rewr("(+2 #(+1 A B) C)", "(+2 A #(+1 B C))"),
        rewr("(+1 A #(+2 B C))", "(+1 #(+2 A B) C)"),
        rewr("(×2 #(×1 A B) C)", "(×2 A #(×1 B C))"),
        rewr("(×1 A #(×2 B C))", "(×1 #(×2 A B) C)"),
      ],
    },
  ];

  type Config = {
    activeRewriteSets: boolean[];
    enableEmergeAnimation: boolean;
    forceTransformScale: boolean;
  };

  const defaultConfig: Config = {
    activeRewriteSets: rewriteSets.map((rs) => rs.defaultEnabled ?? false),
    enableEmergeAnimation: true,
    forceTransformScale: false,
  };

  export const manipulable = configurableManipulable<State, Config>(
    { defaultConfig, ConfigPanel, LeftPanel: OperationsPanel },
    (config, { state, drag }) => {
      return renderTree(state, state, drag, config, 0).element;
    }
  );

  function renderTree(
    state: State,
    tree: Tree,
    drag: Drag<State>,
    config: Config,
    depth: number
  ): {
    element: Svgx;
    w: number;
    h: number;
    id: string;
  } {
    const GAP = 10;
    const PADDING = 5;
    const LABEL_WIDTH = 20;
    const LABEL_MIN_HEIGHT = 20;

    const renderedChildren = tree.children.map((child) =>
      renderTree(state, child, drag, config, depth + 1)
    );

    const renderedChildrenElements: Svgx[] = [];
    let childY = 0;
    for (const childR of renderedChildren) {
      renderedChildrenElements.push(
        <g transform={translate(0, childY)}>{childR.element}</g>
      );
      childY += childR.h + GAP;
    }

    const innerW =
      LABEL_WIDTH +
      (renderedChildren.length > 0
        ? GAP + _.max(renderedChildren.map((c) => c.w))!
        : 0);
    const innerH =
      renderedChildren.length > 0
        ? _.sumBy(renderedChildren, (c) => c.h) +
          GAP * (renderedChildren.length - 1)
        : LABEL_MIN_HEIGHT;

    const w = innerW + PADDING * 2;
    const h = innerH + PADDING * 2;
    const rx = Math.min(14, 0.3 * Math.min(w, h));

    const element = (
      <g
        id={tree.id}
        data-on-drag={drag(() => dragTargets(state, tree.id, config))}
        data-z-index={depth}
        data-emerge-from={
          config.enableEmergeAnimation ? tree.emergeFrom : undefined
        }
        data-emerge-mode={tree.emergeMode ?? (config.forceTransformScale ? "scale" : undefined)}
      >
        {/* Background */}
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
        {/* Label */}
        <text
          x={PADDING + LABEL_WIDTH / 2}
          y={PADDING + innerH / 2}
          dominantBaseline="middle"
          textAnchor="middle"
          fontSize={20}
          fill="black"
        >
          {tree.label}
        </text>
        ,{/* Children */}
        {renderedChildren.length > 0 && (
          <g transform={translate(PADDING + LABEL_WIDTH + GAP, PADDING)}>
            {renderedChildrenElements}
          </g>
        )}
      </g>
    );

    return { element, w, h, id: tree.id };
  }

  function dragTargets(
    state: State,
    draggedKey: string,
    config: Config
  ): DragSpec<State> {
    const newTrees = allPossibleRewrites(
      state,
      _.zip(rewriteSets, config.activeRewriteSets).flatMap(([set, enabled]) =>
        enabled ? set!.rewrites : []
      ),
      draggedKey
    );

    return [span(state), newTrees.map(straightTo)];
  }

  const drawRewrite = (rewrite: Rewrite) => {
    function findFirstTriggerId(pattern: Pattern): string | null {
      if (pattern.isTrigger) {
        return pattern.id;
      }
      if (!isWildcard(pattern)) {
        for (const child of pattern.children) {
          const result = findFirstTriggerId(child);
          if (result !== null) {
            return result;
          }
        }
      }
      return null;
    }
    const firstTriggerId = findFirstTriggerId(rewrite.from);
    return (
      <>
        {drawPattern(rewrite.from, true, firstTriggerId)} →{" "}
        {drawPattern(rewrite.to, true, firstTriggerId)}
      </>
    );
  };

  const drawPattern = (
    pattern: Pattern,
    topLevel: boolean,
    firstTriggerId: string | null
  ): ReactNode => {
    let contents;
    if (isWildcard(pattern)) {
      contents = pattern.id;
    } else if (pattern.id === "0") {
      // Zero is a nullary "operator" representing the constant 0
      contents = <span className="text-blue-600 font-bold">0</span>;
    } else {
      const opById: Record<string, ReactNode> = {
        "+": <span className="text-red-600 font-bold">+</span>,
        "+1": <span className="text-red-600 font-bold">+</span>,
        "+2": <span className="text-green-600 font-bold">+</span>,
        "×": <span className="text-purple-600 font-bold">×</span>,
        "×1": <span className="text-purple-600 font-bold">×</span>,
        "×2": <span className="text-orange-600 font-bold">×</span>,
      };
      contents = (
        <>
          {topLevel ? "" : "("}
          {pattern.children.length > 0 &&
            pattern.children.map((child, i) => [
              i > 0 && <> {opById[pattern.id]} </>,
              drawPattern(child, false, firstTriggerId),
            ])}
          {topLevel ? "" : ")"}
        </>
      );
    }

    if (pattern.id === firstTriggerId) {
      return <span className="bg-amber-200 rounded-sm p-0.5">{contents}</span>;
    } else {
      return contents;
    }
  };

  function OperationsPanel({ config, setConfig }: ConfigPanelProps<Config>) {
    return (
      <>
        {rewriteSets.map((rewriteSet, i) => (
          <ConfigCheckbox
            key={i}
            value={config.activeRewriteSets[i]}
            onChange={(v) => {
              const newActive = [...config.activeRewriteSets];
              newActive[i] = v;
              setConfig({ ...config, activeRewriteSets: newActive });
            }}
          >
            <b>{rewriteSet.title}</b>
            {rewriteSet.subtitle && (
              <>
                <br />
                {rewriteSet.subtitle}
              </>
            )}
            <br />
            {rewriteSet.rewrites.length > 0 &&
              drawRewrite(rewriteSet.rewrites[0])}
          </ConfigCheckbox>
        ))}
      </>
    );
  }

  function ConfigPanel({ config, setConfig }: ConfigPanelProps<Config>) {
    return (
      <>
        <ConfigCheckbox
          value={config.enableEmergeAnimation}
          onChange={(v) => setConfig({ ...config, enableEmergeAnimation: v })}
        >
          Enable emerge animation for new nodes
        </ConfigCheckbox>
        <ConfigCheckbox
          value={config.forceTransformScale}
          onChange={(v) => setConfig({ ...config, forceTransformScale: v })}
          disabled={!config.enableEmergeAnimation}
        >
          Force <span className="font-mono">transform: scale()</span> for emerge
        </ConfigCheckbox>
      </>
    );
  }
}
