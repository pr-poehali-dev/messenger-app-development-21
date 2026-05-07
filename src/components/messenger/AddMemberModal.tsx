import Icon from "@/components/ui/icon";
import { type Contact } from "@/lib/api";
import { Avatar } from "@/components/messenger/ChatAtoms";

interface Props {
  open: boolean;
  onClose: () => void;
  contacts: Contact[];
  filteredContacts: Contact[];
  contactSearch: string;
  setContactSearch: (v: string) => void;
  addingId: number | null;
  onAdd: (id: number) => void;
}

export function AddMemberModal({
  open, onClose, contacts, filteredContacts, contactSearch, setContactSearch, addingId, onAdd,
}: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[210] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-md glass-strong rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()} style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Добавить участников</h3>
          <button onClick={onClose} className="p-2 glass rounded-xl">
            <Icon name="X" size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2 glass rounded-xl px-3 py-2 mb-3">
          <Icon name="Search" size={14} className="text-muted-foreground" />
          <input
            value={contactSearch}
            onChange={e => setContactSearch(e.target.value)}
            placeholder="Поиск по контактам"
            autoFocus
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </div>
        {filteredContacts.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            {contacts.length === 0 ? "Нет контактов" : "Все ваши контакты уже в группе"}
          </p>
        ) : (
          <div className="space-y-1">
            {filteredContacts.map(c => (
              <div key={c.id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5">
                <Avatar label={c.name[0]?.toUpperCase() || "?"} id={c.id} src={c.avatar_url} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{c.name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{c.phone}</div>
                </div>
                <button
                  onClick={() => onAdd(c.id)}
                  disabled={addingId === c.id}
                  className="px-3 py-1.5 grad-primary text-white text-xs font-bold rounded-xl disabled:opacity-50"
                >
                  {addingId === c.id ? "..." : "Добавить"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AddMemberModal;
