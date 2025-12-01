import { ReactElement } from "react";
import { Demo } from "./Demo";
import { numsAtPaths } from "./DragSpec";
import { rotate, scale, translate } from "./manipulable";
import { Angle } from "./manipulable-angle";
import { AngleViaTransform } from "./manipulable-angle-via-transform";
import { Braid } from "./manipulable-braid";
import { Clock } from "./manipulable-clock";
import { Graph } from "./manipulable-graph";
import { GridPoly } from "./manipulable-grid-poly";
import { NoolTree } from "./manipulable-nool-tree";
import { OrderPreserving } from "./manipulable-order-preserving";
import { Outline } from "./manipulable-outline";
import { Perm } from "./manipulable-perm";
import { PermDouble } from "./manipulable-perm-double";
import { SecondSimplest } from "./manipulable-second-simplest";
import { Simplest } from "./manipulable-simplest";
import { SimplestClicker } from "./manipulable-simplest-clicker";
import { Spinny } from "./manipulable-spinny";
import { Tiles } from "./manipulable-tiles";
import { Todo } from "./manipulable-todo";

export const demos: ReactElement[] = [
  <Demo
    id="simplest"
    title="Simplest"
    manipulable={Simplest.manipulable}
    initialState={Simplest.state1}
    height={100}
    padding={20}
  />,
  <Demo
    id="second-simplest"
    title="Second simplest"
    manipulable={SecondSimplest.manipulable}
    initialState={SecondSimplest.state1}
    height={200}
    padding={20}
  />,
  <Demo
    id="simplest-clicker"
    title="Simplest clicker"
    manipulable={SimplestClicker.manipulable}
    initialState={SimplestClicker.state1}
    height={200}
    padding={20}
  />,
  <Demo
    id="todo"
    title="Todo"
    manipulable={Todo.manipulable}
    initialState={Todo.state1}
    height={400}
    padding={20}
  />,
  <Demo
    id="lonely-tile-on-a-grid"
    title="Lonely tile on a grid"
    notes="I'm trying to make dragging feel right here. Goal is for the tile to only drag orthogonally, AND to not jump discontinuously. This seems to require 'Relative Pointer Motion' mode (or divergent approaches)."
    manipulable={Tiles.manipulable}
    initialState={Tiles.stateLonely}
    height={300}
    padding={20}
    initialRelativePointerMotion={true}
  />,
  <Demo
    id="grid-polygon"
    title="Grid polygon"
    manipulable={GridPoly.manipulable}
    initialState={GridPoly.state1}
    height={300}
    padding={20}
  />,
  <Demo
    id="permutation"
    title="Permutation"
    manipulable={Perm.manipulable}
    initialState={Perm.state1}
    height={100}
    padding={15}
  />,
  <Demo
    id="permutation-of-permutations"
    title="Permutation of permutations"
    manipulable={PermDouble.manipulable}
    initialState={PermDouble.state1}
    height={200}
  />,
  <Demo
    id="spinny"
    title="Spinny"
    notes="Tests interpolation of rotations."
    manipulable={Spinny.manipulable}
    initialState={Spinny.state1}
    height={200}
    padding={30}
    initialRelativePointerMotion={false}
  />,
  <Demo
    id="nool-tree"
    title="Nool tree"
    manipulable={NoolTree.manipulable}
    initialState={NoolTree.state1}
    height={350}
    padding={20}
    initialSnapRadius={1}
    initialRelativePointerMotion={true}
    defaultConfig={NoolTree.defaultConfig}
    ConfigPanel={NoolTree.ConfigPanel}
  />,
  <Demo
    id="nool-tree-simpler"
    title="Nool tree, simpler"
    manipulable={NoolTree.manipulable}
    initialState={NoolTree.state2}
    height={200}
    padding={20}
    initialSnapRadius={1}
    initialRelativePointerMotion={true}
    defaultConfig={NoolTree.defaultConfig}
    ConfigPanel={NoolTree.ConfigPanel}
  />,
  <Demo
    id="tree-of-life"
    title="Tree of Life"
    manipulable={Outline.manipulable}
    initialState={Outline.stateTreeOfLife}
    height={1100}
    padding={20}
    initialSnapRadius={5}
  />,
  <Demo
    id="graph"
    title="Graph"
    manipulable={Graph.manipulable}
    initialState={Graph.state1}
    height={200}
    padding={20}
  />,
  <Demo
    id="angle"
    title="Angle"
    manipulable={Angle.manipulable}
    initialState={Angle.state1}
    height={200}
    padding={20}
  />,
  <Demo
    id="angle-via-transform"
    title="Angle (via transform)"
    manipulable={AngleViaTransform.manipulable}
    initialState={AngleViaTransform.state1}
    height={200}
    padding={20}
  />,
  <Demo
    id="stretchy-xy"
    title="Stretchy (xy)"
    initialState={{ scaleX: 1, scaleY: 1 }}
    manipulable={({ state: { scaleX, scaleY }, draggable }) => (
      <g>
        {draggable(
          <circle
            transform={translate(100, 100) + scale(scaleX, scaleY)}
            cx={0}
            cy={0}
            r={50}
            fill="lightblue"
          />,
          numsAtPaths([["scaleX"], ["scaleY"]]),
        )}
        <ellipse
          cx={100}
          cy={100}
          rx={50 * Math.abs(scaleX)}
          ry={50 * Math.abs(scaleY)}
          fill="none"
          stroke="black"
          strokeWidth={4}
        />
      </g>
    )}
    height={200}
    padding={20}
  />,
  <Demo
    id="stretchy-rot"
    title="Stretchy (rot)"
    initialState={{ angle: 0, scaleX: 1 }}
    manipulable={({ state: { angle, scaleX }, draggable }) =>
      draggable(
        <circle
          transform={
            translate(100, 100) + rotate(angle) + scale(scaleX, 1 / scaleX)
          }
          cx={0}
          cy={0}
          r={50}
          fill="lightblue"
        />,
        numsAtPaths([["angle"], ["scaleX"]]),
      )
    }
    height={200}
    padding={20}
  />,
  <Demo
    id="clock"
    title="Clock"
    manipulable={Clock.manipulable}
    initialState={Clock.state1}
    height={200}
    padding={20}
  />,
  <Demo
    id="braids"
    title="Braids"
    manipulable={Braid.manipulable}
    initialState={{ n: 2, seq: [] as const, buds: true }}
    height={200}
    padding={20}
  />,
  <Demo
    id="order-preserving"
    title="Order-preserving maps (tree3 → tree3)"
    manipulable={OrderPreserving.manipulable}
    initialState={OrderPreserving.state1}
    height={400}
    padding={20}
    defaultConfig={OrderPreserving.defaultConfig}
    ConfigPanel={OrderPreserving.ConfigPanel}
  />,
  <Demo
    id="order-preserving-large"
    title="Order-preserving maps (tree7 → tree7)"
    manipulable={OrderPreserving.manipulable}
    initialState={OrderPreserving.state2}
    height={600}
    padding={20}
    defaultConfig={OrderPreserving.defaultConfig}
    ConfigPanel={OrderPreserving.ConfigPanel}
  />,
];
