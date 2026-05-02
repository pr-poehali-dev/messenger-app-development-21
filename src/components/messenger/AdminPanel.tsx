import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

const ADMIN_URL = "https://functions.poehali.dev/74374a22-83da-4771-855b-1716418e719b";

async function adminApi(action: string, body: Record<string, unknown> = {}, token: string) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(ADMIN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Admin-Token": token },
      body: JSON.stringify({ action, ...body }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) {
      return { error: `HTTP ${res.status}` };
    }
    return await res.json();
  } catch (e) {
    return { error: (e as Error).message || "Сетевая ошибка" };
  }
}

interface Stats {
  users: { total: number; online: number; new_24h: number };
  messages: { total: number; last_1h: number; last_24h: number; per_min: number };
  chats: number;
  push_subs: number;
  calls_1h: number;
  load: { level: string; tip: string; msg_per_min: number };
}

interface AdminUser {
  id: number; phone: string; name: string; last_seen: number; created_at: number;
  online: boolean; msg_count?: number; chat_count?: number;
}

const LOAD_COLOR: Record<string, string> = {
  low: "text-emerald-400",
  medium: "text-amber-400",
  high: "text-red-400",
};
const LOAD_BG: Record<string, string> = {
  low: "bg-emerald-500/10 border-emerald-500/20",
  medium: "bg-amber-500/10 border-amber-500/20",
  high: "bg-red-500/10 border-red-500/20",
};
const LOAD_LABEL: Record<string, string> = {
  low: "низкая", medium: "средняя", high: "высокая",
};

export function AdminPanel({ onClose }: { onClose: () => void }) {
  const [token, setToken] = useState(() => sessionStorage.getItem("nova_admin_token") || "");
  const [authed, setAuthed] = useState(false);
  const [authInput, setAuthInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [tab, setTab] = useState<"stats" | "users">("stats");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messageSending, setMessageSending] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearResult, setClearResult] = useState<string | null>(null);
  const [confirmClearMsgs, setConfirmClearMsgs] = useState(false);
  const [clearingMsgs, setClearingMsgs] = useState(false);
  const [clearMsgsResult, setClearMsgsResult] = useState<string | null>(null);
  const [confirmNuke, setConfirmNuke] = useState(false);
  const [nuking, setNuking] = useState(false);
  const [nukeResult, setNukeResult] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [apiError, setApiError] = useState<string>("");

  // Авто-скрытие баннера ошибки
  useEffect(() => {
    if (!apiError) return;
    const t = setTimeout(() => setApiError(""), 4000);
    return () => clearTimeout(t);
  }, [apiError]);

  const login = async () => {
    setAuthError("");
    if (!authInput.trim()) { setAuthError("Введите пароль"); return; }
    setAuthLoading(true);
    const data = await adminApi("stats", {}, authInput);
    setAuthLoading(false);
    if (data.users) {
      setToken(authInput);
      sessionStorage.setItem("nova_admin_token", authInput);
      setAuthed(true);
      setStats(data);
    } else if (data.error) {
      setAuthError(`Ошибка: ${data.error}`);
    } else {
      setAuthError("Неверный пароль");
    }
  };

  const loadStats = useCallback(async () => {
    const data = await adminApi("stats", {}, token);
    if (data.users) setStats(data);
    else if (data.error) setApiError(`Не удалось загрузить статистику: ${data.error}`);
  }, [token]);

  const loadUsers = useCallback(async (q = "") => {
    setLoading(true);
    const data = await adminApi("users", { search: q, limit: 50 }, token);
    if (data.users) { setUsers(data.users); setUsersTotal(data.total); }
    else if (data.error) setApiError(`Не удалось загрузить список: ${data.error}`);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (token) {
      adminApi("stats", {}, token).then(d => {
        if (d.users) { setAuthed(true); setStats(d); }
      });
    }
  }, [token]);

  useEffect(() => {
    if (!authed) return;
    if (tab === "stats") loadStats();
    if (tab === "users") loadUsers(search);
  }, [tab, authed]);

  const openUser = async (u: AdminUser) => {
    const data = await adminApi("user_detail", { user_id: u.id }, token);
    if (data.user) { setSelectedUser(data.user); setEditName(data.user.name); }
  };

  const saveUser = async () => {
    if (!selectedUser) return;
    setSaving(true);
    const data = await adminApi("update_user", { user_id: selectedUser.id, name: editName }, token);
    if (data.user) {
      setSelectedUser(data.user);
      setUsers(prev => prev.map(u => u.id === data.user.id ? { ...u, name: data.user.name } : u));
    }
    setSaving(false);
  };

  const deleteUser = async (userId: number) => {
    setConfirmDelete(userId);
  };

  const confirmDeleteUser = async () => {
    if (!confirmDelete) return;
    const data = await adminApi("delete_user", { user_id: confirmDelete }, token);
    if (data.ok) {
      setUsers(prev => prev.filter(u => u.id !== confirmDelete));
      setSelectedUser(null);
    } else {
      alert("Не удалось удалить: " + (data.error || "ошибка"));
    }
    setConfirmDelete(null);
  };

  const runClearTestData = async () => {
    setClearing(true);
    setClearResult(null);
    const data = await adminApi("clear_test_data", {}, token);
    setClearing(false);
    setConfirmClear(false);
    if (data.ok) {
      setClearResult(`Обезличено пользователей: ${data.cleared}`);
      setUsers([]);
      loadStats();
      setTimeout(() => setClearResult(null), 4000);
    } else {
      setClearResult("Ошибка: " + (data.error || "не удалось"));
    }
  };

  const runNukeAll = async () => {
    setNuking(true);
    setNukeResult(null);
    const data = await adminApi("nuke_all", {}, token);
    setNuking(false);
    setConfirmNuke(false);
    if (data.ok) {
      setNukeResult(`Снесено: ${data.users} юзеров, ${data.messages} сообщений, ${data.chats} чатов`);
      setUsers([]);
      loadStats();
      setTimeout(() => setNukeResult(null), 6000);
    } else {
      setNukeResult("Ошибка: " + (data.error || "не удалось"));
    }
  };

  const runClearAllMessages = async () => {
    setClearingMsgs(true);
    setClearMsgsResult(null);
    const data = await adminApi("clear_all_messages", {}, token);
    setClearingMsgs(false);
    setConfirmClearMsgs(false);
    if (data.ok) {
      setClearMsgsResult(`Очищено сообщений: ${data.cleared_messages}`);
      loadStats();
      setTimeout(() => setClearMsgsResult(null), 4000);
    } else {
      setClearMsgsResult("Ошибка: " + (data.error || "не удалось"));
    }
  };

  const fmtDate = (ts: number) => new Date(ts * 1000).toLocaleDateString("ru", { day: "2-digit", month: "short", year: "numeric" });
  const fmtTime = (ts: number) => {
    const diff = Date.now() / 1000 - ts;
    if (diff < 60) return "только что";
    if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
    return fmtDate(ts);
  };

  if (!authed) return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="glass-strong rounded-3xl p-8 w-full max-w-sm mx-4 animate-scale-in">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-500/20 rounded-xl flex items-center justify-center">
              <Icon name="Terminal" size={20} className="text-violet-400" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Dev Panel</h2>
              <p className="text-xs text-muted-foreground">Только для администратора</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 glass rounded-xl text-muted-foreground hover:text-foreground">
            <Icon name="X" size={18} />
          </button>
        </div>
        <input
          type="password"
          value={authInput}
          onChange={e => setAuthInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && login()}
          placeholder="Пароль администратора"
          className="w-full glass rounded-xl px-4 py-3 text-sm outline-none mb-3 text-foreground placeholder-muted-foreground"
          autoFocus
        />
        {authError && <p className="text-red-400 text-xs mb-3">{authError}</p>}
        <button
          onClick={login}
          disabled={authLoading}
          className="w-full grad-primary text-white rounded-xl py-3 font-bold text-sm glow-primary disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {authLoading && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
          {authLoading ? "Проверяем…" : "Войти"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-[hsl(var(--background))] animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 glass-strong border-b border-white/5" style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top))" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-violet-500/20 rounded-xl flex items-center justify-center">
            <Icon name="Terminal" size={16} className="text-violet-400" />
          </div>
          <span className="font-bold">Nova Dev Panel</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => tab === "stats" ? loadStats() : loadUsers(search)} className="p-2 glass rounded-xl text-muted-foreground hover:text-foreground">
            <Icon name="RefreshCw" size={16} />
          </button>
          <button onClick={onClose} className="p-2 glass rounded-xl text-muted-foreground hover:text-foreground">
            <Icon name="X" size={18} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex mx-4 mt-3 mb-3 glass rounded-2xl p-1">
        {(["stats", "users"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t ? "grad-primary text-white shadow-lg" : "text-muted-foreground hover:text-foreground"}`}>
            {t === "stats" ? "📊 Нагрузка" : "👥 Пользователи"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8">

        {apiError && (
          <div className="mb-3 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2 animate-fade-in">
            <Icon name="AlertCircle" size={15} />
            <span className="flex-1">{apiError}</span>
            <button onClick={() => setApiError("")} className="opacity-70 hover:opacity-100"><Icon name="X" size={13} /></button>
          </div>
        )}

        {/* ── STATS skeleton ── */}
        {tab === "stats" && !stats && (
          <div className="space-y-4 animate-fade-in">
            <div className="glass rounded-2xl p-5 h-24 animate-pulse" />
            <div className="grid grid-cols-3 gap-3">
              {[0,1,2].map(i => <div key={i} className="glass rounded-2xl h-20 animate-pulse" />)}
            </div>
            <div className="glass rounded-2xl h-40 animate-pulse" />
          </div>
        )}

        {/* ── STATS ── */}
        {tab === "stats" && stats && (
          <div className="space-y-4 animate-fade-in">

            {/* Load card */}
            <div className={`rounded-2xl border p-4 ${LOAD_BG[stats.load.level] || LOAD_BG.low}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm">Текущая нагрузка</span>
                <span className={`text-xs font-bold uppercase px-2 py-1 rounded-full ${LOAD_COLOR[stats.load.level] || LOAD_COLOR.low} bg-white/5`}>
                  {LOAD_LABEL[stats.load.level] || stats.load.level}
                </span>
              </div>
              <p className={`text-2xl font-black mb-1 ${LOAD_COLOR[stats.load.level] || LOAD_COLOR.low}`}>
                {stats.load.msg_per_min} сообщ/мин
              </p>
              <p className="text-xs text-muted-foreground">{stats.load.tip}</p>
            </div>

            {/* Users */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Всего", value: stats.users.total, icon: "Users", color: "text-violet-400" },
                { label: "Онлайн", value: stats.users.online, icon: "Wifi", color: "text-emerald-400" },
                { label: "За 24ч", value: stats.users.new_24h, icon: "UserPlus", color: "text-sky-400" },
              ].map(s => (
                <div key={s.label} className="glass rounded-2xl p-3 text-center">
                  <Icon name={s.icon as string} size={18} className={`mx-auto mb-1 ${s.color}`} />
                  <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Messages */}
            <div className="glass rounded-2xl p-4">
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><Icon name="MessageCircle" size={15} className="text-violet-400" /> Сообщения</h3>
              <div className="space-y-2">
                {[
                  { label: "Всего", value: stats.messages.total },
                  { label: "За последний час", value: stats.messages.last_1h },
                  { label: "За 24 часа", value: stats.messages.last_24h },
                  { label: "Звонков за час", value: stats.calls_1h },
                  { label: "Push подписок", value: stats.push_subs },
                  { label: "Чатов", value: stats.chats },
                ].map(r => (
                  <div key={r.label} className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
                    <span className="text-sm text-muted-foreground">{r.label}</span>
                    <span className="font-bold text-sm">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div className="glass rounded-2xl p-4">
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><Icon name="Lightbulb" size={15} className="text-amber-400" /> Рекомендации</h3>
              <div className="space-y-2 text-xs text-muted-foreground">
                {stats.users.total > 1000 && <p>• Рассмотри горизонтальное масштабирование функций</p>}
                {stats.messages.last_24h > 10000 && <p>• Добавь индексы на messages.created_at и messages.chat_id</p>}
                {stats.push_subs > 500 && <p>• Push очередь: отправляй уведомления асинхронно</p>}
                {stats.load.level === "low" && <p>• Всё отлично! Нагрузка минимальна, ресурсы используются эффективно.</p>}
                {stats.load.level === "medium" && <p>• Следи за ростом. При увеличении нагрузки в 2× — время масштабироваться.</p>}
                {stats.load.level === "high" && <p>• Срочно: добавь кэш Redis или увеличь timeout функций.</p>}
              </div>
            </div>

            {/* Danger zone */}
            <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
              <h3 className="font-bold text-sm mb-1 flex items-center gap-2 text-red-400">
                <Icon name="TriangleAlert" size={15} /> Опасная зона
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Очистит имена, аватары, телефоны и last_seen у всех пользователей. Аккаунты не удаляются — но при следующем входе по номеру создадутся как новые.
              </p>
              {/* ☢️ Ядерная кнопка — снести всё */}
              <div className="mb-3 pb-3 border-b border-red-500/20">
                {nukeResult && (
                  <div className="text-xs px-3 py-2 mb-2 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    {nukeResult}
                  </div>
                )}
                {!confirmNuke ? (
                  <button
                    onClick={() => setConfirmNuke(true)}
                    className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-xl py-3 text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/30"
                  >
                    <Icon name="Bomb" size={16} fallback="TriangleAlert" /> Снести всё одной кнопкой
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-red-300">
                      ☢️ Снесёт ВСЁ: пользователей, сообщения, чаты, реакции. Точно?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={runNukeAll}
                        disabled={nuking}
                        className="flex-1 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-bold transition-all flex items-center justify-center gap-2"
                      >
                        {nuking ? (
                          <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Сношу...</>
                        ) : (
                          <>Да, снести всё</>
                        )}
                      </button>
                      <button
                        onClick={() => setConfirmNuke(false)}
                        disabled={nuking}
                        className="px-4 glass rounded-xl text-sm font-semibold disabled:opacity-50"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {clearResult && (
                <div className="text-xs px-3 py-2 mb-3 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  {clearResult}
                </div>
              )}
              {!confirmClear ? (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="w-full bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 rounded-xl py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Icon name="Eraser" size={15} /> Очистить пользователей
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-red-300">Точно? Действие необратимо.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={runClearTestData}
                      disabled={clearing}
                      className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-bold transition-colors flex items-center justify-center gap-2"
                    >
                      {clearing ? (
                        <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Очищаю...</>
                      ) : (
                        <>Да, обезличить всех</>
                      )}
                    </button>
                    <button
                      onClick={() => setConfirmClear(false)}
                      disabled={clearing}
                      className="px-4 glass rounded-xl text-sm font-semibold disabled:opacity-50"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              )}

              {/* Очистка сообщений */}
              <div className="mt-3 pt-3 border-t border-red-500/20">
                {clearMsgsResult && (
                  <div className="text-xs px-3 py-2 mb-2 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    {clearMsgsResult}
                  </div>
                )}
                {!confirmClearMsgs ? (
                  <button
                    onClick={() => setConfirmClearMsgs(true)}
                    className="w-full bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 rounded-xl py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <Icon name="MessageSquareX" size={15} fallback="Trash2" /> Очистить все сообщения
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-red-300">Удалит все сообщения у всех чатов. Точно?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={runClearAllMessages}
                        disabled={clearingMsgs}
                        className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-bold transition-colors flex items-center justify-center gap-2"
                      >
                        {clearingMsgs ? (
                          <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Очищаю...</>
                        ) : (
                          <>Да, удалить все сообщения</>
                        )}
                      </button>
                      <button
                        onClick={() => setConfirmClearMsgs(false)}
                        disabled={clearingMsgs}
                        className="px-4 glass rounded-xl text-sm font-semibold disabled:opacity-50"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── USERS ── */}
        {tab === "users" && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center gap-2 glass rounded-xl px-3 py-2">
              <Icon name="Search" size={15} className="text-muted-foreground" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); loadUsers(e.target.value); }}
                placeholder="Поиск по имени или номеру..."
                className="flex-1 bg-transparent outline-none text-sm"
              />
            </div>
            <p className="text-xs text-muted-foreground px-1">Найдено: {usersTotal}</p>

            {loading && <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" /></div>}

            {users.map(u => (
              <div key={u.id} className="w-full glass rounded-2xl p-4 flex items-center gap-3 hover:bg-white/8 transition-colors group">
                <button onClick={() => openUser(u)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-base flex-shrink-0 ${u.online ? "bg-gradient-to-br from-emerald-500 to-teal-500" : "bg-gradient-to-br from-violet-500 to-indigo-500"}`}>
                    {u.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">{u.name}</span>
                      {u.online && <span className="w-2 h-2 bg-emerald-400 rounded-full flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{u.phone}</p>
                  </div>
                </button>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] text-muted-foreground">#{u.id}</p>
                  <p className="text-[10px] text-muted-foreground">{fmtTime(u.last_seen || 0)}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteUser(u.id); }}
                  title="Удалить пользователя"
                  className="p-2 rounded-xl hover:bg-red-500/15 text-red-400 transition-colors flex-shrink-0"
                >
                  <Icon name="Trash2" size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User detail modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-[210] flex items-end justify-center bg-black/60 animate-fade-in" onClick={() => setSelectedUser(null)}>
          <div className="w-full max-w-lg glass-strong rounded-t-3xl p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Пользователь #{selectedUser.id}</h3>
              <button onClick={() => setSelectedUser(null)} className="p-2 glass rounded-xl text-muted-foreground">
                <Icon name="X" size={16} />
              </button>
            </div>
            <div className="space-y-2 mb-4 text-sm">
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-muted-foreground">Телефон</span><span className="font-mono">{selectedUser.phone}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-muted-foreground">Зарегистрирован</span><span>{fmtDate(selectedUser.created_at)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-muted-foreground">Последний вход</span><span>{fmtTime(selectedUser.last_seen || 0)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-muted-foreground">Сообщений</span><span className="font-bold">{selectedUser.msg_count ?? "—"}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Чатов</span><span className="font-bold">{selectedUser.chat_count ?? "—"}</span>
              </div>
            </div>
            <div className="flex gap-2 mb-2">
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="flex-1 glass rounded-xl px-4 py-2.5 text-sm outline-none"
                placeholder="Новое имя"
              />
              <button onClick={saveUser} disabled={saving} className="px-4 py-2.5 grad-primary rounded-xl text-white text-sm font-bold disabled:opacity-50">
                {saving ? "..." : "Сохранить"}
              </button>
            </div>
            <button
              onClick={() => setShowMessage(true)}
              className="w-full py-2.5 mb-2 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-xl text-sm font-semibold hover:bg-violet-500/20 transition-colors"
            >
              ✉️ Написать сообщение
            </button>
            {showMessage && (
              <div className="mb-2 animate-fade-in">
                <textarea
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  placeholder="Текст сообщения от Nova Dev..."
                  className="w-full glass rounded-xl px-4 py-2.5 text-sm outline-none resize-none mb-2"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowMessage(false); setMessageText(""); }}
                    className="flex-1 py-2 glass rounded-xl text-sm text-muted-foreground"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={async () => {
                      if (!messageText.trim() || !selectedUser) return;
                      setMessageSending(true);
                      await adminApi("send_to_user", { user_id: selectedUser.id, text: messageText.trim() }, token);
                      setMessageSending(false);
                      setShowMessage(false);
                      setMessageText("");
                    }}
                    disabled={messageSending || !messageText.trim()}
                    className="flex-1 py-2 grad-primary rounded-xl text-white text-sm font-bold disabled:opacity-50"
                  >
                    {messageSending ? "..." : "Отправить"}
                  </button>
                </div>
              </div>
            )}
            <button onClick={() => deleteUser(selectedUser.id)}
              className="w-full py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-semibold hover:bg-red-500/20 transition-colors">
              Удалить пользователя
            </button>
          </div>
        </div>
      )}

      {/* Confirm delete dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/70 animate-fade-in">
          <div className="glass-strong rounded-3xl p-6 w-full max-w-xs mx-4 animate-scale-in">
            <div className="w-12 h-12 bg-red-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Icon name="Trash2" size={22} className="text-red-400" />
            </div>
            <h3 className="font-bold text-center mb-1">Удалить пользователя?</h3>
            <p className="text-xs text-muted-foreground text-center mb-5">Все сообщения и данные будут удалены. Это действие необратимо.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-3 glass rounded-xl text-sm font-semibold"
              >
                Отмена
              </button>
              <button
                onClick={confirmDeleteUser}
                className="flex-1 py-3 bg-red-500 rounded-xl text-white text-sm font-bold hover:bg-red-600 transition-colors"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}