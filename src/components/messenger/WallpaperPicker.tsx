import Icon from "@/components/ui/icon";

export const WALLPAPERS: Array<{ id: string; name: string; css: string; className?: string; animated?: boolean }> = [
  { id: "default", name: "По умолчанию", css: "" },
  { id: "violet", name: "Фиолет", css: "linear-gradient(160deg, #1e0a3c 0%, #0f172a 100%)" },
  { id: "ocean", name: "Океан", css: "linear-gradient(160deg, #0c4a6e 0%, #082f49 60%, #020617 100%)" },
  { id: "sunset", name: "Закат", css: "linear-gradient(160deg, #7c2d12 0%, #831843 60%, #0f172a 100%)" },
  { id: "forest", name: "Лес", css: "linear-gradient(160deg, #064e3b 0%, #0f172a 100%)" },
  { id: "candy", name: "Карамель", css: "linear-gradient(160deg, #db2777 0%, #4c1d95 60%, #0f172a 100%)" },
  { id: "cyber", name: "Кибер", css: "linear-gradient(135deg, #0b0d2c 0%, #1e1065 50%, #0b0d2c 100%)" },
  { id: "mint", name: "Мята", css: "linear-gradient(160deg, #0d9488 0%, #134e4a 60%, #0f172a 100%)" },
  { id: "ember", name: "Угли", css: "linear-gradient(160deg, #7f1d1d 0%, #18181b 100%)" },
  { id: "dots", name: "Точки", css: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.10) 1px, transparent 0) 0 0/22px 22px, linear-gradient(160deg, #1e1b4b 0%, #0f172a 100%)" },
  // Анимированные
  { id: "anim-aurora", name: "Аврора 🌌", css: "", className: "wp-animated-aurora", animated: true },
  { id: "anim-sunset", name: "Закат ✨", css: "", className: "wp-animated-sunset", animated: true },
  { id: "anim-ocean", name: "Океан 🌊", css: "", className: "wp-animated-ocean", animated: true },
  { id: "anim-rose", name: "Роза 🌹", css: "", className: "wp-animated-rose", animated: true },
  { id: "anim-stars", name: "Звёзды ⭐", css: "", className: "wp-animated-stars", animated: true },
];

export function wallpaperById(id: string | null | undefined): string {
  if (!id) return "";
  const w = WALLPAPERS.find(x => x.id === id);
  return w?.css || "";
}

export function wallpaperClassById(id: string | null | undefined): string {
  if (!id) return "";
  const w = WALLPAPERS.find(x => x.id === id);
  return w?.className || "";
}

export default function WallpaperPicker({
  open,
  current,
  onClose,
  onSelect,
}: {
  open: boolean;
  current: string | null;
  onClose: () => void;
  onSelect: (id: string | null) => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-md glass-strong rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto animate-fade-in" onClick={e => e.stopPropagation()} style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Icon name="Image" size={18} className="text-violet-400" />
            <h3 className="font-bold text-lg">Обои чата</h3>
          </div>
          <button onClick={onClose} className="p-2 glass rounded-xl text-muted-foreground">
            <Icon name="X" size={16} />
          </button>
        </div>

        <p className="text-xs text-muted-foreground mb-3">Видно только тебе. Не влияет на собеседника.</p>

        <div className="grid grid-cols-3 gap-2">
          {WALLPAPERS.map(w => {
            const active = (current ?? "default") === w.id;
            return (
              <button
                key={w.id}
                onClick={() => { onSelect(w.id === "default" ? null : w.id); onClose(); }}
                className={`relative aspect-[3/4] rounded-2xl overflow-hidden border-2 transition-all ${active ? "border-violet-400 scale-95" : "border-white/10 hover:border-white/30"} ${w.className || ""}`}
                style={w.css ? { background: w.css } : undefined}
              >
                {!w.css && !w.className && (
                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900" />
                )}
                <div className="absolute inset-0 flex items-end p-2">
                  <span className="text-[10px] font-semibold text-white/90 drop-shadow">{w.name}</span>
                </div>
                {w.animated && (
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[8px] font-bold bg-black/40 text-white/90 backdrop-blur">LIVE</div>
                )}
                {active && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center">
                    <Icon name="Check" size={12} className="text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}