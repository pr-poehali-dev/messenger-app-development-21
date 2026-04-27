import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";

type IconName = string;

// ─── Types ───────────────────────────────────────────────────────────────────

type View = "chats" | "stories" | "search" | "profile" | "settings";
type Tab = "chats" | "stories" | "contacts";

interface Message {
  id: number;
  text: string;
  time: string;
  out: boolean;
  read?: boolean;
  file?: { name: string; size: string };
}

interface Chat {
  id: number;
  name: string;
  avatar: string;
  lastMsg: string;
  time: string;
  unread?: number;
  online?: boolean;
  typing?: boolean;
  verified?: boolean;
  group?: boolean;
  pinned?: boolean;
}

interface Story {
  id: number;
  name: string;
  avatar: string;
  seen: boolean;
  gradient: string;
}

// ─── Data ────────────────────────────────────────────────────────────────────

const STORIES: Story[] = [
  { id: 0, name: "Моя", avatar: "Я", seen: false, gradient: "from-violet-600 to-indigo-500" },
  { id: 1, name: "Алина", avatar: "А", seen: false, gradient: "from-pink-500 to-rose-400" },
  { id: 2, name: "Максим", avatar: "М", seen: false, gradient: "from-cyan-500 to-blue-500" },
  { id: 3, name: "Катя", avatar: "К", seen: true, gradient: "from-amber-400 to-orange-500" },
  { id: 4, name: "Дима", avatar: "Д", seen: true, gradient: "from-emerald-400 to-teal-500" },
  { id: 5, name: "Юля", avatar: "Ю", seen: true, gradient: "from-violet-400 to-purple-600" },
];

const CHATS: Chat[] = [
  { id: 1, name: "Алина Соколова", avatar: "А", lastMsg: "Окей, завтра созвонимся 🎉", time: "сейчас", unread: 3, online: true, typing: true, verified: false, pinned: true },
  { id: 2, name: "Команда дизайн", avatar: "Т", lastMsg: "Макеты готовы, проверяй", time: "14:22", unread: 7, group: true, pinned: true },
  { id: 3, name: "Максим Кузнецов", avatar: "М", lastMsg: "Ты смотрел новый фильм?", time: "13:05", online: true },
  { id: 4, name: "Екатерина Л.", avatar: "Е", lastMsg: "Спасибо за помощь!", time: "вчера", unread: 1 },
  { id: 5, name: "Дмитрий Волков", avatar: "Д", lastMsg: "Встреча в 18:00, не забудь", time: "вчера" },
  { id: 6, name: "Маркетинг 🚀", avatar: "М", lastMsg: "Новая стратегия утверждена", time: "пн", group: true },
  { id: 7, name: "Юлия Попова", avatar: "Ю", lastMsg: "Привет! Как дела?", time: "вс", online: false },
  { id: 8, name: "Иван Смирнов", avatar: "И", lastMsg: "Документы отправил", time: "сб" },
];

const MESSAGES: Message[] = [
  { id: 1, text: "Привет! Как дела? 👋", time: "13:00", out: false },
  { id: 2, text: "Отлично! Работаю над новым проектом. Скоро покажу результаты 🚀", time: "13:01", out: true, read: true },
  { id: 3, text: "Звучит круто! Что за проект?", time: "13:02", out: false },
  { id: 4, text: "Мессенджер с крутым дизайном и шифрованием. Хочу сделать что-то особенное 💜", time: "13:03", out: true, read: true },
  { id: 5, text: "Вау, это звучит серьёзно! Покажешь когда будет готово?", time: "13:10", out: false },
  { id: 6, text: "Конечно! Ты будешь одной из первых тестировщиков 😉", time: "13:11", out: true, read: true },
  { id: 7, text: "Окей, завтра созвонимся 🎉", time: "сейчас", out: false },
];

const CONTACTS = [
  { id: 1, name: "Алина Соколова", avatar: "А", status: "Онлайн", online: true },
  { id: 2, name: "Дмитрий Волков", avatar: "Д", status: "Был(а) 5 мин назад", online: false },
  { id: 3, name: "Екатерина Лебедева", avatar: "Е", status: "Онлайн", online: true },
  { id: 4, name: "Иван Смирнов", avatar: "И", status: "Был(а) час назад", online: false },
  { id: 5, name: "Максим Кузнецов", avatar: "М", status: "Онлайн", online: true },
  { id: 6, name: "Юлия Попова", avatar: "Ю", status: "Был(а) вчера", online: false },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const AVATAR_GRADS = [
  "from-violet-500 to-indigo-500",
  "from-pink-500 to-rose-400",
  "from-cyan-500 to-blue-500",
  "from-amber-400 to-orange-500",
  "from-emerald-400 to-teal-500",
  "from-violet-400 to-purple-600",
  "from-fuchsia-500 to-pink-500",
  "from-sky-400 to-cyan-500",
];

function avatarGrad(id: number) {
  return AVATAR_GRADS[id % AVATAR_GRADS.length];
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Avatar({ label, id, size = "md", online }: { label: string; id: number; size?: "sm" | "md" | "lg" | "xl"; online?: boolean }) {
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

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      <div className="typing-dot w-2 h-2 rounded-full bg-violet-400" />
      <div className="typing-dot w-2 h-2 rounded-full bg-violet-400" />
      <div className="typing-dot w-2 h-2 rounded-full bg-violet-400" />
    </div>
  );
}

// ─── Panels ──────────────────────────────────────────────────────────────────

function StoriesBar({ onView }: { onView: (s: Story) => void }) {
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

function ChatList({ chats, onSelect, selectedId }: { chats: Chat[]; onSelect: (c: Chat) => void; selectedId?: number }) {
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

function ChatWindow({ chat, onBack }: { chat: Chat; onBack: () => void }) {
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

function SearchPanel() {
  const [query, setQuery] = useState("");
  const results = query.length > 0 ? CONTACTS.filter(c => c.name.toLowerCase().includes(query.toLowerCase())) : CONTACTS;

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="px-4 pt-4 pb-3">
        <h2 className="text-xl font-bold mb-3">Поиск</h2>
        <div className="flex items-center gap-3 glass rounded-2xl px-4 py-3">
          <Icon name="Search" size={18} className="text-muted-foreground flex-shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Имя, номер, группа..."
            className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder-muted-foreground"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
              <Icon name="X" size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-1">
        {!query && <div className="text-xs text-muted-foreground px-2 pb-2 uppercase tracking-widest font-semibold">Все контакты</div>}
        {results.map((c, i) => (
          <button key={c.id} className={`w-full flex items-center gap-3 p-3 glass rounded-2xl hover:bg-white/8 transition-all animate-fade-in stagger-${Math.min(i + 1, 5)}`}>
            <Avatar label={c.avatar} id={c.id} online={c.online} />
            <div className="text-left">
              <div className="font-semibold text-sm">{c.name}</div>
              <div className="text-xs text-muted-foreground">{c.status}</div>
            </div>
            <div className="ml-auto">
              <Icon name="MessageCircle" size={18} className="text-violet-400" />
            </div>
          </button>
        ))}
        {query && results.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Icon name="SearchX" size={40} className="mx-auto mb-3 opacity-40" />
            <p>Ничего не найдено</p>
          </div>
        )}
      </div>

      <div className="px-4 py-4">
        <button className="w-full flex items-center justify-center gap-2 py-3 grad-primary rounded-2xl text-white font-semibold glow-primary transition-opacity hover:opacity-90">
          <Icon name="UserPlus" size={18} />
          Добавить контакт
        </button>
      </div>
    </div>
  );
}

function ProfilePanel({ onSettings }: { onSettings: () => void }) {
  return (
    <div className="flex flex-col h-full animate-fade-in overflow-y-auto">
      {/* Hero */}
      <div className="relative px-6 pt-8 pb-6 text-center">
        <div className="relative inline-block mb-4">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-4xl font-bold text-white animate-pulse-glow">
            Я
          </div>
          <button className="absolute bottom-0 right-0 w-8 h-8 grad-primary rounded-full flex items-center justify-center text-white shadow-lg">
            <Icon name="Camera" size={14} />
          </button>
        </div>
        <h2 className="text-2xl font-bold">Алексей Петров</h2>
        <p className="text-muted-foreground text-sm mt-1">+7 (999) 123-45-67</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-emerald-400 text-xs font-medium">В сети</span>
        </div>
        <div className="mt-3 px-4 py-2.5 glass rounded-2xl text-sm text-muted-foreground text-left">
          🚀 Запускаю новые проекты. Люблю технологии и кофе ☕
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 px-4 mb-4">
        {[
          { label: "Контакты", value: "248", icon: "Users" },
          { label: "Медиа", value: "1.2K", icon: "Image" },
          { label: "Группы", value: "14", icon: "Hash" },
        ].map((s, i) => (
          <div key={s.label} className={`glass rounded-2xl p-3 text-center animate-fade-in stagger-${i + 1}`}>
            <Icon name={s.icon as IconName} size={18} className="text-violet-400 mx-auto mb-1" />
            <div className="text-lg font-bold grad-text">{s.value}</div>
            <div className="text-[11px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="px-4 space-y-2 mb-6">
        {[
          { icon: "Edit3", label: "Редактировать профиль", sub: "Имя, фото, статус" },
          { icon: "Bell", label: "Уведомления", sub: "Звуки, вибрация" },
          { icon: "Shield", label: "Конфиденциальность", sub: "Блокировки, кто видит" },
          { icon: "Lock", label: "Шифрование", sub: "Управление ключами E2E" },
          { icon: "Palette", label: "Оформление", sub: "Тема, шрифт, фон" },
        ].map((item, i) => (
          <button
            key={item.icon}
            onClick={item.icon === "Shield" || item.icon === "Lock" ? onSettings : undefined}
            className={`w-full flex items-center gap-3 px-4 py-3 glass rounded-2xl hover:bg-white/8 transition-all animate-fade-in stagger-${Math.min(i + 1, 5)}`}
          >
            <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center">
              <Icon name={item.icon as IconName} size={18} className="text-violet-400" />
            </div>
            <div className="text-left flex-1">
              <div className="text-sm font-medium">{item.label}</div>
              <div className="text-xs text-muted-foreground">{item.sub}</div>
            </div>
            <Icon name="ChevronRight" size={16} className="text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
}

function SettingsPanel() {
  const [e2e, setE2e] = useState(true);
  const [twofa, setTwofa] = useState(false);
  const [biometric, setBiometric] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [msgPreview, setMsgPreview] = useState(false);

  const Toggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
    <button onClick={onToggle} className={`w-12 h-6 rounded-full transition-all duration-300 relative ${on ? "grad-primary" : "bg-white/10"}`}>
      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300 ${on ? "left-6.5" : "left-0.5"}`} style={{ left: on ? "calc(100% - 22px)" : "2px" }} />
    </button>
  );

  return (
    <div className="flex flex-col h-full animate-fade-in overflow-y-auto">
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-xl font-bold mb-1">Безопасность</h2>
        <p className="text-sm text-muted-foreground">Управляйте защитой аккаунта</p>
      </div>

      {/* Encryption card */}
      <div className="mx-4 my-3 p-4 rounded-2xl bg-gradient-to-br from-violet-600/20 to-indigo-600/10 border border-violet-500/20">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
            <Icon name="ShieldCheck" size={20} className="text-violet-400" />
          </div>
          <div>
            <div className="font-semibold text-sm">Сквозное шифрование</div>
            <div className="text-xs text-violet-400">Протокол Signal E2E</div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">Все сообщения шифруются на вашем устройстве. Никто — даже наши серверы — не может их прочитать.</p>
      </div>

      <div className="px-4 space-y-2 pb-6">
        {[
          { icon: "Lock", label: "Сквозное шифрование", sub: "E2E для всех чатов", state: e2e, toggle: () => setE2e(v => !v), badge: "Signal" },
          { icon: "KeyRound", label: "Двухфакторная аутентификация", sub: "Код при входе", state: twofa, toggle: () => setTwofa(v => !v) },
          { icon: "Fingerprint", label: "Биометрия", sub: "Вход по Face ID / Touch ID", state: biometric, toggle: () => setBiometric(v => !v) },
          { icon: "Bell", label: "Уведомления", sub: "Показывать оповещения", state: notifications, toggle: () => setNotifications(v => !v) },
          { icon: "Eye", label: "Предпросмотр сообщений", sub: "Текст в уведомлениях", state: msgPreview, toggle: () => setMsgPreview(v => !v) },
        ].map((item, i) => (
          <div key={item.icon} className={`flex items-center gap-3 px-4 py-3 glass rounded-2xl animate-fade-in stagger-${Math.min(i + 1, 5)}`}>
            <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center flex-shrink-0">
              <Icon name={item.icon as IconName} size={18} className="text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{item.label}</span>
                {item.badge && <span className="text-[9px] bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded-full font-bold">{item.badge}</span>}
              </div>
              <div className="text-xs text-muted-foreground">{item.sub}</div>
            </div>
            <Toggle on={item.state} onToggle={item.toggle} />
          </div>
        ))}

        <button className="w-full flex items-center gap-3 px-4 py-3 glass rounded-2xl hover:bg-white/8 transition-all mt-2">
          <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center">
            <Icon name="LogOut" size={18} className="text-red-400" />
          </div>
          <span className="text-sm font-medium text-red-400">Выйти из аккаунта</span>
          <Icon name="ChevronRight" size={16} className="text-red-400/50 ml-auto" />
        </button>
      </div>
    </div>
  );
}

function StoryViewer({ story, onClose }: { story: Story; onClose: () => void }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setProgress(p => { if (p >= 100) { onClose(); return 100; } return p + 2; }), 60);
    return () => clearInterval(t);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-lg animate-scale-in">
      <div className="relative w-full max-w-sm h-[85vh] rounded-3xl overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${story.gradient}`} />
        <div className="absolute inset-0 flex flex-col p-5">
          <div className="w-full h-1 bg-white/20 rounded-full mb-4">
            <div className="h-full bg-white rounded-full transition-none" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-white">{story.avatar}</div>
            <span className="text-white font-semibold">{story.name}</span>
            <span className="text-white/60 text-sm ml-auto">сейчас</span>
            <button onClick={onClose} className="text-white/80 hover:text-white ml-2">
              <Icon name="X" size={20} />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="text-6xl mb-4">✨</div>
              <p className="text-xl font-bold">История {story.name}</p>
              <p className="text-white/60 mt-2 text-sm">Сегодня · 10 просмотров</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1 glass rounded-2xl px-4 py-3 flex items-center gap-2">
              <input className="flex-1 bg-transparent outline-none text-white text-sm placeholder-white/40" placeholder="Ответить..." />
            </div>
            <button className="w-12 h-12 grad-primary rounded-2xl flex items-center justify-center text-white">
              <Icon name="Send" size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Index() {
  const [activeTab, setActiveTab] = useState<Tab>("chats");
  const [view, setView] = useState<View>("chats");
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingStory, setViewingStory] = useState<Story | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);

  const navItems: { tab: View; icon: string; label: string }[] = [
    { tab: "chats", icon: "MessageCircle", label: "Чаты" },
    { tab: "stories", icon: "Circle", label: "Истории" },
    { tab: "search", icon: "Search", label: "Поиск" },
    { tab: "profile", icon: "User", label: "Профиль" },
    { tab: "settings", icon: "Shield", label: "Безопасность" },
  ];

  const handleSelectChat = (chat: Chat) => {
    setSelectedChat(chat);
    setView("chats");
    setShowSidebar(false);
  };

  const handleBack = () => {
    setShowSidebar(true);
  };

  return (
    <div className="h-screen flex overflow-hidden relative">
      {/* Mesh background */}
      <div className="mesh-bg" />

      {/* Story Viewer */}
      {viewingStory && <StoryViewer story={viewingStory} onClose={() => setViewingStory(null)} />}

      {/* ── Sidebar ── */}
      <aside
        className={`
          flex flex-col w-full md:w-80 lg:w-96 flex-shrink-0
          glass-strong border-r border-white/5
          transition-transform duration-300
          ${showSidebar ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          absolute md:relative inset-0 md:inset-auto z-10
        `}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-4 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 grad-primary rounded-xl flex items-center justify-center glow-primary">
              <Icon name="Zap" size={16} className="text-white" />
            </div>
            <span className="text-lg font-bold grad-text">Волна</span>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-2 rounded-xl hover:bg-white/8 transition-colors text-muted-foreground hover:text-foreground">
              <Icon name="PenSquare" size={18} />
            </button>
            <button className="p-2 rounded-xl hover:bg-white/8 transition-colors text-muted-foreground hover:text-foreground">
              <Icon name="MoreHorizontal" size={18} />
            </button>
          </div>
        </div>

        {/* Tab nav */}
        <div className="flex mx-4 mb-3 glass rounded-2xl p-1">
          {(["chats", "stories", "contacts"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                activeTab === t ? "grad-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {{ chats: "Чаты", stories: "Истории", contacts: "Контакты" }[t]}
            </button>
          ))}
        </div>

        {/* Search bar */}
        <div className="flex items-center gap-2 mx-4 mb-2 glass rounded-2xl px-3 py-2">
          <Icon name="Search" size={15} className="text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Поиск..."
            className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder-muted-foreground"
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === "chats" && (
            <>
              <StoriesBar onView={setViewingStory} />
              <ChatList
                chats={CHATS.filter(c => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()))}
                onSelect={handleSelectChat}
                selectedId={selectedChat?.id}
              />
            </>
          )}
          {activeTab === "stories" && (
            <div className="flex-1 p-4 grid grid-cols-2 gap-3 overflow-y-auto">
              {STORIES.filter(s => s.id !== 0).map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setViewingStory(s)}
                  className={`relative h-40 rounded-2xl overflow-hidden animate-fade-in stagger-${Math.min(i + 1, 5)}`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient}`} />
                  <div className="absolute inset-0 flex flex-col justify-end p-3">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarGrad(s.id)} flex items-center justify-center text-sm font-bold text-white mb-1 ${s.seen ? "opacity-60" : "ring-2 ring-white"}`}>
                      {s.avatar}
                    </div>
                    <span className="text-white text-xs font-semibold">{s.name}</span>
                    <span className="text-white/60 text-[10px]">{s.seen ? "Просмотрено" : "Новая"}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
          {activeTab === "contacts" && (
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
              {CONTACTS.map((c, i) => (
                <button key={c.id} onClick={() => handleSelectChat({ id: c.id, name: c.name, avatar: c.avatar, lastMsg: "", time: "", online: c.online })} className={`w-full flex items-center gap-3 p-3 glass rounded-2xl hover:bg-white/8 transition-all animate-fade-in stagger-${Math.min(i + 1, 5)}`}>
                  <Avatar label={c.avatar} id={c.id} online={c.online} />
                  <div className="text-left">
                    <div className="text-sm font-semibold">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.status}</div>
                  </div>
                  <Icon name="ChevronRight" size={15} className="text-muted-foreground ml-auto" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Bottom nav */}
        <div className="flex items-center justify-around px-4 py-3 border-t border-white/5">
          {navItems.map(item => (
            <button
              key={item.tab}
              onClick={() => { setView(item.tab); setShowSidebar(true); setSelectedChat(null); }}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                view === item.tab && !selectedChat ? "text-violet-400" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon name={item.icon as IconName} size={20} />
              <span className="text-[9px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* ── Main area ── */}
      <main className={`
        flex-1 flex flex-col overflow-hidden
        transition-all duration-300
        ${!showSidebar || selectedChat ? "translate-x-0" : "md:translate-x-0"}
        absolute md:relative inset-0 md:inset-auto
        ${showSidebar && !selectedChat ? "translate-x-full md:translate-x-0" : "translate-x-0"}
      `}>
        {selectedChat ? (
          <ChatWindow chat={selectedChat} onBack={handleBack} />
        ) : view === "search" ? (
          <SearchPanel />
        ) : view === "profile" ? (
          <ProfilePanel onSettings={() => setView("settings")} />
        ) : view === "settings" ? (
          <SettingsPanel />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8 animate-fade-in">
            <div className="w-20 h-20 grad-primary rounded-3xl flex items-center justify-center mb-6 glow-primary animate-float">
              <Icon name="MessageCircle" size={36} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2 grad-text">Волна</h2>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
              Выберите диалог слева, чтобы начать общение. Все сообщения защищены сквозным шифрованием.
            </p>
            <div className="flex items-center gap-2 mt-4 px-4 py-2 glass rounded-full">
              <Icon name="Lock" size={13} className="text-violet-400" />
              <span className="text-xs text-muted-foreground">E2E шифрование активно</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}