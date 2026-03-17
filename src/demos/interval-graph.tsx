import { produce } from "immer";
import _ from "lodash";
import { demo } from "../demo";
import { DemoDraggable } from "../demo/ui";
import { Draggable } from "../draggable";
import { inOrder, param } from "../DragSpec";
import { translate } from "../svgx/helpers";

type Interval = { left: number; right: number; track: number };
type State = { intervals: { [key: string]: Interval } };

const initialState: State = {
  intervals: {
    a: { left: 20, right: 100, track: 0 },
    b: { left: 60, right: 160, track: 1 },
    c: { left: 10, right: 70, track: 2 },
    d: { left: 120, right: 200, track: 0 },
    e: { left: 80, right: 140, track: 2 },
  },
};

const NUM_TRACKS = 4;
const TRACK_H = 40;
const GAP = 8;
const DOT_R = 7;
const BAR_H = 6;
const TRACK_W = 300;
const MIN_WIDTH = 10;
const GRAPH_X = TRACK_W + 40;
const NODE_R = 10;

const COLORS: Record<string, string> = {
  a: "#3b82f6",
  b: "#06b6d4",
  c: "#22c55e",
  d: "#f59e0b",
  e: "#8b5cf6",
};

function overlaps(a: Interval, b: Interval) {
  return a.left < b.right && b.left < a.right;
}

const draggable: Draggable<State> = ({ state, d, draggedId }) => {
  const trackY = (track: number) => track * (TRACK_H + GAP) + TRACK_H / 2;

  const entries = Object.entries(state.intervals);

  // Node positions in graph
  const nodePos = (iv: Interval) => ({
    x: GRAPH_X + (iv.left + iv.right) / 2,
    y: trackY(iv.track),
  });

  // All overlapping pairs
  const edges: [string, string][] = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      if (overlaps(entries[i][1], entries[j][1])) {
        edges.push([entries[i][0], entries[j][0]]);
      }
    }
  }

  return (
    <g transform={translate(10, 10)}>
      {/* Track lines */}
      {_.range(NUM_TRACKS).map((t) => (
        <line
          key={t}
          x1={0}
          y1={trackY(t)}
          x2={TRACK_W}
          y2={trackY(t)}
          stroke="#94a3b8"
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />
      ))}

      {/* Intervals */}
      {entries.map(([key, iv]) => {
        const y = trackY(iv.track);
        const color = COLORS[key] ?? "#666";
        const isDraggedBar = draggedId === `bar-${key}`;

        const endpointDrag = (endpoint: "left" | "right") =>
          d.vary(state, param("intervals", key, endpoint), {
            constraint: (s) =>
              inOrder(
                0,
                s.intervals[key].left,
                s.intervals[key].right,
                TRACK_W,
              ),
          });

        const barStates = _.range(NUM_TRACKS).map((t) =>
          produce<State>(state, (draft) => {
            draft.intervals[key].track = t;
          }),
        );

        return (
          <g id={`interval-${key}`} data-z-index={isDraggedBar ? 1 : 0}>
            {/* Bar — drag to change track */}
            <rect
              id={`bar-${key}`}
              transform={translate(iv.left, y - BAR_H / 2)}
              width={Math.max(iv.right - iv.left, MIN_WIDTH)}
              height={BAR_H}
              rx={3}
              fill={color}
              style={{ cursor: "grab" }}
              dragology={() =>
                d.between(barStates).withSnapRadius(10, { transition: true })
              }
            />

            {/* Left dot */}
            <circle
              id={`left-${key}`}
              transform={translate(iv.left, y)}
              r={DOT_R}
              fill={color}
              stroke="white"
              strokeWidth={2}
              data-z-index={2}
              dragology={() => endpointDrag("left")}
            />

            {/* Right dot */}
            <circle
              id={`right-${key}`}
              transform={translate(iv.right, y)}
              r={DOT_R}
              fill={color}
              stroke="white"
              strokeWidth={2}
              data-z-index={2}
              dragology={() => endpointDrag("right")}
            />

            {/* Graph node */}
            <circle
              transform={translate(nodePos(iv).x, nodePos(iv).y)}
              r={NODE_R}
              fill={color}
              stroke="white"
              strokeWidth={2}
              dragology={() =>
                d.between(barStates).withSnapRadius(10, { transition: 40 })
              }
            />
          </g>
        );
      })}

      {/* Graph: edges */}
      {edges.map(([ka, kb]) => {
        const a = nodePos(state.intervals[ka]);
        const b = nodePos(state.intervals[kb]);
        const sameTrack =
          state.intervals[ka].track === state.intervals[kb].track;
        return (
          <g>
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="#ef4444"
              strokeWidth={6}
              strokeOpacity={sameTrack ? 0.6 : 0}
            />
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="#94a3b8"
              strokeWidth={1.5}
            />
          </g>
        );
      })}
    </g>
  );
};

export default demo(
  () => (
    <DemoDraggable
      draggable={draggable}
      initialState={initialState}
      width={GRAPH_X + TRACK_W + 20}
      height={NUM_TRACKS * (TRACK_H + GAP) + 20}
    />
  ),
  { tags: ["d.vary [w/constraint]", "d.between", "spec.withSnapRadius"] },
);
