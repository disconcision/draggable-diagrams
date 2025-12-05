import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes } from "react-router-dom";
import { autoRoute } from "./autoRoute";
import { DemoListPage, SingleDemoPage } from "./DemoLayout";
import { demos } from "./demos";
import { DocsIndexPage } from "./DocsIndexPage";
import { DocsPage } from "./DocsPage";
import "./index.css";
import { IndexPage } from "./IndexPage";
import { PrettyPrintDemo } from "./pretty-print-demo";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        {autoRoute("/", IndexPage)}
        {autoRoute("/docs", DocsIndexPage)}
        {autoRoute("/docs/:slug", DocsPage)}
        {autoRoute("/demos", DemoListPage, { demos })}
        {autoRoute("/demos/:id", SingleDemoPage, { demos })}
        {autoRoute("/pretty-print", PrettyPrintDemo)}
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
