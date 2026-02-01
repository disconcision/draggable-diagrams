import { Manipulable } from "../manipulable2";

export namespace SimplestClicker {
  export type State = {
    colorIdx: number;
  };

  export const state1: State = { colorIdx: 0 };

  export const manipulable: Manipulable<State> = ({ state, setState }) => {
    const colors = ["red", "green", "blue", "yellow"];

    return (
      <rect
        x={40 * state.colorIdx}
        y={0}
        width={100}
        height={100}
        fill={colors[state.colorIdx]}
        onClick={() => {
          const nextIdx = (state.colorIdx + 1) % colors.length;
          setState({ colorIdx: nextIdx });
        }}
        style={{ cursor: "pointer" }}
      />
    );
  };
}
