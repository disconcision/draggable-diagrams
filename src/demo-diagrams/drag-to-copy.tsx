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

const draggable: Draggable<State> = ({ state, d, setState }) => (
  <g>
    {state.dots.map((dot, i) => (
      <circle
        id={`dot-${i}`}
        transform={translate(dot.x, dot.y)}
        r={DOT_RADIUS}
        fill={colors[i % colors.length]}
        onDoubleClick={() => {
          // Remove the dot on double click
          setState({ dots: state.dots.filter((_, idx) => idx !== i) });
        }}
        data-on-drag={() => {
          const newState: State = { dots: [...state.dots, { ...dot }] };
          const copyIdx = state.dots.length;
          return d.switchToStateAndFollow(
            newState,
            `dot-${copyIdx}`,
            d.vary(newState, ["dots", copyIdx, "x"], ["dots", copyIdx, "y"]),
          );
        }}
      />
    ))}
  </g>
);

export const DragToCopy = () => (
  <>
    <DemoNotes>Drag to duplicate. Double click to remove.</DemoNotes>
    <DemoDraggable
      draggable={draggable}
      initialState={initialState}
      width={400}
      height={300}
    />
  </>
);
