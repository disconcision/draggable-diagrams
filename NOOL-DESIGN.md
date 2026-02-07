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
- Have a **brushes** column of blocks (operations and atoms)
- Drag blocks from brushes onto holes to build up expressions
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
- Build patterns using the same brushes

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
- [ ] Design the brushes UI
- [ ] Implement drag-from-brushes-to-hole interaction
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
| `insert-and-remove` | **KEY** - Has brushes/store, items clone when dragged out |
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

This is the **brush pattern**: drag from brushes, item stays in brushes (cloned).

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

### Stage Builder: What's in the brushes?
- Binary operations: `+`, `×`
- Atoms: A fixed set of emoji/variables
- Maybe unary: `-` (negation)

Each is a "template" that gets cloned when dragged (like `insert-and-remove`).

### Rule Builder: Direct construction or macro recording?
Start with **direct construction**. It's simpler and reuses Stage Builder patterns.
- `→` is just another operation (binary, takes two expression slots)
- LHS and RHS start as holes
- Build both sides using the same brushes

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

Associativity-style transforms require restructuring the tree, which means parking atoms temporarily while rearranging operator boundaries. Currently the only place to park is the brushes column (far away) or void (destructive). An "islands" feature — drop elements offside, nearby, temporarily — would make multi-step edits less painful. Related to Josh's islands work.

### Variable arity as an alternative to holes

Instead of fixed-arity operators with holes, operators could take variable-length child lists (like the list demos). Invalid arities would be shown visually (red outline/label). This removes holes entirely and makes construction feel more free-form, but loses the "build valid expressions step by step" grammar guarantee. Different pedagogical character — "build freely, we'll tell you when it's wrong" vs. "fill in the blanks." Worth exploring as an alternative mode.

### Freeform root vs. placeholder root

Two approaches for what you start with in the variable-arity builder:
1. **Placeholder root** (current): Start with a single hole/placeholder. Brush or palette items can replace it. Guarantees you always have a well-formed root before adding children. Simpler mental model.
2. **Freeform root**: Start with nothing. Dragging a block creates the root directly. Would need a "no tree yet" state and special handling for the first drop. More flexible but adds edge cases (what does the empty canvas look like? what happens when you void the root?). Deferred in favor of placeholder approach.

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

---

## ID Scheme Analysis

### Three ID namespaces

The system has three distinct ID namespaces that interact:

1. **Tree node IDs** — permanent identity markers (`"root"`, `"root-1"`, `"root-1-2"`). Path-like naming is just a convention from initial states; semantically they're opaque tokens that persist through all operations. Generated IDs (from rewrites) use the format `${triggerId}-${patternId}-${counter}`.

2. **Pattern op IDs** — establish correspondence between LHS and RHS ops in a rewrite rule. Handcoded rules use label + integer suffix (`"+1"`, `"+2"`). These are used as keys in the `match.ops` map; `applyRewrite` looks them up to find the original tree node and reuse its ID.

3. **Pattern wildcard IDs** — binding names (`"A"`, `"B"`, `"C"`). Map to matched subtrees. First use keeps original tree ID; second use (e.g. distributivity's duplicated wildcard) gets cloned with fresh IDs and `emergeFrom` set.

### How `applyRewrite` assigns IDs in result trees

- **Wildcard, first use**: keeps matched subtree's original tree ID
- **Wildcard, second use**: cloned with generated IDs, `emergeFrom: original.id`, `emergeMode: "clone"`
- **Op, first use**: keeps matched tree node's ID (looked up via pattern op ID in `match.ops`)
- **Op, second use**: generates new ID `${triggerId}-${patternId}-${counter}`, sets `emergeFrom`
- **New op (not in LHS)**: generated ID, `emergeFrom: triggerId` (emerges from drag origin)

### Bug found and fixed in derived rules

`deriveRule` originally used `id: tree.label` for pattern op nodes, causing collisions when multiple ops share a label (e.g. two `+` in associativity). Only the first match was tracked in `ops` map; the second was treated as "reuse" with a generated ID. This caused:
- Wrong ID assignments in rewrite results
- "can't find draggable element" errors when op nodes were triggers

**Fix**: Use `id: tree.id` (tree node IDs) as pattern op IDs. They're unique and naturally establish LHS↔RHS correspondence. When applied to a different tree, the `match.ops` map correctly maps each pattern position to the corresponding tree node.

### The root is not special

The root has no special status in the rewrite system. It's only special-cased in the macro editor UI (can't remove root from tree — gets replaced with a placeholder `□`). The rewrite engine, pattern matching, and ID assignment all treat it identically to any other node.

### Remaining design tensions

- **IDs encode initial position but mean identity**: `"root-1-2"` suggests a position but the node keeps this ID when moved elsewhere. Not wrong, just potentially confusing.
- **Ad-hoc ID generation**: Initial states use hand-written path IDs, brushes use `"tk-N"` with refresh suffixes, placeholders use `"placeholder-N"` with global counter, rewrites use `"${triggerId}-${patternId}-${counter}"`. No unified scheme.
- **Pattern IDs become tree IDs**: When a rewrite is applied, the result tree contains a mix of original tree IDs (from wildcards) and pattern-derived IDs (from new/reused ops). These live in the same namespace without collision guarantees across multiple rewrite applications.

---

## Stage Builder and the Rewrite System

### Current status: ad-hoc, not rewrite-based

The stage builder (holes version) does NOT use the rewrite system from `asts.ts`. All operations are implemented as direct state manipulation:
- **Fill hole**: `replaceNode(tree, holeId, makeExpansion(key, label))` — finds all holes, generates states where each is replaced with the expanded block
- **Erase node**: `replaceNode(tree, nodeId, { id: pickupHoleId, label: "□", children: [] })` — replaces dragged node with fresh hole
- **Swap siblings**: `swapChildrenAtParent(tree, parentId, i, j)`
- **Move to gutter**: splice into gutter array

### Could it be rewrite-based?

Yes. The implicit rules are:
```
□ → (+ □ □)     # hole becomes plus with two holes
□ → (× □ □)     # hole becomes times with two holes
□ → (- □)       # hole becomes negation with one hole
□ → ⛅           # hole becomes atom
□ → 🍄           # etc.
#A → □           # erase: any node becomes a hole
```

The pattern language can match holes specifically: an op pattern with label `"□"` and no children matches hole nodes. So `allPossibleRewrites` could generate the same target states the stage builder currently computes by hand.

### Why it wasn't done that way

Likely implementation-path artifact rather than a deliberate decision. The stage builder was built by studying the `insert-and-remove` demo pattern (clone from store, floating targets), which uses direct state manipulation. The rewrite system was designed for semantics-preserving transformations (nool-tree), not construction. Nobody stopped to check whether the construction operations could be expressed as rewrites.

### Arguments for unifying

- **Conceptual clarity**: Construction IS rewriting (expanding holes). Making this explicit connects the stage builder to the rewrite system.
- **Composability**: If construction rules are rewrite rules, they can be mixed with transformation rules, edited with the same tools, recorded with the macro recorder, etc.
- **Grammar as rule set**: The "grammar" (what blocks exist, what arities they have) becomes a set of rewrite rules rather than a hardcoded `BLOCK_DEFS` array. Editing the grammar = editing the rule set.
- **Erase as inverse**: The erase rules (`#A → □`) are the inverses of the expansion rules. This is the same forward/reverse pattern the macro recorder already derives.

### Arguments against (or complications)

- **Wildcard matching is too broad**: The current erase rule `#A → □` matches ANY node, not just filled positions. Would need guard conditions or a more refined pattern language.
- **Performance**: `allPossibleRewrites` walks the whole tree for each rule. Direct manipulation knows exactly which holes exist.
- **Trigger semantics differ**: In the stage builder, you drag FROM the brushes TO a hole. In the rewrite system, you drag a node IN the tree. The interaction models are different.
- **Brushes are a UI concept, not a rule concept**: Rewrites don't naturally express "this item comes from a palette and the palette item is cloned."

### Possible hybrid

Express the *data model* in terms of rewrites (the rules exist as `Rewrite` objects, the grammar is a rule set) but keep the *interaction model* as-is (brush drag, direct state computation). The rules would be the source of truth for what operations are available, but the drag handlers would still compute targets directly rather than calling `allPossibleRewrites`.

---

## Terminology

| Old term | Canonical term | Notes |
|----------|---------------|-------|
| Toolkit / brush kit | Brushes | The column of available blocks/operations |
| Toolkit item | Brush | A single block type (op or atom) |
| Gutter | Palette | Parking area for temporarily displaced subtrees |
| Sections | Buckets | Categories of brush items (holes ops, variadic ops, atoms) |
| Trash | Void | Discard zone |
| Nool kit | Nolkit | Collective term for all non-stage stuff |

---

## Unified Lane Architecture (Evolving)

### Core concept: everything is a lane

All containers in the UI are vertical lanes of expressions, separated by thin vertical lines. No boxy backgrounds — just content columns with subtle separators.

Lanes (left to right):
1. **Menu** — mode toggles and actions (small rounded-corner squares with abstract symbols)
2. **Brushes** (was "toolkit") — available blocks/operations. Drag from here creates a clone (productive). Relatively fixed/stable content.
3. **Palette** (was "gutter") — parking/inventory for composite structures. Short-to-mid-term storage. Move semantics (not clone).
4. **Stage** (was "tree") — now a **list of trees**, not a single tree. Persistent things you're actively modifying. Each tree independently supports rewrite-rule drags. Cross-tree dragging is allowed.
5. **Void** — accepts drops for deletion.

### Visual treatment

- Thin gray vertical separator lines between each lane
- Line length = max height of the two adjacent lanes, minus small inset on each end
- Rounded line caps (stroke-linecap="round")
- No background rectangles
- Label above relevant column when a mode is active (e.g., "Transform" or "Construct" in small gray text)

### Brushes are rewrite rules

Each brush is actually a rewrite rule: `□ → (+ □ □)`, `□ → ⛅`, etc. The UI renders only the RHS by default. A subtle faded `□→` prefix to the left of each brush communicates the rule nature without being noisy. This prefix could become more visible on hover.

This means the "grammar" (available operations and their arities) is defined by a set of rewrite rules, not a hardcoded array. This enables:
- Editing the grammar = editing the rule set
- Sharing rules between brushes and other lanes
- Recording new brush rules via the macro recorder

### Mode system

Two primary modes (conceptually "folders" or "tags" for rule collections):

- **Transform** — rules that get on-stage direct manipulation (drag on syntax to apply). These are the semantics-preserving rewrite rules.
- **Construct** — rules for freeform building (hole-filling, adding/removing nodes). These are the non-semantics-preserving operations.

These are NOT mutually exclusive modes. They're more like folders you can open/collapse. Each can be toggled independently. There's a meta-affordance to activate all rules in a folder at once.

The **Record** function is orthogonal — you can record in either mode. When recording:
- A subtle animated indicator appears (red dot with slight glow pulsation)
- Any structural changes are tracked as a diff
- Stopping recording derives a rewrite rule from the before/after diff
- The derived rule appears as a new entry in the stage

### Menu column

Three icons initially:
- Transform mode toggle
- Construct mode toggle
- Record toggle

Icons are abstract/geometric symbols in small rounded-corner squares. The column naturally accumulates more entries as capabilities grow (undo, snapshot, toggle rule visibility, selection mode, etc.).

### Stage as non-determinism / history

Two interpretations of the list structure in the stage lane:
1. **Parallel/non-deterministic** — multiple simultaneous versions of an expression (default)
2. **Chronological/history** — auto-accruing history where each structural edit creates a new version, with auto-advance so it looks like editing a single thing but you can navigate back

These could be a mode toggle. History mode deferred for now.

### Interaction precedence for applying transforms

1. **Direct manipulation (primary)** — drag on syntax in-stage to apply rewrite rules. Used for rules where the manifold/snap interaction works (no conflicts, spatially distinguishable targets).
2. **Drag-from-brushes** — drag a rule from the brushes/palette to a target in the stage. Used when direct manipulation is ambiguous or unavailable.
3. **Selection + click (future)** — select a subtree, then click a rule to apply. Most general but most steps. Needed for keyboard/D-pad navigation.

### Future items (noted)

- **D-pad / controller input** — absolute must. Navigate and apply transforms with a gamepad.
- **Sound** — on the agenda.
- **Sticker/decal concept** — annotations on expressions, like special editions on cards (a la Balatro). Visual modifiers that convey metadata (e.g., "this is a transform", "this was recorded").
- **Size management** — when expressions get large, render more densely (approach a maximum size asymptotically).
- **Adventure mode** — locked-down environments with restricted operations, obstacles to progress through.

### Terminology

| Old term | Canonical term | Description |
|----------|---------------|-------------|
| Toolkit / brush kit | Brushes | Available blocks/operations (clones on drag) |
| Toolkit item | Brush | A single block type or expansion rule |
| Gutter | Palette | Parking/inventory for displaced subtrees |
| Tree area | Stage | Active expressions being worked on (now a list) |
| (new) | Lane | Any vertical column of expressions |
| Nool kit | Nolkit | All non-stage stuff (menu + brushes + palette) |
| Sections | Buckets | Categories of brush items |
| Trash | Void | Discard zone |

---

## Vocabulary

Consolidated terminology for the Nool system.

- **Lanes** — the vertical layout units separated by divider lines. The fundamental spatial organizing concept.
- **Menu** — the leftmost column with toggle/reorder icons (`◯→`, `◎→`, `⊙→`). Placeholder name, looking for better. Contains folder toggles and action buttons.
- **Brushes** — the source items column. Drag from here creates a clone (productive).
- **Palette** — the holding area between brushes and stage. Collapsible (see "Collapsible Palette" section). Move semantics, not clone.
- **Stage** — where expressions are built and manipulated. Contains a list of trees (`trees: Tree[]`).
- **Void** — discard zone. Currently a bare floating icon.
- **Nolkit** — collective term for all non-stage stuff (menu + brushes + palette). Everything that could optionally be hidden to give a "clean stage" view. One word, like "toolkit" — N-O-L-K-I-T.
- **Buckets** — the categories of brush items: holes ops, variadic ops, atoms. Each bucket is a collapsible folder in the brushes column.

### Code renames — Done (this session)

| Current | New |
|---------|-----|
| `ToolkitBlock` | `BrushBlock` |
| `toolkit` (state field) | `brushes` |
| `Section` (type) | `Bucket` |
| `sectionOrder` | `bucketOrder` |
| `SECTION_*` constants | `BUCKET_*` |
| `ICON_*` constants | `MENU_*` |
| `TRASH_SIZE` | `VOID_SIZE` |
| `trashed` | `voided` |
| `brushKit*` variables | `brushes*` |

---

## Palette vs Stage — Behavioral Differences

Both palette and stage store `Tree[]` and render with the same `renderTree` function, same vertical stacking, same spacing. Three classes of behavioral difference:

### 1. Interaction depth: whole-tree vs per-node

Stage trees pass `pickUp` to `renderTree`, enabling per-node drag — any sub-node can be individually grabbed, swapped with siblings, moved to a hole, etc. Palette trees pass `rootOnDrag` + `pointerEventsNone`, so the whole tree is a single drag handle. You can move a palette tree elsewhere, but you can't reach inside it.

**Implications of unifying:** If palette trees also used `pickUp`, you could restructure trees in the palette — pull a subtree out of a palette tree, rearrange children, etc. This would make the palette a true "workspace annex" rather than just a parking lot. The question is whether that added power is confusing or useful.

### 2. Drop destination asymmetry

Brush items can be dropped onto the stage (hole fill + stage insertion) but NOT the palette. This is an incidental asymmetry, not a principled one. It could go either way — allowing brush-to-palette drops would let you build up a collection of trees in the palette before moving them to the stage.

Palette items can be dropped onto the stage, stage holes, other palette positions, and the void. Stage items can be dropped onto palette, stage holes, other stage positions, swapped with siblings, and the void. The target sets are similar but not identical.

### 3. Z-index handling

Palette uses `flatZIndex: true` (all nodes at z=0). Stage uses `depth`-based z-index so nested children render on top of parents, enabling per-node click targeting. This is a consequence of difference #1 — without per-node drag, nested z-index isn't needed.

### Unification considerations

Making palette behave exactly like stage would mean:
- Palette trees use `pickUp` (per-node drag)
- Brush items target both palette and stage insertion
- Palette and stage share identical drag handler logic (parameterized by which `Tree[]` they operate on)

This is straightforward wiring — no new framework features needed. The question is whether the simplified "grab the whole tree" palette behavior is actually preferable for its simplicity, or whether full stage-like interaction is worth the added complexity.

---

## Stage List Extensibility & Drop-Anywhere Interaction

### The problem

Stage is now a list of trees (`trees: Tree[]`), but there's no way to add new trees. Need to be able to drag from brushes or palette and drop into the stage to create a new tree entry.

### Desired interaction

- Drag item anywhere in the stage column — it springs to position just below the last entry
- Can drop between existing entries (insert at any index)
- When approaching a droppable region, show the `◯→` prefix as a hint
- The stage behaves like an "infinite sea of holes" — there's always room for more

### Implementation

Brush and palette drag handlers need additional targets: for each possible insertion index in `state.trees`, generate a state where a new tree is inserted. Currently drag targets only fill holes within existing trees.

### Spring-to-position

Need to check existing demos for a "drop anywhere in a region, snap to specific position" interaction. The `floating` pattern with insertion targets may already handle this if the visual positions of insertion targets are stacked vertically. The element snaps to whichever target is closest during drag.

---

## Brushes Layout Evolution

### Two-column layout for atoms

Atoms (1x1 items: 0, 1, ⛅, 🍄, etc.) should be rendered two per row to save vertical space. Binary ops (2x2 visual) and unary ops (1x2) stay one per row. This creates a Diablo/inventory-slot aesthetic.

### Rearrangeable brushes

A "malleable" toggle above each column. When active, contents can be reorranged by dragging. Palette and stage are malleable by default; brushes are not (toggle to enable).

When rearranging 1x1 items, implicit horizontal containers are created — a row with a 1x1 item automatically becomes a container that can accept another 1x1 item next to it. These containers are invisible but provide the layout structure. Think: flat list that can optionally nest one level for horizontal grouping.

### Slot-style drop indicators

When dragging a 1x1 item and there's space, show subtle gray rounded-rect outlines at available drop positions (no fill, thin border). Aesthetic: white plastic background, tiles placed over it, construction-toy feel, neomorphic-adjacent.

---

## Malleable Toggles

### Per-column reorder toggle

Each column (brushes, palette, stage) can have a toggle at its top — a lock/unlock icon — controlling whether items within that column can be reordered by dragging.

- **Palette and stage** are malleable by default (unlocked).
- **Brushes** are NOT malleable by default (locked). Toggle to enable reordering.

### Atom pairs and the list-of-lists state model

When malleable toggles are implemented, upgrade the atoms two-per-row layout from a pure visual layout concern to a real **list-of-lists state model**. Each row of paired atoms becomes an invisible horizontal container:

- The containers are visually transparent but use `fill="transparent"` for pointer events (not `fill="none"`, which lets clicks pass through).
- Dragging the space between two paired atoms moves the pair as a unit.
- This enables reordering pairs, splitting a pair into two singles, or merging two singles into a pair — all through drag interactions.

The `list-of-lists` demo in the demos directory shows a similar pattern with visible containers. The difference here is that the containers are invisible — their existence is only revealed through drag behavior.

---

## Collapsible Palette

### Default state: collapsed

By default, the palette column is hidden (collapsed). It can still receive drops — items dragged TO the palette area are accepted even when collapsed, they just aren't visible until expanded.

### Toggle affordance

A small circle icon sits just above where the separator line between brushes and stage ends. Visual treatment:

- **Default**: same gray as separators (`#ddd`)
- **Hover**: darkened (`#999`)
- **Active/pressed**: dark (`#333`)
- Same visual language as the icons in the menu.

### Expand/collapse animation

- **Expand**: clicking the circle causes it to morph into a lozenge (rounded rectangle). The lozenge has the same height as the circle but stretches to the width of the palette column. Light gray fill (`#ddd`). The lozenge provides a larger click target to re-collapse.
- **Collapse**: clicking the lozenge morphs it back to a circle.
- Animation: circle-to-lozenge morph on expand, lozenge-to-circle on collapse.

### Framework considerations

Use `seconds: 0, immediate: true` for the palette expand/collapse toggle to avoid lerp issues with changing column count. The column count change (2 columns vs 3 columns) would cause intermediate interpolation states with fractional column widths, which would look broken.

---

## Merging Builders Into One System

### Three folders of operations

The unified system has three categories of brushes, each expandable/collapsible:

1. **Atoms** (always visible, goes at top) — 0, 1, ⛅, 🍄, 🎲, 🦠, 🐝. Compact two-column layout.
2. **Holes operations** — fixed-arity operators that create holes: `◯ → (+ ◯ ◯)`, `◯ → (× ◯ ◯)`, etc.
3. **Variadic operations** — variable-arity operators (current variadic builder): `+`, `×`, `-`. Accept any number of children, shown red when arity wrong.

These are NOT mutually exclusive. Can have both holes and variadic expanded simultaneously. But a convenience toggle can make them exclusive (close one when opening the other).

### Menu as folder toggles

Each icon in the menu corresponds to a folder. Clicking toggles expand/collapse. Icons are bare (no border rectangle) to distinguish them from brush items.

### Void reconsideration

- Remove dotted border around void (DONE)
- Void semantically = "transform to hole" in the holes context
- In variadic context, void = remove node (holes auto-cleaned?)
- Consider: void icon could be in the menu instead of a separate lane
- Or: void is just "the abyss" — drag off any edge to discard
- Decision deferred — leave as bare floating icon for now

---

## Hole Character Change

Changed internal hole representation from `□` (U+25A1, White Square) to `◯` (U+25EF, Large Circle) across all files:
- `nool-stage-builder.tsx` — brush rules, hole detection, initial state, pickup handler, prefix text
- `nool-stage-builder-variant.tsx` — isPlaceholder, initial state, placeholder creation
- `nool-tree-macro.tsx` — placeholder creation in macro mode
- The `◯→` prefix in the brushes column now reads as "hole becomes..."

---

## Implementation Status & Next Steps

### Done this session
- [x] Visual redesign: separator lines instead of boxes (nool-stage-builder.tsx)
- [x] Stage as list (`trees: Tree[]`) with cross-tree dragging
- [x] Brush rules as `Rewrite[]` data model with `◯→` prefix
- [x] Hole char `□` → `◯` everywhere
- [x] Void border removed
- [x] ◯→ prefix size increased (11px, 22px width)
- [x] Design notes recorded extensively
- [x] ID scheme fix for derived rules (`tree.id` instead of `tree.label`)
- [x] Auto-derive both forward and reverse rules in macro recorder

### Actionable next (parallelizable)
- [ ] Stage list extensibility: add "create new tree" targets to brush and palette drags
- [ ] Two-column layout for atoms in brushes
- [ ] Apply separator-line visual redesign to variadic builder and macro recorder
- [ ] Menu with folder toggles (transform, construct, record)
- [ ] Malleable toggle for columns (rearrange brushes)
- [ ] Merge variadic builder into unified system (three folders)
- [ ] Spring-to-position drop interaction — check existing demos

### Questions for user
1. Should atoms always be visible (not collapsible), or collapsible like the other folders?
2. For the menu: are ◇ (transform), ◐ (construct), ◉ (record) still the right symbols?
3. When merging variadic and holes builders, should the current separate demo entries remain as presets, or collapse into one configurable demo?

---

## Framework Observations

UX limitations and lessons learned from building the Nool stage builder on top of the draggable diagrams framework.

### Click+drag coexistence required a framework change (dragThreshold)

The framework re-renders all SVG on `pointerdown`, destroying DOM elements. This means a click handler on an SVG element fires on the re-rendered element, not the original — and any state from the original `pointerdown` is lost. To support both click and drag on the same element, a `dragThreshold` parameter was added so that short interactions (below the threshold) are treated as clicks rather than drags.

### Large target counts cause visual instability

When a floating drag generates many target states (e.g., all possible hole-fill positions across multiple trees), the "nearest target" can flip rapidly between states with very different layouts as the cursor moves. This causes the background (non-dragged elements) to "jump" between configurations. The effect is disorienting. Mitigation strategies: reduce target count, add hysteresis, or constrain targets to the local region.

### Lane-aware drop zones (unsolved)

**The ask:** When dragging an item and releasing within a lane's horizontal bounds, the item should snap to the nearest slot in that lane — even if the cursor is well below the lane's actual content. The "active region" of each lane extends to the height of the tallest lane, so the full bounding box of the lane system is droppable.

```
  menu │ brushes    │ pal. │ stage │ void
  ─────┤────────────┤──────┤───────┤──
       │ ┌────────┐ │      │ ┌───┐ │
  ◯ →  │ │ + ◯ ◯  │ │      │ │ A │ │ 🗑
       │ └────────┘ │      │ └───┘ │
  ◎ →  │ ┌────────┐ │      │ ┌───┐ │
       │ │ × ◯ ◯  │ │      │ │ B │ │
  ⊙ →  │ └────────┘ │      │ └───┘ │
       │ ── ── ── ─ │      │       │
       │ ┌──┐ ┌──┐  │      │       │
       │ │0 │ │1 │  │      │       │
       │ └──┘ └──┘  │      │       │
       │ ┌──┐ ┌──┐  │      │       │    The whole region
       │ │⛅│ │🍄│  │      │  ↑    │    between the lane's
       │ └──┘ └──┘  │......│..|....│    X bounds, down to
       ╵             ╵      : 🍄   :    max lane height,
                            :  ↑   :    should be a valid
                            :drop  :    drop zone. 🍄 should
                            :here  :    spring up to below B.
                            :......:
```

**Why it's hard — the framework has no lane concept:** Floating drag proximity measures Euclidean distance from the cursor to where the dragged element would appear in each target state. All targets across all lanes compete on equal footing. In the diagram above:

- "Insert 🍄 at end of stage" target: element appears at roughly (stageX, 100). Cursor at (stageX, 250). Distance ≈ 150px.
- "Return 🍄 to brushes" target: element appears at (brushesX, 180). Distance ≈ sqrt(100² + 70²) ≈ 120px. **Brushes wins.**

The cursor's horizontal position (clearly in the stage lane) has no special meaning to the framework. It just sees points in 2D space and picks the nearest one.

**Possible approaches (none attempted yet):**

1. **Framework: lane-aware proximity** — Add a `laneHints` option to `floating()` that maps X-ranges to target subsets. When the cursor X falls within a lane, bias distance toward that lane's targets (e.g., only measure Y-distance for in-lane targets, or apply a multiplier). Cleanest, but requires framework change.

2. **Framework: custom distance metric** — Let `floating()` accept a custom distance function `(cursor, elementPos) → number` instead of always using Euclidean. More general than lane hints, but puts the burden on the user.

3. **Rendering workaround: extend lane heights** — Make every lane render with min-height = max-lane-height (transparent padding). This pushes "insert at end" target positions further down, making them geometrically closer. But doesn't guarantee the right target always wins — depends on exact geometry.

4. **Rendering workaround: ghost targets** — Create duplicate insertion targets with artificially lowered element positions. Hackiest.

None of these are obviously right. Parking this as a known limitation.

### Variadic vs fixed-arity ops — annotation approach (APPROVED, implementing)

**Problem:** Holes ops (`+` with 2 sockets) and variadic ops (`+` with any children) share the same label. The system can't distinguish them, so: variadic ops get arity-checked against 2 (wrong), removing a child from variadic ops leaves a hole (wrong), and fixed-arity ops accept insertion when variadic mode is on (wrong).

**Solution:** Add `variadic?: boolean` to `Tree` in `asts.ts`. Label stays `"+"` everywhere — rewrite rules match on label and ignore the flag. The flag only affects builder drag behavior.

**Key changes:**

1. **`Tree` type** (`asts.ts`): add `variadic?: boolean`
2. **`makeNodeForItem`**: variadic bucket items get `variadic: true`, start with 0 children (no holes)
3. **`arityOk`**: if `tree.variadic` → always OK; otherwise current fixed-arity check
4. **Pick-up drag handler** (`renderTree`): check `parent.variadic`:
   - Variadic parent: splice child out (no hole). `+(A,B,C)` minus `B` → `+(A,C)`. Uses new `removeChild` helper (inverse of existing `insertChild`).
   - Fixed parent: leave `◯` hole (current behavior). `+(A,B)` minus `B` → `+(A,◯)`.
5. **`allInsertionPoints`**: check `tree.variadic` instead of `isOp(tree.label)`. Only variadic nodes accept new children at arbitrary positions.
6. **`cloneTreeWithFreshIds`**: copy `variadic: tree.variadic`
7. **Global `variadicEnabled` toggle**: becomes irrelevant for insertion behavior. `showVariadicOps` just controls bucket visibility in brushes lane.

**Why this is in the grain of draggable diagrams:** The framework doesn't care how target states are computed — it just interpolates. `removeChild` is the same level of abstraction as existing helpers (`insertChild`, `replaceNode`, `swapChildrenAtParent`). The drag spec (`floating(targets, { backdrop })`) is identical for both fixed and variadic. The only difference is which `stateWithout` you compute.

**Conceptual model:**
- Fixed-arity ops have **sockets** — fixed positions that are either filled (child) or empty (◯). Count never changes.
- Variadic ops have **lists** — children can be added or removed freely. No holes concept.
- Both can coexist in the same tree. Parent's `variadic` flag determines removal behavior.
- `BRUSH_RULES` (Rewrite[]) are used as data source for arity, but execution is direct state manipulation via drag handlers.

### Everything is ONE manipulable

The entire stage builder (brushes + palette + stage + void) is a single manipulable. The framework doesn't natively support modular composition of independent draggable regions within a single SVG. Cross-region drags (e.g., brushes to stage, stage to void) require all regions to share state and target generation. This means every drag handler must reason about the global state, and target generation scales with the total number of drop positions across all lanes.
