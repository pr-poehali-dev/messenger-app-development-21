import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { api, uploadImage, avatarGrad, type Chat, type Message, type Story, type User, type IconName, STORIES } from "@/lib/api";
import { playMessageSound } from "@/lib/sounds";

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

// ─── ChatWindow ───────────────────────────────────────────────────────────────

export function ChatWindow({ chat, onBack, currentUser, onCall }: { chat: Chat; onBack: () => void; currentUser: User; onCall?: (partnerId: number, name: string) => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [showAttach, setShowAttach] = useState(false);
  const [lastSince, setLastSince] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ msgId: number; out: boolean } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadMessages = async (since = 0) => {
    const data = await api("get_messages", { chat_id: chat.id, since }, currentUser.id);
    if (data.messages && data.messages.length > 0) {
      const mapped: Message[] = data.messages.map((m: { id: number; text: string; created_at: number; sender_id: number; read_at?: number; image_url?: string }) => ({
        id: m.id,
        text: m.text,
        time: new Date(m.created_at * 1000).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" }),
        out: m.sender_id === currentUser.id,
        read: !!m.read_at,
        sender_id: m.sender_id,
        created_at: m.created_at,
        image_url: m.image_url,
      }));
      if (since === 0) {
        setMessages(mapped);
      } else {
        // Звук только для входящих новых сообщений
        const hasIncoming = mapped.some(m => !m.out);
        if (hasIncoming) playMessageSound();
        setMessages(prev => [...prev, ...mapped]);
      }
      const maxTs = Math.max(...data.messages.map((m: { created_at: number }) => m.created_at));
      setLastSince(maxTs);
      api("mark_read", { chat_id: chat.id }, currentUser.id);
    }
  };

  useEffect(() => {
    setMessages([]);
    setLastSince(0);
    loadMessages(0);
  }, [chat.id]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadMessages(lastSince);
    }, 2000);
    return () => clearInterval(interval);
  }, [chat.id, lastSince]);

  // Polling typing статуса собеседника
  useEffect(() => {
    const interval = setInterval(async () => {
      const data = await api("get_typing", { chat_id: chat.id }, currentUser.id);
      setIsTyping(!!data.typing);
    }, 2500);
    return () => clearInterval(interval);
  }, [chat.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const notifyTyping = () => {
    api("set_typing", { chat_id: chat.id }, currentUser.id);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {}, 3000);
  };

  const send = async () => {
    if (!input.trim()) return;
    const text = input.trim();
    setInput("");
    const data = await api("send_message", { chat_id: chat.id, text }, currentUser.id);
    if (data.id) {
      const timeStr = new Date(data.created_at * 1000).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
      setMessages(prev => [...prev, { id: data.id, text, time: timeStr, out: true, created_at: data.created_at }]);
      setLastSince(data.created_at);
    }
  };

  const deleteMessage = async (msgId: number) => {
    setCtxMenu(null);
    await api("delete_message", { message_id: msgId }, currentUser.id);
    setMessages(prev => prev.filter(m => m.id !== msgId));
  };

  const startHold = (msgId: number, out: boolean) => {
    holdTimer.current = setTimeout(() => setCtxMenu({ msgId, out }), 500);
  };
  const cancelHold = () => { if (holdTimer.current) clearTimeout(holdTimer.current); };

  const sendPhoto = async (file: File) => {
    setUploading(true);
    setShowAttach(false);
    try {
      const url = await uploadImage(file, currentUser.id);
      const data = await api("send_message", { chat_id: chat.id, text: "📷 Фото", image_url: url }, currentUser.id);
      if (data.id) {
        const timeStr = new Date(data.created_at * 1000).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
        setMessages(prev => [...prev, { id: data.id, text: "📷 Фото", image_url: url, time: timeStr, out: true, created_at: data.created_at }]);
        setLastSince(data.created_at);
      }
    } catch { /* ignore */ } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col h-full animate-fade-in relative">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 glass-strong border-b border-white/5" style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top))", paddingBottom: "0.75rem" }}>
        <button onClick={onBack} className="md:hidden p-2 rounded-xl hover:bg-white/8 transition-colors">
          <Icon name="ChevronLeft" size={20} />
        </button>
        <Avatar label={chat.avatar} id={chat.id} size="md" online={chat.online} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">{chat.name}</span>
            {chat.group && <span className="text-[10px] bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded-full font-medium">группа</span>}
          </div>
          <div className="text-xs text-muted-foreground">
            {chat.typing ? (
              <span className="text-violet-400">печатает сообщение...</span>
            ) : chat.online ? (
              <span className="text-emerald-400">в сети</span>
            ) : (
              "был(а) недавно"
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onCall && chat.partner_id && onCall(chat.partner_id, chat.name)}
            className="p-2 rounded-xl hover:bg-white/8 transition-colors text-emerald-400 hover:text-emerald-300"
          >
            <Icon name="Phone" size={18} />
          </button>
          <button className="p-2 rounded-xl hover:bg-white/8 transition-colors text-muted-foreground hover:text-foreground">
            <Icon name="MoreVertical" size={18} />
          </button>
        </div>
      </div>

      {/* Lock badge */}
      <div className="flex justify-center py-2">
        <div className="flex items-center gap-1.5 px-3 py-1 glass rounded-full">
          <Icon name="Lock" size={11} className="text-violet-400" />
          <span className="text-[11px] text-muted-foreground">Сквозное шифрование</span>
        </div>
      </div>

      {/* Context menu overlay */}
      {ctxMenu && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in"
          onClick={() => setCtxMenu(null)}
        >
          <div className="glass-strong rounded-2xl overflow-hidden shadow-xl min-w-[180px] animate-scale-in" onClick={e => e.stopPropagation()}>
            {ctxMenu.out && (
              <button
                onClick={() => deleteMessage(ctxMenu.msgId)}
                className="w-full flex items-center gap-3 px-5 py-3.5 text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium"
              >
                <Icon name="Trash2" size={16} />
                Удалить сообщение
              </button>
            )}
            <button
              onClick={() => setCtxMenu(null)}
              className="w-full flex items-center gap-3 px-5 py-3.5 text-muted-foreground hover:bg-white/8 transition-colors text-sm"
            >
              <Icon name="X" size={16} />
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5">
        {messages.map((msg, i) => (
          <div
            key={msg.id}
            className={`flex ${msg.out ? "justify-end" : "justify-start"} animate-fade-in`}
            style={{ animationDelay: `${i * 0.04}s` }}
            onMouseDown={() => startHold(msg.id, msg.out)}
            onMouseUp={cancelHold}
            onMouseLeave={cancelHold}
            onTouchStart={() => startHold(msg.id, msg.out)}
            onTouchEnd={cancelHold}
            onContextMenu={e => { e.preventDefault(); setCtxMenu({ msgId: msg.id, out: msg.out }); }}
          >
            <div className={`max-w-[72%] rounded-2xl text-sm leading-relaxed overflow-hidden select-none ${
              msg.out
                ? "msg-bubble-out text-white rounded-tr-sm"
                : "msg-bubble-in text-foreground rounded-tl-sm"
            }`}>
              {msg.image_url && (
                <img
                  src={msg.image_url}
                  alt="фото"
                  className="w-full max-w-[260px] rounded-xl object-cover cursor-pointer"
                  onClick={() => window.open(msg.image_url, "_blank")}
                />
              )}
              {(!msg.image_url || msg.text !== "📷 Фото") && (
                <p className="px-4 py-2.5">{msg.text}</p>
              )}
              <div className={`flex items-center gap-1 px-4 pb-2 ${msg.out ? "justify-end" : "justify-start"}`}>
                <span className={`text-[10px] ${msg.out ? "text-white/60" : "text-muted-foreground"}`}>{msg.time}</span>
                {msg.out && (
                  <Icon name={msg.read ? "CheckCheck" : "Check"} size={12} className={msg.read ? "text-sky-300" : "text-white/50"} />
                )}
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start animate-fade-in">
            <div className="flex items-center gap-2 msg-bubble-in rounded-2xl rounded-tl-sm px-3 py-2">
              <TypingIndicator />
              <span className="text-xs text-violet-400 font-medium">{chat.name.split(" ")[0]} печатает</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) sendPhoto(f); e.target.value = ""; }}
      />
      <div className="px-4 py-3 glass-strong border-t border-white/5">
        {showAttach && (
          <div className="flex gap-2 mb-3 animate-fade-in">
            <button
              onClick={() => { fileInputRef.current?.click(); }}
              className="flex flex-col items-center gap-1 p-3 glass rounded-2xl flex-1 hover:bg-white/8 transition-colors"
            >
              <Icon name="Image" size={20} className="text-violet-400" />
              <span className="text-[10px] text-muted-foreground">Фото</span>
            </button>
            {[
              { icon: "Video", label: "Видео", color: "text-sky-400" },
              { icon: "FileText", label: "Файл", color: "text-emerald-400" },
              { icon: "Music", label: "Аудио", color: "text-pink-400" },
            ].map(item => (
              <button key={item.icon} className="flex flex-col items-center gap-1 p-3 glass rounded-2xl flex-1 hover:bg-white/8 transition-colors">
                <Icon name={item.icon as IconName} size={20} className={item.color} />
                <span className="text-[10px] text-muted-foreground">{item.label}</span>
              </button>
            ))}
          </div>
        )}
        {uploading && (
          <div className="flex items-center gap-2 mb-2 px-1 animate-fade-in">
            <div className="w-4 h-4 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
            <span className="text-xs text-muted-foreground">Загружаем фото...</span>
          </div>
        )}
        <div className="flex items-end gap-2">
          <button
            onClick={() => setShowAttach(v => !v)}
            className={`p-2.5 rounded-xl transition-all ${showAttach ? "bg-violet-500/20 text-violet-400" : "hover:bg-white/8 text-muted-foreground hover:text-foreground"}`}
          >
            <Icon name={showAttach ? "X" : "Paperclip"} size={20} />
          </button>
          <div className="flex-1 flex items-end glass rounded-2xl px-4 py-2.5 gap-2">
            <textarea
              value={input}
              onChange={e => { setInput(e.target.value); notifyTyping(); }}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Сообщение..."
              rows={1}
              className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder-muted-foreground resize-none max-h-32"
            />
            <button className="text-muted-foreground hover:text-foreground transition-colors">
              <Icon name="Smile" size={20} />
            </button>
          </div>
          <button
            onClick={send}
            className={`p-2.5 rounded-xl transition-all ${input.trim() ? "grad-primary text-white glow-primary animate-scale-in" : "glass text-muted-foreground"}`}
          >
            <Icon name={input.trim() ? "Send" : "Mic"} size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}