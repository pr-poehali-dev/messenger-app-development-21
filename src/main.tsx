import * as React from 'react';
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// Применяем сохранённую тему до рендера, чтобы не было «вспышки» дефолтной
(() => {
  try {
    const t = (localStorage.getItem("nova_theme") as "dark" | "midnight" | "violet") || "dark";
    document.documentElement.classList.add(`theme-${t}`);
    document.documentElement.dataset.theme = t;
    const fs = Number(localStorage.getItem("nova_font_size") || 16);
    if (Number.isFinite(fs)) document.documentElement.style.fontSize = `${fs}px`;
  } catch { /* ignore */ }
})();

createRoot(document.getElementById("root")!).render(<App />);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}