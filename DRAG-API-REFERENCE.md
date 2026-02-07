# Draggable Diagrams API Reference

A compositional guide to the drag specification DSL.

---

## Framework Changes (for Josh)

Changes made to `ManipulableDrawer.tsx` during nool development, with motivation.

### Drag Threshold (`dragThreshold` in `DrawerConfig`)

**Problem:** `data-on-drag` and `onClick` cannot coexist. When `onPointerDown` fires, the framework immediately calls `setDragState(dragStateFromSpec(...))`, which triggers a React re-render. The entire SVG is re-rendered for the drag view, destroying all DOM elements. By the time `pointerup` fires, the original element is gone, so the browser can't synthesize a `click` event (click requires matching pointerdown/pointerup targets). This means any `onClick` handlers on draggable elements — or their children — never fire.

**Use case:** Nool's icon column has icons that should be clickable (toggle a section on/off) AND draggable (reorder sections). This is a standard UI pattern (e.g., layer panels in design tools).

**Fix:** Added `dragThreshold: number` to `DrawerConfig` (default: 4px). The `onPointerDown` handler now defers the actual `setDragState` call. It attaches temporary document-level `pointermove`/`pointerup` listeners:
- If pointer moves > threshold px → clean up listeners, start the real drag
- If `pointerup` fires first → clean up listeners, let browser `click` fire normally

The DOM stays intact until movement is confirmed, so clicks work. Set `dragThreshold: 0` for old immediate-drag behavior.

**Changed:** `ManipulableDrawer.tsx` — `onPointerDown` in `postProcessForInteraction`, plus `DrawerConfig` type, plus `pendingDragCleanupRef` on `RenderContext`.

**Side benefit:** Accidental micro-movements during a click no longer start unwanted drags.

---

## Core Concept

You declare **where dragging can take you**, and the framework handles interpolation and snapping. The system renders all target states, determines where the dragged element lands in each, and smoothly interpolates between them.

---

## Type Hierarchy

```ocaml
(* Your application state - any object type *)
type 'state

(* A state with an optional follow-up transition *)
type 'state transition = {
  display: 'state;          (* what you see while dragging here *)
  then_go_to: 'state option (* if Some, transition here on release *)
}

(* Most APIs accept either raw state or state-with-transition *)
type 'state target = 'state | 'state transition

(* The main drag spec - a sum type *)
type 'state drag_spec =
  | Manifolds of 'state manifold_spec list
  | Floating of 'state floating_spec
  | Params of 'state params_spec

(* Discrete state specs *)
type 'state manifold_spec =
  | Span of 'state target list      (* interpolate across all *)
  | StraightTo of 'state target     (* direct path to one *)

(* Free-movement spec *)
type 'state floating_spec = {
  targets: 'state target list;
  backdrop: 'state target option;
  ghost: bool;
  on_top: bool;
}

(* Continuous numeric control *)
type 'state params_spec =
  | ParamPaths of path list
  | CustomParams of float list * (float list -> 'state)
```

---

## Constructors

### State Transitions

```ocaml
val andThen : 'state -> 'state -> 'state transition
```

Wraps a state with a follow-up. Display one state while dragging, transition to another on release.

```typescript
// Show item in trash while dragging, remove entirely on release
andThen(deleteState, postDeleteState)

// Cancel behavior: show removed state, but return to original on release
andThen(stateWithout, originalState)
```

---

### Manifold Specs (Discrete States)

#### `span`

```ocaml
val span : 'state target list -> 'state manifold_spec
```

Creates a single manifold connecting all states. The dragged element interpolates smoothly through the space.

```typescript
// Binary toggle
span([{ value: true }, { value: false }])

// Reordering: all permutations of item position
span(allPermutations)
```

#### `straightTo`

```ocaml
val straightTo : 'state target -> 'state manifold_spec
```

Creates a direct path from current state to target. Multiple `straightTo`s create separate "tracks."

```typescript
// Next/previous controls
[
  state.value > 0 && straightTo({ value: state.value - 1 }),
  state.value < 3 && straightTo({ value: state.value + 1 }),
]
```

#### `span` vs `straightTo`

| `span([A, B, C])` | `[straightTo(A), straightTo(B), straightTo(C)]` |
|-------------------|------------------------------------------------|
| One connected manifold | Three separate tracks |
| Interpolates between all states | Picks one track based on direction |
| Smooth movement through space | Discrete choice of destination |

**Semantic equivalence** (in context where current state is `c`):
```
straightTo(s) ≈ span([c, s])
```

---

### Floating Spec (Free Movement)

```ocaml
val floating :
  'state target list ->
  ?backdrop:'state target ->
  ?ghost:bool ->
  ?on_top:bool ->
  'state floating_spec
```

Element follows cursor freely, snaps to nearest target on release.

| Parameter | Type | Purpose |
|-----------|------|---------|
| `targets` | `'state target list` | Valid drop positions |
| `backdrop` | `'state target option` | Shown when far from all targets |
| `ghost` | `bool` | Show faded copy at original position |
| `on_top` | `bool` | Render floating element above everything |

```typescript
// Reorderable list with floating
const stateWithout: State = produce(state, d => {
  d.items.splice(idx, 1);  // remove item
});

const statesWith: State[] = produceAmb(stateWithout, d => {
  const i = amb(_.range(d.items.length + 1));
  d.items.splice(i, 0, item);  // insert at each position
});

floating(statesWith, { backdrop: stateWithout })
```

#### `span` vs `floating`

| `span(states)` | `floating(states, {backdrop})` |
|----------------|-------------------------------|
| Element position derived from state | Element follows cursor |
| Always "on rails" | Free movement, snap on release |
| No backdrop concept | Backdrop shown when far from targets |

---

### Params Specs (Continuous Control)

```ocaml
val numAtPath : path -> 'state params_spec
val numsAtPaths : path list -> 'state params_spec
val params : float list -> (float list -> 'state) -> 'state params_spec
```

Numeric minimization: system adjusts parameters to make element follow cursor.

```typescript
// Single angle control
numAtPath(["angle"])

// 2D position control
numsAtPaths([["x"], ["y"]])

// Custom parameterization
params([initialAngle, initialRadius], (angle, radius) => ({
  x: radius * Math.cos(angle),
  y: radius * Math.sin(angle),
}))
```

---

### The Wrapper

```ocaml
val drag : ('state drag_spec | (unit -> 'state drag_spec)) -> opaque
```

Wraps a drag spec for attachment to elements. Accepts either a spec directly or a thunk.

```typescript
// Static spec (doesn't depend on current state)
data-on-drag={drag(numAtPath(["angle"]))}

// Dynamic spec (computed from current state)
data-on-drag={drag(() => {
  const reachable = computeReachableStates(state);
  return span(reachable);
})}

// Conditional (disable dragging)
data-on-drag={isEnabled && drag(...)}
```

---

## State Generation Helpers

These are utilities for generating lists of states, not part of the drag spec DSL itself.

### `produce` (from Immer)

Immutable state update.

```typescript
const newState: State = produce(state, draft => {
  draft.items.push("new");
});
```

### `amb` / `produceAmb`

Nondeterministic generation of multiple states. Resolves **immediately** when called.

```typescript
// amb: "for each value in array"
// produceAmb: run recipe for each amb choice, collect results

const allPlacements: State[] = produceAmb(baseState, draft => {
  const idx = amb([0, 1, 2, 3]);  // try each index
  draft.items.splice(idx, 0, item);
});
// Returns array of 4 states, one for each idx
```

---

## Abstraction Levels

```
Level 3: State Generation
         produce, produceAmb, amb
              │
              ▼ produces state lists
Level 2: Drag Spec DSL
         span, straightTo, floating, numAtPath, numsAtPaths, params
         andThen (state transition wrapper)
              │
              ▼ produces DragSpec
Level 1: Attachment Wrapper
         drag(spec) or drag(() => spec)
              │
              ▼ produces opaque value
Level 0: Element Binding
         data-on-drag={...}
```

---

## Framework Behaviors

### Chain Drags (automatic)

When `chainDrags: true` (default), reaching a target mid-drag triggers re-evaluation:

1. State snaps to target
2. Drag spec is recalculated from new state
3. Drag continues with new available targets

This enables multi-step exploration in a single drag (e.g., nool-tree rewrites).

### Interpolation

For manifold-based drags (`span`, `straightTo`), the framework:
1. Renders all target states
2. Projects cursor onto manifold (using Delaunay triangulation)
3. Interpolates rendered SVG based on barycentric coordinates

---

## Patterns

### Reorderable List (span)

Element stays "on rails," slides between positions.

```typescript
drag(() => span(
  _.range(items.length).map(idx =>
    produce(state, d => {
      d.items.splice(currentIdx, 1);
      d.items.splice(idx, 0, item);
    })
  )
))
```

### Reorderable List (floating)

Element follows cursor, snaps on release.

```typescript
drag(() => {
  const without = produce(state, d => d.items.splice(idx, 1));
  const placements = produceAmb(without, d => {
    d.items.splice(amb(_.range(d.items.length + 1)), 0, item);
  });
  return floating(placements, { backdrop: without });
})
```

### Delete with Preview

Show item in trash while dragging, remove on release.

```typescript
const deleteState = produce(state, d => { d.deleted = item; });
const afterDelete = produce(deleteState, d => { d.deleted = undefined; });

floating(
  [...rearrangeStates, andThen(deleteState, afterDelete)],
  { backdrop: stateWithout }
)
```

### Cancel Behavior

Dragging far away returns to original state.

```typescript
floating(placements, {
  backdrop: andThen(stateWithout, originalState)
})
```

### Continuous Angle Control

```typescript
const knobPos = Vec2(radius, 0).rotateDeg(state.angle).add(center);

<circle
  transform={translate(knobPos)}
  data-on-drag={drag(numAtPath(["angle"]))}
/>
```

---

## Key Constraints

- **Element identity**: Use `id` attribute (not React `key`)
- **Positioning**: Use `transform={translate(...)}` (not `x`/`y` attributes)
- **Transform order**: SVG transforms are right-to-left; put `translate` first
- **No slashes in IDs**: Use `node-1-2` not `node/1/2`
