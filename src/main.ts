import { add, distance, type Vec2 } from "./vec2";
import { layer, type Layer } from "./layer";
import { type XYWH, inXYWH, tm, bm, mm } from "./util";

// Canvas setup
const c = document.getElementById("c") as HTMLCanvasElement;
const cContainer = document.getElementById("c-container") as HTMLDivElement;
const ctx = c.getContext("2d")!;

// Pan state
let pan: Vec2 = [0, 0];

// Text color state
let textColor = "black";

// Debug state
let showClickablesDebug = false;

// Tree data structure
type TreeNode = {
  id: string;
  children: TreeNode[];
};

// Domain tree (parent with two children)
const domainTree: TreeNode = {
  id: "d0",
  children: [
    { id: "d1", children: [] },
    { id: "d2", children: [] },
  ],
};

// Codomain tree (3 layers)
const codomainTree: TreeNode = {
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
        { id: "b1", children: [] },
        { id: "b2", children: [] },
        { id: "b3", children: [] },
      ],
    },
    {
      id: "c",
      children: [{ id: "c1", children: [] }],
    },
  ],
};

// Map from domain to codomain (preserves ancestor-descendant relation)
// Maps domain node id -> codomain node id
const exampleMap: Record<string, string> = {
  d0: "root",
  d1: "a",
  d2: "b",
};

// Interaction state machine
type InteractionState =
  | { type: "not-dragging" }
  // if we're dragging, the drag may be "unconfirmed" – not sure if
  // it's a drag or a click (save the click callback for later)
  | {
      type: "unconfirmed";
      startPos: Vec2;
      callback: (() => void) | undefined;
    }
  | { type: "confirmed"; isPan: boolean; pointerType: string };

let ix: InteractionState = { type: "not-dragging" };

// Mouse tracking
let mouseX = 0;
let mouseY = 0;
let pointerType: string = "mouse";

const updateMouse = (e: PointerEvent) => {
  // clientX/Y works better than offsetX/Y for Chrome/Safari compatibility.
  const dragOffset =
    ix.type === "confirmed" && pointerType === "touch" ? 50 : 0;
  mouseX = e.clientX;
  mouseY = e.clientY - dragOffset;
  pointerType = e.pointerType;
};

// Clickable tracking (for future use)
let _clickables: {
  xywh: XYWH;
  callback: () => void;
}[] = [];

const hoveredClickable = () => {
  return _clickables.find(({ xywh }) => inXYWH(mouseX, mouseY, xywh));
};

// Tree layout constants
const NODE_RADIUS = 30;
const VERTICAL_GAP = 80;
const HORIZONTAL_GAP = 20;
const BACKGROUND_EDGE_WIDTH = 15;

// Foreground (mapped) tree constants
const MAPPED_NODE_RADIUS = 15;
const MAPPED_EDGE_WIDTH = 5;

// Keyboard event listeners
window.addEventListener("keydown", (e) => {
  if (e.key === "d" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    showClickablesDebug = !showClickablesDebug;
  }
});

// Pointer event listeners
c.addEventListener("pointermove", (e) => {
  updateMouse(e);

  if (ix.type === "unconfirmed") {
    if (distance(ix.startPos, [e.clientX, e.clientY]) > 4) {
      if (ix.callback) {
        ix.callback();
        ix = { type: "confirmed", isPan: false, pointerType };
      } else {
        ix = { type: "confirmed", isPan: true, pointerType };
      }
    }
  }

  if (ix.type === "confirmed" && ix.isPan) {
    pan = add(pan, [e.movementX, e.movementY]);
  }
});

c.addEventListener("pointerdown", (e) => {
  updateMouse(e);

  const callback = hoveredClickable()?.callback;
  ix = { type: "unconfirmed", startPos: [mouseX, mouseY], callback };
});

c.addEventListener("pointerup", (e) => {
  updateMouse(e);

  if (ix.type === "unconfirmed") {
    // a click!
    if (ix.callback) {
      ix.callback();
    }
  } else if (ix.type === "confirmed") {
    if (!ix.isPan) {
      // a drag!
      const callback = hoveredClickable()?.callback;
      if (callback) {
        callback();
      }
    }
    // end of a pan or drag; it's all good
  }
  ix = { type: "not-dragging" };
});

// Helper to add clickable region
const addClickHandler = (xywh: XYWH, callback: () => void) => {
  _clickables.push({ xywh, callback });
};

// Draw subtree and return bounding box
// Pass null for lyr to only measure without drawing
function drawSubtree(
  lyr: Layer | null,
  node: TreeNode,
  pos: Vec2
): XYWH {
  const nodeSize = NODE_RADIUS * 2;

  if (node.children.length === 0) {
    // Leaf node: just the node itself
    if (lyr) {
      const nodeCenter: Vec2 = [pos[0] + NODE_RADIUS, pos[1] + NODE_RADIUS];
      lyr.fillStyle = "lightgrey";
      lyr.beginPath();
      lyr.arc(nodeCenter[0], nodeCenter[1], NODE_RADIUS, 0, Math.PI * 2);
      lyr.fill();
    }
    return [pos[0], pos[1], nodeSize, nodeSize];
  }

  // Recursively get child bounding boxes (measurement pass)
  const childBoxes = node.children.map((child) =>
    drawSubtree(null, child, [0, 0])
  );

  // Calculate total width needed for children
  const childrenWidth =
    childBoxes.reduce((sum, box) => sum + box[2], 0) +
    HORIZONTAL_GAP * (node.children.length - 1);

  // Width is max of node width and children width
  const width = Math.max(nodeSize, childrenWidth);

  // Height is node + gap + max child height
  const maxChildHeight = Math.max(...childBoxes.map((box) => box[3]));
  const height = nodeSize + VERTICAL_GAP + maxChildHeight;

  if (lyr) {
    // Calculate node center (center of bounding box)
    const nodeCenter: Vec2 = [pos[0] + width / 2, pos[1] + NODE_RADIUS];

    // Calculate starting X for children (centered below parent)
    let childX = pos[0] + (width - childrenWidth) / 2;
    const childY = pos[1] + NODE_RADIUS * 2 + VERTICAL_GAP;

    // Draw edges to children first (so they appear behind nodes)
    for (let i = 0; i < node.children.length; i++) {
      const childBox = childBoxes[i];
      // Child center is in the middle of its bounding box
      const childCenter: Vec2 = [childX + childBox[2] / 2, childY + NODE_RADIUS];

      // Draw edge
      lyr.strokeStyle = "lightgrey";
      lyr.lineWidth = BACKGROUND_EDGE_WIDTH;
      lyr.beginPath();
      lyr.moveTo(nodeCenter[0], nodeCenter[1]);
      lyr.lineTo(childCenter[0], childCenter[1]);
      lyr.stroke();

      childX += childBox[2] + HORIZONTAL_GAP;
    }

    // Draw node
    lyr.fillStyle = "lightgrey";
    lyr.beginPath();
    lyr.arc(nodeCenter[0], nodeCenter[1], NODE_RADIUS, 0, Math.PI * 2);
    lyr.fill();

    // Draw children
    childX = pos[0] + (width - childrenWidth) / 2;
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      const childBox = childBoxes[i];
      drawSubtree(lyr, child, [childX, childY]);
      childX += childBox[2] + HORIZONTAL_GAP;
    }
  }

  return [pos[0], pos[1], width, height];
};

// Helper to find node center position in a tree
// Returns the center position of a node with given id in the tree drawn at basePos
function getNodeCenter(
  tree: TreeNode,
  nodeId: string,
  basePos: Vec2
): Vec2 | null {
  const bbox = drawSubtree(null, tree, [0, 0]);

  function search(node: TreeNode, pos: Vec2): Vec2 | null {
    const nodeBbox = drawSubtree(null, node, [0, 0]);
    const [_, __, width, height] = nodeBbox;

    if (node.id === nodeId) {
      return [pos[0] + width / 2, pos[1] + NODE_RADIUS];
    }

    if (node.children.length === 0) {
      return null;
    }

    const childBoxes = node.children.map((child) =>
      drawSubtree(null, child, [0, 0])
    );

    const childrenWidth =
      childBoxes.reduce((sum, box) => sum + box[2], 0) +
      HORIZONTAL_GAP * (node.children.length - 1);

    let childX = pos[0] + (width - childrenWidth) / 2;
    const childY = pos[1] + NODE_RADIUS * 2 + VERTICAL_GAP;

    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      const childBox = childBoxes[i];
      const result = search(child, [childX, childY]);
      if (result) return result;
      childX += childBox[2] + HORIZONTAL_GAP;
    }

    return null;
  }

  return search(tree, basePos);
}

// Draw mapped tree (foreground)
function drawMappedTree(
  lyr: Layer,
  domainNode: TreeNode,
  map: Record<string, string>,
  codomainTreeBasePos: Vec2
) {
  const codomainNodeId = map[domainNode.id];
  if (!codomainNodeId) return;

  const nodeCenter = getNodeCenter(codomainTree, codomainNodeId, codomainTreeBasePos);
  if (!nodeCenter) return;

  // Draw edges to children first
  for (const child of domainNode.children) {
    const childCodomainNodeId = map[child.id];
    if (!childCodomainNodeId) continue;

    const childCenter = getNodeCenter(codomainTree, childCodomainNodeId, codomainTreeBasePos);
    if (!childCenter) continue;

    lyr.strokeStyle = "black";
    lyr.lineWidth = MAPPED_EDGE_WIDTH;
    lyr.beginPath();
    lyr.moveTo(nodeCenter[0], nodeCenter[1]);
    lyr.lineTo(childCenter[0], childCenter[1]);
    lyr.stroke();
  }

  // Draw node
  lyr.fillStyle = "black";
  lyr.beginPath();
  lyr.arc(nodeCenter[0], nodeCenter[1], MAPPED_NODE_RADIUS, 0, Math.PI * 2);
  lyr.fill();

  // Recursively draw children
  for (const child of domainNode.children) {
    drawMappedTree(lyr, child, map, codomainTreeBasePos);
  }
}

// Draw text at a specific position
function drawText(lyr: Layer, pos: Vec2) {
  lyr.fillStyle = textColor;
  lyr.font = "32px sans-serif";
  lyr.textAlign = "center";
  lyr.textBaseline = "middle";
  const text = "Hello, mathematical structures!";
  const textX = pos[0];
  const textY = pos[1];
  lyr.fillText(text, textX, textY);

  // Measure text and register clickable area
  // We need to use the real context for measureText since Layer doesn't support it
  ctx.font = "32px sans-serif";
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  const textHeight = 32; // approximate height from font size
  addClickHandler(
    [
      textX - textWidth / 2,
      textY - textHeight / 2,
      textWidth,
      textHeight,
    ],
    () => {
      textColor = textColor === "black" ? "grey" : "black";
    }
  );
}

// Drawing function
function draw() {
  // Reset clickables at the start of each frame
  _clickables = [];

  // Create main layer
  const lyr = layer(ctx);

  // Clear canvas with white background
  lyr.fillStyle = "white";
  lyr.fillRect(0, 0, c.width, c.height);

  // Draw codomain tree (background) at panned position (centered)
  const codomainBBox = drawSubtree(null, codomainTree, [0, 0]);
  const codomainPos: Vec2 = add(pan, [
    c.width / 2 - codomainBBox[2] / 2,
    100, // some padding from top
  ]);
  drawSubtree(lyr, codomainTree, codomainPos);

  // Draw mapped tree (foreground) in black
  drawMappedTree(lyr, domainTree, exampleMap, codomainPos);

  // Clickables debug
  if (showClickablesDebug) {
    lyr.save();
    lyr.strokeStyle = "rgba(255, 0, 255, 1)";
    lyr.lineWidth = 4;
    for (const clickable of _clickables) {
      lyr.strokeRect(...clickable.xywh);
    }
    lyr.restore();
  }

  // Draw all commands
  lyr.draw();
}

// Auto-resize canvas to match container
const resizeObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const { width, height } = entry.contentRect;
    c.width = width;
    c.height = height;
    draw(); // Redraw immediately after resize
  }
});
resizeObserver.observe(cContainer);

// Main render loop
function drawLoop() {
  requestAnimationFrame(drawLoop);
  draw();
}

// Start the render loop
drawLoop();
