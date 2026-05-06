import Icon from "@/components/ui/icon";

export interface ScheduledItem {
  id: number;
  chat_id: number;
  text: string;
  media_url?: string | null;
  media_type?: string | null;
  file_name?: string | null;
  scheduled_at: number;
  created_at: number;
}

const fmt = new Intl.DateTimeFormat("ru", {
  weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
});

export default function ScheduledList({
  open,
  items,
  onClose,
  onCancel,
}: {
  open: boolean;
  items: ScheduledItem[];
  onClose: () => void;
  onCancel: (id: number) => Promise<void> | void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-md glass-strong rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto animate-fade-in" onClick={e => e.stopPropagation()} style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Icon name="Clock" size={18} className="text-cyan-400" />
            <h3 className="font-bold text-lg">Запланировано ({items.length})</h3>
          </div>
          <button onClick={onClose} className="p-2 glass rounded-xl text-muted-foreground">
            <Icon name="X" size={16} />
          </button>
        </div>

        {items.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">Нет запланированных сообщений</p>
        ) : (
          <div className="space-y-2">
            {items.map(it => (
              <div key={it.id} className="glass rounded-2xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Icon name="Calendar" size={12} className="text-cyan-400" />
                  <span className="text-xs font-semibold text-cyan-300">{fmt.format(new Date(it.scheduled_at * 1000))}</span>
                </div>
                {it.media_url && (
                  <div className="flex items-center gap-2 mb-1.5 text-xs text-muted-foreground">
                    <Icon name={it.media_type === "image" ? "Image" : it.media_type === "video" ? "Video" : it.media_type === "audio" ? "Music" : "FileText"} size={12} />
                    {it.file_name || it.media_type || "Медиа"}
                  </div>
                )}
                {it.text && <p className="text-sm whitespace-pre-wrap break-words mb-2">{it.text}</p>}
                <button
                  onClick={() => onCancel(it.id)}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                >
                  <Icon name="Trash2" size={12} /> Отменить
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
