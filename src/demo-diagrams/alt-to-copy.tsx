import { DemoDraggable, DemoNotes } from "../demo-ui";
import { Draggable } from "../draggable";
import { translate } from "../svgx/helpers";

type Dot = { x: number; y: number };
type State = { dots: Dot[] };

const initialState: State = {
  dots: [{ x: 150, y: 100 }],
};

const DOT_RADIUS = 20;
const colors = [
  "#3b82f6",
  "#ef4444",
  "#22c55e",
  "#eab308",
  "#a855f7",
  "#ec4899",
];

const draggable: Draggable<State> = ({ state, d }) => (
  <g>
    {state.dots.map((dot, i) => (
      <circle
        id={`dot-${i}`}
        transform={translate(dot.x, dot.y)}
        r={DOT_RADIUS}
        fill={colors[i % colors.length]}
        data-on-drag={(dp) => {
          const moveDot = (s: State, idx: number) =>
            d.vary(s, ["dots", idx, "x"], ["dots", idx, "y"]);

          if (dp.altKey) {
            // Copy: add a new dot at the same position, follow the copy
            const newState: State = { dots: [...state.dots, { ...dot }] };
            const copyIdx = state.dots.length;
            return d.switchToStateAndFollow(
              newState,
              `dot-${copyIdx}`,
              moveDot(newState, copyIdx),
            );
          } else {
            // Move: vary this dot's position
            return moveDot(state, i);
          }
        }}
      />
    ))}
  </g>
);

export const AltToCopy = () => (
  <>
    <DemoNotes>
      Hold <b>Alt/Option</b> while dragging to duplicate a dot. You can toggle
      Alt mid-drag.
    </DemoNotes>
    <DemoDraggable
      draggable={draggable}
      initialState={initialState}
      width={400}
      height={300}
    />
  </>
);
