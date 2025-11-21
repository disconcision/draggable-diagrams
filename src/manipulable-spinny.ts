import _ from "lodash";
import { Manipulable } from "./manipulable";
import { group, keyed, translate, zIndex } from "./shape";
import { Vec2 } from "./vec2";
import { XYWH } from "./xywh";

type PermState = {
  perm: string[];
};

export const manipulableSpinny: Manipulable<PermState> = {
  sourceFile: "manipulable-spinny.ts",

  render(state, draggableKey) {
    const TILE_SIZE = 50;
    const RADIUS = 100;
    const positions = _.fromPairs(
      state.perm.map((p, idx) => [
        p,
        Vec2(-RADIUS, 0)
          .rotate((idx / state.perm.length) * 2 * Math.PI)
          .add([RADIUS, RADIUS]),
      ]),
    );
    return group(
      state.perm.map((p) =>
        translate(
          positions[p],
          keyed(
            p,
            true,
            zIndex(
              p === draggableKey ? 1 : 0,
              group(
                {
                  type: "circle" as const,
                  center: Vec2(0),
                  radius: TILE_SIZE / 2,
                  fillStyle: "white",
                  strokeStyle: "black",
                  lineWidth: 2,
                },
                {
                  type: "rectangle" as const,
                  xywh: XYWH(
                    -TILE_SIZE / 2,
                    -TILE_SIZE / 2,
                    TILE_SIZE,
                    TILE_SIZE,
                  ),
                  lineWidth: 2,
                  label: p,
                },
              ),
            ),
          ),
        ),
      ),
      state.perm.map((p, idx) => {
        return keyed(
          `edge-${p}`,
          false,
          zIndex(-1, {
            type: "line" as const,
            from: positions[p],
            to: positions[state.perm[(idx + 1) % state.perm.length]],
            strokeStyle: "black",
            lineWidth: 1,
          }),
        );
      }),
    );
  },

  accessibleFrom(state, _draggableKey) {
    // interesting bit: this doesn't depend on which key is being
    // dragged!
    return {
      manifolds: [1, state.perm.length - 1].map((idx) => [
        {
          perm: [...state.perm.slice(idx), ...state.perm.slice(0, idx)],
        },
      ]),
    };
  },
};

export const stateSpinny1: PermState = {
  perm: ["A", "B", "C", "D"],
};
