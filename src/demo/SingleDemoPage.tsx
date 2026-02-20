import { Link } from "react-router-dom";
import { demosById } from "./registry";
import { DemoCard, DemoSettingsBar, DemoSettingsProvider } from "./ui";

export function SingleDemoPage({ id }: { id: string }) {
  const demo = demosById.get(id);

  if (!demo) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="text-center py-10 px-5 max-w-3xl mx-auto">
          <h1 className="text-3xl font-normal text-gray-800">Demo not found</h1>
          <div className="mt-5">
            <Link
              to="/demos"
              className="text-blue-600 text-sm hover:text-blue-700"
            >
              &larr; Back to all demos
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DemoSettingsProvider>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="py-10 px-5 max-w-3xl mx-auto w-full">
          <Link
            to="/demos"
            className="inline-block mb-4 text-sm text-gray-600 hover:text-gray-800 no-underline"
          >
            ← Back to all demos
          </Link>
        </div>
        <div className="flex flex-col gap-5 px-5 pb-5 max-w-3xl mx-auto flex-1 w-full">
          <DemoCard demo={demo} />
        </div>
        <DemoSettingsBar />
      </div>
    </DemoSettingsProvider>
  );
}
