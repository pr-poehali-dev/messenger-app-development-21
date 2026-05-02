export type ThemeId = "dark" | "midnight" | "violet";

const THEMES: ThemeId[] = ["dark", "midnight", "violet"];

export function isThemeId(v: unknown): v is ThemeId {
  return typeof v === "string" && (THEMES as string[]).includes(v);
}

export function getStoredTheme(): ThemeId {
  try {
    const v = localStorage.getItem("nova_theme");
    return isThemeId(v) ? v : "dark";
  } catch {
    return "dark";
  }
}

export function getStoredFontSize(): number {
  try {
    const n = Number(localStorage.getItem("nova_font_size"));
    return Number.isFinite(n) && n >= 12 && n <= 24 ? n : 16;
  } catch {
    return 16;
  }
}

export function applyTheme(theme: ThemeId, fontSize?: number) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.remove("theme-dark", "theme-midnight", "theme-violet");
  root.classList.add(`theme-${theme}`);
  if (typeof fontSize === "number") {
    root.style.fontSize = `${fontSize}px`;
  }
  try { localStorage.setItem("nova_theme", theme); } catch { /* ignore */ }
}

export function applyFontSize(size: number) {
  document.documentElement.style.fontSize = `${size}px`;
  try { localStorage.setItem("nova_font_size", String(size)); } catch { /* ignore */ }
}
