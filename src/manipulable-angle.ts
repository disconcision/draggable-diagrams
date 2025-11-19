import { Manipulable } from "./manipulable";
import { group, keyed, translate } from "./shape";
import { Vec2 } from "./vec2";

type AngleState = {
  angle: number;
};

export const manipulableAngle: Manipulable<AngleState> = {
  sourceFile: "manipulable-angle.ts",

  render(state) {
    const center = Vec2(100, 100);
    const radius = 100;
    const knobPos = Vec2(radius, 0).rotate(state.angle).add(center);

    return group([
      translate(
        knobPos,
        keyed("knob", true, {
          type: "circle" as const,
          center: Vec2(0),
          radius: 20,
          fillStyle: "black",
        }),
      ),
      {
        type: "line" as const,
        from: center,
        to: knobPos,
        strokeStyle: "black",
        lineWidth: 4,
      },
    ]);
  },

  accessibleFrom(state, _draggableKey) {
    return {
      initParams: [state.angle],
      stateFromParams(newAngle) {
        return { angle: newAngle };
      },
    };
  },
};

export const stateAngle = {
  angle: 0,
};
