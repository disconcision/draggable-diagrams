import { Link } from "react-router-dom";
import { DemoSettingsProvider } from "./DemoContext";
import { v2Demos } from "./v2-demos";

export function V2DemoPage() {
  return (
    <DemoSettingsProvider>
      <div className="p-8 pb-64">
        <h1 className="text-2xl font-bold mb-4">v2 Demos</h1>

        {v2Demos.map((demo) => (
          <div key={demo.id}>
            <h2 className="text-xl font-semibold mt-8 first:mt-0 mb-2">
              <Link
                to={`/v2/${demo.id}`}
                className="hover:underline text-inherit"
              >
                {demo.id}
              </Link>
            </h2>
            <demo.Component />
          </div>
        ))}
      </div>
    </DemoSettingsProvider>
  );
}
