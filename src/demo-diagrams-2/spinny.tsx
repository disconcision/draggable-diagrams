import { produce } from "immer";
import { DemoDrawer } from "../DemoDrawer";
import { closest, span, withSnapRadius } from "../DragSpec2";
import { Manipulable } from "../manipulable2";
import { rotateDeg, translate } from "../svgx/helpers";

type State = {
  perm: string[];
};

const initialState: State = {
  perm: ["A", "B", "C", "D"],
};

const TILE_SIZE = 50;
const RADIUS = 100;

const manipulable: Manipulable<State> = ({ state, drag }) => (
  <g transform={translate(120, 120)}>
    {/* background circle */}
    <circle
      cx={0}
      cy={0}
      r={RADIUS}
      fill="none"
      stroke="#eee"
      strokeWidth={8}
    />

    {/* item circles */}
    {state.perm.map((p) => {
      const angle = (state.perm.indexOf(p) / state.perm.length) * 360 + 180;
      return (
        <g
          id={p}
          transform={
            rotateDeg(angle) + translate(RADIUS, 0) + rotateDeg(-angle)
          }
          data-z-index={1}
          data-on-drag={drag(
            withSnapRadius(
              closest([
                span([
                  state,
                  produce(state, (s) => {
                    s.perm.push(s.perm.shift()!);
                  }),
                ]),
                span([
                  state,
                  produce(state, (s) => {
                    s.perm.unshift(s.perm.pop()!);
                  }),
                ]),
              ]),
              10,
              { chain: true }
            )
          )}
        >
          <circle
            cx={0}
            cy={0}
            r={TILE_SIZE / 2}
            fill="white"
            stroke="black"
            strokeWidth={2}
          />
          <text
            x={0}
            y={0}
            dominantBaseline="middle"
            textAnchor="middle"
            fontSize={14}
            fill="black"
          >
            {p}
          </text>
        </g>
      );
    })}
  </g>
);

export const Spinny = () => (
  <DemoDrawer
    manipulable={manipulable}
    initialState={initialState}
    width={250}
    height={250}
  />
);
