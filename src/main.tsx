import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./app/App";
import "./app/styles/tailwind.css";
import { initApp } from "./shared/db/initApp";

const root = document.getElementById("root");
if (!root) throw new Error("root not found");

void initApp().then(() => {
  createRoot(root).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>
  );
});
