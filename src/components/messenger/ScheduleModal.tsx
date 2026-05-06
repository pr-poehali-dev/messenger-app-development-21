import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/ui/icon";

interface Preset {
  id: string;
  label: string;
  ts: () => number;
}

const presets: Preset[] = [
  { id: "1h", label: "Через час", ts: () => Math.floor(Date.now() / 1000) + 3600 },
  { id: "tomorrow9", label: "Завтра в 9:00", ts: () => {
    const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0);
    return Math.floor(d.getTime() / 1000);
  } },
  { id: "tomorrow18", label: "Завтра в 18:00", ts: () => {
    const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(18, 0, 0, 0);
    return Math.floor(d.getTime() / 1000);
  } },
  { id: "monday9", label: "В понедельник 9:00", ts: () => {
    const d = new Date();
    const day = d.getDay();
    const diff = (8 - day) % 7 || 7;
    d.setDate(d.getDate() + diff); d.setHours(9, 0, 0, 0);
    return Math.floor(d.getTime() / 1000);
  } },
];

function toLocalInputValue(ts: number) {
  const d = new Date(ts * 1000);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ScheduleModal({
  open,
  onClose,
  onConfirm,
  hasContent,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (scheduledAt: number) => Promise<void> | void;
  hasContent: boolean;
}) {
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      const initial = Math.floor(Date.now() / 1000) + 3600;
      setCustom(toLocalInputValue(initial));
      setError("");
    }
  }, [open]);

  const fmt = useMemo(() => new Intl.DateTimeFormat("ru", {
    weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  }), []);

  if (!open) return null;

  const submit = async (ts: number) => {
    if (!hasContent) {
      setError("Сначала введи текст или прикрепи файл");
      return;
    }
    if (ts <= Math.floor(Date.now() / 1000) + 5) {
      setError("Выбери время минимум через минуту");
      return;
    }
    setBusy(true);
    try {
      await onConfirm(ts);
      onClose();
    } catch (e) {
      setError((e as Error).message || "Не удалось запланировать");
    } finally {
      setBusy(false);
    }
  };

  const customTs = (() => {
    if (!custom) return 0;
    const t = new Date(custom).getTime();
    return isNaN(t) ? 0 : Math.floor(t / 1000);
  })();

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-md glass-strong rounded-t-3xl p-6 animate-fade-in" onClick={e => e.stopPropagation()} style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Icon name="Clock" size={18} className="text-cyan-400" />
            <h3 className="font-bold text-lg">Отложенная отправка</h3>
          </div>
          <button onClick={onClose} className="p-2 glass rounded-xl text-muted-foreground">
            <Icon name="X" size={16} />
          </button>
        </div>

        <p className="text-xs text-muted-foreground mb-3">Сообщение уйдёт автоматически в выбранное время.</p>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {presets.map(p => {
            const ts = p.ts();
            return (
              <button
                key={p.id}
                disabled={busy}
                onClick={() => submit(ts)}
                className="glass rounded-2xl p-3 text-left hover:bg-white/8 transition-colors disabled:opacity-50"
              >
                <div className="text-sm font-semibold">{p.label}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{fmt.format(new Date(ts * 1000))}</div>
              </button>
            );
          })}
        </div>

        <div className="mb-3">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Своё время</label>
          <input
            type="datetime-local"
            value={custom}
            min={toLocalInputValue(Math.floor(Date.now() / 1000) + 60)}
            onChange={e => setCustom(e.target.value)}
            className="w-full glass rounded-xl px-4 py-3 text-sm outline-none"
          />
        </div>

        {error && (
          <div className="mb-3 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
            {error}
          </div>
        )}

        <button
          onClick={() => submit(customTs)}
          disabled={busy || !customTs || !hasContent}
          className="w-full grad-primary text-white rounded-xl py-3 font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {busy
            ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <><Icon name="Send" size={14} /> Запланировать</>}
        </button>
      </div>
    </div>
  );
}
