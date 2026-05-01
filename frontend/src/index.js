import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Flip the body background from "logo white" → "brand cream" only after
// React has rendered. The CSS transition (defined in index.html) gives a
// smooth fade so the splash → app handoff looks polished.
requestAnimationFrame(() => {
  document.documentElement.setAttribute('data-ready', '');
});
