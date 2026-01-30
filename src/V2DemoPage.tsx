import { ListOfLists } from "./demo-diagrams-2/list-of-lists";
import { ManipulableDrawer } from "./ManipulableDrawer2";

export function V2DemoPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">v2 Demos</h1>
      <ManipulableDrawer
        manipulable={ListOfLists.manipulable}
        initialState={ListOfLists.state1}
        width={600}
        height={300}
      />
    </div>
  );
}
