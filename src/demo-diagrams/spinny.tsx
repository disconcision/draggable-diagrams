import { produce } from "immer";
import { straightTo } from "../DragSpec";
import { Manipulable, rotateDeg, translate } from "../manipulable";

export namespace Spinny {
  export type State = {
    perm: string[];
  };

  export const state1: State = {
    perm: ["A", "B", "C", "D"],
  };

  const TILE_SIZE = 50;
  const RADIUS = 100;

  export const manipulable: Manipulable<State> = ({ state, drag }) => (
    <g transform={translate(100, 100)}>
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
            data-on-drag={drag([
              straightTo(
                // we use immer's `produce` to make immutable updates easier
                produce(state, (s) => {
                  s.perm.push(s.perm.shift()!);
                })
              ),
              straightTo(
                produce(state, (s) => {
                  s.perm.unshift(s.perm.pop()!);
                })
              ),
            ])}
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
}
