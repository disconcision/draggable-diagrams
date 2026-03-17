import { produce } from "immer";
import _ from "lodash";
import { useMemo, useState } from "react";
import { demo } from "../demo";
import {
  ConfigPanel,
  ConfigRadio,
  DemoDraggable,
  DemoWithConfig,
} from "../demo/ui";
import { Draggable } from "../draggable";
import { Vec2 } from "../math/vec2";
import { translate } from "../svgx/helpers";
import { assertNever } from "../utils/assert";

type State = {
  beads: string[];
};

const initialState: State = {
  beads: ["A", "B", "C", "D", "E"],
};

const RADIUS = 100;
const CIRCLE_R = 24;

const COLORS = ["#e8b4b8", "#b4d4e8", "#b8e8b4", "#e8d4b4", "#d4b4e8"];

const stages = [
  "d.closest()",
  "d.closest().withFloating()",
  "d.closest().whenFar().withFloating()",
] as const;
type Stage = (typeof stages)[number];

function makeDraggable(stage: Stage): Draggable<State> {
  return ({ state, d, draggedId }) => {
    const n = state.beads.length;

    return (
      <g transform={translate(150, 150)}>
        {/* ring */}
        <circle r={RADIUS} fill="none" stroke="#e0e0e0" strokeWidth={1.5} />
        {/* nodes */}
        {state.beads.map((bead, idx) => {
          const p = Vec2.polarDeg(RADIUS, (idx / n) * 360 - 90);
          const isDragged = bead === draggedId;
          const colorIdx = bead.charCodeAt(0) - 65;
          return (
            <g
              id={bead}
              transform={translate(p)}
              data-z-index={isDragged ? 2 : 1}
              dragology={() => {
                const futureStates = _.range(n).map((targetIdx) =>
                  produce(state, (draft) => {
                    draft.beads.splice(idx, 1);
                    draft.beads.splice(targetIdx, 0, bead);
                  }),
                );

                switch (stage) {
                  case "d.closest()":
                    return d.closest(futureStates);
                  case "d.closest().withFloating()":
                    return d.closest(futureStates).withFloating();
                  case "d.closest().whenFar().withFloating()": {
                    const removed = produce(state, (draft) => {
                      draft.beads.splice(idx, 1);
                    });
                    return d
                      .closest(futureStates)
                      .whenFar(d.fixed(removed).onDrop(state))
                      .withFloating();
                  }
                  default:
                    assertNever(stage);
                }
              }}
            >
              <circle
                r={CIRCLE_R}
                fill={COLORS[colorIdx]}
                stroke="#999"
                strokeWidth={1.5}
                filter={isDragged ? "url(#drop-shadow)" : undefined}
              />
              <text
                dominantBaseline="central"
                textAnchor="middle"
                fontSize={16}
                fontWeight={500}
                fill="#333"
              >
                {bead}
              </text>
            </g>
          );
        })}

        <defs>
          <filter
            id="drop-shadow"
            x="-100%"
            y="-100%"
            width="300%"
            height="300%"
          >
            <feDropShadow dx={0} dy={2} stdDeviation={3} floodOpacity={0.25} />
          </filter>
        </defs>
      </g>
    );
  };
}

export default demo(
  () => {
    const [stage, setStage] = useState<Stage>("d.closest()");
    const draggable = useMemo(() => makeDraggable(stage), [stage]);
    return (
      <DemoWithConfig>
        <DemoDraggable
          draggable={draggable}
          initialState={initialState}
          width={300}
          height={300}
        />
        <ConfigPanel>
          <ConfigRadio
            label="Stage"
            value={stage}
            onChange={setStage}
            options={stages}
          />
        </ConfigPanel>
      </DemoWithConfig>
    );
  },
  { tags: ["d.closest", "spec.withFloating", "spec.whenFar", "reordering"] },
);
