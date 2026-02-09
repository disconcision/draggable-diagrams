import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes } from "react-router-dom";
import { autoRoute } from "./autoRoute";
import { BluefishDemo } from "./bluefish-demo";
import { DemoListPage, SingleDemoPage } from "./DemoLayout";
import { DocsIndexPage } from "./DocsIndexPage";
import { DocsPage } from "./DocsPage";
import "./index.css";
import { IndexPage } from "./IndexPage";
import { InspectPage } from "./InspectPage";
import { PrettyPrintDemo } from "./pretty-print-demo";
import { V2DemoPage } from "./V2DemoPage";
import { V2SingleDemoPage } from "./V2SingleDemoPage";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        {autoRoute("/", IndexPage)}
        {autoRoute("/docs", DocsIndexPage)}
        {autoRoute("/docs/:slug", DocsPage)}
        {autoRoute("/demos", DemoListPage)}
        {autoRoute("/demos/:id/inspect/:stateIndex", InspectPage)}
        {autoRoute("/demos/:id", SingleDemoPage)}
        {autoRoute("/pretty-print", PrettyPrintDemo)}
        {autoRoute("/bluefish", BluefishDemo)}
        {autoRoute("/v2", V2DemoPage)}
        {autoRoute("/v2/:id", V2SingleDemoPage)}
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
