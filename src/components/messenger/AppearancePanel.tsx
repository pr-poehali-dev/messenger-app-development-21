import { useState } from "react";
import Icon from "@/components/ui/icon";
import { type User, api } from "@/lib/api";
import { applyFontSize, applyTheme, getStoredFontSize, getStoredTheme, THEMES_META, type ThemeId } from "@/lib/theme";
import { useEdgeSwipeBack } from "@/hooks/useEdgeSwipeBack";

const ACCENT_COLORS = [
  { id: "violet", hex: "#8b5cf6" },
  { id: "blue", hex: "#3b82f6" },
  { id: "cyan", hex: "#06b6d4" },
  { id: "emerald", hex: "#10b981" },
  { id: "amber", hex: "#f59e0b" },
  { id: "rose", hex: "#f43f5e" },
  { id: "pink", hex: "#ec4899" },
  { id: "indigo", hex: "#6366f1" },
];

const WALLPAPERS = [
  { id: "default", name: "Авто", bg: "" },
  { id: "stars", name: "Звёзды", bg: "radial-gradient(circle at 20% 30%, #1a1a3a 0%, #0d0d1a 60%)" },
  { id: "aurora", name: "Аврора", bg: "linear-gradient(135deg, #064e3b 0%, #312e81 50%, #4c1d95 100%)" },
  { id: "sunset", name: "Закат", bg: "linear-gradient(180deg, #7c2d12 0%, #be185d 70%, #1e1b4b 100%)" },
  { id: "ocean", name: "Океан", bg: "linear-gradient(180deg, #0c4a6e 0%, #082f49 100%)" },
  { id: "rose", name: "Роза", bg: "linear-gradient(135deg, #831843 0%, #500724 100%)" },
];

const BUBBLES = [
  { id: "default", name: "Обычный" },
  { id: "rounded", name: "Округлый" },
  { id: "minimal", name: "Минимал" },
];

export default function AppearancePanel({
  currentUser, onClose, onUserUpdate,
}: { currentUser: User; onClose: () => void; onUserUpdate: (u: User) => void; }) {
  useEdgeSwipeBack(onClose);
  const isPro = !!currentUser.pro_until && currentUser.pro_until > Math.floor(Date.now() / 1000);
  const [theme, setTheme] = useState<ThemeId>(getStoredTheme());
  const [font, setFont] = useState<number>(getStoredFontSize());
  const [accent, setAccent] = useState<string>(currentUser.accent_color || "violet");
  const [wallpaper, setWallpaper] = useState<string>(currentUser.chat_wallpaper || "default");
  const [bubbleStyle, setBubbleStyle] = useState<string>(currentUser.bubble_style || "default");

  const setT = (id: ThemeId, pro: boolean | undefined) => {
    if (pro && !isPro) { alert("Эта тема доступна с Nova Pro"); return; }
    setTheme(id); applyTheme(id, font);
    api("update_user_settings", { theme_id: id }, currentUser.id);
    onUserUpdate({ ...currentUser, theme_id: id } as User);
  };

  const setF = (n: number) => {
    setFont(n);
    applyFontSize(n);
    api("update_user_settings", { font_size: n }, currentUser.id);
  };

  const setA = (id: string) => {
    setAccent(id);
    document.documentElement.style.setProperty("--accent", ACCENT_COLORS.find(c => c.id === id)?.hex || "#8b5cf6");
    api("update_user_settings", { accent_color: id }, currentUser.id);
    onUserUpdate({ ...currentUser, accent_color: id } as User);
  };

  const setWp = (id: string) => {
    setWallpaper(id);
    api("update_user_settings", { chat_wallpaper: id }, currentUser.id);
    onUserUpdate({ ...currentUser, chat_wallpaper: id } as User);
  };

  const setBs = (id: string) => {
    setBubbleStyle(id);
    api("update_user_settings", { bubble_style: id }, currentUser.id);
    onUserUpdate({ ...currentUser, bubble_style: id } as User);
  };

  return (
    <div className="fixed inset-0 z-[260] bg-[#0d0d1a] flex flex-col animate-fade-in">
      {/* Минималистичный header */}
      <div className="flex items-center gap-2 px-2 py-2 border-b border-white/5" style={{ paddingTop: "calc(0.5rem + env(safe-area-inset-top))" }}>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 transition" aria-label="Назад">
          <Icon name="ChevronLeft" size={18} />
        </button>
        <h2 className="text-sm font-semibold flex-1">Оформление</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 max-w-md mx-auto w-full">
        {/* Тема */}
        <Section title="Тема">
          <div className="grid grid-cols-4 gap-1.5">
            {THEMES_META.map(t => {
              const active = theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setT(t.id, t.pro)}
                  className={`relative aspect-square rounded-xl bg-gradient-to-br ${t.preview} transition ${active ? "ring-2 ring-violet-400" : "ring-1 ring-white/5 hover:ring-white/15"}`}
                  title={t.name}
                >
                  {t.pro && !isPro && (
                    <span className="absolute top-0.5 right-0.5 text-[8px] bg-amber-500 text-black font-bold px-1 py-px rounded">PRO</span>
                  )}
                  {active && (
                    <Icon name="Check" size={12} className="absolute bottom-0.5 right-0.5 text-white drop-shadow" />
                  )}
                </button>
              );
            })}
          </div>
        </Section>

        {/* Акцент */}
        <Section title="Акцент">
          <div className="flex flex-wrap gap-2">
            {ACCENT_COLORS.map(c => {
              const active = accent === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setA(c.id)}
                  className={`w-8 h-8 rounded-full transition ${active ? "ring-2 ring-white/80 ring-offset-2 ring-offset-[#0d0d1a]" : "hover:scale-110"}`}
                  style={{ background: c.hex }}
                  aria-label={c.id}
                />
              );
            })}
          </div>
        </Section>

        {/* Размер шрифта */}
        <Section title="Шрифт">
          <div className="flex items-center gap-3 px-1">
            <span className="text-xs text-muted-foreground">A</span>
            <input
              type="range" min={12} max={20} value={font}
              onChange={e => setF(parseInt(e.target.value, 10))}
              className="flex-1 accent-violet-500"
            />
            <span className="text-base font-semibold">A</span>
            <span className="text-xs text-muted-foreground w-7 text-right tabular-nums">{font}</span>
          </div>
        </Section>

        {/* Обои */}
        <Section title="Обои чата">
          <div className="grid grid-cols-3 gap-1.5">
            {WALLPAPERS.map(w => {
              const active = wallpaper === w.id;
              return (
                <button
                  key={w.id}
                  onClick={() => setWp(w.id)}
                  className={`relative h-14 rounded-lg overflow-hidden transition ${active ? "ring-2 ring-violet-400" : "ring-1 ring-white/5 hover:ring-white/15"}`}
                  style={{ background: w.bg || "linear-gradient(135deg, #1f1f3a, #0d0d1a)" }}
                >
                  <span className="absolute bottom-0.5 left-1.5 text-[10px] font-medium text-white/90">{w.name}</span>
                  {active && <Icon name="Check" size={12} className="absolute top-1 right-1 text-white drop-shadow" />}
                </button>
              );
            })}
          </div>
        </Section>

        {/* Пузыри */}
        <Section title="Сообщения">
          <div className="flex gap-1.5">
            {BUBBLES.map(b => {
              const active = bubbleStyle === b.id;
              return (
                <button
                  key={b.id}
                  onClick={() => setBs(b.id)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${active ? "bg-violet-500 text-white" : "bg-white/5 text-muted-foreground hover:bg-white/8"}`}
                >
                  {b.name}
                </button>
              );
            })}
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2 px-1">{title}</div>
      {children}
    </div>
  );
}
