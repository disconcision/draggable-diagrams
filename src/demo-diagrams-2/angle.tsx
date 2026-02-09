import { vary } from "../DragSpec2";
import { DemoDrawer } from "../DemoDrawer";
import { Manipulable } from "../manipulable2";
import { Vec2 } from "../math/vec2";
import { translate } from "../svgx/helpers";

type State = {
  angle: number;
};

const initialState: State = {
  angle: 0,
};

const manipulable: Manipulable<State> = ({ state, drag }) => {
  const center = Vec2(100, 100);
  const radius = 100;
  const knobPos = Vec2(radius, 0).rotateDeg(state.angle).add(center);

  return (
    <g>
      <circle
        transform={translate(knobPos)}
        r={20}
        fill="black"
        data-on-drag={drag(vary(state, ["angle"]))}
      />
      <line
        {...center.xy1()}
        {...knobPos.xy2()}
        stroke="black"
        strokeWidth={4}
      />
    </g>
  );
};

export const Angle = () => (
  <DemoDrawer
    manipulable={manipulable}
    initialState={initialState}
    width={250}
    height={250}
  />
);
