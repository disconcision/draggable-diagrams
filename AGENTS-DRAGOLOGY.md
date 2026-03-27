# Building Interactive Diagrams with Dragology

Dragology is a React library for building interactive, draggable SVG interfaces. You describe how your UI looks as a function of state, attach drag specs to elements, and the library handles pointer tracking, animation, and state interpolation.

## The Core Idea

A Dragology interface is a **pure function from state to SVG**. You don't write imperative drag handlers — instead, you declare *what states an element can be dragged between*, and the library figures out the rest: interpolating positions mid-drag, snapping on drop, and animating transitions.

```
State → SVG rendering (with drag specs attached to elements)
                ↓
    User drags → library interpolates → new State
```

## Minimal Example: A Toggle Switch

```tsx
import { Draggable, DraggableRenderer, translate } from "dragology";

type State = { status: "on" | "off" };

const toggle: Draggable<State> = ({ state, d }) => (
  <g transform={translate(50, 50)}>
    {/* Track */}
    <rect width={120} height={60} rx={30}
      fill={state.status === "on" ? "#22c55e" : "#d1d5db"} />

    {/* Knob — draggable between two states */}
    <circle
      transform={state.status === "on" ? translate(90, 30) : translate(30, 30)}
      r={26} fill="white"
      dragologyOnDrag={() => d.between([{ status: "off" }, { status: "on" }])}
    />
  </g>
);

// Render it (uncontrolled — manages its own state)
<DraggableRenderer
  draggable={toggle}
  initialState={{ status: "off" }}
  width={200} height={200}
/>
```

That's it. The knob slides between two positions. Mid-drag, the library interpolates the SVG smoothly between the "on" and "off" renderings. On drop, it snaps to whichever state is closest.

## How It Works

### The Draggable Function

A `Draggable<T>` is a React render function with this signature:

```tsx
type Draggable<T> = (props: {
  state: T;              // Current state
  d: DragSpecBuilder<T>; // Builder for creating drag specs
  draggedId: string | null; // ID of element being dragged (if any)
  setState: SetState<T>; // Imperative state updates (clicks, etc.)
}) => Svgx;
```

It receives the current state, returns SVG. Elements that should be draggable get a `dragologyOnDrag` prop.

### State Must Be an Object

Your state type `T` must be an object (not a primitive). This is fine:

```tsx
type State = { value: number };
type State = { items: string[] };
type State = { nodes: Record<string, { x: number; y: number }> };
```

### Positioning: Always Use `transform={translate(...)}`

Position elements with `transform={translate(x, y)}`, **not** with `x`/`y` attributes. The library tracks SVG transforms to know where elements are — `translate()` is what it understands.

```tsx
// Good
<circle transform={translate(state.x, state.y)} r={10} />

// Bad — the library can't track this
<circle cx={state.x} cy={state.y} r={10} />
```

## The Two Core Drag Specs

Most interactions are built from two primitives: `d.between()` for discrete choices and `d.vary()` for continuous values.

### `d.between()` — Discrete States

Drag between a set of possible states. The library interpolates the full SVG rendering between them.

```tsx
// Toggle: two states
dragologyOnDrag={() => d.between([{ status: "off" }, { status: "on" }])}

// Three-way selector: three states
dragologyOnDrag={() => d.between([{ name: "r" }, { name: "g" }, { name: "b" }])}

// Reordering a list: one state per possible position
dragologyOnDrag={() => {
  const allOrders = state.items.map((_, j) => ({
    items: moveItem(state.items, i, j),
  }));
  return d.between(allOrders);
}}
```

### `d.vary()` — Continuous Values

Vary numeric parameters freely. The library uses numerical optimization to find the parameter values that place the dragged element under the pointer.

```tsx
import { param, inOrder } from "dragology";

// Slider: vary a single value with constraints
dragologyOnDrag={() =>
  d.vary(state, param("value"), {
    constraint: (s) => inOrder(0, s.value, 240),
  })
}

// 2D position: vary x and y
dragologyOnDrag={() =>
  d.vary(state, [param("nodes", key, "x"), param("nodes", key, "y")])
}

// Rotation: vary an angle (works even inside rotated groups!)
dragologyOnDrag={() => d.vary(state, param("angle"))}
```

The `param(...)` helper specifies a path into the state object. `param("nodes", key, "x")` means `state.nodes[key].x`.

**Constraints** limit the optimizer. `inOrder(a, b, c)` ensures `a ≤ b ≤ c`. You can also use `lessThan`, `moreThan`, and combine with `and(...)`.

## Composing Specs

### `d.closest()` — Pick the Nearest Behavior

When an element can do different things depending on where you drag it, use `d.closest()`. It switches between specs based on proximity.

```tsx
// Timeline block: slide along a track (vary), but also switch tracks (closest)
dragologyOnDrag={() =>
  d.closest(
    _.range(NUM_TRACKS).map((track) =>
      d.vary(
        produce(state, (draft) => { draft.blocks[i].track = track }),
        param("blocks", i, "pos"),
        { constraint: (s) => inOrder(0, s.blocks[i].pos, TRACK_W - BLOCK_W) },
      )
    )
  ).withBranchTransition(100) // animate when switching tracks
}
```

### Chaining Methods

Drag specs have chainable methods that modify behavior:

| Method | What it does |
|---|---|
| `.withFloating()` | Float the element freely, snapping to a position on drop |
| `.withSnapRadius(px)` | Only snap when within `px` pixels of a drop target |
| `.withDropTransition("elastic-out")` | Custom drop animation (also accepts `"cubic-out"`, a duration in ms, or a custom easing) |
| `.withBranchTransition(ms)` | Animate when switching between `closest()` branches |
| `.onDrop(state)` | Override the final state on drop; accepts a value or `(previewState) => newState` |
| `.during(fn)` | Transform the preview state each frame (for live recomputation) |

Example — a bouncy toggle:

```tsx
dragologyOnDrag={() =>
  d.between([{ value: true }, { value: false }])
   .withDropTransition("elastic-out")
}
```

## Element Identity and Layering

### Use `id` for Element Identity

The library tracks elements by their `id` attribute. Use `id` (not React `key`) for elements that need to be individually identifiable — especially draggable ones and anything referenced by `draggedId`.

```tsx
<g id={`node-${key}`} ...>
```

**No slashes in IDs.** Use hyphens: `id="node-1-2"` not `id="node/1/2"`.

### `dragologyZIndex` for Draw Order

Control layering with `dragologyZIndex`. Useful for bringing dragged items to the front:

```tsx
<g
  id={item.id}
  dragologyZIndex={draggedId === item.id ? 1 : 0}
  dragologyOnDrag={() => ...}
>
```

## Imperative State Updates with `setState`

For non-drag interactions (clicks, keyboard, etc.), use `setState`:

```tsx
const draggable: Draggable<State> = ({ state, d, setState }) => (
  <g onClick={() => setState({ ...state, status: state.status === "on" ? "off" : "on" })}
     style={{ cursor: "pointer" }}>
    ...
  </g>
);
```

`setState` also accepts a second argument with a `transition` option for animating the change.

## Controlled vs. Uncontrolled

### Uncontrolled (simplest)

The component manages its own state. Pass `initialState`:

```tsx
<DraggableRenderer
  draggable={myDraggable}
  initialState={{ value: 0 }}
  width={300} height={200}
/>
```

### Controlled

The parent owns the state. Pass `state` + a handler:

```tsx
const [state, setState] = useState({ value: false });

<DraggableRenderer
  draggable={myDraggable}
  state={state}
  onDropState={setState}  // called when the user finishes dragging
  width={300} height={200}
/>
```

- `onDropState` — called once when the drag ends with the final state
- `onDragState` — called continuously during drag with the preview state

## SVG Helpers

Dragology exports helpers for common SVG transforms:

```tsx
import { translate, rotateDeg, scale, path, Vec2 } from "dragology";

translate(100, 50)       // "translate(100, 50)"
translate(Vec2(100, 50)) // same, from a Vec2
rotateDeg(45)            // "rotate(45)"
scale(2)                 // "scale(2)"

// Combine transforms (SVG applies right-to-left — put translate first)
transform={translate(x, y) + rotateDeg(angle)}
```

`Vec2` is a 2D vector class for math:

```tsx
const center = Vec2(100, 100);
const offset = Vec2(50, 0).rotateDeg(angle);
const point = center.add(offset);

// Destructure into SVG line attributes
<line {...center.xy1()} {...point.xy2()} stroke="black" />
```

## Gotchas

1. **Transform ordering matters.** SVG transforms apply right-to-left. Always put `translate()` before `rotateDeg()`: `translate(x, y) + rotateDeg(angle)`.

2. **Never use `x`/`y` attributes for positioning.** Always use `transform={translate(...)}`. The library needs transforms to track element positions.

3. **No slashes in `id` attributes.** Use hyphens instead.

4. **`d.vary()` only works on values that affect the dragged element's rendered position.** If varying a parameter doesn't move the element on screen, the optimizer has nothing to work with.

5. **For group movement with `vary`, vary a shared position** (like a group center), not each member independently. Only parameters that affect the dragged element's bounding box will optimize correctly.

6. **The `state` arg to `d.vary()` is the optimizer's starting point**, not necessarily the current rendered state. It's the state from which the optimizer begins searching.

7. **`dragologyOnDrag` takes a function that returns a spec**, not the spec directly: `dragologyOnDrag={() => d.between(...)}`, not `dragologyOnDrag={d.between(...)}`.

8. **Conditional dragging** — make an element conditionally draggable with: `dragologyOnDrag={condition && (() => d.between(...))}`.
