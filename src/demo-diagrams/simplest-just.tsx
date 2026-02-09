import { DemoDraggable } from "../demo-ui";
import { Draggable } from "../draggable";
import { closest, floating, just } from "../DragSpec";
import { translate } from "../svgx/helpers";

type State = {
  value: number;
};

const initialState: State = { value: 0 };

const draggable: Draggable<State> = ({ state, drag }) => (
  <rect
    id="switch"
    transform={translate(state.value * 100, 0)}
    x={0}
    y={0}
    width={100}
    height={100}
    data-on-drag={drag(() =>
      closest([
        just({ value: 0 }),
        floating({ value: 1 }, { ghost: { opacity: 0.5 } }),
        just({ value: 2 }),
        floating({ value: 3 }, { ghost: { opacity: 0.5 } }),
      ])
    )}
  />
);

export const SimplestJust = () => (
  <DemoDraggable
    draggable={draggable}
    initialState={initialState}
    width={500}
    height={150}
  />
);
