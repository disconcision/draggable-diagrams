import _ from "lodash";
import { DemoDrawer } from "../DemoDrawer";
import { closest, floating, just, span } from "../DragSpec2";
import { Manipulable } from "../manipulable2";
import { translate } from "../svgx/helpers";
import { assertNever } from "../utils";

type State = {
  posIndex: number;
};

const POSITIONS = [
  [10, 10],
  [100, 10],
  [55, 90],
] as const;
const SQUARE_SIZE = 40;

const initialState: State = { posIndex: 0 };

const manipulableFactory =
  (mode: "span" | "floating" | "just"): Manipulable<State> =>
  ({ state, drag }) =>
    (
      <g>
        {/* background positions */}
        {POSITIONS.map((pos, i) => (
          <rect
            key={i}
            transform={translate(pos)}
            width={SQUARE_SIZE}
            height={SQUARE_SIZE}
            rx={4}
            fill="none"
            stroke="#cbd5e1"
            strokeWidth={1}
          />
        ))}
        {/* draggable square */}
        <rect
          id="switch"
          transform={translate(POSITIONS[state.posIndex])}
          width={SQUARE_SIZE}
          height={SQUARE_SIZE}
          rx={4}
          data-on-drag={drag(() => {
            const states: State[] = _.range(POSITIONS.length).map((i) => ({
              posIndex: i,
            }));

            if (mode === "span") {
              return span(states);
            } else if (mode === "floating") {
              return closest(states.map((s) => floating(s)));
            } else if (mode === "just") {
              return closest(states.map((s) => just(s)));
            } else {
              assertNever(mode);
            }
          })}
        />
        <line
          x1={POSITIONS[0][0] + SQUARE_SIZE / 2}
          y1={POSITIONS[0][1] + SQUARE_SIZE / 2}
          x2={POSITIONS[state.posIndex][0] + SQUARE_SIZE / 2}
          y2={POSITIONS[state.posIndex][1] + SQUARE_SIZE / 2}
          stroke="#cbd5e1"
          strokeWidth={6}
          strokeLinecap="round"
        />
      </g>
    );

const spanManipulable = manipulableFactory("span");
const floatingManipulable = manipulableFactory("floating");
const justManipulable = manipulableFactory("just");

export const SimpleTriangle = () => (
  <div>
    <h3 className="text-md font-medium italic mt-6 mb-1">span</h3>
    <DemoDrawer
      manipulable={spanManipulable}
      initialState={initialState}
      width={250}
      height={150}
    />
    <h3 className="text-md font-medium italic mt-6 mb-1">floating</h3>
    <DemoDrawer
      manipulable={floatingManipulable}
      initialState={initialState}
      width={250}
      height={150}
    />
    <h3 className="text-md font-medium italic mt-6 mb-1">just</h3>
    <DemoDrawer
      manipulable={justManipulable}
      initialState={initialState}
      width={250}
      height={150}
    />
  </div>
);
