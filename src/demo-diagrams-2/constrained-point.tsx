import { lessThan, vary } from "../DragSpec2";
import { Manipulable } from "../manipulable2";
import { Vec2 } from "../math/vec2";
import { translate } from "../svgx/helpers";
import { DemoDrawer } from "../DemoDrawer";

type State = {
  x: number;
  y: number;
};

const initialState: State = {
  x: 150,
  y: 150,
};

const center = Vec2(150, 150);
const radius = 100;

const manipulable: Manipulable<State> = ({ state, drag }) => {
  return (
    <g>
      {/* boundary circle */}
      <circle
        {...center.cxy()}
        r={radius}
        fill="none"
        stroke="#ccc"
        strokeWidth={2}
        strokeDasharray="6 4"
      />
      {/* draggable point */}
      <circle
        id="point"
        transform={translate(Vec2(state.x, state.y))}
        r={14}
        fill="black"
        data-on-drag={drag(
          vary(state, ["x"], ["y"], {
            constraint: (s) => lessThan(center.dist2(s), radius ** 2),
          })
        )}
      />
    </g>
  );
};

export const ConstrainedPoint = () => (
  <DemoDrawer
    manipulable={manipulable}
    initialState={initialState}
    width={300}
    height={300}
  />
);
