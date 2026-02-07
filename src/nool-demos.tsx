import { NoolStageBuilder } from "./demo-diagrams/nool-stage-builder";
import { NoolTreeEditable } from "./demo-diagrams/nool-tree-editable";
import { NoolTreeMacro } from "./demo-diagrams/nool-tree-macro";
import { demoData, SomeDemoData } from "./demos";

// Nool-specific demos registry

export const noolDemos: SomeDemoData[] = [
  demoData({
    id: "nool-stage-builder",
    title: "Stage Builder",
    notes: (
      <>
        Build algebraic expressions from scratch. Toggle modes with the icons:
        ◎ holes ops, ⊞ variadic ops, ◆ atoms. Drag blocks onto the stage,
        grab placed nodes to move or swap them, or drag away to erase.
      </>
    ),
    manipulable: NoolStageBuilder.manipulable,
    initialStates: [NoolStageBuilder.state1],
    height: 550,
    padding: 20,
    sourceFile: "nool-stage-builder.tsx",
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
  demoData({
    id: "nool-tree-macro",
    title: "Nool Tree (Macro Recorder)",
    notes: (
      <>
        Record macros to derive rewrite rules by demonstration. Click "Record
        Macro", freely rearrange the tree, then stop recording. The system
        derives a rule from the before/after diff.
      </>
    ),
    manipulable: NoolTreeMacro.manipulable,
    initialStates: [NoolTreeMacro.state1],
    height: 600,
    padding: 20,
    initialDrawerConfig: { snapRadius: 1, relativePointerMotion: true },
    sourceFile: "nool-tree-macro.tsx",
  }),
];
