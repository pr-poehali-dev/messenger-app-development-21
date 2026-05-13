import { useState } from "react";
import Icon from "@/components/ui/icon";
import { avatarGrad, type Chat } from "@/lib/api";
import { MediaViewer } from "@/components/messenger/MediaViewer";

// ─── Avatar ───────────────────────────────────────────────────────────────────

export function Avatar({ label, id, size = "md", online, src, zoomable }: { label: string; id: number; size?: "sm" | "md" | "lg" | "xl"; online?: boolean; src?: string | null; zoomable?: boolean }) {
  const [open, setOpen] = useState(false);
  const sz = { sm: "w-9 h-9 text-sm", md: "w-11 h-11 text-base", lg: "w-14 h-14 text-xl", xl: "w-20 h-20 text-3xl" }[size];
  const canZoom = zoomable && !!src;
  return (
    <div className="relative flex-shrink-0">
      <div
        className={`${sz} rounded-full bg-gradient-to-br ${avatarGrad(id)} flex items-center justify-center font-bold text-white overflow-hidden ${canZoom ? "cursor-pointer active:scale-95 transition-transform" : ""}`}
        onClick={canZoom ? (e) => { e.stopPropagation(); setOpen(true); } : undefined}
      >
        {src ? (
          <img src={src} alt={label} className="w-full h-full object-cover" />
        ) : (
          label
        )}
      </div>
      {online && (
        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-[hsl(var(--background))] rounded-full" />
      )}
      {open && src && (
        <MediaViewer items={[{ url: src, type: "image" }]} onClose={() => setOpen(false)} />
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

// ─── ChatList ─────────────────────────────────────────────────────────────────

export function ChatList({ chats, onSelect, selectedId }: { chats: Chat[]; onSelect: (c: Chat) => void; selectedId?: number }) {
  const pinned = chats.filter(c => c.pinned);
  const rest = chats.filter(c => !c.pinned);

  const ChatRow = ({ chat }: { chat: Chat }) => (
    <button
      onClick={() => onSelect(chat)}
      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors rounded-2xl mx-2
        ${selectedId === chat.id ? "bg-white/8 glass" : "hover:bg-white/4"}`}
    >
      <Avatar label={chat.avatar} id={chat.id} online={chat.online} src={chat.avatar_url || undefined} />
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            {chat.pinned && <Icon name="Pin" size={11} className="text-violet-400 flex-shrink-0" />}
            {chat.group && <Icon name="Users" size={12} className="text-sky-400 flex-shrink-0" />}
            <span className="font-semibold text-sm text-foreground truncate">{chat.name}</span>
            {chat.muted && <Icon name="BellOff" size={11} className="text-muted-foreground flex-shrink-0" />}
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
            <span className={`ml-2 flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold text-white flex items-center justify-center ${chat.muted ? "bg-white/15" : "grad-primary"}`}>
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
          {pinned.map((c) => <ChatRow key={c.id} chat={c} />)}
          <div className="px-6 py-1 mt-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Все чаты</div>
        </>
      )}
      {rest.map((c) => <ChatRow key={c.id} chat={c} />)}
    </div>
  );
}