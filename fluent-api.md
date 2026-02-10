# Fluent DragSpec API: Before & After

## The idea

Wrapper functions like `withSnapRadius(spec, 10)` become method calls: `spec.snapRadius(10)`. Leaf constructors (`span`, `just`, `floating`, `vary`, `closest`) stay the same. This eliminates inside-out nesting.

Methods:
- `.snapRadius(radius, opts?)` — was `withSnapRadius(spec, radius, opts)`
- `.dropTransition(transition?)` — was `withDropTransition(spec, transition)`
- `.withBackground(bg, opts?)` — was `withBackground(fg, bg, opts)`
- `.andThen(state)` — was `andThen(spec, state)`
- `.withDistance(f)` — was `withDistance(spec, f)`

---

## Examples

### linear-track — snap + drop transition

```typescript
// BEFORE
withDropTransition(
  withSnapRadius(span([{ value: true }, { value: false }]), 10),
  "elastic-out"
)

// AFTER
span([{ value: true }, { value: false }])
  .snapRadius(10)
  .dropTransition("elastic-out")
```

### spinny — chained closest of spans

```typescript
// BEFORE
withSnapRadius(
  closest([span([state, newState1]), span([state, newState2])]),
  10,
  { chain: true }
)

// AFTER
closest([span([state, newState1]), span([state, newState2])])
  .snapRadius(10, { chain: true })
```

### tiles — snap with transition + chain

```typescript
// BEFORE
withSnapRadius(
  closest(
    directions.map((d) => {
      // ...
      return span([state, newState]);
    })
  ),
  3,
  { transition: true, chain: true }
)

// AFTER
closest(
  directions.map((d) => {
    // ...
    return span([state, newState]);
  })
).snapRadius(3, { transition: true, chain: true })
```

### fifteen — chained snapping

```typescript
// BEFORE
withSnapRadius(closest(spans), 10, { chain: true })

// AFTER
closest(spans).snapRadius(10, { chain: true })
```

### kanban — column reordering with snap

```typescript
// BEFORE
withSnapRadius(span([state, ...columnReorderStates]), 20, {
  transition: true,
})

// AFTER
span([state, ...columnReorderStates])
  .snapRadius(20, { transition: true })
```

### perm-floating — floating with just backdrop

```typescript
// BEFORE
withBackground(
  closest(statesWith.map((s) => floating(s))),
  just(state)
)

// AFTER
closest(statesWith.map((s) => floating(s)))
  .withBackground(just(state))
```

### canvas-of-lists — floating foreground, vary backdrop

```typescript
// BEFORE
withBackground(
  closest(statesWith.map((s) => floating(s))),
  vary(
    stateWithNewRow,
    ["rows", newRowId, "x"],
    ["rows", newRowId, "y"]
  )
)

// AFTER
closest(statesWith.map((s) => floating(s)))
  .withBackground(
    vary(stateWithNewRow, ["rows", newRowId, "x"], ["rows", newRowId, "y"])
  )
```

### orbiting-planet-with-background — vary foreground + vary background + radius

```typescript
// BEFORE
withBackground(
  closest(
    STARS.map((_, starIdx) =>
      vary({ mode: "orbiting", currentStar: starIdx, angle }, ["angle"])
    )
  ),
  vary({ mode: "free", x: planetX, y: planetY }, ["x"], ["y"]),
  { radius: 50 }
)

// AFTER
closest(
  STARS.map((_, starIdx) =>
    vary({ mode: "orbiting", currentStar: starIdx, angle }, ["angle"])
  )
).withBackground(
  vary({ mode: "free", x: planetX, y: planetY }, ["x"], ["y"]),
  { radius: 50 }
)
```

### list-of-lists — floating with andThen backdrop

```typescript
// BEFORE
withBackground(
  closest(statesWith.map((s) => floating(s))),
  andThen(floating(stateWithout), state)
)

// AFTER
closest(statesWith.map((s) => floating(s)))
  .withBackground(floating(stateWithout).andThen(state))
```

### insert-and-remove — andThen for delete

```typescript
// BEFORE
andThen(floating(deleteState), postDeleteState)

// AFTER
floating(deleteState).andThen(postDeleteState)
```

### node-wires — conditional andThen + withBackground

```typescript
// BEFORE
let varySpec: DragSpec<State> = vary(freeState, ...paths);
if (shouldDelete) {
  varySpec = andThen(varySpec, deleteState);
}
return withBackground(closest(snapSpecs), varySpec, { radius: 20 });

// AFTER
let varySpec: DragSpec<State> = vary(freeState, ...paths);
if (shouldDelete) {
  varySpec = varySpec.andThen(deleteState);
}
return closest(snapSpecs).withBackground(varySpec, { radius: 20 });
```

### tromino — conditional structure with snap + chain

```typescript
// BEFORE
withSnapRadius(
  config.snappyMode
    ? closest(
        [...singleRotations, state].map((s) =>
          floating(s, { ghost: { opacity: 0.2 } })
        )
      )
    : closest(singleRotations.map((s) => span([state, s]))),
  1,
  { chain: true }
)

// AFTER
(config.snappyMode
  ? closest(
      [...singleRotations, state].map((s) =>
        floating(s, { ghost: { opacity: 0.2 } })
      )
    )
  : closest(singleRotations.map((s) => span([state, s])))
).snapRadius(1, { chain: true })
```

### todo — conditional floating vs span

```typescript
// BEFORE
config.useFloating
  ? withBackground(
      closest(statesWith.map((s) => floating(s))),
      floating(stateWithout)
    )
  : span(statesWith)

// AFTER
config.useFloating
  ? closest(statesWith.map((s) => floating(s)))
      .withBackground(floating(stateWithout))
  : span(statesWith)
```

---

## Cases that don't change

These are already clean — no wrapping involved:

```typescript
// vary (leaf)
vary(state, ["angle"])
vary(state, ["x"], ["y"])
vary(state, ["x"], ["y"], { constraint: ... })

// span (leaf)
span([state1, state2])

// closest of spans/varies (no outer wrapper)
closest(specs)
closest(STARS.map((_, i) => vary({ currentStar: i, angle }, ["angle"])))

// floating (leaf)
floating(state, { ghost: { opacity: 0.5 } })
```

---

## Summary

The fluent style helps most when there's **nesting of wrappers** — the 2-3 deep `withDropTransition(withSnapRadius(withBackground(...)))` cases. It reads top-to-bottom instead of inside-out.

It doesn't help (or change) leaf constructors or flat `closest([...])` calls, which are already clear.

The trickiest case is the ternary + method call (tromino), where you need parens around the ternary before `.snapRadius(...)`. Not terrible, but worth noting.
