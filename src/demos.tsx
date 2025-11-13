import { ReactNode } from "react";
import { Demo } from "./components/Demo";
import { ManipulableDrawer } from "./manipulable";
import { manipulableGridPoly } from "./manipulable-grid-poly";
import { manipulableInsertAndRemove } from "./manipulable-insert-and-remove";
import { manipulableNoolTree } from "./manipulable-nool-tree";
import { manipulableOrderPreserving } from "./manipulable-order-preserving";
import { manipulablePerm } from "./manipulable-perm";
import { manipulablePermDouble } from "./manipulable-perm-double";
import { manipulableRushHour } from "./manipulable-rush-hour";
import { manipulableSimplest } from "./manipulable-simplest";
import { makeSokobanState, manipulableSokoban } from "./manipulable-sokoban";
import { manipulableTiles } from "./manipulable-tiles";
import { buildHasseDiagram, tree3, tree7 } from "./trees";

export interface DemoEntry {
  id: string;
  node: ReactNode;
}

export const demos: DemoEntry[] = [
  {
    id: "rush-hour",
    node: (
      <Demo
        id="rush-hour"
        title="Rush Hour"
        drawer={
          new ManipulableDrawer(manipulableRushHour, {
            w: 6,
            h: 6,
            cars: {
              A: { x: 0, y: 0, w: 2, h: 1, dir: "h", color: "lightgreen" },
              B: { x: 0, y: 1, w: 1, h: 3, dir: "v", color: "purple" },
              C: { x: 1, y: 2, w: 2, h: 1, dir: "h", color: "red" },
              D: { x: 0, y: 4, w: 1, h: 2, dir: "v", color: "orange" },
              E: { x: 3, y: 1, w: 1, h: 3, dir: "v", color: "blue" },
              F: { x: 5, y: 0, w: 1, h: 3, dir: "v", color: "yellow" },
              G: { x: 4, y: 4, w: 2, h: 1, dir: "h", color: "lightblue" },
              H: { x: 2, y: 5, w: 3, h: 1, dir: "h", color: "green" },
            },
          })
        }
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
        drawer={
          new ManipulableDrawer(manipulableTiles, {
            w: 4,
            h: 4,
            tiles: {
              "12": { x: 0, y: 0 },
              "1": { x: 1, y: 0 },
              "2": { x: 2, y: 0 },
              "15": { x: 3, y: 0 },
              "11": { x: 0, y: 1 },
              "6": { x: 1, y: 1 },
              "5": { x: 2, y: 1 },
              "8": { x: 3, y: 1 },
              "7": { x: 0, y: 2 },
              "10": { x: 1, y: 2 },
              "9": { x: 2, y: 2 },
              "4": { x: 3, y: 2 },
              "13": { x: 1, y: 3 },
              "14": { x: 2, y: 3 },
              "3": { x: 3, y: 3 },
            },
          })
        }
        height={200}
        padding={20}
      />
    ),
  },
  {
    id: "lonely-tile-on-a-grid-goal-is-for-it-to-only-slide-orthogonally",
    node: (
      <Demo
        id="lonely-tile-on-a-grid-goal-is-for-it-to-only-slide-orthogonally"
        title="Lonely tile on a grid; goal is for it to only slide orthogonally"
        drawer={
          new ManipulableDrawer(manipulableTiles, {
            w: 5,
            h: 5,
            tiles: {
              A: { x: 2, y: 2 },
            },
          })
        }
        height={300}
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
        drawer={
          new ManipulableDrawer(manipulableOrderPreserving, {
            domainTree: tree3,
            codomainTree: tree3,
            hasseDiagram: buildHasseDiagram(tree3, tree3),
            curMorphIdx: 0,
          })
        }
        height={260}
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
        drawer={
          new ManipulableDrawer(manipulableOrderPreserving, {
            domainTree: tree7,
            codomainTree: tree7,
            hasseDiagram: buildHasseDiagram(tree7, tree7),
            curMorphIdx: 0,
          })
        }
        height={500}
        padding={20}
      />
    ),
  },
  {
    id: "grid-polygon",
    node: (
      <Demo
        id="grid-polygon"
        title="Grid polygon"
        drawer={
          new ManipulableDrawer(manipulableGridPoly, {
            w: 6,
            h: 6,
            points: [
              { x: 1, y: 1 },
              { x: 4, y: 2 },
              { x: 3, y: 5 },
              { x: 1, y: 4 },
            ],
          })
        }
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
        drawer={
          new ManipulableDrawer(manipulablePerm, {
            perm: ["A", "B", "C", "D", "E"],
          })
        }
        height={50}
        padding={10}
      />
    ),
  },
  {
    id: "permutation-of-permutations",
    node: (
      <Demo
        id="permutation-of-permutations"
        title="Permutation of permutations"
        drawer={
          new ManipulableDrawer(manipulablePermDouble, {
            rows: [
              ["A1", "B1", "C1"],
              ["A2", "B2", "C2"],
              ["A3", "B3", "C3"],
            ],
          })
        }
        height={200}
      />
    ),
  },
  {
    id: "inserting-removing-items-wip",
    node: (
      <Demo
        id="inserting-removing-items-wip"
        title="Inserting & removing items (WIP)"
        drawer={
          new ManipulableDrawer(manipulableInsertAndRemove, {
            store: [
              { key: "D", label: "🍎" },
              { key: "E", label: "🍌" },
              { key: "F", label: "🍇" },
            ],
            items: [
              { key: "A", label: "🍎" },
              { key: "B", label: "🍎" },
              { key: "C", label: "🍌" },
            ],
          })
        }
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
        drawer={
          new ManipulableDrawer(manipulableNoolTree, {
            id: "root",
            label: "+",
            children: [
              {
                id: "root/1",
                label: "+",
                children: [
                  {
                    id: "root/1/1",
                    label: "+",
                    children: [
                      { id: "root/1/1/1", label: "⛅", children: [] },
                      {
                        id: "root/1/1/2",
                        label: "-",
                        children: [
                          { id: "root/1/1/2/1", label: "🍄", children: [] },
                        ],
                      },
                    ],
                  },
                  { id: "root/1/2", label: "🍄", children: [] },
                ],
              },
              {
                id: "root/2",
                label: "+",
                children: [
                  {
                    id: "root/2/1",
                    label: "×",
                    children: [
                      { id: "root/2/1/1", label: "🎲", children: [] },
                      { id: "root/2/1/2", label: "🦠", children: [] },
                    ],
                  },
                  {
                    id: "root/2/2",
                    label: "×",
                    children: [
                      { id: "root/2/2/1", label: "🎲", children: [] },
                      { id: "root/2/2/2", label: "🐝", children: [] },
                    ],
                  },
                ],
              },
            ],
          })
        }
        height={350}
        padding={20}
      />
    ),
  },
  {
    id: "nool-tree-simpler",
    node: (
      <Demo
        id="nool-tree-simpler"
        title="Nool tree, simpler"
        drawer={
          new ManipulableDrawer(manipulableNoolTree, {
            id: "+1",
            label: "+",
            children: [
              {
                id: "+2",
                label: "+",
                children: [
                  { id: "A", label: "A", children: [] },
                  { id: "B", label: "B", children: [] },
                ],
              },
              {
                id: "+3",
                label: "+",
                children: [
                  { id: "C", label: "C", children: [] },
                  { id: "D", label: "D", children: [] },
                ],
              },
            ],
          })
        }
        height={200}
        padding={20}
      />
    ),
  },
  {
    id: "sokoban-wip",
    node: (
      <Demo
        id="sokoban-wip"
        title="Sokoban (WIP)"
        drawer={
          new ManipulableDrawer(
            manipulableSokoban,
            makeSokobanState(`  #####
###   #
#gpb  #
### bg#
#g##b #
# # g ##
#b Bbbg#
#   g  #
########`),
          )
        }
        height={500}
        padding={20}
      />
    ),
  },
  {
    id: "simplest",
    node: (
      <Demo
        id="simplest"
        title="Simplest"
        drawer={new ManipulableDrawer(manipulableSimplest, true)}
        height={150}
        padding={20}
      />
    ),
  },
];
