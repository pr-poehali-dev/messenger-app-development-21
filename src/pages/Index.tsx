import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { api, pushApi, urlBase64ToUint8Array, type View, type Tab, type Chat, type User, type Story, CHATS, STORIES } from "@/lib/api";
import { StoriesBar, ChatList, ChatWindow, Avatar } from "@/components/messenger/ChatComponents";
import { StoryViewer, SearchPanel, ProfilePanel, SettingsPanel } from "@/components/messenger/Panels";
import { AuthScreen } from "@/components/messenger/AuthScreen";

export default function Index() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  // Восстановление сессии из localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("nova_user");
      if (saved) {
        const user = JSON.parse(saved) as User;
        if (user?.id && user?.phone && user?.name) {
          setCurrentUser(user);
        }
      }
    } catch { /* ignore */ }
    setSessionChecked(true);
  }, []);

  const [activeTab, setActiveTab] = useState<Tab>("chats");
  const [view, setView] = useState<View>("chats");
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [viewingStory, setViewingStory] = useState<Story | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [realChats, setRealChats] = useState<Chat[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Push-подписка
  useEffect(() => {
    if (!currentUser) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const subscribe = async () => {
      try {
        const keyData = await pushApi("vapid_key");
        const publicKey = keyData.public_key;
        if (!publicKey) return;

        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        const sub = existing || await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        const subJson = sub.toJSON();
        await pushApi("subscribe", {
          endpoint: sub.endpoint,
          p256dh: (subJson.keys as Record<string, string>)?.p256dh || "",
          auth: (subJson.keys as Record<string, string>)?.auth || "",
        }, currentUser.id);
      } catch {
        // Пользователь отклонил или браузер не поддерживает
      }
    };

    Notification.requestPermission().then((perm) => {
      if (perm === "granted") subscribe();
    });
  }, [currentUser]);

  // Загрузка чатов
  useEffect(() => {
    if (!currentUser) return;
    const loadChats = async () => {
      const data = await api("get_chats", {}, currentUser.id);
      if (data.chats) {
        const mapped: Chat[] = data.chats.map((c: { id: number; last_message: string; last_message_at: number; partner: { id: number; name: string; last_seen: number }; unread: number }) => ({
          id: c.id,
          name: c.partner.name,
          avatar: c.partner.name[0]?.toUpperCase() || "?",
          lastMsg: c.last_message || "Нет сообщений",
          time: c.last_message_at ? new Date(c.last_message_at * 1000).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" }) : "",
          unread: c.unread || 0,
          online: Date.now() / 1000 - (c.partner.last_seen || 0) < 300,
          partner_id: c.partner.id,
        }));
        setRealChats(mapped);
      }
    };
    loadChats();
    const interval = setInterval(loadChats, 3000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Загрузка пользователей для поиска
  useEffect(() => {
    if (!currentUser) return;
    api("get_users", { exclude_id: currentUser.id }).then((data) => {
      if (data.users) setUsers(data.users);
    });
  }, [currentUser]);

  const handleStartChat = async (partnerId: number) => {
    if (!currentUser) return;
    const data = await api("get_or_create_chat", { partner_id: partnerId }, currentUser.id);
    if (data.chat_id) {
      const partner = users.find(u => u.id === partnerId);
      const chat: Chat = {
        id: data.chat_id,
        name: partner?.name || "Пользователь",
        avatar: (partner?.name || "П")[0].toUpperCase(),
        lastMsg: "Начните общение",
        time: "",
        partner_id: partnerId,
      };
      setSelectedChat(chat);
      setView("chats");
      setShowSidebar(false);
      const chatsData = await api("get_chats", {}, currentUser.id);
      if (chatsData.chats) {
        setRealChats(chatsData.chats.map((c: { id: number; last_message: string; last_message_at: number; partner: { id: number; name: string; last_seen: number }; unread: number }) => ({
          id: c.id,
          name: c.partner.name,
          avatar: c.partner.name[0]?.toUpperCase() || "?",
          lastMsg: c.last_message || "Нет сообщений",
          time: c.last_message_at ? new Date(c.last_message_at * 1000).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" }) : "",
          unread: c.unread || 0,
          online: Date.now() / 1000 - (c.partner.last_seen || 0) < 300,
          partner_id: c.partner.id,
        })));
      }
    }
  };

  const login = (user: User) => {
    localStorage.setItem("nova_user", JSON.stringify(user));
    setCurrentUser(user);
  };

  const logout = () => {
    localStorage.removeItem("nova_user");
    setCurrentUser(null);
  };

  if (!sessionChecked) return (
    <div className="h-screen flex items-center justify-center relative overflow-hidden">
      <div className="mesh-bg" />
      <div className="flex flex-col items-center gap-4">
        <div className="w-20 h-20 grad-primary rounded-3xl flex items-center justify-center glow-primary animate-float">
          <Icon name="Zap" size={36} className="text-white" />
        </div>
        <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
      </div>
    </div>
  );

  if (!currentUser) return <AuthScreen onDone={login} />;

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
            <span className="text-lg font-bold grad-text">Nova</span>
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
                chats={(realChats.length > 0 ? realChats : CHATS).filter(c => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()))}
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
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-sm font-bold text-white mb-1 ${s.seen ? "opacity-60" : "ring-2 ring-white"}`}>
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
              {users.map((u, i) => (
                <button key={u.id} onClick={() => handleStartChat(u.id)} className={`w-full flex items-center gap-3 p-3 glass rounded-2xl hover:bg-white/8 transition-all animate-fade-in stagger-${Math.min(i + 1, 5)}`}>
                  <Avatar label={u.name[0]?.toUpperCase() || "?"} id={u.id} online={Date.now() / 1000 - (u.last_seen || 0) < 300} />
                  <div className="text-left">
                    <div className="text-sm font-semibold">{u.name}</div>
                    <div className="text-xs text-muted-foreground">{u.phone}</div>
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
              <Icon name={item.icon as string} size={20} />
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
          <ChatWindow chat={selectedChat} onBack={handleBack} currentUser={currentUser} />
        ) : view === "search" ? (
          <SearchPanel users={users} currentUser={currentUser} onStartChat={handleStartChat} />
        ) : view === "profile" ? (
          <ProfilePanel onSettings={() => setView("settings")} currentUser={currentUser} />
        ) : view === "settings" ? (
          <SettingsPanel onLogout={logout} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8 animate-fade-in">
            <div className="w-20 h-20 grad-primary rounded-3xl flex items-center justify-center mb-6 glow-primary animate-float">
              <Icon name="MessageCircle" size={36} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2 grad-text">Nova</h2>
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
