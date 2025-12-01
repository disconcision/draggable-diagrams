import { XYWH } from "../xywh";
import { ManipulableCanvas, straightTo } from "./manipulable-canvas";
import { rectangle } from "./shape";

type State = {
  value: number;
};

export const manipulableSecondSimplest: ManipulableCanvas<State> = {
  sourceFile: "manipulable-second-simplest.ts",

  render(state) {
    return rectangle({
      xywh: XYWH(0, 0, 100, 100),
      fillStyle: "black",
    })
      .draggable("switch")
      .absoluteKey("switch")
      .translate([state.value * 100, 20 * (-1) ** state.value + 10]);
  },

  onDrag(state) {
    return [
      state.value > 0 && straightTo({ value: state.value - 1 }),
      state.value < 3 && straightTo({ value: state.value + 1 }),
    ];
  },
};

export const stateSecondSimplest1: State = { value: 0 };
