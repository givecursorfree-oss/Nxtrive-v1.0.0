import React from "react";
import ReactDOM from "react-dom/client";
import { MotionConfig } from "motion/react";
import { initTheme } from "./lib/theme";
import { bootstrapBackend } from "./lib/backend-lifecycle";
import App from "./App";
import "./index.css";

initTheme();
bootstrapBackend();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </React.StrictMode>,
);
