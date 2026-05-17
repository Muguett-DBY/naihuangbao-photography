import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles/global.css";

for (const href of ["https://www.xiaohongshu.com"]) {
  const preconnect = document.createElement("link");
  preconnect.rel = "preconnect";
  preconnect.href = href;
  preconnect.crossOrigin = "anonymous";
  document.head.append(preconnect);
}

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element #root was not found");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

requestAnimationFrame(() => {
  document.body.classList.add("is-loaded");
});
