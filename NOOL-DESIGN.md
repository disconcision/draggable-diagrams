# Nool Design Notes

## The Core Insight

Current Nool has two "fixed" aspects:
1. **Fixed initial state** (the expression/tree you manipulate)
2. **Fixed rewrite rules** (the transformations available)

The vision is to make both of these editable/constructible, eventually linking everything together into a cohesive system.

---

## Terminology

- **Stage**: An algebraic expression being manipulated (the "initial state" in current Nool)
- **Rewrite rules**: Pattern-based transformations (what current Nool calls axioms)
- **Grammar**: The fixed set of operations with fixed arities (binary ops, atoms, etc.)

---

## Variant 1: Stage Builder (Expression Constructor)

### Goal
Build algebraic expressions from scratch, rather than only transforming existing ones.

### Key Distinction from Current Nool
Current Nool only allows **semantics-preserving** transformations (the axioms). Building from scratch requires **non-semantics-preserving** operations—you're constructing, not transforming.

### Approach: Grammar-Based Construction

Start with a fixed grammar:
- Binary operations: `+`, `×`
- Unary operations: `-` (negation) — future
- Atoms: variables (emoji), numbers

Construction model:
- Start with a **hole** (non-terminal)
- Have a **toolkit/palette** of blocks (operations and atoms)
- Drag blocks from toolkit onto holes to build up expressions
- When an operation is placed, it creates new holes for its operands

### UX Goals
- When dragging a block over a droppable hole, the hole **expands** to receive it
- Smooth animations (the framework supports this via interpolation)

### Open Questions
- Does the draggable paradigm extend naturally here?
- The identity rules (`a → 0 + a`) have a "creating something from nothing" quality—related?
- Multiple production rules can apply to one non-terminal—how to disambiguate via drag?

### Relevant Existing Demos to Study
- `insert-and-remove`: Creating/removing items
- `list-of-lists` / `list-of-lists-sizes`: Floating pattern, drag between containers
- `perm-floating`: Item moves between positions
- `todo`: Has add/remove interactions
- Others TBD

---

## Variant 2: Rewrite Rule Builder

### Goal
Construct the transformation rules themselves, rather than using a fixed set.

### Approach A: Direct Construction

Think of a rewrite rule as a special binary operation:
```
LHS  →  RHS
```

Use the same block-based UI as the Stage Builder:
- The `→` (or `↔` for bidirectional) is an operation
- LHS and RHS are expression slots
- Build patterns using the same toolkit

This means rules are just another kind of "expression" to construct.

### Approach B: Macro Recorder / "Enacting"

1. Start with an expression X
2. Manipulate it **freely** (non-semantics-preserving) into Y
3. This creates the rule `X → Y`

Like "recording" a transformation to define it.

**Sub-variant**:
- Take a regular expression X
- Press a button to turn it into `X → X` (identity rewrite)
- Then manipulate one side freely to get `X → Y`

### Open Questions
- What's the "free manipulation" mode? How does it differ from current Nool?
- Is Approach B actually different from Approach A, or just a different UX for the same thing?
- How much freedom? Can you break grammar constraints?

---

## Relationship Between Variants

```
┌─────────────────────────────────────────────────────────────┐
│                      NOOL PROPER                            │
│  (Current Nool: apply rewrite rules to transform stages)    │
│                                                             │
│         ↑ uses stages              ↑ uses rules             │
│                                                             │
├─────────────────────┬───────────────────────────────────────┤
│   STAGE BUILDER     │         RULE BUILDER                  │
│   (Variant 1)       │         (Variant 2)                   │
│                     │                                       │
│   Build expressions │   Build rewrite rules                 │
│   from blocks       │   (as special expressions, or         │
│                     │    by "enacting" transformations)     │
└─────────────────────┴───────────────────────────────────────┘
```

Eventually: outputs from builders feed into Nool proper.

---

## Meta-Level (Future)

- Grammar editor: Define what operations exist and their arities
- Free-form mode: Expressions that don't respect a fixed grammar
- These are deferred for now—start with fixed grammar

---

## Implementation Plan

### Phase 1: Infrastructure
- [x] Create Nool-dedicated page (`/nool`)
- [ ] Keep original Nool on main demos page
- [ ] Set up `nool-demos.ts` for Nool-specific demo registry

### Phase 2: Stage Builder
- [ ] Study relevant demos (insert-and-remove, list-of-lists, etc.)
- [ ] Design the "toolkit" UI
- [ ] Implement drag-from-toolkit-to-hole interaction
- [ ] Nice expand-on-hover animations

### Phase 3: Rule Builder
- [ ] Decide: Direct construction vs. macro recorder vs. both
- [ ] If direct: Treat `→` as an operation, reuse Stage Builder patterns
- [ ] If macro: Design "free manipulation" mode

### Phase 4: Integration
- [ ] Connect Stage Builder output to Nool proper
- [ ] Connect Rule Builder output to Nool proper
- [ ] Consider unified UI

---

## Demos to Study for Inspiration

| Demo | Relevant Aspect |
|------|-----------------|
| `insert-and-remove` | **KEY** - Has toolkit/store, items clone when dragged out |
| `list-of-lists` | Floating pattern, moving between containers, `produceAmb` |
| `perm-floating` | Simple floating reorder pattern |
| `todo` | Uses `setState` directly for input, has Add button |
| `outline` | Tree structure, `insertAtAllPositions` for all placements |
| `nool-tree` (current) | Baseline—tree rendering, rewrite application |

---

## Key Patterns from Existing Demos

### `insert-and-remove` (Most Relevant for Stage Builder)
```typescript
// Store items don't disappear—they CLONE when dragged
const stateWithout = produce(state, (draft) => {
  draft.store[storeItemIdx].key += "-1";  // Mutate key to create "new" item
});

// Generate all insertion positions
const statesWith = produceAmb(stateWithout, (draft) => {
  const insertIdx = amb(_.range(state.items.length + 1));
  draft.items.splice(insertIdx, 0, storeItem);
});

return floating(statesWith, { backdrop: stateWithout });
```

This is the **toolkit pattern**: drag from palette, item stays in palette (cloned).

### `outline` (Tree Insertion)
```typescript
// Insert a node at ALL possible positions in tree
function insertAtAllPositions(tree: Tree, child: Tree): Tree[] {
  // Recursively finds every valid insertion point
  // Returns array of all possible resulting trees
}
```

This could be adapted for Nool—insert an operation node at all valid positions.

### `list-of-lists` (Nested Ambiguity)
```typescript
const statesWith = produceAmb(stateWithout, (draft) => {
  const newRow = amb(draft.rows);           // Which container?
  const newColIdx = amb(_.range(...));      // Which position in container?
  newRow.items.splice(newColIdx, 0, p);
});
```

Nested `amb()` for multiple dimensions of choice.

---

## Design Decisions to Make

### Stage Builder: How do "holes" work?
Options:
1. **Explicit hole type**: State has special `{ type: "hole", id: "..." }` nodes
2. **Implicit holes**: Any atom position can accept an operation (replaces atom)
3. **Typed holes**: Holes specify what can fill them (e.g., "expression" vs "atom")

Recommendation: Start with **explicit holes**. A hole is a leaf node that can accept operations or atoms.

### Stage Builder: What's in the toolkit?
- Binary operations: `+`, `×`
- Atoms: A fixed set of emoji/variables
- Maybe unary: `-` (negation)

Each is a "template" that gets cloned when dragged (like `insert-and-remove`).

### Rule Builder: Direct construction or macro recording?
Start with **direct construction**. It's simpler and reuses Stage Builder patterns.
- `→` is just another operation (binary, takes two expression slots)
- LHS and RHS start as holes
- Build both sides using the same toolkit

Macro recording is interesting but adds complexity (need "free manipulation" mode).

---

## Notes & Open Threads

- The identity rules in current Nool (`0 + a → a` and reverse) have a "creation" quality—related to inserting `0` nodes?
- "Bag of blocks" metaphor works well—see `insert-and-remove`
- Want nice UX: expand-on-hover, smooth interpolation (framework supports this)
- For tree structures: `outline` demo's `insertAtAllPositions` is a good reference

### Model A (drag-hole manifold) didn't work for Stage Builder

The manifold approach (drag a hole, snap to different expansion options) fails when all target states have the dragged element at essentially the same position. With 9+ targets (3 ops + 6 atoms) and no spatial differentiation, there's nothing to drag *toward*. Manifolds work for the Nool tree because rewrites *rearrange* existing elements into visually distinct positions.

### Interesting future interaction: "pull-toward" radial selection

For situations where multiple target states exist but lack natural spatial differentiation, an alternative interaction:
- When the user starts dragging, the target states appear arranged *around* the current element (like a radial menu)
- Dragging doesn't move the cursor/element—instead, dragging in a direction pulls the nearest target state *toward* the current state
- Releasing "snaps" that target into place, replacing the current state
- Think of it as "bringing a state to you" rather than "moving to a state"

This could generalize the drag paradigm to situations where the standard "drag toward a visual position" metaphor breaks down.

### Holes should be ephemeral, not persistent

Tried giving holes persistent IDs (swapping a hole's ID to the vacated position when a node is placed). This works for same-level sibling swaps (commutativity) but feels wrong across tree levels — a hole from deep in the tree sliding up to a higher level is conceptually incoherent. Sibling swaps already work without hole trickery (`swapChildrenAtParent` exchanges children in-place, both keep their real IDs). For cross-level placement, holes should just appear/disappear. Possible future improvement: fade animation for hole appearance/disappearance.

### Drop offside / "islands" for multi-step edits

Associativity-style transforms require restructuring the tree, which means parking atoms temporarily while rearranging operator boundaries. Currently the only place to park is the toolkit (far away) or trash (destructive). An "islands" feature — drop elements offside, nearby, temporarily — would make multi-step edits less painful. Related to Josh's islands work.

### Variable arity as an alternative to holes

Instead of fixed-arity operators with holes, operators could take variable-length child lists (like the list demos). Invalid arities would be shown visually (red outline/label). This removes holes entirely and makes construction feel more free-form, but loses the "build valid expressions step by step" grammar guarantee. Different pedagogical character — "build freely, we'll tell you when it's wrong" vs. "fill in the blanks." Worth exploring as an alternative mode.

### Freeform root vs. placeholder root

Two approaches for what you start with in the variable-arity builder:
1. **Placeholder root** (current): Start with a single hole/placeholder. Toolkit or gutter items can replace it. Guarantees you always have a well-formed root before adding children. Simpler mental model.
2. **Freeform root**: Start with nothing. Dragging a block creates the root directly. Would need a "no tree yet" state and special handling for the first drop. More flexible but adds edge cases (what does the empty canvas look like? what happens when you trash the root?). Deferred in favor of placeholder approach.

### Stage Builder and Rewrite Builder may converge

The stage builder (construct from a hole) and rewrite builder (freely edit an expression) overlap significantly. The stage builder is a special case of the rewrite builder (starting from a single hole). The rewrite builder subsumes it. Architectural distinction may just be which operations are allowed, not the underlying mechanism.

---

## Rewrite Rule Conflict Detection

### The problem

When multiple rewrite rule sets are enabled, two rules from different sets can both match the same tree structure with the same trigger node. Each produces a different target state, but the `straightTo` manifold for each target is parameterized by where the dragged element ends up. If both targets place the dragged element at the same rendered position, the user can only snap to one — the other is effectively invisible. Example: commutativity `(+ #A B) → (+ B A)` and associativity-sideways `(+2 #(+1 A B) C) → (+2 A #(+1 B C))` both match `(+ (+ a b) c)` with trigger on the inner `+`, and both move it to the second-child position.

### Three layers of "conflict"

1. **Pattern overlap** (static, from rules alone): Two LHS patterns can simultaneously match the same tree with the same trigger. This is a necessary condition for any conflict. Checkable by analyzing pattern structure without knowing the state or the view.

2. **Instance-level overlap** (runtime, from rules + current state): For a specific tree and a specific drag, do two rules actually both fire? Pattern overlap is an over-approximation — a specific tree might not contain the structure needed for both rules to match. Even within one tree, some nodes might trigger both rules while others trigger only one.

3. **Spatial overlap** (runtime, from rules + state + view): Do the two resulting target states place the dragged element at indistinguishable rendered positions? This depends on the view function. The current nool-tree view is structurally homogeneous (position depends only on tree structure, not labels/depth/identity), which means pattern overlap reliably predicts spatial overlap. A context-sensitive view could break this correspondence — rendering different operators differently could make two "conflicting" rules produce visually distinguishable targets.

### Key insight about static detection

Pattern overlap is necessary for conflict regardless of view. Two rules that never match the same tree+trigger cannot conflict under any view. So static pattern-overlap detection identifies exactly the rule pairs that *could* conflict under *some* view for *some* state. It's a sound over-approximation.

Conversely, without considering the view, you can't prove two overlapping rules *will* conflict — a sufficiently clever view could always distinguish them. But for the homogeneous nool-tree view, the over-approximation is tight.

### Proposed approach: static pattern-overlap detection

Given the homogeneous nool-tree rendering, static detection should catch all practical conflicts.

**Algorithm sketch**: Two LHS patterns overlap with compatible triggers if there exists a tree matching both, where the trigger positions align. Check by attempting to "unify" the two patterns:
- Two wildcards always unify (they can match the same subtree)
- A wildcard and an op pattern unify (the wildcard matches the op's structure)
- Two op patterns unify if they have the same label and their children pairwise unify
- Trigger compatibility: at least one trigger in each pattern must correspond to the same position in the unified tree

More precisely: given rules R1 with trigger on node T1 and R2 with trigger on node T2, they overlap when we can overlay the two LHS patterns such that T1 and T2 map to the same tree node. This requires walking the patterns together and checking structural compatibility.

Note: rules within the same set don't need conflict checking (they're designed to work together). Only cross-set conflicts matter.

**UI behavior**:
- When the user enables a rule set, check for pattern overlap against all other enabled sets
- If conflicts are detected, visually mark the conflicting sets (e.g., amber/red highlight, warning icon)
- Optionally: prevent enabling a set that conflicts with already-enabled sets, or show a confirmation
- The existing hardcoded "Conflicts with commutativity!" message on associativity-sideways should be replaced by automatic detection

**Scope**: This only needs to handle the nool-tree's pattern language (ops with labels + wildcards + trigger markers). The pattern structures are small, so the unification check is cheap.

### What this doesn't cover

- Conflicts that only manifest for certain states (instance-level) — the static check flags the pair regardless
- Conflicts that a different view function would resolve — the static check is conservative
- "Soft" conflicts where targets are close but not identical in position — would need rendering-aware analysis
- Runtime disambiguation UI (e.g., showing a menu when multiple targets overlap) — a separate feature entirely
