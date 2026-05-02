import { useState, useRef, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { api, uploadMedia, type Chat, type Message, type Reaction, type User } from "@/lib/api";
import { playMessageSound } from "@/lib/sounds";
import { MediaMessage, ReactionBar } from "@/components/messenger/ChatMediaMessage";
import { type MediaItem } from "@/components/messenger/MediaViewer";
import { ChatHeader, ContextMenu, ChatInput } from "@/components/messenger/ChatWindowParts";
import { TypingIndicator } from "@/components/messenger/ChatAtoms";

// Re-export atoms so existing imports from ChatComponents still work
export { Avatar, TypingIndicator, StoriesBar, ChatList } from "@/components/messenger/ChatAtoms";

// ─── ChatWindow ───────────────────────────────────────────────────────────────

export function ChatWindow({
  chat, onBack, currentUser, onCall, onVideoCall, onChatUpdated, onChatDeleted,
}: {
  chat: Chat;
  onBack: () => void;
  currentUser: User;
  onCall?: (partnerId: number, name: string) => void;
  onVideoCall?: (partnerId: number, name: string) => void;
  onChatUpdated?: (chat: Chat) => void;
  onChatDeleted?: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [showAttach, setShowAttach] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [confirm, setConfirm] = useState<null | { title: string; text: string; danger?: boolean; action: () => void | Promise<void>; }>(null);
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

  const setChatField = async (field: "muted" | "pinned" | "favorite", value: boolean) => {
    onChatUpdated?.({ ...chat, [field]: value });
    try {
      await api("set_chat_setting", { chat_id: chat.id, field, value }, currentUser.id);
    } catch {
      onChatUpdated?.({ ...chat, [field]: !value });
    }
  };

  const handleToggleMute = () => setChatField("muted", !chat.muted);
  const handleTogglePin = () => setChatField("pinned", !chat.pinned);
  const handleToggleFavorite = () => setChatField("favorite", !chat.favorite);

  const handleClearHistory = () => {
    setConfirm({
      title: "Очистить историю?",
      text: "Все сообщения в этом чате будут скрыты у вас. Собеседник продолжит видеть их у себя.",
      danger: true,
      action: async () => {
        await api("clear_history", { chat_id: chat.id }, currentUser.id);
        setMessages([]);
        setLastSince(Math.floor(Date.now() / 1000));
      },
    });
  };

  const handleBlock = () => {
    if (!chat.partner_id) return;
    setConfirm({
      title: "Заблокировать пользователя?",
      text: `${chat.name} больше не сможет писать вам сообщения. Чат скроется из списка.`,
      danger: true,
      action: async () => {
        await api("block_user", { target_user_id: chat.partner_id }, currentUser.id);
        onChatDeleted?.();
        onBack();
      },
    });
  };

  const filteredMessages = searchQuery.trim()
    ? messages.filter(m => (m.text || "").toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : messages;

  return (
    <div className="flex flex-col h-full animate-fade-in relative">
      <ChatHeader
        chat={chat}
        onBack={onBack}
        showMenu={showMenu}
        setShowMenu={setShowMenu}
        onCall={onCall}
        onVideoCall={onVideoCall}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        showSearch={showSearch}
        setShowSearch={setShowSearch}
        onToggleMute={handleToggleMute}
        onTogglePin={handleTogglePin}
        onToggleFavorite={handleToggleFavorite}
        onClearHistory={handleClearHistory}
        onBlock={handleBlock}
      />

      {confirm && (
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-6 animate-fade-in" onClick={() => setConfirm(null)}>
          <div className="glass-strong rounded-2xl p-5 max-w-sm w-full animate-scale-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-2">{confirm.title}</h3>
            <p className="text-sm text-muted-foreground mb-4">{confirm.text}</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirm(null)} className="px-4 py-2 rounded-xl hover:bg-white/8 text-sm">
                Отмена
              </button>
              <button
                onClick={async () => { const a = confirm.action; setConfirm(null); await a(); }}
                className={`px-4 py-2 rounded-xl text-sm font-medium ${confirm.danger ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-violet-500/20 text-violet-400 hover:bg-violet-500/30"}`}
              >
                Подтвердить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lock badge */}
      <div className="flex justify-center py-2">
        <div className="flex items-center gap-1.5 px-3 py-1 glass rounded-full">
          <Icon name="Lock" size={11} className="text-violet-400" />
          <span className="text-[11px] text-muted-foreground">Сквозное шифрование</span>
        </div>
      </div>

      {ctxMenu && (
        <ContextMenu
          ctxMenu={ctxMenu}
          messages={messages}
          onClose={() => { setCtxMenu(null); setShowReactionPicker(null); }}
          onReact={addReaction}
          onDelete={deleteMessage}
        />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5" onClick={() => { setShowMenu(false); setShowReactionPicker(null); }}>
        {(() => {
          const mediaGallery: MediaItem[] = messages
            .filter(m => (m.media_type === "image" || m.media_type === "video") && (m.media_url || m.image_url))
            .map(m => ({ url: (m.media_url || m.image_url)!, type: m.media_type === "video" ? "video" as const : "image" as const }));

          return filteredMessages.map((msg, i) => {
            const isMedia = (msg.media_type === "image" || msg.media_type === "video") && (msg.media_url || msg.image_url);
            const galleryIndex = isMedia
              ? mediaGallery.findIndex(g => g.url === (msg.media_url || msg.image_url))
              : 0;

            return (
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
                  {(msg.media_url || msg.image_url) && (
                    <div className="p-1.5">
                      <MediaMessage msg={msg} gallery={mediaGallery} galleryIndex={galleryIndex} out={msg.out} />
                    </div>
                  )}
                  {msg.text && msg.text !== "📷 Фото" && msg.text !== "🎥 Видео" && msg.text !== "🎵 Голосовое" && !msg.text.startsWith("📎") && (
                    <p className="px-4 py-2.5">{msg.text}</p>
                  )}
                  <div className={`flex items-center gap-1 px-4 pb-2 pt-1 ${msg.out ? "justify-end" : "justify-start"}`}>
                    <span className={`text-[10px] ${msg.out ? "text-white/60" : "text-muted-foreground"}`}>{msg.time}</span>
                    {msg.out && (
                      <Icon name={msg.read ? "CheckCheck" : "Check"} size={12} className={msg.read ? "text-sky-300" : "text-white/50"} />
                    )}
                  </div>
                </div>
                {(msg.reactions || []).filter(r => r.emoji !== "__removed__").length > 0 && (
                  <ReactionBar
                    reactions={msg.reactions || []}
                    currentUserId={currentUser.id}
                    onReact={(emoji) => addReaction(msg.id, emoji)}
                  />
                )}
              </div>
            );
          });
        })()}
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

      <ChatInput
        input={input}
        setInput={setInput}
        showAttach={showAttach}
        setShowAttach={setShowAttach}
        uploading={uploading}
        uploadLabel={uploadLabel}
        recording={recording}
        recordSec={recordSec}
        fileInputRef={fileInputRef}
        onSend={send}
        onNotifyTyping={notifyTyping}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        onFileChange={sendFile}
      />
    </div>
  );
}