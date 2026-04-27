import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Avatar, TypingIndicator } from "./types";
import type { Chat, Message, IconName } from "./types";
import { MESSAGES } from "./types";

export default function ChatWindow({ chat, onBack }: { chat: Chat; onBack: () => void }) {
  const [messages, setMessages] = useState<Message[]>(MESSAGES);
  const [input, setInput] = useState("");
  const [showAttach, setShowAttach] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = () => {
    if (!input.trim()) return;
    const now = new Date();
    const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
    setMessages(m => [...m, { id: Date.now(), text: input.trim(), time, out: true, read: false }]);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 glass-strong border-b border-white/5">
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
          <button className="p-2 rounded-xl hover:bg-white/8 transition-colors text-muted-foreground hover:text-foreground">
            <Icon name="Phone" size={18} />
          </button>
          <button className="p-2 rounded-xl hover:bg-white/8 transition-colors text-muted-foreground hover:text-foreground">
            <Icon name="Video" size={18} />
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5">
        {messages.map((msg, i) => (
          <div key={msg.id} className={`flex ${msg.out ? "justify-end" : "justify-start"} animate-fade-in`} style={{ animationDelay: `${i * 0.04}s` }}>
            <div className={`max-w-[72%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
              msg.out
                ? "msg-bubble-out text-white rounded-tr-sm"
                : "msg-bubble-in text-foreground rounded-tl-sm"
            }`}>
              <p>{msg.text}</p>
              <div className={`flex items-center gap-1 mt-1 ${msg.out ? "justify-end" : "justify-start"}`}>
                <span className={`text-[10px] ${msg.out ? "text-white/60" : "text-muted-foreground"}`}>{msg.time}</span>
                {msg.out && (
                  <Icon name={msg.read ? "CheckCheck" : "Check"} size={12} className={msg.read ? "text-sky-300" : "text-white/50"} />
                )}
              </div>
            </div>
          </div>
        ))}
        {chat.typing && (
          <div className="flex justify-start">
            <div className="msg-bubble-in rounded-2xl rounded-tl-sm">
              <TypingIndicator />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 glass-strong border-t border-white/5">
        {showAttach && (
          <div className="flex gap-2 mb-3 animate-fade-in">
            {[
              { icon: "Image", label: "Фото", color: "text-violet-400" },
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
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Сообщение..."
              rows={1}
              className="flex-1 bg-transparent outline-none resize-none text-sm text-foreground placeholder-muted-foreground max-h-32"
              style={{ lineHeight: "1.5" }}
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
