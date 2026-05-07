import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { api, type User } from "@/lib/api";
import { useEdgeSwipeBack } from "@/hooks/useEdgeSwipeBack";
import { useT } from "@/hooks/useT";

interface Note {
  id: number;
  text: string;
  media_url?: string | null;
  media_type?: string | null;
  pinned: boolean;
  created_at: number;
}

export default function SavedNotesPanel({
  currentUser, onClose,
}: { currentUser: User; onClose: () => void; }) {
  useEdgeSwipeBack(onClose);
  const { t } = useT();
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => {
    api("saved_notes_list", {}, currentUser.id).then(d => {
      if (Array.isArray(d?.notes)) setNotes(d.notes);
    });
  };

  useEffect(() => { load(); }, [currentUser.id]);

  const add = async () => {
    if (!text.trim()) return;
    setBusy(true);
    await api("saved_notes_add", { text: text.trim() }, currentUser.id);
    setText("");
    setBusy(false);
    load();
  };

  const togglePin = async (n: Note) => {
    await api("saved_notes_pin", { id: n.id, pinned: !n.pinned }, currentUser.id);
    load();
  };

  const remove = async (id: number) => {
    if (!confirm("Удалить заметку?")) return;
    await api("saved_notes_remove", { id }, currentUser.id);
    load();
  };

  const fmt = (ts: number) => new Date(ts * 1000).toLocaleString("ru", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="fixed inset-0 z-[260] bg-background flex flex-col animate-fade-in">
      <div className="flex items-center gap-2 px-3 py-2 glass-strong border-b border-white/5" style={{ paddingTop: "calc(0.5rem + env(safe-area-inset-top))" }}>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/8"><Icon name="ChevronLeft" size={20} /></button>
        <Icon name="Bookmark" size={18} className="text-violet-400" />
        <h2 className="font-bold flex-1">{t("nav.saved")}</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {notes.length === 0 && (
          <div className="text-center pt-12">
            <div className="w-16 h-16 mx-auto rounded-3xl grad-primary flex items-center justify-center mb-3">
              <Icon name="Bookmark" size={28} className="text-white" />
            </div>
            <h3 className="font-bold text-base mb-1">Заметки и избранное</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">Сохраняй важное здесь — заметки, ссылки, идеи. Видишь только ты.</p>
          </div>
        )}
        {notes.map(n => (
          <div key={n.id} className={`glass rounded-2xl p-3 ${n.pinned ? "border border-amber-500/30" : ""}`}>
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="text-[10px] text-muted-foreground">{fmt(n.created_at)}</span>
              <div className="flex gap-1">
                <button onClick={() => togglePin(n)} className="p-1 hover:bg-white/8 rounded-lg" title={n.pinned ? "Открепить" : "Закрепить"}>
                  <Icon name={n.pinned ? "PinOff" : "Pin"} size={12} className={n.pinned ? "text-amber-400" : "text-muted-foreground"} />
                </button>
                <button onClick={() => remove(n.id)} className="p-1 hover:bg-red-500/15 rounded-lg" title="Удалить">
                  <Icon name="Trash2" size={12} className="text-red-400" />
                </button>
              </div>
            </div>
            <p className="text-sm whitespace-pre-wrap break-words">{n.text}</p>
          </div>
        ))}
      </div>

      <div className="p-3 glass-strong border-t border-white/5 flex items-center gap-2" style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); add(); } }}
          placeholder="Запиши идею или вставь ссылку..."
          className="flex-1 glass rounded-xl px-4 py-2.5 text-sm outline-none"
        />
        <button onClick={add} disabled={!text.trim() || busy} className="w-10 h-10 grad-primary rounded-xl text-white flex items-center justify-center disabled:opacity-50">
          <Icon name="Plus" size={16} />
        </button>
      </div>
    </div>
  );
}