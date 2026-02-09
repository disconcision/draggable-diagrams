import { Link } from "react-router-dom";
import { DemoSettingsProvider } from "./DemoContext";
import { v2Demos } from "./v2-demos";

export function V2SingleDemoPage({ id }: { id: string }) {
  const demo = v2Demos.find((d) => d.id === id);

  if (!demo) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Demo not found</h1>
        <Link to="/v2" className="text-blue-600 hover:text-blue-700">
          &larr; Back to all demos
        </Link>
      </div>
    );
  }

  return (
    <DemoSettingsProvider>
      <div className="p-8">
        <Link
          to="/v2"
          className="text-blue-600 hover:text-blue-700 text-sm mb-4 inline-block"
        >
          &larr; Back to all demos
        </Link>
        <h1 className="text-2xl font-bold mb-4">{demo.id}</h1>
        <demo.Component />
      </div>
    </DemoSettingsProvider>
  );
}
