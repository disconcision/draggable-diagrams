import _ from "lodash";
import { layer, PointOnLayer, type Layer } from "./layer";
import {
  codomainTree,
  domainTree,
  testMorphs,
  TreeMorph,
  TreeNode,
} from "./trees";
import { add, distance, v, type Vec2 } from "./vec2";
import { inXYWH, type XYWH } from "./xywh";

// Canvas setup
const c = document.getElementById("c") as HTMLCanvasElement;
const cContainer = document.getElementById("c-container") as HTMLDivElement;
const ctx = c.getContext("2d")!;

// Pan state
let pan: Vec2 = [0, 0];

// Debug state
let showClickablesDebug = false;

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

const BG_NODE_PADDING = 5;
const BG_NODE_GAP = 20;
const FG_NODE_SIZE = 20;
const FG_NODE_GAP = 10;

function drawBgSubtree(
  /** The background (codomain) node to draw */
  bgNode: TreeNode,
  /** All foreground (domain) nodes that are still looking for a
   * home, here or elsewhere */
  fgNodes: TreeNode[],
  morph: TreeMorph,
  /** An mutable record of where foreground nodes centers */
  fgNodeCenters: Record<string, PointOnLayer>,
): {
  bgLyr: Layer;
  fgLyr: Layer;
  w: number;
  h: number;
  rootCenter: PointOnLayer;
} {
  const bgLyr = layer(ctx);
  const fgLyr = layer(ctx);

  let [fgNodesHere, fgNodesBelow] = _.partition(
    fgNodes,
    (n) => morph[n.id] === bgNode.id,
  );

  const bgNodeR = drawBgNodeWithFgNodesInside(
    morph,
    bgNode,
    fgNodesHere,
    fgNodeCenters,
  );

  fgNodesBelow.push(...bgNodeR.fgNodesBelow);

  let x = 0;
  let y = bgNodeR.h + BG_NODE_GAP;
  let maxX = bgNodeR.w;
  let maxY = bgNodeR.h;

  const childRootCenters: PointOnLayer[] = [];

  for (const child of bgNode.children) {
    const childR = drawBgSubtree(child, fgNodesBelow, morph, fgNodeCenters);

    bgLyr.place(childR.bgLyr, v(x, y));
    fgLyr.place(childR.fgLyr, v(x, y));

    x += childR.w + BG_NODE_GAP;
    maxX = Math.max(maxX, x - BG_NODE_GAP);
    maxY = Math.max(maxY, y + childR.h);

    childRootCenters.push(childR.rootCenter);
  }

  const bgNodeOffset = v((maxX - bgNodeR.w) / 2, 0);
  bgLyr.place(bgNodeR.bgLyr, bgNodeOffset);
  fgLyr.place(bgNodeR.fgLyr, bgNodeOffset);

  for (const childRootCenter of childRootCenters) {
    bgLyr.do(() => {
      bgLyr.strokeStyle = "lightgray";
      bgLyr.lineWidth = 4;
      bgLyr.beginPath();
      bgLyr.moveTo(...bgLyr.resolvePoint(bgNodeR.rootCenter));
      bgLyr.lineTo(...bgLyr.resolvePoint(childRootCenter));
      bgLyr.stroke();
    });
  }

  return { bgLyr, fgLyr, w: maxX, h: maxY, rootCenter: bgNodeR.rootCenter };
}

/** Draw a background node with all relevant foreground nodes inside
 * – might be multiple subtrees */
function drawBgNodeWithFgNodesInside(
  morph: TreeMorph,
  bgNode: TreeNode,
  /** The caller has already figured out which foreground nodes
   * should be drawn as roots here */
  fgNodesHere: TreeNode[],
  /** An mutable record of where foreground nodes centers */
  fgNodeCenters: Record<string, PointOnLayer>,
): {
  bgLyr: Layer;
  fgLyr: Layer;
  w: number;
  h: number;
  /** A list of foreground nodes that are descendents of nodes drawn
   * here, but which belong in lower-down background nodes */
  fgNodesBelow: TreeNode[];
  rootCenter: PointOnLayer;
} {
  const bgLyr = layer(ctx);
  const fgLyr = layer(ctx);

  let x = BG_NODE_PADDING;
  let y = BG_NODE_PADDING;

  let maxX = x + 10;
  let maxY = y + 10;

  const fgNodesBelow: TreeNode[] = [];

  for (const fgNode of fgNodesHere) {
    const r = drawFgSubtreeInBgNode(fgNode, bgNode.id, morph, fgNodeCenters);
    fgLyr.place(r.fgLyr, v(x, y));

    x += r.w + FG_NODE_GAP;
    maxX = Math.max(maxX, x - FG_NODE_GAP);
    maxY = Math.max(maxY, y + r.h);

    fgNodesBelow.push(...r.fgNodesBelow);
  }

  maxX += BG_NODE_PADDING;
  maxY += BG_NODE_PADDING;

  // draw rect background
  bgLyr.do(() => {
    bgLyr.fillStyle = "lightgray";
    bgLyr.rect(0, 0, maxX, maxY);
    bgLyr.fill();
  });

  return {
    bgLyr,
    fgLyr,
    w: maxX,
    h: maxY,
    fgNodesBelow,
    rootCenter: bgLyr.point([maxX / 2, maxY / 2]),
  };
}

function drawFgSubtreeInBgNode(
  fgNode: TreeNode,
  bgNodeId: string,
  morph: TreeMorph,
  /** An mutable record of where foreground nodes centers */
  fgNodeCenters: Record<string, PointOnLayer>,
): {
  fgLyr: Layer;
  fgNodesBelow: TreeNode[];
  w: number;
  h: number;
} {
  const fgLyr = layer(ctx);

  let x = 0;
  let y = FG_NODE_SIZE + FG_NODE_GAP;
  let maxX = x + FG_NODE_SIZE;
  let maxY = FG_NODE_SIZE;

  const fgNodesBelow: TreeNode[] = [];

  for (const child of fgNode.children) {
    if (morph[child.id] === bgNodeId) {
      const r = drawFgSubtreeInBgNode(child, bgNodeId, morph, fgNodeCenters);
      fgLyr.place(r.fgLyr, v(x, y));
      fgNodesBelow.push(...r.fgNodesBelow);
      x += r.w + FG_NODE_GAP;
      maxX = Math.max(maxX, x - FG_NODE_GAP);
      maxY = Math.max(maxY, y + r.h);
    } else {
      fgNodesBelow.push(child);
    }
  }

  const nodeCenter = v(maxX / 2, FG_NODE_SIZE / 2);
  fgLyr.fillStyle = "black";
  fgLyr.beginPath();
  fgLyr.arc(...nodeCenter, FG_NODE_SIZE / 2, 0, Math.PI * 2);
  fgLyr.fill();
  fgNodeCenters[fgNode.id] = fgLyr.point(nodeCenter);

  return {
    fgLyr,
    fgNodesBelow,
    w: maxX,
    h: maxY,
  };
}

function drawFgNodeEdges(
  fgLyr: Layer,
  fgNode: TreeNode,
  fgNodeCenters: Record<string, PointOnLayer>,
) {
  if (fgNode.parentId) {
    const nodeCenter = fgNodeCenters[fgNode.id];
    const parentNodeCenter = fgNodeCenters[fgNode.parentId];
    if (!parentNodeCenter) {
      throw new Error(
        `No center recorded for parent node ${fgNode.parentId} of node ${fgNode.id}`,
      );
    }
    fgLyr.do(() => {
      fgLyr.strokeStyle = "black";
      fgLyr.lineWidth = 2;
      fgLyr.beginPath();
      fgLyr.moveTo(...fgLyr.resolvePoint(parentNodeCenter));
      fgLyr.lineTo(...fgLyr.resolvePoint(nodeCenter));
      fgLyr.stroke();
    });
  }
  for (const child of fgNode.children) {
    drawFgNodeEdges(fgLyr, child, fgNodeCenters);
  }
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

  let curX = pan[0] + 20;
  let curY = pan[1] + 20;

  const bgLyr = layer(ctx);
  lyr.place(bgLyr);
  const fgLyr = layer(ctx);
  lyr.place(fgLyr);

  for (const morph of testMorphs) {
    const fgNodeCenters: Record<string, PointOnLayer> = {};
    const r = drawBgSubtree(codomainTree, [domainTree], morph, fgNodeCenters);
    bgLyr.place(r.bgLyr, v(curX, curY));
    fgLyr.place(r.fgLyr, v(curX, curY));
    drawFgNodeEdges(fgLyr, domainTree, fgNodeCenters);
    curY += r.h + BG_NODE_GAP;
  }

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
if (false) {
  drawLoop();
} else {
  draw();
}
