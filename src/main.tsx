import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { preinitializeMermaid } from "./core/markdown/renderMermaid";
import "./i18n";
import "./styles/globals.css";
import "highlight.js/styles/github.css";

preinitializeMermaid();

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
