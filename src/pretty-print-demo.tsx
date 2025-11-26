import { useEffect } from "react";
import { prettyLog, testData } from "./pretty-print";

export function PrettyPrintDemo() {
  useEffect(() => {
    console.log("=== Pretty Print Demo ===\n");
    prettyLog(testData);
    console.log("\n--- Narrow (width=40) ---");
    prettyLog(testData, 40);
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h2>Pretty Print Demo</h2>
      <p>Open the browser console to see the output.</p>
    </div>
  );
}
