import { numAtPath } from "../DragSpec";
import { Manipulable, rotateDeg, translate } from "../manipulable";

export namespace AngleViaTransform {
  export type State = {
    angle: number;
  };

  export const state1: State = {
    angle: 0,
  };

  export const manipulable: Manipulable<State> = ({ state, drag }) => {
    const radius = 100;

    return (
      <g transform={translate(100, 100)}>
        <g transform={rotateDeg(state.angle)}>
          <line
            x1={0}
            y1={0}
            x2={radius}
            y2={0}
            stroke="black"
            strokeWidth={4}
          />
          <circle
            transform={translate(radius, 0)}
            cx={0}
            cy={0}
            r={20}
            fill="black"
            data-on-drag={drag(numAtPath(["angle"]))}
          />
        </g>
      </g>
    );
  };
}
