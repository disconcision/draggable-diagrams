import { demo } from "../demo";
import { DemoDraggable, DemoLink, DemoNotes } from "../demo/ui";
import { Draggable } from "../draggable";
import { equal } from "../DragSpec";
import { Vec2 } from "../math/vec2";
import { translate } from "../svgx/helpers";

type State = {
  x: number;
  y: number;
};

// Cassini oval: product of distances to two foci = a²
// With a=1.1, c=1 (a > c gives a single connected oval)
const SCALE = 100;
const a = 1.1;
const c = 1;
const aPx = a * SCALE;
const cPx = c * SCALE;

const center = Vec2(200, 150);
const f1 = Vec2(center.x - cPx, center.y);
const f2 = Vec2(center.x + cPx, center.y);

// Parametric sampling for the SVG path
function cassiniPath(n: number): string {
  const points: string[] = [];
  for (let i = 0; i < n; i++) {
    const theta = (2 * Math.PI * i) / n;
    const cos2t = Math.cos(2 * theta);
    const sin2t = Math.sin(2 * theta);
    const r2 = cPx ** 2 * cos2t + Math.sqrt(aPx ** 4 - cPx ** 4 * sin2t ** 2);
    if (r2 < 0) continue;
    const r = Math.sqrt(r2);
    points.push(
      `${center.x + r * Math.cos(theta)},${center.y + r * Math.sin(theta)}`,
    );
  }
  return `M${points.join("L")}Z`;
}

const curvePath = cassiniPath(200);

// Initial point: rightmost point of the oval (θ=0)
const r0 = Math.sqrt(cPx ** 2 + aPx ** 2);
const initialState: State = { x: center.x + r0, y: center.y };

const draggable: Draggable<State> = ({ state, d }) => {
  return (
    <g>
      <path
        d={curvePath}
        fill="none"
        stroke="#ccc"
        strokeWidth={2}
        strokeDasharray="6 4"
      />
      <circle
        id="point"
        transform={translate(Vec2(state.x, state.y))}
        r={14}
        fill="black"
        dragology={() =>
          d.vary(state, [["x"], ["y"]], {
            constraint: (s) => {
              const p = Vec2(s.x, s.y);
              return equal(p.dist(f1) * p.dist(f2), aPx ** 2);
            },
          })
        }
      />
    </g>
  );
};

export default demo(
  () => (
    <>
      <DemoNotes>
        Point constrained to a{" "}
        <DemoLink href="https://en.wikipedia.org/wiki/Cassini_oval">
          Cassini oval
        </DemoLink>{" "}
        (a=1.1, c=1) using an <code>equal</code> constraint on the product of
        distances to two foci. (The visible curve is plotted using a polar
        parameterization, which kind of ruins the fun of using the constraint
        solver here.)
      </DemoNotes>
      <DemoNotes>
        Note a strange asymmetry when dragging from the upper concavity to the
        lower concavity and back again.
      </DemoNotes>
      <DemoDraggable
        draggable={draggable}
        initialState={initialState}
        width={400}
        height={300}
      />
    </>
  ),
  { tags: ["d.vary [w/constraint]"] },
);
