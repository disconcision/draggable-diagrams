import { ReactElement } from "react";
import { DemoCanvas } from "./DemoCanvas";
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
import { manipulableSpinny, stateSpinny1 } from "./manipulable-spinny";
import { manipulableSpinnyOld } from "./manipulable-spinny-old";
import { manipulableTiles, stateTilesLonely } from "./manipulable-tiles";

export const demosCanvas: ReactElement[] = [
  <DemoCanvas
    id="simplest"
    title="Simplest"
    manipulable={manipulableSimplest}
    initialState={stateSimplest1}
    height={100}
    padding={20}
  />,
  <DemoCanvas
    id="second-simplest"
    title="Second simplest"
    manipulable={manipulableSecondSimplest}
    initialState={stateSecondSimplest1}
    height={120}
    padding={20}
  />,
  <DemoCanvas
    id="order-preserving-map"
    title="Order preserving map"
    manipulable={manipulableOrderPreserving}
    initialState={stateOrderPreserving1}
    height={400}
    padding={20}
  />,
  <DemoCanvas
    id="order-preserving-map-big"
    title="Order preserving map (big)"
    manipulable={manipulableOrderPreserving}
    initialState={stateOrderPreserving2}
    height={650}
    padding={20}
  />,
  <DemoCanvas
    id="rush-hour"
    title="Rush Hour"
    manipulable={manipulableRushHour}
    initialState={stateRushHour1}
    height={300}
    padding={20}
  />,
  <DemoCanvas
    id="15-puzzle"
    title="15 puzzle"
    notes="Weird experiment: I made the blank draggable"
    manipulable={manipulableFifteen}
    initialState={stateFifteen}
    height={200}
    padding={20}
    initialRelativePointerMotion={true}
  />,
  <DemoCanvas
    id="lonely-tile-on-a-grid"
    title="Lonely tile on a grid"
    notes="I'm trying to make dragging feel right here. Goal is for the tile to only drag orthogonally, AND to not jump discontinuously. This seems to require 'Relative Pointer Motion' mode (or divergent approaches)."
    manipulable={manipulableTiles}
    initialState={stateTilesLonely}
    height={300}
    padding={20}
    initialRelativePointerMotion={true}
  />,
  <DemoCanvas
    id="grid-polygon"
    title="Grid polygon"
    manipulable={manipulableGridPoly}
    initialState={stateGridPoly1}
    height={250}
    padding={20}
  />,
  <DemoCanvas
    id="permutation"
    title="Permutation"
    manipulable={manipulablePerm}
    initialState={statePerm1}
    height={50}
    padding={15}
  />,
  <DemoCanvas
    id="permutation-of-permutations"
    title="Permutation of permutations"
    manipulable={manipulablePermDouble}
    initialState={statePermDouble1}
    height={200}
  />,
  <DemoCanvas
    id="spinny"
    title="Spinny"
    manipulable={manipulableSpinny}
    initialState={stateSpinny1}
    height={200}
    padding={30}
    initialRelativePointerMotion={false}
  />,
  <DemoCanvas
    id="spinny-old"
    title="Spinny (Old)"
    manipulable={manipulableSpinnyOld}
    initialState={stateSpinny1}
    height={200}
    padding={30}
    initialRelativePointerMotion={false}
  />,
  <DemoCanvas
    id="flippy"
    title="Flippy"
    manipulable={manipulableFlippy}
    initialState={stateFlippy1}
    height={200}
    padding={30}
    initialChainDrags={false}
    initialRelativePointerMotion={false}
  />,
  <DemoCanvas
    id="inserting-removing-items"
    title="Inserting & removing items"
    manipulable={manipulableInsertAndRemove}
    initialState={stateInsertAndRemove1}
    height={150}
    padding={10}
  />,
  <DemoCanvas
    id="nool-tree"
    title="Nool tree"
    manipulable={manipulableNoolTree}
    initialState={stateNoolTree1}
    height={350}
    padding={20}
    initialSnapRadius={1}
    initialRelativePointerMotion={true}
  />,
  <DemoCanvas
    id="nool-tree-simpler"
    title="Nool tree, simpler"
    manipulable={manipulableNoolTree}
    initialState={stateNoolTree2}
    height={200}
    padding={20}
    initialSnapRadius={1}
    initialRelativePointerMotion={true}
  />,
  <DemoCanvas
    id="outline"
    title="Outline"
    manipulable={manipulableOutline}
    initialState={stateOutline1}
    height={400}
    padding={20}
    initialSnapRadius={5}
  />,
  <DemoCanvas
    id="sokoban"
    title="Sokoban"
    manipulable={manipulableSokoban}
    initialState={stateSokoban1}
    height={500}
    padding={20}
    initialRelativePointerMotion={true}
  />,
  <DemoCanvas
    id="graph"
    title="Graph"
    manipulable={manipulableGraph}
    initialState={stateGraph}
    height={200}
    padding={20}
  />,
  <DemoCanvas
    id="angle"
    title="Angle"
    manipulable={manipulableAngle}
    initialState={stateAngle}
    height={200}
    padding={20}
  />,
  <DemoCanvas
    id="angle-via-transform"
    title="Angle (via transform)"
    manipulable={manipulableAngleViaTransform}
    initialState={stateAngle}
    height={200}
    padding={20}
  />,
  <DemoCanvas
    id="clock"
    title="Clock"
    manipulable={manipulableClock}
    initialState={stateClock}
    height={200}
    padding={20}
  />,
];
