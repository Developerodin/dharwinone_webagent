import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GalleryPreviewPage } from "./pages/GalleryPreviewPage";
import "./index.css";

const rootEl = document.getElementById("root");

if (!rootEl) {
  throw new Error("Root element #root not found");
}

createRoot(rootEl).render(
  <StrictMode>
    <GalleryPreviewPage />
  </StrictMode>,
);
