import Icon from "@/components/ui/icon";
import { avatarGrad, type Chat, type Story, STORIES } from "@/lib/api";

// ─── Avatar ───────────────────────────────────────────────────────────────────

export function Avatar({ label, id, size = "md", online }: { label: string; id: number; size?: "sm" | "md" | "lg" | "xl"; online?: boolean }) {
  const sz = { sm: "w-9 h-9 text-sm", md: "w-11 h-11 text-base", lg: "w-14 h-14 text-xl", xl: "w-20 h-20 text-3xl" }[size];
  return (
    <div className="relative flex-shrink-0">
      <div className={`${sz} rounded-full bg-gradient-to-br ${avatarGrad(id)} flex items-center justify-center font-bold text-white`}>
        {label}
      </div>
      {online && (
        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-[hsl(var(--background))] rounded-full" />
      )}
    </div>
  );
}

// ─── TypingIndicator ──────────────────────────────────────────────────────────

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      <div className="typing-dot w-2 h-2 rounded-full bg-violet-400" />
      <div className="typing-dot w-2 h-2 rounded-full bg-violet-400" />
      <div className="typing-dot w-2 h-2 rounded-full bg-violet-400" />
    </div>
  );
}

// ─── StoriesBar ───────────────────────────────────────────────────────────────

export function StoriesBar({ onView }: { onView: (s: Story) => void }) {
  return (
    <div className="flex gap-3 px-4 py-3 overflow-x-auto no-scrollbar">
      {STORIES.map((s, i) => (
        <button
          key={s.id}
          onClick={() => onView(s)}
          className={`flex flex-col items-center gap-1.5 flex-shrink-0 animate-fade-in stagger-${Math.min(i + 1, 5)}`}
        >
          <div className={`p-[2px] rounded-full bg-gradient-to-br ${s.seen ? "from-gray-600 to-gray-500 opacity-50" : s.gradient}`}>
            <div className="w-14 h-14 rounded-full glass flex items-center justify-center font-bold text-white text-xl border-2 border-[hsl(var(--background))]">
              {s.id === 0 ? (
                <Icon name="Plus" size={22} className="text-violet-400" />
              ) : (
                <div className={`w-full h-full rounded-full bg-gradient-to-br ${avatarGrad(s.id)} flex items-center justify-center text-base font-bold`}>
                  {s.avatar}
                </div>
              )}
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground w-16 truncate text-center">{s.name}</span>
        </button>
      ))}
    </div>
  );
}

// ─── ChatList ─────────────────────────────────────────────────────────────────

export function ChatList({ chats, onSelect, selectedId }: { chats: Chat[]; onSelect: (c: Chat) => void; selectedId?: number }) {
  const pinned = chats.filter(c => c.pinned);
  const rest = chats.filter(c => !c.pinned);

  const ChatRow = ({ chat, i }: { chat: Chat; i: number }) => (
    <button
      onClick={() => onSelect(chat)}
      className={`w-full flex items-center gap-3 px-4 py-3 transition-all duration-200 rounded-2xl mx-2 animate-fade-in stagger-${Math.min(i + 1, 5)}
        ${selectedId === chat.id ? "bg-white/8 glass" : "hover:bg-white/4"}`}
    >
      <Avatar label={chat.avatar} id={chat.id} online={chat.online} />
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {chat.pinned && <Icon name="Pin" size={11} className="text-violet-400" />}
            {chat.group && <Icon name="Users" size={12} className="text-sky-400" />}
            <span className="font-semibold text-sm text-foreground truncate">{chat.name}</span>
          </div>
          <span className="text-[11px] text-muted-foreground flex-shrink-0 ml-2">{chat.time}</span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          {chat.typing ? (
            <span className="text-xs text-violet-400 font-medium">печатает...</span>
          ) : (
            <span className="text-xs text-muted-foreground truncate">{chat.lastMsg}</span>
          )}
          {chat.unread ? (
            <span className="ml-2 flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full grad-primary text-[10px] font-bold text-white flex items-center justify-center">
              {chat.unread}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );

  return (
    <div className="flex-1 overflow-y-auto py-2 space-y-0.5">
      {chats.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center px-8">
          <div className="w-16 h-16 glass rounded-3xl flex items-center justify-center mb-4">
            <Icon name="MessageCircle" size={28} className="text-violet-400" />
          </div>
          <p className="font-semibold mb-1">Чатов пока нет</p>
          <p className="text-sm text-muted-foreground">Найди людей через поиск или добавь контакты</p>
        </div>
      )}
      {pinned.length > 0 && (
        <>
          <div className="px-6 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Закреплённые</div>
          {pinned.map((c, i) => <ChatRow key={c.id} chat={c} i={i} />)}
          <div className="px-6 py-1 mt-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Все чаты</div>
        </>
      )}
      {rest.map((c, i) => <ChatRow key={c.id} chat={c} i={i + pinned.length} />)}
    </div>
  );
}
