export type ThemeId = "dark" | "midnight" | "violet" | "ocean" | "sunset" | "forest" | "rose" | "light";

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  preview: string; // tailwind gradient classes
  pro?: boolean;   // требует Nova Pro
}

export const THEMES_META: ThemeMeta[] = [
  { id: "dark",     name: "Тёмная",   preview: "from-zinc-900 to-zinc-800" },
  { id: "midnight", name: "Полночь",  preview: "from-slate-900 to-indigo-950" },
  { id: "violet",   name: "Фиолет",   preview: "from-violet-900 to-fuchsia-900" },
  { id: "ocean",    name: "Океан",    preview: "from-sky-900 to-cyan-700", pro: true },
  { id: "sunset",   name: "Закат",    preview: "from-orange-700 via-pink-700 to-rose-900", pro: true },
  { id: "forest",   name: "Лес",      preview: "from-emerald-900 to-teal-800", pro: true },
  { id: "rose",     name: "Роза",     preview: "from-rose-700 to-pink-900", pro: true },
  { id: "light",    name: "Светлая",  preview: "from-zinc-200 to-zinc-100" },
];

const THEMES: ThemeId[] = THEMES_META.map(t => t.id);

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
  THEMES.forEach(t => root.classList.remove(`theme-${t}`));
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

function hexToHslTriplet(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let hh = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hh = (g - b) / d + (g < b ? 6 : 0); break;
      case g: hh = (b - r) / d + 2; break;
      case b: hh = (r - g) / d + 4; break;
    }
    hh /= 6;
  }
  return `${Math.round(hh * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function applyAccent(hex: string) {
  const triplet = hexToHslTriplet(hex);
  document.documentElement.style.setProperty("--primary", triplet);
  document.documentElement.style.setProperty("--ring", triplet);
  document.documentElement.style.setProperty("--accent-color", hex);
  try { localStorage.setItem("nova_accent_hex", hex); } catch { /* ignore */ }
}

export function getStoredAccentHex(): string | null {
  try { return localStorage.getItem("nova_accent_hex"); } catch { return null; }
}