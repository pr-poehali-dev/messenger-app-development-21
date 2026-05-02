export const CHAT_API = "https://functions.poehali.dev/b97ade88-cc88-4702-a461-4c386efd5ca3";
export const PUSH_API = "https://functions.poehali.dev/c9d141ca-3552-433f-a968-ac1e92da00af";
export const UPLOAD_API = "https://functions.poehali.dev/c0e361f0-438f-44b3-8886-26f5afb7d935";

export interface UploadResult {
  url: string;
  media_type: "image" | "video" | "audio" | "file";
  file_name: string;
  file_size: number;
}

export async function uploadMedia(file: File, userId: number): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(",")[1];
        const res = await fetch(UPLOAD_API, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-User-Id": String(userId) },
          body: JSON.stringify({ data: base64, mime: file.type, file_name: file.name, file_size: file.size }),
        });
        const data = await res.json();
        if (data.url) resolve(data);
        else reject(new Error(data.error || "Ошибка загрузки"));
      } catch (e) { reject(e); }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function uploadImage(file: File, userId: number): Promise<string> {
  const result = await uploadMedia(file, userId);
  return result.url;
}

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

export type View = "chats" | "stories" | "search" | "profile" | "settings" | "contacts";

export interface Contact {
  id: number;
  name: string;
  real_name: string;
  phone: string;
  avatar_url?: string;
  last_seen?: number;
}
export type Tab = "chats" | "stories" | "contacts";
export type IconName = string;

export interface Reaction {
  emoji: string;
  user_name: string;
  user_id: number;
}

export interface ReplyPreview {
  id: number;
  sender_name: string;
  text: string;
  media_type?: string;
}

export interface Message {
  id: number;
  text: string;
  time: string;
  out: boolean;
  read?: boolean;
  sender_id?: number;
  sender_name?: string;
  kind?: "text" | "missed_call" | "system";
  created_at?: number;
  image_url?: string;
  media_type?: "image" | "video" | "audio" | "file";
  media_url?: string;
  file_name?: string;
  file_size?: number;
  duration?: number;
  reactions?: Reaction[];
  reply_to?: ReplyPreview | null;
  forwarded_from_user_id?: number | null;
  forwarded_from_name?: string | null;
  edited_at?: number | null;
}

export interface Chat {
  id: number;
  name: string;
  avatar: string;
  avatar_url?: string | null;
  lastMsg: string;
  time: string;
  unread?: number;
  online?: boolean;
  typing?: boolean;
  verified?: boolean;
  group?: boolean;
  pinned?: boolean;
  muted?: boolean;
  favorite?: boolean;
  archived?: boolean;
  partner_id?: number;
}

export interface User {
  id: number;
  phone: string;
  name: string;
  avatar_url?: string;
  last_seen?: number;
  about?: string | null;
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
];

export const CHATS: Chat[] = [];

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