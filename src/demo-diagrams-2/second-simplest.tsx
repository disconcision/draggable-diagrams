import { closest, span, withSnapRadius } from "../DragSpec2";
import { Manipulable } from "../manipulable2";
import { translate } from "../svgx/helpers";

export namespace SecondSimplest {
  export type State = {
    value: number;
  };

  export const state1: State = { value: 0 };

  export const manipulable: Manipulable<State> = ({ state, drag }) => (
    <rect
      id="switch"
      transform={translate(state.value * 100, 20 * (-1) ** state.value + 20)}
      width={100}
      height={100}
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
  );
}
