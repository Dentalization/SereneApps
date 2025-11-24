import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/tailwind.css";
import "./styles/index.css";
import "./styles/modal-fix.css";
import "./utils/consoleToaster";
import { initDevCleanup } from "./utils/devCleanup";

const INITIAL_LOADER_MIN_VISIBLE_MS = 1500;
const INITIAL_LOADER_FADE_MS = 520;

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root container '#root' tidak ditemukan.");
}

let hasClearedInitialLoader = false;

const clearInitialLoader = () => {
  if (hasClearedInitialLoader) {
    return;
  }

  const { body } = document;
  const initialLoader = document.getElementById("initial-loader");

  if (!body.classList.contains("initial-loading") || !initialLoader) {
    hasClearedInitialLoader = true;
    body.classList.remove("initial-loading");
    body.classList.remove("initial-loading-fade");
    return;
  }

  body.classList.add("initial-loading-fade");

  window.setTimeout(() => {
    if (initialLoader.parentElement) {
      initialLoader.parentElement.removeChild(initialLoader);
    }

    body.classList.remove("initial-loading");
    body.classList.remove("initial-loading-fade");
    hasClearedInitialLoader = true;
  }, INITIAL_LOADER_FADE_MS);
};

const root = createRoot(container);

// Development-only: Inisialisasi pembersihan overlay/text node nyasar
if (import.meta.env.DEV) {
  initDevCleanup();
}

root.render(<App />);

requestAnimationFrame(() => {
  window.setTimeout(clearInitialLoader, INITIAL_LOADER_MIN_VISIBLE_MS);
});
