import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { api, pushApi, urlBase64ToUint8Array, type View, type Tab, type Chat, type User, type Story, STORIES } from "@/lib/api";
import { StoriesBar, ChatList, ChatWindow, Avatar } from "@/components/messenger/ChatComponents";
import { StoryViewer, SearchPanel, ProfilePanel, SettingsPanel } from "@/components/messenger/Panels";
import { AuthScreen } from "@/components/messenger/AuthScreen";
import { ContactsPanel } from "@/components/messenger/ContactsPanel";
import { CallScreen } from "@/components/messenger/CallScreen";
import { type Contact } from "@/lib/api";

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
  const [activeCall, setActiveCall] = useState<{ userId: number; name: string; callId: string; incoming: boolean } | null>(null);

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

  const startCall = (contact: Contact) => {
    const callId = `${currentUser!.id}_${contact.id}_${Date.now()}`;
    setActiveCall({ userId: contact.id, name: contact.name, callId, incoming: false });
  };

  // Polling входящих звонков
  useEffect(() => {
    if (!currentUser) return;
    const since = { val: Math.floor(Date.now() / 1000) - 5 };
    const interval = setInterval(async () => {
      if (activeCall) return;
      const data = await api("poll_incoming_call", { since: since.val }, currentUser.id);
      if (data.call) {
        since.val = data.call.created_at;
        setActiveCall({ userId: data.call.from_user_id, name: data.call.from_name, callId: data.call.call_id, incoming: true });
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [currentUser, activeCall]);

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
    { tab: "contacts", icon: "BookUser", label: "Контакты" },
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

      {/* Call screen */}
      {activeCall && (
        <CallScreen
          currentUser={currentUser}
          remoteUserId={activeCall.userId}
          remoteName={activeCall.name}
          callId={activeCall.callId}
          isIncoming={activeCall.incoming}
          onClose={() => setActiveCall(null)}
        />
      )}

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
        <div className="flex items-center justify-between px-4 pb-3" style={{ paddingTop: "calc(1.25rem + env(safe-area-inset-top))" }}>
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
                chats={realChats.filter(c => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()))}
                onSelect={handleSelectChat}
                selectedId={selectedChat?.id}
              />
            </>
          )}
          {activeTab === "stories" && (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center px-8">
              <div className="w-16 h-16 glass rounded-3xl flex items-center justify-center mb-4">
                <Icon name="Circle" size={28} className="text-violet-400" />
              </div>
              <p className="font-semibold mb-1">Историй пока нет</p>
              <p className="text-sm text-muted-foreground">Скоро здесь появятся истории твоих контактов</p>
            </div>
          )}
        </div>

        {/* Bottom nav */}
        <div className="flex items-center justify-around px-4 py-3 border-t border-white/5">
          {navItems.map(item => {
            const totalUnread = item.tab === "chats" ? realChats.reduce((s, c) => s + (c.unread || 0), 0) : 0;
            return (
              <button
                key={item.tab}
                onClick={() => { setView(item.tab); setShowSidebar(true); setSelectedChat(null); }}
                className={`relative flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                  view === item.tab && !selectedChat ? "text-violet-400" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon name={item.icon as string} size={20} />
                {totalUnread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 grad-primary rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                    {totalUnread > 99 ? "99+" : totalUnread}
                  </span>
                )}
                <span className="text-[9px] font-medium">{item.label}</span>
              </button>
            );
          })}
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
          <ChatWindow
            chat={selectedChat}
            onBack={handleBack}
            currentUser={currentUser}
            onCall={(partnerId, name) => {
              const callId = `${currentUser.id}_${partnerId}_${Date.now()}`;
              setActiveCall({ userId: partnerId, name, callId, incoming: false });
            }}
          />
        ) : view === "search" ? (
          <SearchPanel users={users} currentUser={currentUser} onStartChat={handleStartChat} />
        ) : view === "contacts" ? (
          <ContactsPanel currentUser={currentUser} onStartChat={(chat) => { setSelectedChat(chat); setShowSidebar(false); }} onCall={startCall} />
        ) : view === "profile" ? (
          <ProfilePanel onSettings={() => setView("settings")} currentUser={currentUser} onUserUpdate={(u) => { setCurrentUser(u); }} />
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