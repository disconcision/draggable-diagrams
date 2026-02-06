import { useState } from "react";
import { Link } from "react-router-dom";
import { Demo } from "./Demo";
import { ErrorBoundary } from "./ErrorBoundary";
import { noolDemos } from "./nool-demos";

export function NoolPage() {
  const [debugMode, setDebugMode] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="text-center py-10 px-5 max-w-3xl mx-auto">
        <Link to="/" className="text-gray-500 text-sm no-underline">
          <h1 className="text-3xl font-normal text-gray-800">
            Nool Playground
          </h1>
        </Link>
        <p className="text-gray-600 mt-2 text-sm">
          Algebraic expression manipulation and rule construction
        </p>
      </div>
      <div className="flex flex-col gap-5 px-16 pb-5 flex-1">
        {noolDemos.map((demo) => {
          return demo.run((demo) => (
            <ErrorBoundary key={demo.id}>
              <Demo demoData={demo} debugMode={debugMode} baseUrl="/nool" />
            </ErrorBoundary>
          ));
        })}
      </div>
      <div className="sticky bottom-0 bg-white/95 py-4 px-5 border-t border-gray-200 flex gap-5 items-center justify-center shadow-[0_-2px_4px_rgba(0,0,0,0.1)]">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={debugMode}
            onChange={(e) => setDebugMode(e.target.checked)}
          />
          Debug View
        </label>
        <Link
          to="/nool/design"
          className="text-blue-600 text-sm hover:text-blue-700 no-underline"
        >
          Design Notes
        </Link>
      </div>
    </div>
  );
}
