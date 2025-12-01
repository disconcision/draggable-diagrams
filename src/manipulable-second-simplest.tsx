import { straightTo } from "./DragSpec";
import { Manipulable, translate } from "./manipulable";

export namespace SecondSimplest {
  export type State = {
    value: number;
  };

  export const state1: State = { value: 0 };

  export const manipulable: Manipulable<State> = ({ state, drag }) => (
    <rect
      id="switch"
      transform={translate(state.value * 100, 20 * (-1) ** state.value + 20)}
      x={0}
      y={0}
      width={100}
      height={100}
      data-on-drag={drag(() => [
        state.value > 0 && straightTo({ value: state.value - 1 }),
        state.value < 3 && straightTo({ value: state.value + 1 }),
      ])}
    />
  );
}
