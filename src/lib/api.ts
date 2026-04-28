export const CHAT_API = "https://functions.poehali.dev/b97ade88-cc88-4702-a461-4c386efd5ca3";
export const PUSH_API = "https://functions.poehali.dev/c9d141ca-3552-433f-a968-ac1e92da00af";

export async function api(action: string, body: Record<string, unknown> = {}, userId?: number) {
  const res = await fetch(CHAT_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(userId ? { "X-User-Id": String(userId) } : {}) },
    body: JSON.stringify({ action, ...body }),
  });
  return res.json();
}

export async function pushApi(action: string, body: Record<string, unknown> = {}, userId?: number) {
  const res = await fetch(PUSH_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(userId ? { "X-User-Id": String(userId) } : {}) },
    body: JSON.stringify({ action, ...body }),
  });
  return res.json();
}

export function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type View = "chats" | "stories" | "search" | "profile" | "settings";
export type Tab = "chats" | "stories" | "contacts";
export type IconName = string;

export interface Message {
  id: number;
  text: string;
  time: string;
  out: boolean;
  read?: boolean;
  sender_id?: number;
  created_at?: number;
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
  partner_id?: number;
}

export interface User {
  id: number;
  phone: string;
  name: string;
  avatar_url?: string;
  last_seen?: number;
}

export interface Story {
  id: number;
  name: string;
  avatar: string;
  seen: boolean;
  gradient: string;
}

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// ─── Data ────────────────────────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
