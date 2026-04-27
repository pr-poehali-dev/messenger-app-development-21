import Icon from "@/components/ui/icon";
import { Avatar, avatarGrad } from "./types";
import type { Chat, Story, Tab, View, IconName } from "./types";
import { STORIES, CHATS, CONTACTS } from "./types";

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

interface SidebarProps {
  activeTab: Tab;
  setActiveTab: (t: Tab) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedChat: Chat | null;
  onSelectChat: (c: Chat) => void;
  onViewStory: (s: Story) => void;
  view: View;
  setView: (v: View) => void;
  setSelectedChat: (c: Chat | null) => void;
  showSidebar: boolean;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  selectedChat,
  onSelectChat,
  onViewStory,
  view,
  setView,
  setSelectedChat,
  showSidebar,
}: SidebarProps) {
  const navItems: { tab: View; icon: string; label: string }[] = [
    { tab: "chats", icon: "MessageCircle", label: "Чаты" },
    { tab: "stories", icon: "Circle", label: "Истории" },
    { tab: "search", icon: "Search", label: "Поиск" },
    { tab: "profile", icon: "User", label: "Профиль" },
    { tab: "settings", icon: "Shield", label: "Безопасность" },
  ];

  return (
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
            <StoriesBar onView={onViewStory} />
            <ChatList
              chats={CHATS.filter(c => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()))}
              onSelect={onSelectChat}
              selectedId={selectedChat?.id}
            />
          </>
        )}
        {activeTab === "stories" && (
          <div className="flex-1 p-4 grid grid-cols-2 gap-3 overflow-y-auto">
            {STORIES.filter(s => s.id !== 0).map((s, i) => (
              <button
                key={s.id}
                onClick={() => onViewStory(s)}
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
              <button key={c.id} onClick={() => onSelectChat({ id: c.id, name: c.name, avatar: c.avatar, lastMsg: "", time: "", online: c.online })} className={`w-full flex items-center gap-3 p-3 glass rounded-2xl hover:bg-white/8 transition-all animate-fade-in stagger-${Math.min(i + 1, 5)}`}>
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
            onClick={() => { setView(item.tab); setSelectedChat(null); }}
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
  );
}
