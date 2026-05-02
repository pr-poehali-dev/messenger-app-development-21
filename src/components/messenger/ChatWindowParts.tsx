import { useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { type Chat, type Message, type User, type IconName } from "@/lib/api";
import { Avatar } from "@/components/messenger/ChatAtoms";
import { QUICK_REACTIONS } from "@/components/messenger/ChatMediaMessage";
import EmojiStickerPicker from "@/components/messenger/EmojiStickerPicker";

// ─── ChatHeader ───────────────────────────────────────────────────────────────

export function ChatHeader({
  chat,
  onBack,
  showMenu,
  setShowMenu,
  onCall,
  onVideoCall,
  searchQuery,
  setSearchQuery,
  showSearch,
  setShowSearch,
  onToggleMute,
  onTogglePin,
  onToggleFavorite,
  onClearHistory,
  onBlock,
  onToggleArchive,
}: {
  chat: Chat;
  onBack: () => void;
  showMenu: boolean;
  setShowMenu: (v: boolean | ((prev: boolean) => boolean)) => void;
  onCall?: (partnerId: number, name: string) => void;
  onVideoCall?: (partnerId: number, name: string) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  showSearch: boolean;
  setShowSearch: (v: boolean) => void;
  onToggleMute: () => void;
  onTogglePin: () => void;
  onToggleFavorite: () => void;
  onClearHistory: () => void;
  onBlock: () => void;
  onToggleArchive: () => void;
}) {
  const headerHoldTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startHeaderHold = () => {
    if (headerHoldTimer.current) clearTimeout(headerHoldTimer.current);
    headerHoldTimer.current = setTimeout(() => setShowMenu(true), 450);
  };
  const cancelHeaderHold = () => {
    if (headerHoldTimer.current) { clearTimeout(headerHoldTimer.current); headerHoldTimer.current = null; }
  };

  if (showSearch) {
    return (
      <div className="flex items-center gap-2 px-3 glass-strong border-b border-white/5" style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top))", paddingBottom: "0.75rem" }}>
        <button
          onClick={() => { setShowSearch(false); setSearchQuery(""); }}
          className="p-2 rounded-xl hover:bg-white/8 transition-colors"
        >
          <Icon name="ChevronLeft" size={20} />
        </button>
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5">
          <Icon name="Search" size={16} className="text-muted-foreground" />
          <input
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по чату..."
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-muted-foreground hover:text-foreground">
              <Icon name="X" size={14} />
            </button>
          )}
        </div>
      </div>
    );
  }

  const menuItems: Array<{ icon: IconName; label: string; red?: boolean; active?: boolean; onClick: () => void }> = [
    { icon: "Search", label: "Поиск по чату", onClick: () => setShowSearch(true) },
    { icon: chat.muted ? "BellOff" : "Bell", label: chat.muted ? "Включить уведомления" : "Отключить уведомления", active: chat.muted, onClick: onToggleMute },
    { icon: "Pin", label: chat.pinned ? "Открепить" : "Закрепить", active: chat.pinned, onClick: onTogglePin },
    { icon: "Star", label: chat.favorite ? "Убрать из избранного" : "В избранное", active: chat.favorite, onClick: onToggleFavorite },
    { icon: "Archive", label: chat.archived ? "Из архива" : "В архив", active: chat.archived, onClick: onToggleArchive },
    { icon: "Trash2", label: "Очистить историю", red: true, onClick: onClearHistory },
    { icon: "Ban", label: "Заблокировать", red: true, onClick: onBlock },
  ];

  return (
    <div className="flex items-center gap-3 px-4 glass-strong border-b border-white/5 relative" style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top))", paddingBottom: "0.75rem" }}>
      <button onClick={onBack} className="md:hidden p-2 rounded-xl hover:bg-white/8 transition-colors">
        <Icon name="ChevronLeft" size={20} />
      </button>
      <div
        className="flex-1 flex items-center gap-3 min-w-0 select-none cursor-pointer"
        onMouseDown={startHeaderHold}
        onMouseUp={cancelHeaderHold}
        onMouseLeave={cancelHeaderHold}
        onTouchStart={startHeaderHold}
        onTouchEnd={cancelHeaderHold}
        onTouchCancel={cancelHeaderHold}
        onContextMenu={(e) => { e.preventDefault(); setShowMenu(true); }}
      >
        <Avatar label={chat.avatar} id={chat.id} size="md" online={chat.online} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground truncate">{chat.name}</span>
            {chat.muted && <Icon name="BellOff" size={12} className="text-muted-foreground flex-shrink-0" />}
            {chat.pinned && <Icon name="Pin" size={12} className="text-violet-400 flex-shrink-0" />}
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
      </div>
      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-3 top-[calc(env(safe-area-inset-top)+3.5rem)] z-50 glass-strong rounded-2xl overflow-hidden shadow-xl min-w-[230px] animate-scale-in">
            {menuItems.map(item => (
              <button
                key={item.label}
                onClick={() => { setShowMenu(false); item.onClick(); }}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/8 transition-colors text-sm ${item.red ? "text-red-400 hover:bg-red-500/10" : ""} ${item.active ? "text-violet-400" : ""}`}
              >
                <Icon name={item.icon} size={16} className={item.red ? "text-red-400" : item.active ? "text-violet-400" : "text-muted-foreground"} />
                <span className="text-left flex-1">{item.label}</span>
                {item.active && <Icon name="Check" size={14} className="text-violet-400" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── ContextMenu ──────────────────────────────────────────────────────────────

export function ContextMenu({
  ctxMenu,
  messages,
  onClose,
  onReact,
  onDelete,
  onReply,
  onForward,
  onEdit,
  onPin,
  isPinned,
}: {
  ctxMenu: { msgId: number; out: boolean };
  messages: Message[];
  onClose: () => void;
  onReact: (msgId: number, emoji: string) => void;
  onDelete: (msgId: number) => void;
  onReply: (msgId: number) => void;
  onForward: (msgId: number) => void;
  onEdit: (msgId: number) => void;
  onPin: (msgId: number) => void;
  isPinned: boolean;
}) {
  const msg = messages.find(m => m.id === ctxMenu.msgId);
  const canEdit = ctxMenu.out && msg && (!msg.media_type || msg.media_type === "image") && msg.text && !msg.text.startsWith("📷") && !msg.text.startsWith("🎥") && !msg.text.startsWith("🎵") && !msg.text.startsWith("📎");
  const [showFullPicker, setShowFullPicker] = useState(false);

  const FULL_EMOJI = ["😀","😂","🥰","😍","😎","🤔","😢","😭","😡","🤯","🥳","😴","🤝","🙏","👍","👎","👏","🔥","💯","✨","⭐","💪","💔","❤️","💜","💙","💚","💛","🧡","🤍","🖤","🎉","🎊","🎁","🚀","💩","🤡","👻","🌚","🌝","☀️","🌈","💎","🏆","🥇","🍕","☕","🍷"];

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in"
      onClick={onClose}
    >
      <div className="glass-strong rounded-2xl overflow-hidden shadow-xl min-w-[220px] max-w-[320px] animate-scale-in" onClick={e => e.stopPropagation()}>
        {showFullPicker ? (
          <div className="p-3 border-b border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground">Выбери эмодзи</span>
              <button onClick={() => setShowFullPicker(false)} className="p-1 rounded-lg hover:bg-white/10">
                <Icon name="X" size={14} className="text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
              {FULL_EMOJI.map((e) => (
                <button
                  key={e}
                  onClick={() => onReact(ctxMenu.msgId, e)}
                  className="text-xl p-1 rounded-lg hover:bg-white/10 hover:scale-110 transition-all"
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1 px-3 py-3 border-b border-white/5">
            {QUICK_REACTIONS.map(emoji => (
              <button
                key={emoji}
                onClick={() => onReact(ctxMenu.msgId, emoji)}
                className="text-xl p-1 hover:scale-125 transition-transform"
              >
                {emoji}
              </button>
            ))}
            <button
              onClick={() => setShowFullPicker(true)}
              className="ml-1 w-8 h-8 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center transition-colors"
            >
              <Icon name="Plus" size={16} className="text-muted-foreground" />
            </button>
          </div>
        )}
        <button
          onClick={() => onReply(ctxMenu.msgId)}
          className="w-full flex items-center gap-3 px-5 py-3 hover:bg-white/8 transition-colors text-sm"
        >
          <Icon name="Reply" size={16} className="text-muted-foreground" />
          Ответить
        </button>
        <button
          onClick={() => onForward(ctxMenu.msgId)}
          className="w-full flex items-center gap-3 px-5 py-3 hover:bg-white/8 transition-colors text-sm"
        >
          <Icon name="Forward" size={16} className="text-muted-foreground" />
          Переслать
        </button>
        {canEdit && (
          <button
            onClick={() => onEdit(ctxMenu.msgId)}
            className="w-full flex items-center gap-3 px-5 py-3 hover:bg-white/8 transition-colors text-sm"
          >
            <Icon name="Pencil" size={16} className="text-muted-foreground" />
            Изменить
          </button>
        )}
        <button
          onClick={() => onPin(ctxMenu.msgId)}
          className="w-full flex items-center gap-3 px-5 py-3 hover:bg-white/8 transition-colors text-sm"
        >
          <Icon name={isPinned ? "PinOff" : "Pin"} size={16} className="text-muted-foreground" />
          {isPinned ? "Открепить" : "Закрепить"}
        </button>
        <button
          onClick={() => {
            if (msg?.text) navigator.clipboard.writeText(msg.text);
            onClose();
          }}
          className="w-full flex items-center gap-3 px-5 py-3 hover:bg-white/8 transition-colors text-sm"
        >
          <Icon name="Copy" size={16} className="text-muted-foreground" />
          Копировать
        </button>
        {ctxMenu.out && (
          <button
            onClick={() => onDelete(ctxMenu.msgId)}
            className="w-full flex items-center gap-3 px-5 py-3 text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium border-t border-white/5"
          >
            <Icon name="Trash2" size={16} />
            Удалить сообщение
          </button>
        )}
      </div>
    </div>
  );
}

// ─── ChatInput ────────────────────────────────────────────────────────────────

export function ChatInput({
  input,
  setInput,
  showAttach,
  setShowAttach,
  uploading,
  uploadLabel,
  recording,
  recordSec,
  fileInputRef,
  onSend,
  onNotifyTyping,
  onStartRecording,
  onStopRecording,
  onFileChange,
  onVideoCircle,
  replyTo,
  onCancelReply,
  editing,
  onCancelEdit,
}: {
  input: string;
  setInput: (v: string) => void;
  showAttach: boolean;
  setShowAttach: (v: boolean | ((prev: boolean) => boolean)) => void;
  uploading: boolean;
  uploadLabel: string;
  recording: boolean;
  recordSec: number;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onSend: () => void;
  onNotifyTyping: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onFileChange: (file: File) => void;
  onVideoCircle?: () => void;
  replyTo?: Message | null;
  onCancelReply?: () => void;
  editing?: Message | null;
  onCancelEdit?: () => void;
}) {
  const [showEmoji, setShowEmoji] = useState(false);
  return (
    <div className="px-4 py-3 glass-strong border-t border-white/5 relative" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFileChange(f); e.target.value = ""; }}
      />
      {(replyTo || editing) && (
        <div className="flex items-center gap-3 mb-2 px-3 py-2 glass rounded-xl animate-fade-in border-l-2 border-violet-400">
          <Icon name={editing ? "Pencil" : "Reply"} size={16} className="text-violet-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-violet-400 font-medium">
              {editing ? "Редактирование" : `Ответ ${replyTo?.sender_name || ""}`}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {(editing?.text || replyTo?.text || "[медиа]").slice(0, 80)}
            </div>
          </div>
          <button
            onClick={() => { onCancelReply?.(); onCancelEdit?.(); }}
            className="p-1 rounded-lg hover:bg-white/8 text-muted-foreground hover:text-foreground"
          >
            <Icon name="X" size={16} />
          </button>
        </div>
      )}
      {showAttach && (
        <div className="grid grid-cols-5 gap-2 mb-3 animate-fade-in">
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
          {onVideoCircle && (
            <button
              onClick={onVideoCircle}
              className="flex flex-col items-center gap-1 p-3 glass rounded-2xl hover:bg-white/8 transition-colors"
            >
              <Icon name="Video" size={20} className="text-rose-400" />
              <span className="text-[10px] text-muted-foreground">Кружок</span>
            </button>
          )}
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
          <button onClick={onStopRecording} className="ml-auto text-xs text-muted-foreground hover:text-red-400">
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
            onChange={e => { setInput(e.target.value); onNotifyTyping(); }}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
            placeholder="Сообщение..."
            rows={1}
            className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder-muted-foreground resize-none max-h-32"
          />
          <div className="relative">
            <button
              onClick={() => setShowEmoji(v => !v)}
              className={`transition-colors ${showEmoji ? "text-violet-400" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Icon name="Smile" size={20} />
            </button>
            <EmojiStickerPicker
              open={showEmoji}
              onClose={() => setShowEmoji(false)}
              onPick={(e) => setInput(input + e)}
            />
          </div>
        </div>
        {input.trim() ? (
          <button
            onClick={onSend}
            className="p-2.5 rounded-xl transition-all grad-primary text-white glow-primary animate-scale-in"
          >
            <Icon name="Send" size={20} />
          </button>
        ) : (
          <button
            onMouseDown={onStartRecording}
            onMouseUp={onStopRecording}
            onTouchStart={onStartRecording}
            onTouchEnd={onStopRecording}
            className={`p-2.5 rounded-xl transition-all ${recording ? "bg-red-500 text-white" : "glass text-muted-foreground hover:text-violet-400"}`}
          >
            <Icon name="Mic" size={20} />
          </button>
        )}
      </div>
    </div>
  );
}