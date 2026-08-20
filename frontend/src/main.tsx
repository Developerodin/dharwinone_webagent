import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { migrateClientStorage } from "./lib/clientStorage";
import "./index.css";

// Before anything reads the cache: discard client storage written by an older
// layout. A browser carrying the pre-accounts localStorage would otherwise
// render projects that no longer match what the server holds.
migrateClientStorage();

const rootEl = document.getElementById("root");

if (!rootEl) {
  throw new Error("Root element #root not found");
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
