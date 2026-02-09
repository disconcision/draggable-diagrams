import { closest, span, withSnapRadius } from "../DragSpec2";
import { Manipulable } from "../manipulable2";
import { translate } from "../svgx/helpers";

export namespace LinearTrackChained {
  export type State = {
    value: number;
  };

  const SIZE = 40;

  export const state1: State = { value: 0 };

  export const manipulable: Manipulable<State> = ({ state, drag }) => (
    <g>
      <polyline
        points={[0, 1, 2, 3]
          .map((v) => `${v * 100 + SIZE / 2},${20 * (-1) ** v + 20 + SIZE / 2}`)
          .join(" ")}
        fill="none"
        stroke="#cbd5e1"
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        id="switch"
        transform={translate(state.value * 100, 20 * (-1) ** state.value + 20)}
        width={SIZE}
        height={SIZE}
        rx={4}
        data-on-drag={drag(() =>
          withSnapRadius(
            closest([
              state.value > 0 && span([state, { value: state.value - 1 }]),
              state.value < 3 && span([state, { value: state.value + 1 }]),
            ]),
            10,
            { chain: true }
          )
        )}
      />
    </g>
  );
}
