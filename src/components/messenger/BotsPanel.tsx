import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { api, type User } from "@/lib/api";
import { useEdgeSwipeBack } from "@/hooks/useEdgeSwipeBack";

interface Bot {
  id: number;
  name: string;
  username: string;
  token?: string;
  description?: string | null;
  webhook_url?: string | null;
  avatar_url?: string | null;
}

export default function BotsPanel({
  currentUser,
  onBack,
}: {
  currentUser: User;
  onBack?: () => void;
}) {
  useEdgeSwipeBack(onBack);
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [description, setDescription] = useState("");
  const [createError, setCreateError] = useState("");
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [copied, setCopied] = useState<string>("");

  const load = async () => {
    setLoading(true);
    const r = await api("bot_list_my", {}, currentUser.id);
    if (r && r.bots) setBots(r.bots);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    setCreateError("");
    if (!name.trim() || name.trim().length < 2) { setCreateError("Имя слишком короткое"); return; }
    const u = username.trim().replace(/^@/, "").toLowerCase();
    if (!/^[a-z0-9_]{3,32}$/.test(u)) { setCreateError("Username 3–32: латиница, цифры, _"); return; }
    if (!u.endsWith("bot")) { setCreateError("Username должен заканчиваться на 'bot'"); return; }
    setBusy(true);
    const r = await api("bot_create", { name: name.trim(), username: u, description: description.trim() }, currentUser.id);
    setBusy(false);
    if (r && r.id) {
      setName(""); setUsername(""); setDescription(""); setCreating(false);
      setOpenId(r.id);
      load();
    } else {
      setCreateError(r?.error || "Не удалось создать бота");
    }
  };

  const copy = async (label: string, val: string) => {
    try {
      await navigator.clipboard.writeText(val);
      setCopied(label);
      setTimeout(() => setCopied(""), 1500);
    } catch { /* ignore */ }
  };

  const revokeToken = async (botId: number) => {
    if (!confirm("Сгенерировать новый токен? Старый перестанет работать.")) return;
    const r = await api("bot_revoke_token", { bot_id: botId }, currentUser.id);
    if (r && r.token) {
      setBots(prev => prev.map(b => b.id === botId ? { ...b, token: r.token } : b));
    }
  };

  const updateWebhook = async (bot: Bot, wh: string) => {
    const r = await api("bot_update", { bot_id: bot.id, webhook_url: wh }, currentUser.id);
    if (r && r.updated !== undefined) {
      setBots(prev => prev.map(b => b.id === bot.id ? { ...b, webhook_url: wh || null } : b));
    }
  };

  const opened = bots.find(b => b.id === openId);

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="px-4 py-4 glass-strong border-b border-white/5" style={{ paddingTop: "calc(1rem + env(safe-area-inset-top))" }}>
        <div className="flex items-center gap-2">
          {onBack && (
            <button onClick={onBack} className="md:hidden p-2 -ml-2 rounded-xl hover:bg-white/8">
              <Icon name="ChevronLeft" size={20} />
            </button>
          )}
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #6366f1, #06b6d4)" }}>
            <Icon name="Bot" size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold truncate">Мои боты</h2>
            <p className="text-[11px] text-muted-foreground">Создавай ботов и подключай их к своим сервисам</p>
          </div>
          <button
            onClick={() => { setCreating(true); setOpenId(null); }}
            className="grad-primary text-white rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-1.5"
          >
            <Icon name="Plus" size={14} />
            Создать
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && <div className="text-center text-muted-foreground py-10 text-sm">Загружаем...</div>}

        {!loading && !creating && !opened && bots.length === 0 && (
          <div className="text-center py-10 px-6">
            <div className="w-16 h-16 rounded-3xl glass mx-auto mb-3 flex items-center justify-center">
              <Icon name="Bot" size={28} className="text-violet-400" />
            </div>
            <p className="font-bold mb-1">У тебя пока нет ботов</p>
            <p className="text-xs text-muted-foreground mb-4">
              Бот — это автоматизированный аккаунт. Может отвечать в чатах через webhook или long-polling.
            </p>
            <button onClick={() => setCreating(true)} className="grad-primary text-white rounded-xl px-4 py-2.5 text-sm font-bold">
              Создать первого бота
            </button>
          </div>
        )}

        {creating && (
          <div className="glass-strong rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">Новый бот</h3>
              <button onClick={() => setCreating(false)} className="p-1.5 rounded-lg hover:bg-white/8">
                <Icon name="X" size={16} />
              </button>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">Имя</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Мой первый бот"
                className="w-full mt-1 bg-white/5 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">Username (должен заканчиваться на «bot»)</label>
              <div className="flex items-center mt-1">
                <span className="px-3 py-2 bg-white/5 rounded-l-xl text-sm text-muted-foreground">@</span>
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase())}
                  placeholder="my_super_bot"
                  className="flex-1 bg-white/5 rounded-r-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">Описание (необязательно)</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                maxLength={300}
                placeholder="Что делает бот"
                className="w-full mt-1 bg-white/5 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              />
            </div>
            {createError && (
              <div className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{createError}</div>
            )}
            <button
              onClick={create}
              disabled={busy}
              className="w-full grad-primary text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-50"
            >
              {busy ? "Создаём..." : "Создать бота"}
            </button>
          </div>
        )}

        {!creating && opened && (
          <div className="space-y-3">
            <button onClick={() => setOpenId(null)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <Icon name="ChevronLeft" size={12} />
              К списку ботов
            </button>
            <div className="glass-strong rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl font-bold"
                  style={{ background: "linear-gradient(135deg, #6366f1, #06b6d4)" }}>
                  {opened.avatar_url
                    ? <img src={opened.avatar_url} alt={opened.name} className="w-full h-full object-cover rounded-2xl" />
                    : <Icon name="Bot" size={22} className="text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{opened.name}</div>
                  <div className="text-xs text-violet-400 truncate">@{opened.username}</div>
                </div>
              </div>
              {opened.description && <p className="text-xs text-muted-foreground mb-3">{opened.description}</p>}

              <div className="space-y-2">
                <div className="bg-white/5 rounded-xl p-3">
                  <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1.5">Токен бота</div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-[11px] font-mono break-all">{opened.token}</code>
                    <button onClick={() => opened.token && copy("Токен", opened.token)} className="p-1.5 glass rounded-lg flex-shrink-0">
                      <Icon name={copied === "Токен" ? "Check" : "Copy"} size={14} className={copied === "Токен" ? "text-emerald-400" : ""} />
                    </button>
                  </div>
                  <button onClick={() => revokeToken(opened.id)} className="mt-2 text-[11px] text-amber-400 hover:underline">
                    Сгенерировать новый токен
                  </button>
                </div>

                <div className="bg-white/5 rounded-xl p-3">
                  <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1.5">Webhook URL</div>
                  <input
                    defaultValue={opened.webhook_url || ""}
                    placeholder="https://your-server.com/webhook"
                    onBlur={e => updateWebhook(opened, e.target.value.trim())}
                    className="w-full bg-black/30 rounded-lg px-2.5 py-2 text-[11px] font-mono outline-none focus:ring-1 focus:ring-violet-500"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    Когда боту пишут — мы отправим POST на этот URL с JSON: {"{message_id, chat_id, from_user_id, from_user_name, text, created_at}"}.
                  </p>
                </div>

                <details className="bg-white/5 rounded-xl p-3 group">
                  <summary className="text-xs font-bold cursor-pointer flex items-center gap-1.5">
                    <Icon name="Code" size={12} />
                    Как использовать API
                  </summary>
                  <div className="mt-3 space-y-3 text-[11px]">
                    <div>
                      <div className="text-muted-foreground mb-1">Получить новые сообщения (long-polling):</div>
                      <pre className="bg-black/40 rounded-lg p-2 overflow-x-auto font-mono">{`POST /
{"action":"bot_get_updates",
 "token":"${opened.token}",
 "since": 0}`}</pre>
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-1">Отправить сообщение:</div>
                      <pre className="bg-black/40 rounded-lg p-2 overflow-x-auto font-mono">{`POST /
{"action":"bot_send_message",
 "token":"${opened.token}",
 "chat_id": <id>,
 "text":"Привет!"}`}</pre>
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-1">Сообщение с inline-кнопками:</div>
                      <pre className="bg-black/40 rounded-lg p-2 overflow-x-auto font-mono">{`{"action":"bot_send_message",
 "token":"${opened.token}",
 "chat_id": <id>,
 "text":"Что выбираешь?",
 "buttons":[
   [{"text":"Да","callback_data":"yes"},
    {"text":"Нет","callback_data":"no"}],
   [{"text":"Сайт","url":"https://nova.app"}]
 ]}`}</pre>
                      <p className="text-muted-foreground mt-1">Когда юзер нажмёт кнопку — придёт update с type:&quot;callback&quot; и полем callback_data.</p>
                    </div>
                  </div>
                </details>
              </div>
            </div>
          </div>
        )}

        {!creating && !opened && bots.map(b => (
          <button
            key={b.id}
            onClick={() => setOpenId(b.id)}
            className="w-full glass rounded-2xl p-3 flex items-center gap-3 hover:bg-white/8 transition text-left"
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #6366f1, #06b6d4)" }}>
              {b.avatar_url
                ? <img src={b.avatar_url} alt={b.name} className="w-full h-full object-cover rounded-xl" />
                : <Icon name="Bot" size={20} className="text-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm truncate flex items-center gap-1">
                {b.name}
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 font-bold">BOT</span>
              </div>
              <div className="text-[11px] text-violet-400 truncate">@{b.username}</div>
            </div>
            <Icon name="ChevronRight" size={16} className="text-muted-foreground flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}