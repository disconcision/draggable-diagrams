export type TreeNodeWithoutParents = {
  id: string;
  children: TreeNodeWithoutParents[];
};

export type TreeNode = {
  id: string;
  parentId: string | null;
  children: TreeNode[];
};

export function addParents(
  node: TreeNodeWithoutParents,
  parentId: string | null = null,
): TreeNode {
  return {
    id: node.id,
    parentId: parentId,
    children: node.children.map((child) => addParents(child, node.id)),
  };
}

export type TreeMorph = Record<string, string>;

export function nodesInTree(root: TreeNode): TreeNode[] {
  const nodes: TreeNode[] = [];
  function visit(node: TreeNode) {
    nodes.push(node);
    for (const child of node.children) {
      visit(child);
    }
  }
  visit(root);
  return nodes;
}

// /**
//  * We're descending the codomain tree, drawing bits of the domain
//  * tree in the right places. By the time we get to a codomain node,
//  * we have a bunch of domain nodes that need to be drawn somewhere.
//  */
// export function whatToDrawAtCodomainNode(
//   morph: TreeMorph,
//   domainNodes: TreeNode[],
//   codomainTree: TreeNode,
// ): {
//   domainNodesHere: TreeNode[];
//   domainNodesBelow: TreeNode[];
// } {
//   const domainNodesHere: TreeNode[] = [];
//   const domainNodesBelow: TreeNode[] = [];

// }

// # Example data

// Domain tree (parent with two children)
export const domainTree = addParents({
  id: "d0",
  children: [
    { id: "d1", children: [] },
    { id: "d2", children: [] },
  ],
});

// Codomain tree (3 layers)
export const codomainTree = addParents({
  id: "root",
  children: [
    {
      id: "a",
      children: [
        { id: "a1", children: [] },
        { id: "a2", children: [] },
      ],
    },
    {
      id: "b",
      children: [
        {
          id: "b1",
          children: [],
        },
        { id: "b2", children: [] },
        { id: "b3", children: [] },
      ],
    },
    { id: "c", children: [{ id: "c1", children: [] }] },
  ],
});

export const testMorphs: TreeMorph[] = [
  // Entire domain maps to one codomain node
  { d0: "root", d1: "root", d2: "root" },
  // Domain spread across multiple codomain nodes
  { d0: "root", d1: "a", d2: "b" },
  // Domain spanning parent and leaf
  { d0: "root", d1: "a1", d2: "a1" },
  // Starting lower
  { d0: "a", d1: "a1", d2: "a1" },
];
