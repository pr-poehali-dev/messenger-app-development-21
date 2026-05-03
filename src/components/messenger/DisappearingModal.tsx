import Icon from "@/components/ui/icon";

const OPTIONS: { sec: number | null; label: string; sub?: string }[] = [
  { sec: null, label: "Отключить", sub: "Сообщения сохраняются навсегда" },
  { sec: 10, label: "10 секунд" },
  { sec: 60, label: "1 минута" },
  { sec: 300, label: "5 минут" },
  { sec: 3600, label: "1 час" },
  { sec: 86400, label: "24 часа" },
  { sec: 604800, label: "7 дней" },
];

export default function DisappearingModal({
  current,
  onClose,
  onSelect,
}: {
  current: number | null;
  onClose: () => void;
  onSelect: (sec: number | null) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[280] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm glass-strong rounded-t-3xl sm:rounded-3xl p-5 animate-slide-up"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #6366f1, #ec4899)" }}>
              <Icon name="Timer" size={18} className="text-white" />
            </div>
            <h3 className="text-base font-bold">Исчезающие сообщения</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/8">
            <Icon name="X" size={16} />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Новые сообщения будут автоматически удаляться у обоих участников через выбранное время после отправки.
        </p>

        <div className="space-y-1.5">
          {OPTIONS.map(opt => {
            const active = (opt.sec ?? null) === (current ?? null);
            return (
              <button
                key={String(opt.sec)}
                onClick={() => onSelect(opt.sec)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl transition text-left ${
                  active ? "bg-violet-500/15 border border-violet-400/40" : "glass hover:bg-white/8 border border-transparent"
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  active ? "bg-violet-500/30 text-violet-300" : "bg-white/5 text-muted-foreground"
                }`}>
                  <Icon name={opt.sec === null ? "Infinity" : "Timer"} size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold">{opt.label}</div>
                  {opt.sub && <div className="text-[11px] text-muted-foreground">{opt.sub}</div>}
                </div>
                {active && <Icon name="Check" size={16} className="text-violet-400 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
