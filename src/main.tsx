import * as React from 'react';
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// Применяем сохранённую тему до рендера, чтобы не было «вспышки» дефолтной
import { applyTheme, getStoredTheme, getStoredFontSize } from "@/lib/theme";
applyTheme(getStoredTheme(), getStoredFontSize());

createRoot(document.getElementById("root")!).render(<App />);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}