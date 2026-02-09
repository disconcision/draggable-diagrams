import { DemoDrawer } from "../DemoDrawer";
import { closest, floating, just } from "../DragSpec2";
import { Manipulable } from "../manipulable2";
import { translate } from "../svgx/helpers";

type State = {
  value: number;
};

const initialState: State = { value: 0 };

const manipulable: Manipulable<State> = ({ state, drag }) => (
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
  <DemoDrawer
    manipulable={manipulable}
    initialState={initialState}
    width={500}
    height={150}
  />
);
