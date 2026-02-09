import { prettyLog, PrettyPrint, testData } from "@joshuahhh/pretty-print";
import { useEffect } from "react";

export function PrettyPrintDemo() {
  useEffect(() => {
    console.log("=== Pretty Print Demo ===\n");
    prettyLog(testData);
    console.log("\n--- Narrow (width=40) ---");
    prettyLog(testData, { width: 40 });
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h2>Pretty Print Demo</h2>

      <h3>Rendered in HTML (responsive width):</h3>
      <PrettyPrint
        value={testData}
        style={{ background: "#f9f9f9", fontSize: "28px" }}
      />

      <h3 style={{ marginTop: "30px" }}>In a narrow container (300px):</h3>
      <div style={{ width: "300px" }}>
        <PrettyPrint value={testData} style={{ background: "#f9f9f9" }} />
      </div>

      <p style={{ marginTop: "30px", color: "#666" }}>
        Also check the browser console for console.log output!
      </p>
    </div>
  );
}
