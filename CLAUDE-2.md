# Codebase Architecture Notes

## Core Data Flow (v2 drag system)

```
DragSpec (plain data) → dragSpecToBehavior() → DragBehavior (frame → DragResult) → ManipulableDrawer renders result
```

### Key types in DragSpec2.tsx
- `DragSpec<T>` — union of spec types: just, floating, closest, with-background, and-then, vary, with-distance, with-snap-radius, span, transition-to-and-then
- `DragBehavior<T>` = `(frame: DragFrame) => DragResult<T>` — the runtime function
- `DragResult<T>` — has `rendered: LayeredSvgx`, `dropState: T`, `distance: number`, `activePath: string`, optional `debugOverlay: () => Svgx`, optional `chainNow`
- `BehaviorContext<T>` — carries manipulable, draggedPath, draggedId, pointerLocal, floatLayered

### ManipulableDrawer2.tsx
- State machine: idle | dragging, with optional springingFrom
- Animation loop calls `behavior(frame)` each frame during drag
- `DrawIdleMode` — renders with interaction (grab cursors, pointerDown handlers)
- `DrawDraggingMode` — renders result.rendered + optional debugOverlay
- Spring system: 200ms cubic-out easing via `runSpring()`
- `initDrag()` sets up behavior from spec + context

### DebugManipulableDrawer.tsx
- Wraps ManipulableDrawer with debug features
- Props: showTreeView, showDropZones, showDebugOverlay (all booleans from V2DemoPage)
- Manages DebugDragInfo state via onDebugDragInfo callback

### V2DemoPage.tsx
- Top-level page with checkbox controls (fixed top-right)
- `Drawer` helper passes showTreeView, showDropZones, showDebugOverlay to DebugManipulableDrawer

## SVG Representation
- `Svgx` = `React.ReactElement<React.SVGProps<SVGElement>>`
- `LayeredSvgx` = `{ byId: Map<string, Svgx>, descendents: Map<string, Set<string>> | null }`
- Elements with `id` get pulled to top-level of the Map
- Root goes in with key `""`

## File Conventions
- DragSpec2.tsx is now .tsx (was .ts, renamed to support JSX in debugOverlay)
- demo-diagrams-2/ contains v2 diagram implementations
- manipulable2.tsx defines the Manipulable type and unsafeDrag/getDragSpecCallbackOnElement

## Gotchas
- SVG transforms are right-to-left: put translate() first
- No React keys in Manipulable definitions (uses id attributes)
- No slashes in IDs
- 14 snapshot test failures in layers.test.tsx and lerp.test.tsx are pre-existing
- `data-transition={false}` on elements means they skip spring animation (track cursor directly)
