import { useState } from "react";
import { Link } from "react-router-dom";
import { ConfigCheckbox } from "./configurable";
import { DemoData } from "./demos";
import { ErrorBoundary } from "./ErrorBoundary";
import { ManipulableDrawer } from "./ManipulableDrawer";

export function Demo<T extends object>({
  demoData,
  onDragStateChange,
  debugMode,
  baseUrl,
  docEmbedMode,
}: {
  demoData: DemoData<T>;
  onDragStateChange?: (dragState: any) => void;
  debugMode?: boolean;
  baseUrl?: string;
  docEmbedMode?: boolean;
}) {
  const {
    id,
    title,
    notes,
    manipulable,
    initialStates,
    height,
    padding,
    initialDrawerConfig,
    sourceFile,
    configPosition = "right",
  } = demoData;

  const [snapRadius, setSnapRadius] = useState(
    initialDrawerConfig?.snapRadius ?? 10
  );
  const [chainDrags, setChainDrags] = useState(
    initialDrawerConfig?.chainDrags ?? true
  );
  const [relativePointerMotion, _setRelativePointerMotion] = useState(
    initialDrawerConfig?.relativePointerMotion ?? false
  );

  const [diagramConfig, setDiagramConfig] = useState<any>(
    demoData.manipulable.type === "configurable"
      ? demoData.manipulable.defaultConfig
      : undefined
  );

  return (
    <div
      className={`bg-white rounded-lg p-5  ${
        docEmbedMode ? "shadow-md border border-gray-200" : "shadow-sm"
      }`}
      id={id}
    >
      <div className="flex items-start justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 m-0">
          {baseUrl ? (
            <Link
              to={`${baseUrl}/${id}`}
              className="no-underline text-gray-900 hover:text-gray-700 hover:underline"
            >
              {title}
            </Link>
          ) : (
            title
          )}
        </h2>
        {sourceFile && (
          <a
            href={`https://github.com/joshuahhh/draggable-diagrams/blob/main/src/demo-diagrams/${sourceFile}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-500 hover:text-gray-700 no-underline hover:underline"
          >
            source
          </a>
        )}
      </div>
      {notes && <div className="mt-2 mb-4 text-sm text-gray-600">{notes}</div>}
      <div className={`flex flex-col gap-4 ${configPosition === "left" ? "md:flex-row-reverse" : "md:flex-row"}`}>
        <div className="flex-1 min-w-0" style={{ padding }}>
          {initialStates.map((initialState, idx) => (
            <div key={idx}>
              <div className="relative group">
                <Link
                  to={`/demos/${id}/inspect/${idx}`}
                  className="absolute top-0 right-0 text-xs text-gray-400 hover:text-gray-600 no-underline opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  inspect
                </Link>
                <ErrorBoundary>
                  <ManipulableDrawer
                    manipulable={manipulable.withConfig(diagramConfig)}
                    initialState={initialState}
                    drawerConfig={{
                      snapRadius,
                      chainDrags,
                      relativePointerMotion,
                      animationDuration: 300,
                    }}
                    height={height}
                    debugMode={debugMode}
                    onDragStateChange={onDragStateChange}
                  />
                </ErrorBoundary>
              </div>
              {initialStates.length > 1 && idx < initialStates.length - 1 && (
                <div className="border-t border-gray-200 my-8" />
              )}
            </div>
          ))}
        </div>
        <div
          className={`${
            demoData.manipulable.type === "configurable"
              ? "w-64 md:w-52"
              : "w-48 md:w-32"
          } bg-gray-50 rounded p-3 flex flex-col gap-2`}
        >
          {demoData.manipulable.type === "configurable" && (
            <>
              <demoData.manipulable.ConfigPanel
                config={diagramConfig}
                setConfig={setDiagramConfig}
              />
              <div className="border-t border-gray-300 my-1" />
            </>
          )}
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-gray-700">Snap radius</span>
            <input
              type="range"
              min="0"
              max="50"
              value={snapRadius}
              onChange={(e) => setSnapRadius(Number(e.target.value))}
              className="w-full"
            />
            <span className="text-gray-500 text-center">
              {snapRadius} pixels
            </span>
          </label>
          <ConfigCheckbox
            label="Chain drags automatically"
            value={chainDrags}
            onChange={setChainDrags}
          />
          {/* TODO: make this do something */}
          {/* <ConfigCheckbox
            label="Relative pointer motion"
            value={relativePointerMotion}
            onChange={_setRelativePointerMotion}
          /> */}
        </div>
      </div>
    </div>
  );
}
