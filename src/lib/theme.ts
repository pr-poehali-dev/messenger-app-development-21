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
