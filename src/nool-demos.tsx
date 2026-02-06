import { NoolStageBuilder } from "./demo-diagrams/nool-stage-builder";
import { NoolStageBuilderVariant } from "./demo-diagrams/nool-stage-builder-variant";
import { NoolTreeEditable } from "./demo-diagrams/nool-tree-editable";
import { demoData, SomeDemoData } from "./demos";

// Nool-specific demos registry

export const noolDemos: SomeDemoData[] = [
  demoData({
    id: "nool-stage-builder",
    title: "Stage Builder (Holes)",
    notes: (
      <>
        Build algebraic expressions from scratch. Drag blocks from the toolkit
        onto holes (◯). Grab placed nodes to move them, to swap siblings, or
        drag away toerase.
      </>
    ),
    manipulable: NoolStageBuilder.manipulable,
    initialStates: [NoolStageBuilder.state1],
    height: 550,
    padding: 20,
    sourceFile: "nool-stage-builder.tsx",
  }),
  demoData({
    id: "nool-stage-builder-variant",
    title: "Stage Builder (Variadic)",
    notes: (
      <>
        Operators will tolerate any number of children, but will be angry (red)
        until their arity matches. Drag blocks into any op's child list.
      </>
    ),
    manipulable: NoolStageBuilderVariant.manipulable,
    initialStates: [NoolStageBuilderVariant.state1],
    height: 550,
    padding: 20,
    sourceFile: "nool-stage-builder-variant.tsx",
  }),
  demoData({
    id: "nool-tree",
    title: "Nool Tree",
    notes: (
      <>
        Apply rewrite rules to transform algebraic expressions. Try using the
        identity rules to grow the tree!
      </>
    ),
    manipulable: NoolTreeEditable.manipulable,
    initialStates: [NoolTreeEditable.state1],
    height: 600,
    padding: 20,
    initialDrawerConfig: { snapRadius: 1, relativePointerMotion: true },
    sourceFile: "nool-tree-editable.tsx",
  }),
  // Future: Rule Builder (construct rewrite rules)
];
