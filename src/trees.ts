import dagre from "dagre";

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

/**
 * Find all morphisms from domain tree to codomain tree.
 * A morphism is a map that preserves the ancestor-descendant partial order:
 * if x is an ancestor of y in domain, then f(x) must be an ancestor of f(y) in codomain.
 */
export function allMorphs(domain: TreeNode, codomain: TreeNode): TreeMorph[] {
  const domainNodes = nodesInTree(domain);
  const codomainNodes = nodesInTree(codomain);

  // Build ancestor relationships for both trees
  const isAncestorInDomain = buildAncestorMap(domain);
  const isAncestorInCodomain = buildAncestorMap(codomain);

  const results: TreeMorph[] = [];
  const currentMorph: TreeMorph = {};

  function backtrack(nodeIndex: number) {
    if (nodeIndex === domainNodes.length) {
      // We've assigned all domain nodes, save this morphism
      results.push({ ...currentMorph });
      return;
    }

    const domainNode = domainNodes[nodeIndex];

    // Try assigning this domain node to each codomain node
    for (const codomainNode of codomainNodes) {
      // Check if this assignment is valid
      if (isValidAssignment(domainNode, codomainNode)) {
        currentMorph[domainNode.id] = codomainNode.id;
        backtrack(nodeIndex + 1);
        delete currentMorph[domainNode.id];
      }
    }
  }

  function isValidAssignment(domainNode: TreeNode, codomainNode: TreeNode): boolean {
    // Check against all previously assigned nodes
    for (const [assignedDomainId, assignedCodomainId] of Object.entries(currentMorph)) {
      const assignedDomainNode = domainNodes.find(n => n.id === assignedDomainId)!;
      const assignedCodomainNode = codomainNodes.find(n => n.id === assignedCodomainId)!;

      // If assignedDomainNode is an ancestor of domainNode in domain,
      // then assignedCodomainNode must be an ancestor of codomainNode in codomain
      if (isAncestorInDomain(assignedDomainNode, domainNode)) {
        if (!isAncestorInCodomain(assignedCodomainNode, codomainNode)) {
          return false;
        }
      }

      // If domainNode is an ancestor of assignedDomainNode in domain,
      // then codomainNode must be an ancestor of assignedCodomainNode in codomain
      if (isAncestorInDomain(domainNode, assignedDomainNode)) {
        if (!isAncestorInCodomain(codomainNode, assignedCodomainNode)) {
          return false;
        }
      }
    }

    return true;
  }

  backtrack(0);
  return results;
}

/**
 * Build a function that checks if node1 is an ancestor of node2 (or equal to node2)
 */
function buildAncestorMap(root: TreeNode): (ancestor: TreeNode, descendant: TreeNode) => boolean {
  const ancestorMap = new Map<string, Set<string>>();

  function visit(node: TreeNode, ancestors: string[]) {
    // A node is its own ancestor (reflexive)
    const nodeAncestors = new Set([...ancestors, node.id]);
    ancestorMap.set(node.id, nodeAncestors);

    for (const child of node.children) {
      visit(child, [...ancestors, node.id]);
    }
  }

  visit(root, []);

  return (ancestor: TreeNode, descendant: TreeNode) => {
    const ancestors = ancestorMap.get(descendant.id);
    return ancestors ? ancestors.has(ancestor.id) : false;
  };
}

/**
 * Check if morphism f covers morphism g.
 * f covers g if:
 * - They differ at exactly one domain node
 * - At that node, f maps to the parent of where g maps
 */
export function covers(f: TreeMorph, g: TreeMorph, codomain: TreeNode): boolean {
  const codomainNodes = nodesInTree(codomain);
  const nodeById = new Map(codomainNodes.map(n => [n.id, n]));

  // Find all differences
  const differences: string[] = [];
  for (const key of Object.keys(f)) {
    if (f[key] !== g[key]) {
      differences.push(key);
    }
  }

  // Must differ at exactly one node
  if (differences.length !== 1) {
    return false;
  }

  const differingKey = differences[0];
  const fTarget = nodeById.get(f[differingKey]);
  const gTarget = nodeById.get(g[differingKey]);

  if (!fTarget || !gTarget) {
    return false;
  }

  // f must map to the parent of where g maps
  return fTarget.id === gTarget.parentId;
}

export type HasseDiagram = {
  nodes: TreeMorph[];
  edges: [number, number][]; // [from, to] where indices refer to nodes array
};

/**
 * Build a Hasse diagram of morphisms under the covering relation.
 * Returns nodes (morphisms) and edges (covering relations).
 */
export function buildHasseDiagram(
  domain: TreeNode,
  codomain: TreeNode,
): HasseDiagram {
  const morphs = allMorphs(domain, codomain);
  const edges: [number, number][] = [];

  // Check all pairs of morphisms for covering relation
  for (let i = 0; i < morphs.length; i++) {
    for (let j = 0; j < morphs.length; j++) {
      if (i !== j && covers(morphs[i], morphs[j], codomain)) {
        edges.push([i, j]); // i covers j
      }
    }
  }

  return { nodes: morphs, edges };
}

/**
 * Convert a Hasse diagram to Graphviz DOT format.
 * Useful for visualization.
 */
export function toDot(diagram: HasseDiagram): string {
  const lines: string[] = ["digraph HasseDiagram {", "  rankdir=BT;"];

  // Add nodes with labels
  for (let i = 0; i < diagram.nodes.length; i++) {
    const morph = diagram.nodes[i];
    const label = Object.entries(morph)
      .map(([k, v]) => `${k}→${v}`)
      .join("\\n");
    lines.push(`  n${i} [label="${label}"];`);
  }

  // Add edges
  for (const [from, to] of diagram.edges) {
    lines.push(`  n${to} -> n${from};`); // to -> from because edges go up in Hasse
  }

  lines.push("}");
  return lines.join("\n");
}

export type HasseLayout = {
  /** Map from morphism index to its (x, y) position */
  positions: Map<number, { x: number; y: number }>;
  /** Width and height of the entire layout */
  width: number;
  height: number;
};

/**
 * Compute a layered layout for a Hasse diagram using dagre.
 * Returns absolute (x, y) positions for each morphism.
 */
export function layoutHasse(diagram: HasseDiagram): HasseLayout {
  const g = new dagre.graphlib.Graph();

  // Configure graph layout
  g.setGraph({
    rankdir: "TB", // Top to bottom (maximal morphisms at top)
    nodesep: 100,  // Horizontal separation between nodes
    ranksep: 150,  // Vertical separation between ranks
  });

  // Default to set node labels
  g.setDefaultEdgeLabel(() => ({}));

  // Add nodes
  for (let i = 0; i < diagram.nodes.length; i++) {
    g.setNode(i.toString(), { width: 100, height: 100 });
  }

  // Add edges (from covers to, so from should be above to in BT layout)
  for (const [from, to] of diagram.edges) {
    g.setEdge(from.toString(), to.toString());
  }

  // Run layout
  dagre.layout(g);

  // Extract positions
  const positions = new Map<number, { x: number; y: number }>();
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (let i = 0; i < diagram.nodes.length; i++) {
    const node = g.node(i.toString());
    positions.set(i, { x: node.x, y: node.y });
    minX = Math.min(minX, node.x);
    maxX = Math.max(maxX, node.x);
    minY = Math.min(minY, node.y);
    maxY = Math.max(maxY, node.y);
  }

  return {
    positions,
    width: maxX - minX,
    height: maxY - minY,
  };
}
