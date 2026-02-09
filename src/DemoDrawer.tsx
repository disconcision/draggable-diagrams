import { PrettyPrint } from "@joshuahhh/pretty-print";
import { useState } from "react";
import { useDemoSettings } from "./DemoContext";
import {
  OverlayLegend,
  SpatialOverlaySvg,
  useOverlayData,
} from "./DragSpecSpatialOverlay";
import { DragSpecTreeView } from "./DragSpecTreeView";
import { ErrorBoundary } from "./ErrorBoundary";
import { DebugDragInfo, ManipulableDrawer } from "./ManipulableDrawer2";
import { Manipulable } from "./manipulable2";

export function DemoDrawer<T extends object>({
  manipulable,
  initialState,
  width,
  height,
}: {
  manipulable: Manipulable<T>;
  initialState: T;
  width: number;
  height: number;
}) {
  const { showTreeView, showDropZones, showDebugOverlay, showStateViewer } =
    useDemoSettings();
  const [debugInfo, setDebugInfo] = useState<DebugDragInfo<T>>({
    type: "idle",
    state: initialState,
  });

  const draggingDebugInfo = debugInfo.type === "dragging" ? debugInfo : null;

  const { data: overlayData, computing: overlayComputing } = useOverlayData(
    showDropZones ? draggingDebugInfo : null,
    width,
    height
  );

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
        {(showTreeView || showStateViewer) && (
          <div className="w-72 shrink-0 flex flex-col gap-2">
            {showTreeView && (
              <>
                {draggingDebugInfo ? (
                  <div className="flex flex-col gap-2">
                    <div className="text-xs text-slate-500 font-mono">
                      activePath: {draggingDebugInfo.activePath}
                    </div>
                    <DragSpecTreeView
                      spec={draggingDebugInfo.spec}
                      activePath={draggingDebugInfo.activePath}
                      colorMap={overlayData?.colorMap}
                    />
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic">
                    Drag an element to see its tree view
                  </div>
                )}
              </>
            )}
            {showStateViewer && (
              <ErrorBoundary>
                <PrettyPrint
                  value={
                    debugInfo.type === "dragging"
                      ? debugInfo.dropState
                      : debugInfo.state
                  }
                  style={{ fontSize: "11px" }}
                />
              </ErrorBoundary>
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
