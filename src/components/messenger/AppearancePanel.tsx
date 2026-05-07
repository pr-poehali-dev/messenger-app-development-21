import { useState } from "react";
import Icon from "@/components/ui/icon";
import { type User, api } from "@/lib/api";
import { applyFontSize, applyTheme, getStoredFontSize, getStoredTheme, THEMES_META, type ThemeId } from "@/lib/theme";
import { useEdgeSwipeBack } from "@/hooks/useEdgeSwipeBack";

const ACCENT_COLORS = [
  { id: "violet", hex: "#8b5cf6", name: "Фиолет" },
  { id: "blue", hex: "#3b82f6", name: "Синий" },
  { id: "cyan", hex: "#06b6d4", name: "Бирюза" },
  { id: "emerald", hex: "#10b981", name: "Изумруд" },
  { id: "amber", hex: "#f59e0b", name: "Янтарь" },
  { id: "rose", hex: "#f43f5e", name: "Роза" },
  { id: "pink", hex: "#ec4899", name: "Пинк" },
  { id: "indigo", hex: "#6366f1", name: "Индиго" },
];

const WALLPAPERS = [
  { id: "default", name: "По умолчанию", bg: "" },
  { id: "stars", name: "Звёзды", bg: "radial-gradient(circle at 20% 30%, #1a1a3a 0%, #0d0d1a 60%)" },
  { id: "aurora", name: "Аврора", bg: "linear-gradient(135deg, #064e3b 0%, #312e81 50%, #4c1d95 100%)" },
  { id: "sunset", name: "Закат", bg: "linear-gradient(180deg, #7c2d12 0%, #be185d 70%, #1e1b4b 100%)" },
  { id: "ocean", name: "Океан", bg: "linear-gradient(180deg, #0c4a6e 0%, #082f49 100%)" },
  { id: "rose", name: "Роза", bg: "linear-gradient(135deg, #831843 0%, #500724 100%)" },
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

  const setF = (n: number) => { setFont(n); applyFontSize(n); api("update_user_settings", { font_size: n }, currentUser.id); };

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
      <div className="flex items-center gap-2 px-3 py-2 glass-strong border-b border-white/5" style={{ paddingTop: "calc(0.5rem + env(safe-area-inset-top))" }}>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/8"><Icon name="ChevronLeft" size={20} /></button>
        <h2 className="font-bold flex-1">Оформление</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Тема</h3>
          <div className="grid grid-cols-3 gap-2">
            {THEMES_META.map(t => (
              <button key={t.id} onClick={() => setT(t.id, t.pro)} className={`relative h-20 rounded-2xl bg-gradient-to-br ${t.preview} border-2 ${theme === t.id ? "border-violet-400" : "border-transparent"}`}>
                {t.pro && !isPro && <span className="absolute top-1 right-1 text-[9px] bg-amber-500 text-black font-bold px-1.5 py-0.5 rounded-full">PRO</span>}
                <span className="absolute bottom-1 left-2 text-[10px] font-bold text-white drop-shadow">{t.name}</span>
                {theme === t.id && (
                  <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center">
                    <Icon name="Check" size={11} className="text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Акцентный цвет</h3>
          <div className="grid grid-cols-4 gap-2">
            {ACCENT_COLORS.map(c => (
              <button key={c.id} onClick={() => setA(c.id)} className={`h-14 rounded-2xl flex items-center justify-center border-2 ${accent === c.id ? "border-white" : "border-transparent"}`} style={{ background: c.hex }}>
                {accent === c.id && <Icon name="Check" size={16} className="text-white" />}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Размер шрифта</h3>
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <Icon name="Type" size={14} className="text-muted-foreground" />
              <input type="range" min={12} max={20} value={font} onChange={e => setF(parseInt(e.target.value, 10))} className="flex-1 accent-violet-500" />
              <span className="text-sm font-mono w-8 text-right">{font}</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Обои чата</h3>
          <div className="grid grid-cols-3 gap-2">
            {WALLPAPERS.map(w => (
              <button key={w.id} onClick={() => setWp(w.id)} className={`h-20 rounded-2xl border-2 ${wallpaper === w.id ? "border-violet-400" : "border-transparent"} relative overflow-hidden`} style={{ background: w.bg || "linear-gradient(135deg, #1f1f3a, #0d0d1a)" }}>
                <span className="absolute bottom-1 left-2 text-[10px] font-bold text-white drop-shadow">{w.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Стиль пузырей</h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "default", name: "Обычный" },
              { id: "rounded", name: "Округлый" },
              { id: "minimal", name: "Минимал" },
            ].map(b => (
              <button key={b.id} onClick={() => setBs(b.id)} className={`py-3 rounded-2xl text-xs font-semibold ${bubbleStyle === b.id ? "grad-primary text-white" : "glass text-muted-foreground"}`}>
                {b.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
