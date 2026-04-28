import { useState, useRef, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { api, uploadMedia, avatarGrad, type Chat, type Message, type Reaction, type Story, type User, type IconName, STORIES } from "@/lib/api";
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

// ─── MediaMessage ─────────────────────────────────────────────────────────────

function MediaMessage({ msg }: { msg: Message }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [imgError, setImgError] = useState(false);

  const mediaUrl = msg.media_url || msg.image_url;
  const mediaType = msg.media_type || (msg.image_url ? "image" : null);

  if (!mediaType || !mediaUrl) return null;

  const formatSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
  };

  if (mediaType === "image") {
    if (imgError) return (
      <div className="w-full max-w-[260px] h-32 rounded-xl bg-white/10 flex items-center justify-center">
        <Icon name="ImageOff" size={24} className="text-muted-foreground" />
      </div>
    );
    return (
      <img
        src={mediaUrl}
        alt="фото"
        className="w-full max-w-[260px] rounded-xl object-cover cursor-pointer"
        onError={() => setImgError(true)}
        onClick={() => window.open(mediaUrl, "_blank")}
      />
    );
  }

  if (mediaType === "video") {
    return (
      <div className="w-full max-w-[260px] rounded-xl overflow-hidden">
        <video
          src={mediaUrl}
          controls
          className="w-full rounded-xl"
          style={{ maxHeight: 300 }}
          playsInline
        />
      </div>
    );
  }

  if (mediaType === "audio") {
    const togglePlay = () => {
      if (!audioRef.current) return;
      if (playing) { audioRef.current.pause(); setPlaying(false); }
      else { audioRef.current.play(); setPlaying(true); }
    };
    return (
      <div className="flex items-center gap-3 px-1 py-1 min-w-[200px]">
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(139,92,246,0.25)" }}
        >
          <Icon name={playing ? "Pause" : "Play"} size={18} className="text-violet-400" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium">Голосовое</div>
          <div className="w-full h-1 bg-white/20 rounded-full mt-1">
            <div className="h-full bg-violet-400 rounded-full" style={{ width: playing ? "50%" : "0%", transition: "width 0.1s" }} />
          </div>
        </div>
        <audio ref={audioRef} src={mediaUrl} onEnded={() => setPlaying(false)} />
      </div>
    );
  }

  if (mediaType === "file") {
    return (
      <a
        href={mediaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 px-1 py-1 min-w-[200px] hover:opacity-80 transition-opacity"
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(16,185,129,0.2)" }}>
          <Icon name="FileText" size={18} className="text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium truncate">{msg.file_name || "Файл"}</div>
          <div className="text-[10px] text-muted-foreground">{formatSize(msg.file_size)}</div>
        </div>
        <Icon name="Download" size={16} className="text-muted-foreground flex-shrink-0" />
      </a>
    );
  }

  return null;
}

// ─── ReactionBar ──────────────────────────────────────────────────────────────

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

function ReactionBar({ reactions, currentUserId, onReact }: { reactions: Reaction[]; currentUserId: number; onReact: (emoji: string) => void }) {
  const grouped: Record<string, { count: number; users: string[]; mine: boolean }> = {};
  for (const r of reactions) {
    if (r.emoji === "__removed__") continue;
    if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, users: [], mine: false };
    grouped[r.emoji].count++;
    grouped[r.emoji].users.push(r.user_name);
    if (r.user_id === currentUserId) grouped[r.emoji].mine = true;
  }
  const entries = Object.entries(grouped).filter(([, v]) => v.count > 0);
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 px-2 pb-1">
      {entries.map(([emoji, data]) => (
        <button
          key={emoji}
          onClick={() => onReact(emoji)}
          title={data.users.join(", ")}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all ${
            data.mine ? "bg-violet-500/30 border border-violet-500/50" : "bg-white/10 hover:bg-white/20"
          }`}
        >
          <span>{emoji}</span>
          {data.count > 1 && <span className="text-[10px] font-bold">{data.count}</span>}
        </button>
      ))}
    </div>
  );
}

// ─── ChatWindow ───────────────────────────────────────────────────────────────

export function ChatWindow({
  chat, onBack, currentUser, onCall, onVideoCall
}: {
  chat: Chat;
  onBack: () => void;
  currentUser: User;
  onCall?: (partnerId: number, name: string) => void;
  onVideoCall?: (partnerId: number, name: string) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [showAttach, setShowAttach] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState<number | null>(null);
  const [lastSince, setLastSince] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadLabel, setUploadLabel] = useState("Загружаем...");
  const [isTyping, setIsTyping] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ msgId: number; out: boolean } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const recordTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadMessages = useCallback(async (since = 0) => {
    const data = await api("get_messages", { chat_id: chat.id, since }, currentUser.id);
    if (data.messages && data.messages.length > 0) {
      const mapped: Message[] = data.messages.map((m: {
        id: number; text: string; created_at: number; sender_id: number; read_at?: number;
        image_url?: string; media_type?: string; media_url?: string;
        file_name?: string; file_size?: number; duration?: number;
        reactions?: Reaction[];
      }) => ({
        id: m.id,
        text: m.text,
        time: new Date(m.created_at * 1000).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" }),
        out: m.sender_id === currentUser.id,
        read: !!m.read_at,
        sender_id: m.sender_id,
        created_at: m.created_at,
        image_url: m.image_url,
        media_type: m.media_type as Message["media_type"],
        media_url: m.media_url,
        file_name: m.file_name,
        file_size: m.file_size,
        duration: m.duration,
        reactions: m.reactions || [],
      }));
      if (since === 0) {
        setMessages(mapped);
      } else {
        const hasIncoming = mapped.some(m => !m.out);
        if (hasIncoming) playMessageSound();
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const newMsgs = mapped.filter(m => !existingIds.has(m.id));
          // Обновляем реакции существующих сообщений
          const updated = prev.map(pm => {
            const fresh = mapped.find(m => m.id === pm.id);
            return fresh ? { ...pm, reactions: fresh.reactions } : pm;
          });
          return newMsgs.length > 0 ? [...updated, ...newMsgs] : updated;
        });
      }
      const maxTs = Math.max(...data.messages.map((m: { created_at: number }) => m.created_at));
      setLastSince(maxTs);
      api("mark_read", { chat_id: chat.id }, currentUser.id);
    }
  }, [chat.id, currentUser.id]);

  useEffect(() => {
    setMessages([]);
    setLastSince(0);
    loadMessages(0);
  }, [chat.id]);

  useEffect(() => {
    const interval = setInterval(() => loadMessages(lastSince), 2000);
    return () => clearInterval(interval);
  }, [chat.id, lastSince, loadMessages]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const data = await api("get_typing", { chat_id: chat.id }, currentUser.id);
      setIsTyping(!!data.typing);
    }, 2500);
    return () => clearInterval(interval);
  }, [chat.id, currentUser.id]);

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
      setMessages(prev => [...prev, { id: data.id, text, time: timeStr, out: true, created_at: data.created_at, reactions: [] }]);
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

  const sendFile = async (file: File) => {
    setUploading(true);
    setShowAttach(false);
    const labelMap: Record<string, string> = { image: "Загружаем фото...", video: "Загружаем видео...", audio: "Загружаем аудио...", file: "Загружаем файл..." };
    try {
      const result = await uploadMedia(file, currentUser.id);
      setUploadLabel(labelMap[result.media_type] || "Загружаем...");
      const data = await api("send_message", {
        chat_id: chat.id,
        media_type: result.media_type,
        media_url: result.url,
        file_name: result.file_name,
        file_size: result.file_size,
      }, currentUser.id);
      if (data.id) {
        const timeStr = new Date(data.created_at * 1000).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
        setMessages(prev => [...prev, {
          id: data.id,
          text: data.text || "",
          time: timeStr,
          out: true,
          created_at: data.created_at,
          media_type: result.media_type,
          media_url: result.url,
          image_url: result.media_type === "image" ? result.url : undefined,
          file_name: result.file_name,
          file_size: result.file_size,
          reactions: [],
        }]);
        setLastSince(data.created_at);
      }
    } catch (uploadErr) { console.error(uploadErr); } finally { setUploading(false); }
  };

  // ── Голосовые сообщения ────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorder.current = mr;
      audioChunks.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunks.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunks.current, { type: "audio/webm" });
        const file = new File([blob], `voice_${Date.now()}.webm`, { type: "audio/webm" });
        await sendFile(file);
      };
      mr.start();
      setRecording(true);
      setRecordSec(0);
      recordTimer.current = setInterval(() => setRecordSec(s => s + 1), 1000);
    } catch {
      alert("Нет доступа к микрофону");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      mediaRecorder.current.stop();
    }
    if (recordTimer.current) clearInterval(recordTimer.current);
    setRecording(false);
  };

  const addReaction = async (msgId: number, emoji: string) => {
    setShowReactionPicker(null);
    setCtxMenu(null);
    await api("add_reaction", { message_id: msgId, emoji }, currentUser.id);
    // Обновляем реакции локально
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      const existing = m.reactions || [];
      const myIdx = existing.findIndex(r => r.user_id === currentUser.id);
      if (myIdx >= 0) {
        const updated = [...existing];
        if (updated[myIdx].emoji === emoji) {
          updated.splice(myIdx, 1);
        } else {
          updated[myIdx] = { ...updated[myIdx], emoji };
        }
        return { ...m, reactions: updated };
      }
      return { ...m, reactions: [...existing, { emoji, user_id: currentUser.id, user_name: "Я" }] };
    }));
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
          <button
            onClick={() => onVideoCall && chat.partner_id && onVideoCall(chat.partner_id, chat.name)}
            className="p-2 rounded-xl hover:bg-white/8 transition-colors text-sky-400 hover:text-sky-300"
          >
            <Icon name="Video" size={18} />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMenu(v => !v)}
              className="p-2 rounded-xl hover:bg-white/8 transition-colors text-muted-foreground hover:text-foreground"
            >
              <Icon name="MoreVertical" size={18} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-10 z-50 glass-strong rounded-2xl overflow-hidden shadow-xl min-w-[200px] animate-scale-in" onClick={() => setShowMenu(false)}>
                {[
                  { icon: "Search", label: "Поиск по чату" },
                  { icon: "Bell", label: "Уведомления" },
                  { icon: "Pin", label: "Закреплённые" },
                  { icon: "Star", label: "Избранные" },
                  { icon: "Trash2", label: "Очистить историю", red: true },
                  { icon: "Ban", label: "Заблокировать", red: true },
                ].map(item => (
                  <button
                    key={item.icon}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/8 transition-colors text-sm ${item.red ? "text-red-400 hover:bg-red-500/10" : ""}`}
                  >
                    <Icon name={item.icon as IconName} size={16} className={item.red ? "text-red-400" : "text-muted-foreground"} />
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
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
          onClick={() => { setCtxMenu(null); setShowReactionPicker(null); }}
        >
          <div className="glass-strong rounded-2xl overflow-hidden shadow-xl min-w-[200px] animate-scale-in" onClick={e => e.stopPropagation()}>
            {/* Quick reactions */}
            <div className="flex gap-1 px-4 py-3 border-b border-white/5">
              {QUICK_REACTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => addReaction(ctxMenu.msgId, emoji)}
                  className="text-xl hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                const msg = messages.find(m => m.id === ctxMenu.msgId);
                if (msg?.text) navigator.clipboard.writeText(msg.text);
                setCtxMenu(null);
              }}
              className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-white/8 transition-colors text-sm"
            >
              <Icon name="Copy" size={16} className="text-muted-foreground" />
              Копировать
            </button>
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
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5" onClick={() => { setShowMenu(false); setShowReactionPicker(null); }}>
        {messages.map((msg, i) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.out ? "items-end" : "items-start"} animate-fade-in`}
            style={{ animationDelay: `${i * 0.04}s` }}
          >
            <div
              className={`max-w-[72%] rounded-2xl text-sm leading-relaxed overflow-hidden select-none ${
                msg.out
                  ? "msg-bubble-out text-white rounded-tr-sm"
                  : "msg-bubble-in text-foreground rounded-tl-sm"
              }`}
              onMouseDown={() => startHold(msg.id, msg.out)}
              onMouseUp={cancelHold}
              onMouseLeave={cancelHold}
              onTouchStart={() => startHold(msg.id, msg.out)}
              onTouchEnd={cancelHold}
              onContextMenu={e => { e.preventDefault(); setCtxMenu({ msgId: msg.id, out: msg.out }); }}
            >
              {/* Media content */}
              {(msg.media_url || msg.image_url) && (
                <div className="p-1.5">
                  <MediaMessage msg={msg} />
                </div>
              )}
              {/* Text */}
              {msg.text && msg.text !== "📷 Фото" && msg.text !== "🎥 Видео" && msg.text !== "🎵 Голосовое" && !msg.text.startsWith("📎") && (
                <p className="px-4 py-2.5">{msg.text}</p>
              )}
              {/* Time + read */}
              <div className={`flex items-center gap-1 px-4 pb-2 pt-1 ${msg.out ? "justify-end" : "justify-start"}`}>
                <span className={`text-[10px] ${msg.out ? "text-white/60" : "text-muted-foreground"}`}>{msg.time}</span>
                {msg.out && (
                  <Icon name={msg.read ? "CheckCheck" : "Check"} size={12} className={msg.read ? "text-sky-300" : "text-white/50"} />
                )}
              </div>
            </div>
            {/* Reactions */}
            {(msg.reactions || []).filter(r => r.emoji !== "__removed__").length > 0 && (
              <ReactionBar
                reactions={msg.reactions || []}
                currentUserId={currentUser.id}
                onReact={(emoji) => addReaction(msg.id, emoji)}
              />
            )}
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
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) sendFile(f); e.target.value = ""; }}
      />
      <div className="px-4 py-3 glass-strong border-t border-white/5" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
        {showAttach && (
          <div className="grid grid-cols-4 gap-2 mb-3 animate-fade-in">
            {[
              { icon: "Image", label: "Фото", color: "text-violet-400", mime: "image/*" },
              { icon: "Video", label: "Видео", color: "text-sky-400", mime: "video/*" },
              { icon: "Music", label: "Аудио", color: "text-pink-400", mime: "audio/*" },
              { icon: "FileText", label: "Файл", color: "text-emerald-400", mime: "*" },
            ].map(item => (
              <button
                key={item.icon}
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = item.mime;
                    fileInputRef.current.click();
                  }
                }}
                className="flex flex-col items-center gap-1 p-3 glass rounded-2xl hover:bg-white/8 transition-colors"
              >
                <Icon name={item.icon as IconName} size={20} className={item.color} />
                <span className="text-[10px] text-muted-foreground">{item.label}</span>
              </button>
            ))}
          </div>
        )}
        {uploading && (
          <div className="flex items-center gap-2 mb-2 px-1 animate-fade-in">
            <div className="w-4 h-4 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
            <span className="text-xs text-muted-foreground">{uploadLabel}</span>
          </div>
        )}
        {recording && (
          <div className="flex items-center gap-3 mb-2 px-2 animate-fade-in">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm text-red-400 font-medium">
              Запись {Math.floor(recordSec / 60).toString().padStart(2, "0")}:{(recordSec % 60).toString().padStart(2, "0")}
            </span>
            <button onClick={stopRecording} className="ml-auto text-xs text-muted-foreground hover:text-red-400">
              Отмена
            </button>
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
          {input.trim() ? (
            <button
              onClick={send}
              className="p-2.5 rounded-xl transition-all grad-primary text-white glow-primary animate-scale-in"
            >
              <Icon name="Send" size={20} />
            </button>
          ) : (
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              className={`p-2.5 rounded-xl transition-all ${recording ? "bg-red-500 text-white" : "glass text-muted-foreground hover:text-violet-400"}`}
            >
              <Icon name="Mic" size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}