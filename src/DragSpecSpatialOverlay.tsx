import { useEffect, useRef, useState } from "react";
import {
  BehaviorContext,
  DragFrame,
  DragSpec,
  dragSpecToBehavior,
} from "./DragSpec2";
import { Vec2 } from "./math/vec2";

// # Types

export type OverlayData = {
  cells: { x: number; y: number; activePath: string }[];
  cellSize: number;
  colorMap: Map<string, string>;
};

// # Colors

const REGION_COLORS = [
  "rgb(65, 105, 225)", // royal blue
  "rgb(220, 20, 60)", // crimson
  "rgb(34, 139, 34)", // forest green
  "rgb(255, 165, 0)", // orange
  "rgb(138, 43, 226)", // blue violet
  "rgb(0, 206, 209)", // dark turquoise
  "rgb(255, 215, 0)", // gold
  "rgb(199, 21, 133)", // medium violet red
  "rgb(70, 130, 180)", // steel blue
  "rgb(210, 105, 30)", // chocolate
];

function assignColors(paths: string[]): Map<string, string> {
  const sorted = [...new Set(paths)].sort();
  const map = new Map<string, string>();
  for (let i = 0; i < sorted.length; i++) {
    map.set(sorted[i], REGION_COLORS[i % REGION_COLORS.length]);
  }
  return map;
}

// # Computation

export function computeOverlay<T extends object>(
  spec: DragSpec<T>,
  behaviorCtx: BehaviorContext<T>,
  width: number,
  height: number,
  pointerStart: Vec2,
  cellSize: number = 30
): OverlayData {
  const samplingBehavior = dragSpecToBehavior(spec, behaviorCtx);

  const cols = Math.ceil(width / cellSize);
  const rows = Math.ceil(height / cellSize);
  const cells: { x: number; y: number; activePath: string }[] = [];

  // Scan in raster order for vary's curParams warm-starting
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = (col + 0.5) * cellSize;
      const y = (row + 0.5) * cellSize;
      const frame: DragFrame = { pointer: Vec2(x, y), pointerStart };
      try {
        const result = samplingBehavior(frame);
        cells.push({ x, y, activePath: result.activePath });
      } catch {
        cells.push({ x, y, activePath: "error" });
      }
    }
  }

  const colorMap = assignColors(cells.map((c) => c.activePath));
  return { cells, cellSize, colorMap };
}

// # Overlay SVG component

export function SpatialOverlaySvg({
  data,
  width,
  height,
}: {
  data: OverlayData;
  width: number;
  height: number;
}) {
  return (
    <svg
      width={width}
      height={height}
      className="absolute top-0 left-0 pointer-events-none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g opacity={0.35}>
        {data.cells.map(({ x, y, activePath }, i) => (
          <rect
            key={i}
            x={x - data.cellSize / 2}
            y={y - data.cellSize / 2}
            width={data.cellSize}
            height={data.cellSize}
            fill={data.colorMap.get(activePath) ?? "gray"}
          />
        ))}
      </g>
    </svg>
  );
}

// # Legend component

export function OverlayLegend({ data }: { data: OverlayData }) {
  const entries = [...data.colorMap.entries()];
  return (
    <div className="text-xs font-mono flex flex-wrap gap-x-4 gap-y-1">
      {entries.map(([path, color]) => (
        <div key={path} className="flex items-center gap-1.5">
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              backgroundColor: color,
              opacity: 0.6,
              flexShrink: 0,
            }}
          />
          <span className="text-slate-600">{path}</span>
        </div>
      ))}
    </div>
  );
}

// # Hook for async overlay computation

export function useOverlayData<T extends object>(
  spec: DragSpec<T> | null,
  behaviorCtx: BehaviorContext<T> | null,
  pointerStart: Vec2 | null,
  width: number,
  height: number,
  cellSize: number = 30
): OverlayData | null {
  const [data, setData] = useState<OverlayData | null>(null);
  const computeIdRef = useRef(0);

  // Use a ref to the spec identity to detect new drags
  const specRef = useRef(spec);

  useEffect(() => {
    if (!spec || !behaviorCtx || !pointerStart) {
      setData(null);
      return;
    }

    // Only recompute when spec identity changes (new drag)
    if (spec === specRef.current && data !== null) return;
    specRef.current = spec;

    const id = ++computeIdRef.current;
    const ps = pointerStart; // narrow for closure

    // Compute in batches to avoid blocking the main thread
    const samplingBehavior = dragSpecToBehavior(spec, behaviorCtx);
    const cols = Math.ceil(width / cellSize);
    const rows = Math.ceil(height / cellSize);
    const cells: { x: number; y: number; activePath: string }[] = [];
    let row = 0;
    const ROWS_PER_BATCH = 3;

    function processBatch() {
      if (id !== computeIdRef.current) return; // cancelled

      const endRow = Math.min(row + ROWS_PER_BATCH, rows);
      for (; row < endRow; row++) {
        for (let col = 0; col < cols; col++) {
          const x = (col + 0.5) * cellSize;
          const y = (row + 0.5) * cellSize;
          const frame: DragFrame = { pointer: Vec2(x, y), pointerStart: ps };
          try {
            const result = samplingBehavior(frame);
            cells.push({ x, y, activePath: result.activePath });
          } catch {
            cells.push({ x, y, activePath: "error" });
          }
        }
      }

      if (row >= rows) {
        const colorMap = assignColors(cells.map((c) => c.activePath));
        setData({ cells, cellSize, colorMap });
      } else {
        requestAnimationFrame(processBatch);
      }
    }

    requestAnimationFrame(processBatch);
  }, [spec, behaviorCtx, pointerStart, width, height, cellSize]);

  return data;
}
