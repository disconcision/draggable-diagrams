import { DemoDrawer } from "../DemoDrawer";
import { span, withDropTransition, withSnapRadius } from "../DragSpec2";
import { Manipulable } from "../manipulable2";
import { translate } from "../svgx/helpers";

type State = {
  value: boolean;
};

const SQUARE_SIZE = 40;
const TRACK_LENGTH = 60;

const initialState: State = { value: false };

const manipulable: Manipulable<State> = ({ state, drag }) => (
  <g>
    <line
      x1={SQUARE_SIZE / 2}
      y1={SQUARE_SIZE / 2}
      x2={TRACK_LENGTH + SQUARE_SIZE / 2}
      y2={SQUARE_SIZE / 2}
      stroke="#cbd5e1"
      strokeWidth={6}
      strokeLinecap="round"
    />
    <rect
      id="switch"
      transform={translate(state.value ? TRACK_LENGTH : 0, 0)}
      width={SQUARE_SIZE}
      height={SQUARE_SIZE}
      rx={4}
      data-on-drag={drag(() =>
        withDropTransition(
          withSnapRadius(span([{ value: true }, { value: false }]), 10),
          "elastic-out"
        )
      )}
    />
  </g>
);

export const LinearTrack = () => (
  <DemoDrawer
    manipulable={manipulable}
    initialState={initialState}
    width={150}
    height={80}
  />
);
