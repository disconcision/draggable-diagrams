import { useState } from "react";
import {
  OverlayLegend,
  SpatialOverlaySvg,
  useOverlayData,
} from "./DragSpecSpatialOverlay";
import { DragSpecTreeView } from "./DragSpecTreeView";
import { DebugDragInfo, ManipulableDrawer } from "./ManipulableDrawer2";
import { Manipulable } from "./manipulable2";

export function DebugManipulableDrawer<T extends object>({
  manipulable,
  initialState,
  width,
  height,
  showTreeView,
  showDropZones,
  showDebugOverlay,
}: {
  manipulable: Manipulable<T>;
  initialState: T;
  width: number;
  height: number;
  showTreeView: boolean;
  showDropZones: boolean;
  showDebugOverlay: boolean;
}) {
  const [debugInfo, setDebugInfo] = useState<DebugDragInfo<T>>({
    type: "idle",
  });

  const { data: overlayData, computing: overlayComputing } = useOverlayData(
    showDropZones && debugInfo.type === "dragging" ? debugInfo.spec : null,
    showDropZones && debugInfo.type === "dragging" ? debugInfo.behaviorCtx : null,
    showDropZones && debugInfo.type === "dragging"
      ? debugInfo.pointerStart
      : null,
    width,
    height
  );

  const dragging = debugInfo.type === "dragging" ? debugInfo : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-4 items-start">
        <div className="relative">
          <ManipulableDrawer
            manipulable={manipulable}
            initialState={initialState}
            width={width}
            height={height}
            onDebugDragInfo={setDebugInfo}
            showDebugOverlay={showDebugOverlay}
          />
          {showDropZones && overlayData && (
            <SpatialOverlaySvg
              data={overlayData}
              width={width}
              height={height}
            />
          )}
          {showDropZones && overlayComputing && (
            <svg
              width={20}
              height={20}
              className="absolute top-1.5 left-1.5 pointer-events-none"
              viewBox="0 0 20 20"
            >
              <circle
                cx={10}
                cy={10}
                r={7}
                fill="none"
                stroke="#94a3b8"
                strokeWidth={2}
                strokeDasharray="11 33"
              >
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 10 10"
                  to="360 10 10"
                  dur="0.8s"
                  repeatCount="indefinite"
                />
              </circle>
            </svg>
          )}
        </div>
        {showTreeView && (
          <div className="w-72 shrink-0">
            {dragging ? (
              <div className="flex flex-col gap-2">
                <div className="text-xs text-slate-500 font-mono">
                  activePath: {dragging.activePath}
                </div>
                <DragSpecTreeView
                  spec={dragging.spec}
                  activePath={dragging.activePath}
                  colorMap={overlayData?.colorMap}
                />
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic">
                Drag an element to see its tree view
              </div>
            )}
          </div>
        )}
      </div>
      {showDropZones && !showTreeView && overlayData && (
        <OverlayLegend data={overlayData} />
      )}
    </div>
  );
}
