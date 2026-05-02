import { useState, useRef, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { api, uploadMedia, type Chat, type Message, type Reaction, type User } from "@/lib/api";
import { playMessageSound } from "@/lib/sounds";
import { MediaMessage, ReactionBar } from "@/components/messenger/ChatMediaMessage";
import { type MediaItem } from "@/components/messenger/MediaViewer";
import { ChatHeader, ContextMenu, ChatInput } from "@/components/messenger/ChatWindowParts";
import { TypingIndicator } from "@/components/messenger/ChatAtoms";
import { SwipeableMessage } from "@/components/messenger/SwipeableMessage";
import { formatDateLabel, dayKey } from "@/components/messenger/dateGroup";
import { LinkifiedText, extractFirstUrl, getDomain } from "@/components/messenger/LinkifiedText";

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
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [forwardMsgId, setForwardMsgId] = useState<number | null>(null);
  const [pinnedMsg, setPinnedMsg] = useState<{ id: number; sender_name: string; text: string; media_type?: string } | null>(null);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
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
        id: number; text: string; created_at: number; sender_id: number; sender_name?: string; read_at?: number;
        image_url?: string; media_type?: string; media_url?: string;
        file_name?: string; file_size?: number; duration?: number;
        reactions?: Reaction[];
        reply_to?: { id: number; sender_name: string; text: string; media_type?: string } | null;
        forwarded_from_user_id?: number | null;
        forwarded_from_name?: string | null;
        edited_at?: number | null;
      }) => ({
        id: m.id,
        text: m.text,
        time: new Date(m.created_at * 1000).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" }),
        out: m.sender_id === currentUser.id,
        read: !!m.read_at,
        sender_id: m.sender_id,
        sender_name: m.sender_name,
        created_at: m.created_at,
        image_url: m.image_url,
        media_type: m.media_type as Message["media_type"],
        media_url: m.media_url,
        file_name: m.file_name,
        file_size: m.file_size,
        duration: m.duration,
        reactions: m.reactions || [],
        reply_to: m.reply_to || null,
        forwarded_from_user_id: m.forwarded_from_user_id || null,
        forwarded_from_name: m.forwarded_from_name || null,
        edited_at: m.edited_at || null,
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
    const container = messagesScrollRef.current;
    if (!container) return;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    // если близко к низу — авто-скроллим
    if (distanceFromBottom < 120) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
      setNewCount(0);
    } else {
      // считаем непрочитанные «новые входящие»
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && !lastMsg.out) {
        setNewCount((n) => n + 1);
      }
    }
  }, [messages, isTyping]);

  const handleMessagesScroll = () => {
    const container = messagesScrollRef.current;
    if (!container) return;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    setShowScrollDown(distanceFromBottom > 200);
    if (distanceFromBottom < 50) setNewCount(0);
  };

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
    setNewCount(0);
  };

  const notifyTyping = () => {
    api("set_typing", { chat_id: chat.id }, currentUser.id);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {}, 3000);
  };

  const send = async () => {
    if (!input.trim()) return;
    const text = input.trim();
    setInput("");

    // edit-режим
    if (editing) {
      const editId = editing.id;
      setEditing(null);
      await api("edit_message", { message_id: editId, text }, currentUser.id);
      setMessages(prev => prev.map(m => m.id === editId ? { ...m, text, edited_at: Math.floor(Date.now() / 1000) } : m));
      return;
    }

    const replyId = replyTo?.id;
    const replyPreview = replyTo ? { id: replyTo.id, sender_name: replyTo.sender_name || (replyTo.out ? "Вы" : chat.name), text: replyTo.text, media_type: replyTo.media_type } : null;
    setReplyTo(null);

    const data = await api("send_message", {
      chat_id: chat.id,
      text,
      reply_to_id: replyId,
    }, currentUser.id);
    if (data.id) {
      const timeStr = new Date(data.created_at * 1000).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
      setMessages(prev => [...prev, { id: data.id, text, time: timeStr, out: true, created_at: data.created_at, reactions: [], reply_to: replyPreview }]);
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

  // ── Reply / Forward / Edit / Pin ──
  const handleReply = (msgId: number) => {
    const m = messages.find(x => x.id === msgId);
    if (m) {
      setReplyTo({ ...m, sender_name: m.out ? "Вы" : (m.sender_name || chat.name) });
      setEditing(null);
      setCtxMenu(null);
    }
  };

  const handleEdit = (msgId: number) => {
    const m = messages.find(x => x.id === msgId);
    if (m) {
      setEditing(m);
      setReplyTo(null);
      setInput(m.text);
      setCtxMenu(null);
    }
  };

  const handleForward = (msgId: number) => {
    setForwardMsgId(msgId);
    setCtxMenu(null);
  };

  const handlePinToggle = async (msgId: number) => {
    setCtxMenu(null);
    if (pinnedMsg?.id === msgId) {
      setPinnedMsg(null);
      await api("unpin_message", { chat_id: chat.id }, currentUser.id);
    } else {
      const m = messages.find(x => x.id === msgId);
      if (m) {
        setPinnedMsg({ id: m.id, sender_name: m.out ? "Вы" : (m.sender_name || chat.name), text: m.text, media_type: m.media_type });
      }
      await api("pin_message", { chat_id: chat.id, message_id: msgId }, currentUser.id);
    }
  };

  const scrollToMessage = (msgId: number) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightId(msgId);
      setTimeout(() => setHighlightId(null), 1500);
    }
  };

  // Загружаем pinned при смене чата
  useEffect(() => {
    let cancel = false;
    api("get_pinned_message", { chat_id: chat.id }, currentUser.id).then(data => {
      if (cancel) return;
      setPinnedMsg(data.pinned || null);
    });
    return () => { cancel = true; };
  }, [chat.id, currentUser.id]);

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

  const handleToggleArchive = async () => {
    const next = !chat.archived;
    await api("archive_chat", { chat_id: chat.id, archived: next }, currentUser.id);
    onChatDeleted?.();
    onBack();
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
        onToggleArchive={handleToggleArchive}
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
          onReply={handleReply}
          onForward={handleForward}
          onEdit={handleEdit}
          onPin={handlePinToggle}
          isPinned={pinnedMsg?.id === ctxMenu.msgId}
        />
      )}

      {/* Pinned message bar */}
      {pinnedMsg && (
        <button
          onClick={() => scrollToMessage(pinnedMsg.id)}
          className="flex items-center gap-3 px-4 py-2 glass border-b border-white/5 w-full text-left hover:bg-white/5 transition-colors"
        >
          <Icon name="Pin" size={14} className="text-violet-400 flex-shrink-0" />
          <div className="flex-1 min-w-0 border-l-2 border-violet-400 pl-3">
            <div className="text-[11px] text-violet-400 font-medium">Закреплённое сообщение</div>
            <div className="text-xs text-muted-foreground truncate">
              {pinnedMsg.text || (pinnedMsg.media_type === "image" ? "📷 Фото" : pinnedMsg.media_type === "video" ? "🎥 Видео" : "[медиа]")}
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); handlePinToggle(pinnedMsg.id); }}
            className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground"
          >
            <Icon name="X" size={14} />
          </button>
        </button>
      )}

      {/* Messages */}
      <div
        ref={messagesScrollRef}
        onScroll={handleMessagesScroll}
        className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5 relative"
        onClick={() => { setShowMenu(false); setShowReactionPicker(null); }}
      >
        {(() => {
          const mediaGallery: MediaItem[] = messages
            .filter(m => (m.media_type === "image" || m.media_type === "video") && (m.media_url || m.image_url))
            .map(m => ({ url: (m.media_url || m.image_url)!, type: m.media_type === "video" ? "video" as const : "image" as const }));

          let prevDayKey = "";
          const nodes: JSX.Element[] = [];

          filteredMessages.forEach((msg, i) => {
            const isMedia = (msg.media_type === "image" || msg.media_type === "video") && (msg.media_url || msg.image_url);
            const galleryIndex = isMedia
              ? mediaGallery.findIndex(g => g.url === (msg.media_url || msg.image_url))
              : 0;

            // Date separator
            const ts = msg.created_at || 0;
            const k = dayKey(ts);
            if (ts && k !== prevDayKey) {
              prevDayKey = k;
              nodes.push(
                <div key={`d-${k}-${msg.id}`} className="flex justify-center my-3">
                  <div className="px-3 py-1 glass rounded-full text-[11px] text-muted-foreground capitalize">
                    {formatDateLabel(ts)}
                  </div>
                </div>
              );
            }

            const url = msg.text ? extractFirstUrl(msg.text) : null;
            const showText = msg.text && msg.text !== "📷 Фото" && msg.text !== "🎥 Видео" && msg.text !== "🎵 Голосовое" && !msg.text.startsWith("📎");

            nodes.push(
              <SwipeableMessage key={msg.id} out={msg.out} onReply={() => handleReply(msg.id)}>
                <div
                  id={`msg-${msg.id}`}
                  className={`flex flex-col ${msg.out ? "items-end" : "items-start"} animate-fade-in transition-all ${highlightId === msg.id ? "scale-[1.02]" : ""}`}
                  style={{ animationDelay: `${Math.min(i, 10) * 0.03}s` }}
                >
                  <div
                    className={`max-w-[72%] rounded-2xl text-sm leading-relaxed overflow-hidden select-none transition-shadow ${
                      msg.out
                        ? "msg-bubble-out text-white rounded-tr-sm"
                        : "msg-bubble-in text-foreground rounded-tl-sm"
                    } ${highlightId === msg.id ? "ring-2 ring-violet-400" : ""}`}
                    onMouseDown={() => startHold(msg.id, msg.out)}
                    onMouseUp={cancelHold}
                    onMouseLeave={cancelHold}
                    onContextMenu={e => { e.preventDefault(); setCtxMenu({ msgId: msg.id, out: msg.out }); }}
                  >
                    {msg.forwarded_from_name && (
                      <div className={`px-4 pt-2 pb-0.5 text-[11px] font-medium ${msg.out ? "text-white/80" : "text-violet-400"} flex items-center gap-1`}>
                        <Icon name="Forward" size={11} />
                        Переслано от {msg.forwarded_from_name}
                      </div>
                    )}
                    {msg.reply_to && (
                      <button
                        onClick={(e) => { e.stopPropagation(); scrollToMessage(msg.reply_to!.id); }}
                        className={`block w-full text-left mx-1 mt-1 px-3 py-1.5 rounded-lg border-l-2 ${msg.out ? "bg-white/15 border-white" : "bg-violet-500/15 border-violet-400"}`}
                      >
                        <div className={`text-[11px] font-medium ${msg.out ? "text-white" : "text-violet-400"}`}>
                          {msg.reply_to.sender_name}
                        </div>
                        <div className={`text-xs truncate ${msg.out ? "text-white/80" : "text-muted-foreground"}`}>
                          {msg.reply_to.text || (msg.reply_to.media_type === "image" ? "📷 Фото" : msg.reply_to.media_type === "video" ? "🎥 Видео" : "[медиа]")}
                        </div>
                      </button>
                    )}
                    {(msg.media_url || msg.image_url) && (
                      <div className="p-1.5">
                        <MediaMessage msg={msg} gallery={mediaGallery} galleryIndex={galleryIndex} out={msg.out} />
                      </div>
                    )}
                    {showText && (
                      <p className="px-4 py-2.5 whitespace-pre-wrap break-words">
                        <LinkifiedText text={msg.text} out={msg.out} />
                      </p>
                    )}
                    {url && showText && (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className={`block mx-3 mb-2 px-3 py-2 rounded-lg border-l-2 ${msg.out ? "bg-white/10 border-white/60" : "bg-white/5 border-violet-400"} hover:opacity-90 transition-opacity`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon name="Link" size={12} className={msg.out ? "text-white/80" : "text-violet-400"} />
                          <span className={`text-[11px] font-medium ${msg.out ? "text-white" : "text-violet-400"}`}>
                            {getDomain(url)}
                          </span>
                        </div>
                        <div className={`text-xs mt-0.5 truncate ${msg.out ? "text-white/80" : "text-muted-foreground"}`}>
                          {url}
                        </div>
                      </a>
                    )}
                    <div className={`flex items-center gap-1 px-4 pb-2 pt-1 ${msg.out ? "justify-end" : "justify-start"}`}>
                      {msg.edited_at && (
                        <span className={`text-[10px] italic ${msg.out ? "text-white/60" : "text-muted-foreground"}`}>изменено</span>
                      )}
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
              </SwipeableMessage>
            );
          });

          return nodes;
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

      {showScrollDown && (
        <button
          onClick={scrollToBottom}
          className="absolute right-4 bottom-24 z-20 w-11 h-11 rounded-full glass-strong flex items-center justify-center shadow-lg hover:bg-white/10 transition-all animate-fade-in"
        >
          <Icon name="ChevronDown" size={20} className="text-foreground" />
          {newCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 grad-primary rounded-full text-[10px] font-bold text-white flex items-center justify-center">
              {newCount > 99 ? "99+" : newCount}
            </span>
          )}
        </button>
      )}

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
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        editing={editing}
        onCancelEdit={() => { setEditing(null); setInput(""); }}
      />

      {/* Forward dialog */}
      {forwardMsgId !== null && (
        <ForwardDialog
          messageId={forwardMsgId}
          currentUser={currentUser}
          currentChatId={chat.id}
          onClose={() => setForwardMsgId(null)}
        />
      )}
    </div>
  );
}

// ─── ForwardDialog ────────────────────────────────────────────────────────────

function ForwardDialog({
  messageId,
  currentUser,
  currentChatId,
  onClose,
}: {
  messageId: number;
  currentUser: User;
  currentChatId: number;
  onClose: () => void;
}) {
  const [chats, setChats] = useState<Array<{ id: number; name: string; avatar: string }>>([]);
  const [query, setQuery] = useState("");
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<number | null>(null);

  useEffect(() => {
    api("get_chats", {}, currentUser.id).then((data) => {
      if (data.chats) {
        setChats(data.chats
          .filter((c: { id: number }) => c.id !== currentChatId)
          .map((c: { id: number; partner: { name: string } }) => ({
            id: c.id,
            name: c.partner.name,
            avatar: c.partner.name[0]?.toUpperCase() || "?",
          })));
      }
    });
  }, [currentUser.id, currentChatId]);

  const filtered = query.trim()
    ? chats.filter(c => c.name.toLowerCase().includes(query.trim().toLowerCase()))
    : chats;

  const send = async (chatId: number) => {
    setSending(true);
    await api("forward_message", { message_id: messageId, target_chat_id: chatId }, currentUser.id);
    setSentTo(chatId);
    setTimeout(onClose, 600);
  };

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/60 flex items-end md:items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      <div
        className="glass-strong rounded-t-3xl md:rounded-3xl w-full max-w-md max-h-[80vh] flex flex-col animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h3 className="font-semibold">Переслать в чат</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/8 text-muted-foreground">
            <Icon name="X" size={18} />
          </button>
        </div>
        <div className="px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5">
            <Icon name="Search" size={16} className="text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Поиск чата..."
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {filtered.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8">Нет чатов</div>
          )}
          {filtered.map(c => (
            <button
              key={c.id}
              disabled={sending}
              onClick={() => send(c.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/8 transition-colors disabled:opacity-50 ${sentTo === c.id ? "bg-emerald-500/10" : ""}`}
            >
              <div className="w-10 h-10 rounded-full grad-primary flex items-center justify-center font-semibold text-white">
                {c.avatar}
              </div>
              <span className="flex-1 text-left font-medium">{c.name}</span>
              {sentTo === c.id && <Icon name="Check" size={18} className="text-emerald-400" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}