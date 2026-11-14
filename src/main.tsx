import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import "./styles.css";
import App from "./App";
import { CatalogProvider } from "./lib/catalog";
import { SelectionProvider } from "./lib/selection";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <CatalogProvider>
        <SelectionProvider>
          <App />
        </SelectionProvider>
      </CatalogProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
