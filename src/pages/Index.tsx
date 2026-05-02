import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { api, pushApi, urlBase64ToUint8Array, type View, type Tab, type Chat, type User, type Story, STORIES } from "@/lib/api";
import { StoriesBar, ChatList, ChatWindow, Avatar } from "@/components/messenger/ChatComponents";
import { StoryViewer, SearchPanel, ProfilePanel, SettingsPanel } from "@/components/messenger/Panels";
import { AuthScreen } from "@/components/messenger/AuthScreen";
import { ContactsPanel } from "@/components/messenger/ContactsPanel";
import { CallScreen } from "@/components/messenger/CallScreen";
import { AdminPanel } from "@/components/messenger/AdminPanel";
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
  const [showAdmin, setShowAdmin] = useState(false);
  const [showPro, setShowPro] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [archivedCount, setArchivedCount] = useState(0);

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

    // Если уже granted — подписываемся сразу. Иначе ждём первого пользовательского жеста,
    // браузеры (особенно Safari) не дают вызвать requestPermission без тапа.
    if (Notification.permission === "granted") {
      subscribe();
      return;
    }
    if (Notification.permission === "default") {
      const onUserGesture = () => {
        Notification.requestPermission().then((perm) => {
          if (perm === "granted") subscribe();
        });
        window.removeEventListener("pointerdown", onUserGesture);
        window.removeEventListener("keydown", onUserGesture);
      };
      window.addEventListener("pointerdown", onUserGesture, { once: true });
      window.addEventListener("keydown", onUserGesture, { once: true });
      return () => {
        window.removeEventListener("pointerdown", onUserGesture);
        window.removeEventListener("keydown", onUserGesture);
      };
    }
  }, [currentUser]);

  // Загрузка чатов
  useEffect(() => {
    if (!currentUser) return;
    const loadChats = async () => {
      const data = await api("get_chats", { archived: showArchived }, currentUser.id);
      if (typeof data.archived_count === "number") setArchivedCount(data.archived_count);
      if (data.chats) {
        const mapped: Chat[] = data.chats.map((c: { id: number; last_message: string; last_message_at: number; partner: { id: number; name: string; last_seen: number; avatar_url?: string | null }; unread: number; muted?: boolean; pinned?: boolean; favorite?: boolean }) => ({
          id: c.id,
          name: c.partner.name,
          avatar: c.partner.name[0]?.toUpperCase() || "?",
          avatar_url: c.partner.avatar_url || null,
          lastMsg: c.last_message || "Нет сообщений",
          time: c.last_message_at ? new Date(c.last_message_at * 1000).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" }) : "",
          unread: c.unread || 0,
          online: Date.now() / 1000 - (c.partner.last_seen || 0) < 300,
          partner_id: c.partner.id,
          muted: c.muted || false,
          pinned: c.pinned || false,
          favorite: c.favorite || false,
        }));
        // Обновляем только если реально что-то изменилось — иначе мигают ники
        setRealChats(prev => {
          const prevStr = JSON.stringify(prev.map(c => ({ id: c.id, lastMsg: c.lastMsg, unread: c.unread, online: c.online, time: c.time, muted: c.muted, pinned: c.pinned, favorite: c.favorite })));
          const nextStr = JSON.stringify(mapped.map(c => ({ id: c.id, lastMsg: c.lastMsg, unread: c.unread, online: c.online, time: c.time, muted: c.muted, pinned: c.pinned, favorite: c.favorite })));
          return prevStr === nextStr ? prev : mapped;
        });
      }
    };
    loadChats();
    const interval = setInterval(loadChats, 5000);
    return () => clearInterval(interval);
  }, [currentUser, showArchived]);

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
        avatar_url: partner?.avatar_url || null,
        lastMsg: "Начните общение",
        time: "",
        partner_id: partnerId,
      };
      setSelectedChat(chat);
      setView("chats");
      setShowSidebar(false);
      const chatsData = await api("get_chats", {}, currentUser.id);
      if (chatsData.chats) {
        setRealChats(chatsData.chats.map((c: { id: number; last_message: string; last_message_at: number; partner: { id: number; name: string; last_seen: number; avatar_url?: string | null }; unread: number }) => ({
          id: c.id,
          name: c.partner.name,
          avatar: c.partner.name[0]?.toUpperCase() || "?",
          avatar_url: c.partner.avatar_url || null,
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

      {/* Nova Pro modal */}
      {showPro && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowPro(false)}>
          <div className="w-full max-w-sm glass-strong rounded-t-3xl p-6 pb-10 animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6" />
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl" style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)" }}>
                👑
              </div>
            </div>
            <h2 className="text-2xl font-black text-center mb-1">Nova Pro</h2>
            <p className="text-muted-foreground text-sm text-center mb-6">Разблокируй все возможности мессенджера</p>
            <div className="space-y-3 mb-6">
              {[
                { icon: "Zap", text: "Без рекламы навсегда" },
                { icon: "Image", text: "Отправка файлов до 2 ГБ" },
                { icon: "Shield", text: "Приоритетная поддержка" },
                { icon: "Star", text: "Эксклюзивные темы оформления" },
                { icon: "Users", text: "Групповые звонки до 50 человек" },
              ].map(f => (
                <div key={f.icon} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(245,158,11,0.15)" }}>
                    <Icon name={f.icon as string} size={16} style={{ color: "#f59e0b" }} />
                  </div>
                  <span className="text-sm font-medium">{f.text}</span>
                </div>
              ))}
            </div>
            <button className="w-full py-4 rounded-2xl font-black text-white text-base" style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)" }}>
              Оформить за 299 ₽/мес
            </button>
            <button onClick={() => setShowPro(false)} className="w-full py-3 text-sm text-muted-foreground mt-2">
              Не сейчас
            </button>
          </div>
        </div>
      )}

      {/* Admin Panel */}
      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}

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
          flex flex-col flex-shrink-0
          glass-strong border-r border-white/5
          transition-transform duration-300 ease-in-out
          md:w-80 lg:w-96
          absolute inset-y-0 left-0 z-20 w-full
          md:relative md:translate-x-0 md:z-auto
          ${showSidebar ? "translate-x-0" : "-translate-x-full"}
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
            {/* Nova Pro badge */}
            <button
              onClick={() => setShowPro(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)", color: "#fff" }}
            >
              <Icon name="Crown" size={12} />
              Pro
            </button>
            {/* Dev Panel */}
            <button
              onClick={() => setShowAdmin(true)}
              className="p-2 rounded-xl hover:bg-white/8 transition-colors text-muted-foreground hover:text-violet-400"
              title="Dev Panel"
            >
              <Icon name="Terminal" size={18} />
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
              {showArchived && (
                <button
                  onClick={() => setShowArchived(false)}
                  className="flex items-center gap-3 px-4 py-3 mx-2 rounded-2xl hover:bg-white/5 transition-colors"
                >
                  <Icon name="ChevronLeft" size={18} className="text-muted-foreground" />
                  <span className="text-sm font-medium">Назад к чатам</span>
                </button>
              )}
              {!showArchived && archivedCount > 0 && (
                <button
                  onClick={() => setShowArchived(true)}
                  className="flex items-center gap-3 px-4 py-3 mx-2 rounded-2xl hover:bg-white/5 transition-colors animate-fade-in"
                >
                  <div className="w-11 h-11 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                    <Icon name="Archive" size={18} className="text-violet-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-sm">Архив</div>
                    <div className="text-xs text-muted-foreground">{archivedCount} {archivedCount === 1 ? "чат" : archivedCount < 5 ? "чата" : "чатов"}</div>
                  </div>
                  <Icon name="ChevronRight" size={16} className="text-muted-foreground" />
                </button>
              )}
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
        <div className="flex items-center justify-around px-4 pt-3 border-t border-white/5" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
          {navItems.map(item => {
            const totalUnread = item.tab === "chats" ? realChats.reduce((s, c) => s + (c.unread || 0), 0) : 0;
            return (
              <button
                key={item.tab}
                onClick={() => {
                  setView(item.tab);
                  setSelectedChat(null);
                  // На мобильном для вкладок «профиль/настройки/поиск/контакты» показываем сразу контент,
                  // а не сайдбар поверх. Сайдбар — только для «чатов».
                  setShowSidebar(item.tab === "chats");
                }}
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
        transition-transform duration-300 ease-in-out
        absolute inset-0 md:relative
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
            onVideoCall={(partnerId, name) => {
              const callId = `video_${currentUser.id}_${partnerId}_${Date.now()}`;
              setActiveCall({ userId: partnerId, name, callId, incoming: false });
            }}
            onChatUpdated={(updated) => {
              setSelectedChat(updated);
              setRealChats(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
            }}
            onChatDeleted={() => {
              setRealChats(prev => prev.filter(c => c.id !== selectedChat.id));
              setSelectedChat(null);
            }}
          />
        ) : view === "search" ? (
          <SearchPanel users={users} currentUser={currentUser} onStartChat={handleStartChat} onBack={() => { setView("chats"); setShowSidebar(true); }} />
        ) : view === "contacts" ? (
          <ContactsPanel currentUser={currentUser} onStartChat={(chat) => { setSelectedChat(chat); setShowSidebar(false); }} onCall={startCall} onBack={() => { setView("chats"); setShowSidebar(true); }} />
        ) : view === "profile" ? (
          <ProfilePanel onSettings={() => setView("settings")} currentUser={currentUser} onUserUpdate={(u) => { setCurrentUser(u); }} onBack={() => { setView("chats"); setShowSidebar(true); }} chatsCount={realChats.length} />
        ) : view === "settings" ? (
          <SettingsPanel onLogout={logout} onBack={() => setView("profile")} />
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