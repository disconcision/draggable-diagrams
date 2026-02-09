import { DemoDraggable } from "../demo-ui";
import { Draggable } from "../draggable";
import { vary } from "../DragSpec";
import { rotateDeg, scale, translate } from "../svgx/helpers";

type State = {
  angle: number;
  scaleX: number;
};

const initialState: State = { angle: 0, scaleX: 1 };

const draggable: Draggable<State> = ({ state, drag }) => (
  <circle
    transform={
      translate(100, 100) +
      rotateDeg(state.angle) +
      scale(state.scaleX, 1 / state.scaleX)
    }
    cx={0}
    cy={0}
    r={50}
    fill="lightblue"
    data-on-drag={drag(() => vary(state, ["angle"], ["scaleX"]))}
  />
);

export const StretchyRot = () => (
  <DemoDraggable
    draggable={draggable}
    initialState={initialState}
    width={250}
    height={250}
  />
);
