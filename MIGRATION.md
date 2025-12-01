# Migration Guide: Manipulable to Manipulable

## Overview

Converting from the old `Manipulable` API to the new `Manipulable` API.

## ⚠️ CRITICAL MISTAKES TO AVOID

When porting manipulables, there are two common mistakes that will break behavior:

### 1. Missing demo settings when adding to demos.tsx

**ALWAYS copy ALL settings from the original demo!**

When you port a manipulable, find the original demo entry in `demos.tsx` and copy every setting:
- `height` - copy exactly
- `padding` - copy exactly
- `initialSnapRadius` - copy exactly (if present) ← **Most commonly forgotten!**
- `initialRelativePointerMotion` - copy exactly (if present)
- `initialChainDrags` - copy exactly (if present)
- Any other props - copy them all

See the "Adding Demos to demos.tsx" section below for detailed examples.

### 2. Changing span() to straightTo() in drag logic

**DON'T change `span(states)` to `states.map(straightTo)`!**

These have different behavior:
- `span(states)` - creates a single manifold from an array of states
- `states.map(straightTo)` - creates an array of individual manifolds

Always check what the original uses and match it exactly. See "Drag Specifications" section below for examples.

## Pattern Changes

### File Setup

**Before:**
```typescript
import { Manipulable, span } from "./manipulable";
import { circle, group, line } from "./shape";
```

**After:**
```typescript
import { straightTo } from "./DragSpec";
import { Manipulable, translate } from "./manipulable";
```

### Type Signature

**Before:**
```typescript
export const manipulableGridPoly: Manipulable<GridPolyState> = {
  sourceFile: "manipulable-grid-poly.ts",
  render(state) { ... },
  onDrag(state, draggableKey) { ... }
};
```

**After:**
```typescript
export const manipulableGridPolySvg: Manipulable<GridPolyState> = ({
  state,
  draggable,
  draggedId,
}) => {
  // Return JSX directly
  // draggedId contains the id of the currently dragged element (if any)
};
```

### Rendering Shapes

**Before:**
```typescript
circle({
  center: Vec2(x * TILE_SIZE, y * TILE_SIZE),
  radius: 5,
  fillStyle: "gray",
})
```

**After:**
```typescript
<circle
  cx={x * TILE_SIZE}
  cy={y * TILE_SIZE}
  r={5}
  fill="gray"
/>
```

### Making Elements Draggable

**Before:**
```typescript
circle({
  center: Vec2(0),
  radius: 10,
  fillStyle: "black",
})
  .draggable(`${idx}`)
  .translate(Vec2(pt.x * TILE_SIZE, pt.y * TILE_SIZE))
```

**After:**
```typescript
draggable(
  <circle
    transform={translate(pt.x * TILE_SIZE, pt.y * TILE_SIZE)}
    cx={0}
    cy={0}
    r={10}
    fill="black"
  />,
  // drag spec here
)
```

### Drag Specifications

**Before:**
```typescript
onDrag(state, draggableKey) {
  const idx = parseInt(draggableKey, 10);
  const states = [];
  // ... compute states
  return span(states);
}
```

**After:**
```typescript
draggable(
  <element />,
  () => {
    const states = [];
    // ... compute states
    return span(states);
  }
)
```

**Note:** `span()` is still used the same way - it takes an array of states and creates a manifold. Import it from `"./DragSpec"`.

For simple transitions to specific states, use `straightTo()`:
```typescript
draggable(
  <element />,
  [
    state.value > 0 && straightTo({ value: state.value - 1 }),
    state.value < 3 && straightTo({ value: state.value + 1 }),
  ]
)
```

**⚠️ CRITICAL: Don't change span() to straightTo() when porting!**

A common mistake is to change `span(states)` to `states.map(straightTo)` when porting. **DON'T DO THIS!**

**Wrong ❌:**
```typescript
// Original uses span
onDrag(state, draggableKey) {
  const states = computeAllStates();
  return span(states);  // Original
}

// WRONG port - changed span to map(straightTo)
draggable(<element />, () => {
  const states = computeAllStates();
  return states.map(straightTo);  // ❌ WRONG - changes behavior!
})
```

**Correct ✓:**
```typescript
// Correct port - keep using span
draggable(<element />, () => {
  const states = computeAllStates();
  return span(states);  // ✓ Correct - matches original
})
```

**Why this matters:**
- `span(states)` - creates a single manifold from an array of states
- `states.map(straightTo)` - creates an array of individual manifolds

These have different behavior! Always check what the original uses and match it exactly.

### Grouping Elements

**Before:**
```typescript
group(
  element1,
  element2,
  array.map(item => makeElement(item))
)
```

**After:**
```typescript
<g>
  {element1}
  {element2}
  {array.map(item => makeElement(item))}
</g>
```

### Lines

**Before:**
```typescript
line({
  from: Vec2(x1, y1),
  to: Vec2(x2, y2),
  strokeStyle: "black",
  lineWidth: 2,
})
```

**After:**
```typescript
<line
  x1={x1}
  y1={y1}
  x2={x2}
  y2={y2}
  stroke="black"
  strokeWidth={2}
/>
```

### Text (rectangle with label only)

In the old API, `rectangle()` with only a `label` property (no fill/stroke) renders just text, not an actual rectangle.

**Before:**
```typescript
rectangle({
  xywh: [x, y, width, height],
  label: "Hello",
})
```

**After:**
```typescript
<text
  x={x + width / 2}
  y={y + height / 2}
  dominantBaseline="middle"
  textAnchor="middle"
  fontSize={14}
  fill="black"
>
  Hello
</text>
```

**Note:** The old API centers text in the given `xywh` bounds. In SVG, use the center point with `textAnchor="middle"` and `dominantBaseline="middle"` to achieve the same effect.

### Property Name Changes

| Old API | New API (SVG) |
|---------|---------------|
| `fillStyle` | `fill` |
| `strokeStyle` | `stroke` |
| `lineWidth` | `strokeWidth` |
| `center` (circle) | `cx`, `cy` |
| `radius` | `r` |
| `.zIndex(n)` | `data-z-index={n}` |

### Absolute Keys Become IDs

The old API used `.absoluteKey()` to give elements stable identities across state changes. In SVG, this becomes the `id` attribute:

**Before:**
```typescript
element
  .draggable(key)
  .absoluteKey(key)
```

**After:**
```typescript
<element id={key} />
```

**Important:** The `id` attribute is what replaces `.absoluteKey()` - it's used by the framework to track elements across state changes and interpolate between them.

**DO NOT use slashes in IDs:** Element IDs cannot contain forward slashes (`/`). The framework uses slashes internally for path tracking, and IDs with slashes will cause errors. Use hyphens or other separators instead.

**Examples:**
```typescript
// ✓ Good - uses hyphens
<g id="root-1-2" />
<rect id="node-a-b" />

// ✗ Bad - contains slashes
<g id="root/1/2" />  // Error!
<rect id="node/a/b" />  // Error!
```

**DO NOT use React's `key` prop:** When porting diagrams, do NOT add `key` props to elements. React's `key` is completely unrelated to the framework's element tracking and serves no purpose here. Only use `id` when you need stable element identity.

### Transform Positioning

The old API used `.translate()` method chaining. The new API uses the `transform` attribute with the `translate()` helper:

**Before:**
```typescript
element.translate(Vec2(x, y))
```

**After:**
```typescript
<element transform={translate(x, y)} />
```

Or:
```typescript
<element transform={translate(Vec2(x, y))} />
```

## Complete Example: manipulable-grid-poly

**Before (manipulable-grid-poly.ts):**
```typescript
import { produce } from "immer";
import _ from "lodash";
import { Manipulable, span } from "./manipulable";
import { circle, group, line } from "./shape";
import { assert } from "./utils";
import { Vec2 } from "./vec2";

type GridPolyState = {
  w: number;
  h: number;
  points: { x: number; y: number }[];
};

export const manipulableGridPoly: Manipulable<GridPolyState> = {
  sourceFile: "manipulable-grid-poly.ts",

  render(state) {
    const TILE_SIZE = 50;
    return group(
      _.range(state.w).map((x) =>
        _.range(state.h).map((y) =>
          circle({
            center: Vec2(x * TILE_SIZE, y * TILE_SIZE),
            radius: 5,
            fillStyle: "gray",
          }),
        ),
      ),
      state.points.map((pt, idx) =>
        circle({
          center: Vec2(0),
          radius: 10,
          fillStyle: "black",
        })
          .draggable(`${idx}`)
          .translate(Vec2(pt.x * TILE_SIZE, pt.y * TILE_SIZE)),
      ),
      state.points.map((pt, idx) => {
        const nextPt = state.points[(idx + 1) % state.points.length];
        return line({
          from: Vec2(pt.x * TILE_SIZE, pt.y * TILE_SIZE),
          to: Vec2(nextPt.x * TILE_SIZE, nextPt.y * TILE_SIZE),
          strokeStyle: "black",
          lineWidth: 2,
        });
      }),
    );
  },

  onDrag(state, draggableKey) {
    const idx = parseInt(draggableKey, 10);
    assert(!isNaN(idx));
    const states = [];
    for (const x of _.range(state.w)) {
      for (const y of _.range(state.h)) {
        if (!state.points.some((pt) => pt.x === x && pt.y === y)) {
          states.push(
            produce(state, (draft) => {
              draft.points[idx] = { x, y };
            }),
          );
        }
      }
    }
    return span(states);
  },
};
```

**After (manipulable-grid-poly-svg.tsx):**
```typescript
import { produce } from "immer";
import _ from "lodash";
import { span } from "./DragSpec";
import { Manipulable, translate } from "./manipulable";

type GridPolyState = {
  w: number;
  h: number;
  points: { x: number; y: number }[];
};

export const manipulableGridPolySvg: Manipulable<GridPolyState> = ({
  state,
  draggable,
  draggedId,
}) => {
  const TILE_SIZE = 50;

  return (
    <g>
      {/* Grid points */}
      {_.range(state.w).map((x) =>
        _.range(state.h).map((y) => (
          <circle
            cx={x * TILE_SIZE}
            cy={y * TILE_SIZE}
            r={5}
            fill="gray"
          />
        )),
      )}

      {/* Polygon edges */}
      {state.points.map((pt, idx) => {
        const nextPt = state.points[(idx + 1) % state.points.length];
        return (
          <line
            x1={pt.x * TILE_SIZE}
            y1={pt.y * TILE_SIZE}
            x2={nextPt.x * TILE_SIZE}
            y2={nextPt.y * TILE_SIZE}
            stroke="black"
            strokeWidth={2}
          />
        );
      })}

      {/* Draggable polygon vertices */}
      {state.points.map((pt, idx) =>
        draggable(
          <circle
            transform={translate(pt.x * TILE_SIZE, pt.y * TILE_SIZE)}
            cx={0}
            cy={0}
            r={10}
            fill="black"
          />,
          () => {
            const states = [];
            for (const x of _.range(state.w)) {
              for (const y of _.range(state.h)) {
                if (!state.points.some((p) => p.x === x && p.y === y)) {
                  states.push(
                    produce(state, (draft) => {
                      draft.points[idx] = { x, y };
                    })
                  );
                }
              }
            }
            return span(states);
          },
        ),
      )}
    </g>
  );
};
```

### Key Changes in This Example

1. **No more `sourceFile` field** - not needed in the new API
2. **No more `render(state)` and `onDrag(state, draggableKey)` split** - everything is in one function
3. **`group()` becomes `<g>`** - use JSX
4. **Draggable key is implicit** - derived from the element's position in the tree
5. **`span(states)` stays the same** - still used to create manifolds from arrays of states
6. **`.absoluteKey()` becomes `id` attribute** - use `id={key}` on SVG elements when you need stable identity across state changes
7. **`draggedId` parameter** - available in the function signature for visual feedback during dragging (see example in `manipulable-perm-svg.tsx`)
8. **Comments can clarify sections** - JSX allows comments to organize the rendering
9. **No React `key` props needed** - don't add them when porting diagrams

## Visual Feedback During Dragging

In the old API, `render(state, draggableKey)` received the currently dragged element's key, allowing custom visual feedback. The new API provides similar functionality via the `draggedId` parameter:

**Before:**
```typescript
render(state, draggableKey) {
  return group(
    state.items.map((item) =>
      element
        .draggable(item.id)
        .translate(Vec2(x, item.id === draggableKey ? -10 : 0))
    )
  );
}
```

**After:**
```typescript
export const manipulableExample: Manipulable<State> = ({
  state,
  draggable,
  draggedId,
}) => {
  return (
    <g>
      {state.items.map((item, idx) =>
        draggable(
          <g
            id={item.id}
            transform={translate(x, item.id === draggedId ? -10 : 0)}
          >
            {/* element content */}
          </g>,
          // drag spec
        )
      )}
    </g>
  );
};
```

**Key points:**
- `draggedId` contains the `id` of the element currently being dragged (or `undefined` if nothing is being dragged)
- To use this feature, elements must have an `id` attribute
- You can use `draggedId` to provide visual feedback like lifting, highlighting, or changing appearance during drag
- See `manipulable-perm-svg.tsx` for a complete working example

### Z-Index / Stacking Order

The old API had `.zIndex()` for controlling stacking order:

**Before:**
```typescript
element.zIndex(10)
```

**After:**
```typescript
<element data-z-index={10} />
```

Elements are rendered in order of their `data-z-index` value (default: 0). Lower values render first (appear below), higher values render last (appear on top).

**Important:** `data-z-index` can only be set on elements that have an `id` attribute. Setting it on an element without an `id` will throw an error.

**Example:**
```typescript
<g>
  <rect id="r1" data-z-index={10} fill="red" />   {/* ✓ Valid: has id */}
  <rect id="r2" data-z-index={5} fill="blue" />    {/* ✓ Valid: has id */}
  <rect id="r3" fill="green" />                    {/* ✓ Valid: data-z-index defaults to 0 */}
  <rect data-z-index={1} fill="yellow" />          {/* ✗ Error: no id! */}
</g>
```

## Adding Demos to demos.tsx

**⚠️ CRITICAL:** When migrating a manipulable and adding it to `demos.tsx`, you MUST copy ALL settings from the original demo. Missing even one setting will cause different behavior.

### Step-by-step process:

1. **Find the original demo** in `demos.tsx`
2. **Copy EVERY prop** from the original to the new SVG version
3. **Double-check** you didn't miss any

**Example - migrating "outline":**
```typescript
// Step 1: Find the original demo
<Demo
  id="outline"
  title="Outline"
  manipulable={manipulableOutline}
  initialState={stateOutline1}
  height={400}              // ← MUST copy this
  padding={20}              // ← MUST copy this
  initialSnapRadius={5}     // ← MUST copy this - DON'T SKIP!
/>

// Step 2: Create new SVG demo with ALL the same settings
<Demo
  id="outline-svg"
  title="Outline (SVG)"
  manipulableSvg={manipulableOutlineSvg}
  initialState={stateOutline1Svg}
  height={400}              // ✓ Copied
  padding={20}              // ✓ Copied
  initialSnapRadius={5}     // ✓ Copied - this is easy to forget!
/>
```

**Common settings that MUST be copied:**
- `height` - Canvas height in pixels - **ALWAYS copy**
- `padding` - Padding around the diagram - **ALWAYS copy**
- `initialSnapRadius` - Snap radius for dragging - **ALWAYS copy if present**
- `initialRelativePointerMotion` - Relative pointer motion - **ALWAYS copy if present**
- `initialChainDrags` - Chain drags - **ALWAYS copy if present**
- Any other props - **COPY EVERYTHING**

**Common mistakes to avoid:**
- ❌ Forgetting `initialSnapRadius` (this is the most common mistake!)
- ❌ Copying some settings but not all
- ❌ Assuming a setting isn't needed for SVG
- ❌ Not checking the original demo first

**When in doubt:** Open `demos.tsx`, find the original demo, and copy every single prop.

## Migrated Examples

The following examples have been migrated and are available in the demos:

- **Grid Polygon**: `manipulable-grid-poly-svg.tsx` (see demo "Grid polygon (SVG)")
- **Permutation**: `manipulable-perm-svg.tsx` (see demo "Permutation (SVG)") - demonstrates `draggedId` for visual feedback
- **Permutation of Permutations**: `manipulable-perm-double-svg.tsx` (see demo "Permutation of permutations (SVG)") - demonstrates complex z-index logic with `draggedId`
- **Second Simplest**: `manipulable-second-simplest-svg.tsx` (see demo "Second simplest (SVG)")
- **Tiles**: `manipulable-tiles-svg.tsx` (see demo "Lonely tile on a grid (SVG)")
- **Angle**: `manipulable-angle-svg.tsx` (see demo "Angle (SVG)")
- **Nool Tree**: `manipulable-nool-tree-svg.tsx` (see demos "Nool tree (SVG)" and "Nool tree, simpler (SVG)") - demonstrates recursive rendering and complex drag logic with tree transformations
- **Outline**: `manipulable-outline-svg.tsx` (see demo "Outline (SVG)") - demonstrates recursive tree rendering with drag-to-reorder functionality
- **Spinny**: `manipulable-spinny-svg.tsx` (see demo "Spinny (SVG)") - demonstrates circular arrangement with rotation transforms and drag-to-rotate functionality
