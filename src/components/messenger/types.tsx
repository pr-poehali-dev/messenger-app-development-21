export type IconName = string;

export type View = "chats" | "stories" | "search" | "profile" | "settings";
export type Tab = "chats" | "stories" | "contacts";

export interface Message {
  id: number;
  text: string;
  time: string;
  out: boolean;
  read?: boolean;
  file?: { name: string; size: string };
}

export interface Chat {
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

export interface Story {
  id: number;
  name: string;
  avatar: string;
  seen: boolean;
  gradient: string;
}

export const STORIES: Story[] = [
  { id: 0, name: "Моя", avatar: "Я", seen: false, gradient: "from-violet-600 to-indigo-500" },
  { id: 1, name: "Алина", avatar: "А", seen: false, gradient: "from-pink-500 to-rose-400" },
  { id: 2, name: "Максим", avatar: "М", seen: false, gradient: "from-cyan-500 to-blue-500" },
  { id: 3, name: "Катя", avatar: "К", seen: true, gradient: "from-amber-400 to-orange-500" },
  { id: 4, name: "Дима", avatar: "Д", seen: true, gradient: "from-emerald-400 to-teal-500" },
  { id: 5, name: "Юля", avatar: "Ю", seen: true, gradient: "from-violet-400 to-purple-600" },
];

export const CHATS: Chat[] = [
  { id: 1, name: "Алина Соколова", avatar: "А", lastMsg: "Окей, завтра созвонимся 🎉", time: "сейчас", unread: 3, online: true, typing: true, verified: false, pinned: true },
  { id: 2, name: "Команда дизайн", avatar: "Т", lastMsg: "Макеты готовы, проверяй", time: "14:22", unread: 7, group: true, pinned: true },
  { id: 3, name: "Максим Кузнецов", avatar: "М", lastMsg: "Ты смотрел новый фильм?", time: "13:05", online: true },
  { id: 4, name: "Екатерина Л.", avatar: "Е", lastMsg: "Спасибо за помощь!", time: "вчера", unread: 1 },
  { id: 5, name: "Дмитрий Волков", avatar: "Д", lastMsg: "Встреча в 18:00, не забудь", time: "вчера" },
  { id: 6, name: "Маркетинг 🚀", avatar: "М", lastMsg: "Новая стратегия утверждена", time: "пн", group: true },
  { id: 7, name: "Юлия Попова", avatar: "Ю", lastMsg: "Привет! Как дела?", time: "вс", online: false },
  { id: 8, name: "Иван Смирнов", avatar: "И", lastMsg: "Документы отправил", time: "сб" },
];

export const MESSAGES: Message[] = [
  { id: 1, text: "Привет! Как дела? 👋", time: "13:00", out: false },
  { id: 2, text: "Отлично! Работаю над новым проектом. Скоро покажу результаты 🚀", time: "13:01", out: true, read: true },
  { id: 3, text: "Звучит круто! Что за проект?", time: "13:02", out: false },
  { id: 4, text: "Мессенджер с крутым дизайном и шифрованием. Хочу сделать что-то особенное 💜", time: "13:03", out: true, read: true },
  { id: 5, text: "Вау, это звучит серьёзно! Покажешь когда будет готово?", time: "13:10", out: false },
  { id: 6, text: "Конечно! Ты будешь одной из первых тестировщиков 😉", time: "13:11", out: true, read: true },
  { id: 7, text: "Окей, завтра созвонимся 🎉", time: "сейчас", out: false },
];

export const CONTACTS = [
  { id: 1, name: "Алина Соколова", avatar: "А", status: "Онлайн", online: true },
  { id: 2, name: "Дмитрий Волков", avatar: "Д", status: "Был(а) 5 мин назад", online: false },
  { id: 3, name: "Екатерина Лебедева", avatar: "Е", status: "Онлайн", online: true },
  { id: 4, name: "Иван Смирнов", avatar: "И", status: "Был(а) час назад", online: false },
  { id: 5, name: "Максим Кузнецов", avatar: "М", status: "Онлайн", online: true },
  { id: 6, name: "Юлия Попова", avatar: "Ю", status: "Был(а) вчера", online: false },
];

export const AVATAR_GRADS = [
  "from-violet-500 to-indigo-500",
  "from-pink-500 to-rose-400",
  "from-cyan-500 to-blue-500",
  "from-amber-400 to-orange-500",
  "from-emerald-400 to-teal-500",
  "from-violet-400 to-purple-600",
  "from-fuchsia-500 to-pink-500",
  "from-sky-400 to-cyan-500",
];

export function avatarGrad(id: number) {
  return AVATAR_GRADS[id % AVATAR_GRADS.length];
}

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

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      <div className="typing-dot w-2 h-2 rounded-full bg-violet-400" />
      <div className="typing-dot w-2 h-2 rounded-full bg-violet-400" />
      <div className="typing-dot w-2 h-2 rounded-full bg-violet-400" />
    </div>
  );
}
