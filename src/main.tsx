import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import "./design/reset.css";
import "./design/tokens.css";
import "./design/worlds.css";
import "./design/motion.css";
import "./design/app.css";
import "./design/scenes.css";

const root = document.getElementById("root");
if (!root) throw new Error("BOW could not find its application root.");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
