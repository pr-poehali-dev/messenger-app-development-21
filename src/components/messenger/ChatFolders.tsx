import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import type { Chat, IconName } from "@/lib/api";

export type FolderId = "all" | "unread" | "favorite" | "groups" | "personal";

const FOLDERS: { id: FolderId; label: string; icon: IconName }[] = [
  { id: "all", label: "Все", icon: "MessageCircle" },
  { id: "unread", label: "Непрочитанные", icon: "Mail" },
  { id: "favorite", label: "Избранное", icon: "Star" },
  { id: "personal", label: "Личные", icon: "User" },
  { id: "groups", label: "Группы", icon: "Users" },
];

const STORAGE_KEY = "nova_chat_folder";

export function getStoredFolder(): FolderId {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && FOLDERS.some(f => f.id === v)) return v as FolderId;
  } catch { /* ignore */ }
  return "all";
}

export function filterChatsByFolder(chats: Chat[], folder: FolderId): Chat[] {
  switch (folder) {
    case "unread":   return chats.filter(c => (c.unread || 0) > 0);
    case "favorite": return chats.filter(c => c.favorite);
    case "groups":   return chats.filter(c => c.group);
    case "personal": return chats.filter(c => !c.group);
    default:         return chats;
  }
}

export function ChatFolders({ folder, onChange, chats }: {
  folder: FolderId;
  onChange: (f: FolderId) => void;
  chats: Chat[];
}) {
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, folder); } catch { /* ignore */ }
  }, [folder]);

  const counts: Record<FolderId, number> = {
    all: chats.length,
    unread: chats.filter(c => (c.unread || 0) > 0).length,
    favorite: chats.filter(c => c.favorite).length,
    personal: chats.filter(c => !c.group).length,
    groups: chats.filter(c => c.group).length,
  };

  // Не показываем папки если меньше 3 чатов вообще
  if (chats.length < 3) return null;

  return (
    <div className="flex gap-1.5 px-3 pb-2 overflow-x-auto no-scrollbar">
      {FOLDERS.map(f => {
        const cnt = counts[f.id];
        if (f.id !== "all" && cnt === 0) return null;
        const active = folder === f.id;
        return (
          <button
            key={f.id}
            onClick={() => onChange(f.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              active
                ? "grad-primary text-white shadow-md shadow-violet-500/20"
                : "bg-white/5 text-muted-foreground hover:bg-white/10"
            }`}
          >
            <Icon name={f.icon} size={12} />
            {f.label}
            {cnt > 0 && (
              <span className={`text-[10px] px-1.5 rounded-full ${active ? "bg-white/20" : "bg-white/10"}`}>{cnt}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function useChatFolder(): [FolderId, (f: FolderId) => void] {
  const [folder, setFolder] = useState<FolderId>(() => getStoredFolder());
  return [folder, setFolder];
}
