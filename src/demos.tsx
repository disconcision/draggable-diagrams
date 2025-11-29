import { ReactNode } from "react";
import { Demo } from "./components/Demo";
import { manipulableAngle, stateAngle } from "./manipulable-angle";
import { manipulableAngleViaTransform } from "./manipulable-angle-via-transform";
import { manipulableClock, stateClock } from "./manipulable-clock";
import { manipulableFifteen, stateFifteen } from "./manipulable-fifteen";
import { manipulableFlippy, stateFlippy1 } from "./manipulable-flippy";
import { manipulableGraph, stateGraph } from "./manipulable-graph";
import { manipulableGridPoly, stateGridPoly1 } from "./manipulable-grid-poly";
import {
  manipulableInsertAndRemove,
  stateInsertAndRemove1,
} from "./manipulable-insert-and-remove";
import {
  manipulableNoolTree,
  stateNoolTree1,
  stateNoolTree2,
} from "./manipulable-nool-tree";
import {
  manipulableOrderPreserving,
  stateOrderPreserving1,
  stateOrderPreserving2,
} from "./manipulable-order-preserving";
import { manipulableOutline, stateOutline1 } from "./manipulable-outline";
import { manipulablePerm, statePerm1 } from "./manipulable-perm";
import {
  manipulablePermDouble,
  statePermDouble1,
} from "./manipulable-perm-double";
import { manipulableRushHour, stateRushHour1 } from "./manipulable-rush-hour";
import {
  manipulableSecondSimplest,
  stateSecondSimplest1,
} from "./manipulable-second-simplest";
import { manipulableSimplest, stateSimplest1 } from "./manipulable-simplest";
import { manipulableSokoban, stateSokoban1 } from "./manipulable-sokoban";
import { manipulableSpinny } from "./manipulable-spinny";
import { manipulableSpinnyOld, stateSpinny1 } from "./manipulable-spinny-old";
import { manipulableTiles, stateTilesLonely } from "./manipulable-tiles";

export interface DemoEntry {
  id: string;
  node: ReactNode;
}

export const demos: DemoEntry[] = [
  {
    id: "simplest",
    node: (
      <Demo
        id="simplest"
        title="Simplest"
        manipulable={manipulableSimplest}
        initialState={stateSimplest1}
        height={100}
        padding={20}
      />
    ),
  },
  {
    id: "second-simplest",
    node: (
      <Demo
        id="second-simplest"
        title="Second simplest"
        manipulable={manipulableSecondSimplest}
        initialState={stateSecondSimplest1}
        height={120}
        padding={20}
      />
    ),
  },
  {
    id: "order-preserving-map",
    node: (
      <Demo
        id="order-preserving-map"
        title="Order preserving map"
        manipulable={manipulableOrderPreserving}
        initialState={stateOrderPreserving1}
        height={400}
        padding={20}
      />
    ),
  },
  {
    id: "order-preserving-map-big",
    node: (
      <Demo
        id="order-preserving-map-big"
        title="Order preserving map (big)"
        manipulable={manipulableOrderPreserving}
        initialState={stateOrderPreserving2}
        height={650}
        padding={20}
      />
    ),
  },
  {
    id: "rush-hour",
    node: (
      <Demo
        id="rush-hour"
        title="Rush Hour"
        manipulable={manipulableRushHour}
        initialState={stateRushHour1}
        height={300}
        padding={20}
      />
    ),
  },
  {
    id: "15-puzzle",
    node: (
      <Demo
        id="15-puzzle"
        title="15 puzzle"
        notes="Weird experiment: I made the blank draggable"
        manipulable={manipulableFifteen}
        initialState={stateFifteen}
        height={200}
        padding={20}
        initialRelativePointerMotion={true}
      />
    ),
  },
  {
    id: "lonely-tile-on-a-grid",
    node: (
      <Demo
        id="lonely-tile-on-a-grid"
        title="Lonely tile on a grid"
        notes="I'm trying to make dragging feel right here. Goal is for the tile to only drag orthogonally, AND to not jump discontinuously. This seems to require 'Relative Pointer Motion' mode (or divergent approaches)."
        manipulable={manipulableTiles}
        initialState={stateTilesLonely}
        height={300}
        padding={20}
        initialRelativePointerMotion={true}
      />
    ),
  },
  {
    id: "grid-polygon",
    node: (
      <Demo
        id="grid-polygon"
        title="Grid polygon"
        manipulable={manipulableGridPoly}
        initialState={stateGridPoly1}
        height={250}
        padding={20}
      />
    ),
  },
  {
    id: "permutation",
    node: (
      <Demo
        id="permutation"
        title="Permutation"
        manipulable={manipulablePerm}
        initialState={statePerm1}
        height={50}
        padding={15}
      />
    ),
  },
  {
    id: "permutation-of-permutations",
    node: (
      <Demo
        id="permutation-of-permutations"
        title="Permutation of permutations"
        manipulable={manipulablePermDouble}
        initialState={statePermDouble1}
        height={200}
      />
    ),
  },
  {
    id: "spinny",
    node: (
      <Demo
        id="spinny"
        title="Spinny"
        manipulable={manipulableSpinny}
        initialState={stateSpinny1}
        height={200}
        padding={30}
        initialRelativePointerMotion={false}
      />
    ),
  },
  {
    id: "spinny-old",
    node: (
      <Demo
        id="spinny-old"
        title="Spinny (Old)"
        manipulable={manipulableSpinnyOld}
        initialState={stateSpinny1}
        height={200}
        padding={30}
        initialRelativePointerMotion={false}
      />
    ),
  },
  {
    id: "flippy",
    node: (
      <Demo
        id="flippy"
        title="Flippy"
        manipulable={manipulableFlippy}
        initialState={stateFlippy1}
        height={200}
        padding={30}
        initialTransitionWhileDragging={false}
        initialRelativePointerMotion={false}
      />
    ),
  },
  {
    id: "inserting-removing-items",
    node: (
      <Demo
        id="inserting-removing-items"
        title="Inserting & removing items"
        manipulable={manipulableInsertAndRemove}
        initialState={stateInsertAndRemove1}
        height={150}
        padding={10}
      />
    ),
  },
  {
    id: "nool-tree",
    node: (
      <Demo
        id="nool-tree"
        title="Nool tree"
        manipulable={manipulableNoolTree}
        initialState={stateNoolTree1}
        height={350}
        padding={20}
        initialSnapRadius={1}
        initialRelativePointerMotion={true}
      />
    ),
  },
  {
    id: "nool-tree-simpler",
    node: (
      <Demo
        id="nool-tree-simpler"
        title="Nool tree, simpler"
        manipulable={manipulableNoolTree}
        initialState={stateNoolTree2}
        height={200}
        padding={20}
        initialSnapRadius={1}
        initialRelativePointerMotion={true}
      />
    ),
  },
  {
    id: "outline",
    node: (
      <Demo
        id="outline"
        title="Outline"
        manipulable={manipulableOutline}
        initialState={stateOutline1}
        height={400}
        padding={20}
        initialSnapRadius={5}
      />
    ),
  },
  {
    id: "sokoban",
    node: (
      <Demo
        id="sokoban"
        title="Sokoban"
        manipulable={manipulableSokoban}
        initialState={stateSokoban1}
        height={500}
        padding={20}
        initialRelativePointerMotion={true}
      />
    ),
  },
  {
    id: "graph",
    node: (
      <Demo
        id="graph"
        title="Graph"
        manipulable={manipulableGraph}
        initialState={stateGraph}
        height={200}
        padding={20}
      />
    ),
  },
  {
    id: "angle",
    node: (
      <Demo
        id="angle"
        title="Angle"
        manipulable={manipulableAngle}
        initialState={stateAngle}
        height={200}
        padding={20}
      />
    ),
  },
  {
    id: "angle-via-transform",
    node: (
      <Demo
        id="angle-via-transform"
        title="Angle (via transform)"
        manipulable={manipulableAngleViaTransform}
        initialState={stateAngle}
        height={200}
        padding={20}
      />
    ),
  },
  {
    id: "clock",
    node: (
      <Demo
        id="clock"
        title="Clock"
        manipulable={manipulableClock}
        initialState={stateClock}
        height={200}
        padding={20}
      />
    ),
  },
];
