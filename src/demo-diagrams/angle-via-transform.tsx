import { DemoDrawer } from "../demo-ui";
import { vary } from "../DragSpec";
import { Manipulable } from "../manipulable";
import { rotateDeg, translate } from "../svgx/helpers";

type State = {
  angle: number;
};

const initialState: State = {
  angle: 0,
};

const manipulable: Manipulable<State> = ({ state, drag }) => {
  const radius = 100;

  return (
    <g transform={translate(100, 100)}>
      <g transform={rotateDeg(state.angle)}>
        <line x1={0} y1={0} x2={radius} y2={0} stroke="black" strokeWidth={4} />
        <circle
          transform={translate(radius, 0)}
          cx={0}
          cy={0}
          r={20}
          fill="black"
          data-on-drag={drag(vary(state, ["angle"]))}
        />
      </g>
    </g>
  );
};

export const AngleViaTransform = () => (
  <DemoDrawer
    manipulable={manipulable}
    initialState={initialState}
    width={250}
    height={250}
  />
);
