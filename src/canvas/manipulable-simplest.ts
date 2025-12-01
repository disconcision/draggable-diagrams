import { XYWH } from "../xywh";
import { ManipulableCanvas, span } from "./manipulable-canvas";
import { rectangle } from "./shape";

type State = {
  value: boolean;
};

export const manipulableSimplest: ManipulableCanvas<State> = {
  sourceFile: "manipulable-simplest.ts",
  render(state) {
    return rectangle({
      xywh: XYWH(0, 0, 100, 100),
      fillStyle: "black",
    })
      .draggable("switch")
      .absoluteKey("switch")
      .translate([state.value ? 100 : 0, 0]);
  },

  onDrag(_state, _draggableKey) {
    return span([{ value: true }, { value: false }]);
  },
};

export const stateSimplest1: State = { value: true };
