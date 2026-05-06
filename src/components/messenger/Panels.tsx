import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import { api, avatarGrad, uploadMedia, type User, type IconName } from "@/lib/api";
import { Avatar } from "@/components/messenger/ChatComponents";
import { useEdgeSwipeBack } from "@/hooks/useEdgeSwipeBack";
import {
  RINGTONES, NOTIFY_SOUNDS,
  getRingtoneId, setRingtoneId,
  getNotifyId, setNotifyId,
  getVolume, setVolume,
  previewRingtone, previewNotifySound, stopRingtone,
  saveCustomRingtone, getCustomRingtoneMeta, clearCustomRingtone,
  type RingtoneId, type NotifyId,
} from "@/lib/sounds";
import { applyTheme, applyFontSize, getStoredTheme, getStoredFontSize, THEMES_META, type ThemeId } from "@/lib/theme";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;        // 5 МБ
const MAX_RINGTONE_SIZE = 10 * 1024 * 1024;     // 10 МБ
const MAX_ABOUT_LEN = 200;

// ─── SearchPanel ──────────────────────────────────────────────────────────────

export function SearchPanel({ users, currentUser, onStartChat, onBack }: { users: User[]; currentUser: User; onStartChat: (id: number) => void; onBack?: () => void }) {
  useEdgeSwipeBack(onBack);
  const [query, setQuery] = useState("");
  const [bots, setBots] = useState<{ id: number; name: string; username: string; description?: string | null; avatar_url?: string | null }[]>([]);
  const results = users.filter(u => !query || u.name.toLowerCase().includes(query.toLowerCase()) || u.phone.includes(query));
  useEffect(() => {
    const q = query.trim().replace(/^@/, "");
    if (q.length < 2) { setBots([]); return; }
    let alive = true;
    const t = setTimeout(async () => {
      const r = await api("bot_search", { query: q }, currentUser.id);
      if (alive && r && Array.isArray(r.bots)) setBots(r.bots);
    }, 200);
    return () => { alive = false; clearTimeout(t); };
  }, [query, currentUser.id]);

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="px-4 pt-4 pb-3" style={{ paddingTop: "calc(1rem + env(safe-area-inset-top))" }}>
        <div className="flex items-center gap-2 mb-3">
          {onBack && (
            <button onClick={onBack} className="md:hidden p-2 -ml-2 rounded-xl hover:bg-white/8 transition-colors">
              <Icon name="ChevronLeft" size={20} />
            </button>
          )}
          <h2 className="text-xl font-bold">Поиск</h2>
        </div>
        <div className="flex items-center gap-3 glass rounded-2xl px-4 py-3">
          <Icon name="Search" size={18} className="text-muted-foreground flex-shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Имя, номер, группа..."
            className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder-muted-foreground"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
              <Icon name="X" size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-1">
        {bots.length > 0 && (
          <>
            <div className="text-xs text-muted-foreground px-2 pb-2 uppercase tracking-widest font-semibold flex items-center gap-1.5">
              <Icon name="Bot" size={12} className="text-cyan-400" />
              Боты
            </div>
            {bots.map(b => (
              <button
                key={`bot-${b.id}`}
                onClick={() => onStartChat(b.id)}
                className="w-full flex items-center gap-3 p-3 glass rounded-2xl hover:bg-white/8 transition-all"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #6366f1, #06b6d4)" }}>
                  {b.avatar_url ? <img src={b.avatar_url} alt={b.name} className="w-full h-full object-cover rounded-full" /> : <Icon name="Bot" size={16} />}
                </div>
                <div className="text-left min-w-0 flex-1">
                  <div className="font-semibold text-sm flex items-center gap-1">
                    <span className="truncate">{b.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 font-bold flex-shrink-0">BOT</span>
                  </div>
                  <div className="text-xs text-violet-400 truncate">@{b.username}</div>
                </div>
                <Icon name="MessageCircle" size={18} className="text-violet-400 flex-shrink-0" />
              </button>
            ))}
            <div className="h-2" />
          </>
        )}
        {!query && <div className="text-xs text-muted-foreground px-2 pb-2 uppercase tracking-widest font-semibold">Все пользователи</div>}
        {results.map((u, i) => (
          <button key={u.id} onClick={() => onStartChat(u.id)} className={`w-full flex items-center gap-3 p-3 glass rounded-2xl hover:bg-white/8 transition-all animate-fade-in stagger-${Math.min(i + 1, 5)}`}>
            <Avatar label={u.name[0]?.toUpperCase() || "?"} id={u.id} online={currentUser.id !== u.id && Date.now() / 1000 - (u.last_seen || 0) < 300} />
            <div className="text-left">
              <div className="font-semibold text-sm">{u.name}</div>
              <div className="text-xs text-muted-foreground">{u.phone}</div>
            </div>
            <div className="ml-auto">
              <Icon name="MessageCircle" size={18} className="text-violet-400" />
            </div>
          </button>
        ))}
        {query && results.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Icon name="SearchX" size={40} className="mx-auto mb-3 opacity-40" />
            <p>Ничего не найдено</p>
          </div>
        )}
      </div>

      <div className="px-4 py-4">
        <button className="w-full flex items-center justify-center gap-2 py-3 grad-primary rounded-2xl text-white font-semibold glow-primary transition-opacity hover:opacity-90">
          <Icon name="UserPlus" size={18} />
          Добавить контакт
        </button>
      </div>
    </div>
  );
}

// ─── ProfilePanel ─────────────────────────────────────────────────────────────

export function ProfilePanel({ onSettings, currentUser, onUserUpdate, onBack, chatsCount = 0, onOpenWallet, onOpenPro, onOpenProSettings, onOpenProgress, onOpenBots, onOpenSupport }: { onSettings: () => void; currentUser: User; onUserUpdate?: (u: User) => void; onBack?: () => void; chatsCount?: number; onOpenWallet?: () => void; onOpenPro?: () => void; onOpenProSettings?: () => void; onOpenProgress?: () => void; onOpenBots?: () => void; onOpenSupport?: () => void }) {
  useEdgeSwipeBack(onBack);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(currentUser.name);
  const [saving, setSaving] = useState(false);
  const [showAppearance, setShowAppearance] = useState(false);
  const [editingAbout, setEditingAbout] = useState(false);
  const [aboutDraft, setAboutDraft] = useState(currentUser.about || "");
  const [savingAbout, setSavingAbout] = useState(false);

  const saveAbout = async () => {
    setSavingAbout(true);
    try {
      const data = await api("update_profile", { about: aboutDraft.trim() }, currentUser.id);
      if (data.user) {
        onUserUpdate?.(data.user);
        localStorage.setItem("nova_user", JSON.stringify(data.user));
        setEditingAbout(false);
      }
    } catch { /* ignore */ } finally { setSavingAbout(false); }
  };

  // Пол и дата рождения
  const [savingMeta, setSavingMeta] = useState(false);
  const updateField = async (field: "gender" | "birthdate", value: string | null) => {
    setSavingMeta(true);
    try {
      const data = await api("update_profile", { [field]: value }, currentUser.id);
      if (data.user) {
        onUserUpdate?.(data.user);
        localStorage.setItem("nova_user", JSON.stringify(data.user));
      }
    } catch { /* ignore */ } finally { setSavingMeta(false); }
  };
  const formatBirthdate = (iso?: string | null) => {
    if (!iso) return "Не указана";
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) return "Не указана";
    const year = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    const day = parseInt(m[3], 10);
    if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return "Не указана";
    const months = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
    return `${day} ${months[month - 1]} ${year} г.`;
  };
  const calcAge = (iso?: string | null) => {
    if (!iso) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) return null;
    const year = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    const day = parseInt(m[3], 10);
    if (year < 1900 || year > 2100) return null;
    const now = new Date();
    let age = now.getFullYear() - year;
    const dm = now.getMonth() + 1 - month;
    if (dm < 0 || (dm === 0 && now.getDate() < day)) age--;
    if (age < 0 || age > 150) return null;
    return age;
  };
  const [bdayPickerOpen, setBdayPickerOpen] = useState(false);
  const parseBd = (iso?: string | null) => {
    const m = iso ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso) : null;
    return m ? { d: parseInt(m[3]), mo: parseInt(m[2]), y: parseInt(m[1]) } : { d: 1, mo: 1, y: 2000 };
  };
  const initBd = parseBd(currentUser.birthdate);
  const [bdDay, setBdDay] = useState<number>(initBd.d);
  const [bdMonth, setBdMonth] = useState<number>(initBd.mo);
  const [bdYear, setBdYear] = useState<number>(initBd.y);
  const saveBirthdate = async () => {
    const iso = `${bdYear}-${String(bdMonth).padStart(2, "0")}-${String(bdDay).padStart(2, "0")}`;
    await updateField("birthdate", iso);
    setBdayPickerOpen(false);
  };
  const clearBirthdate = async () => {
    await updateField("birthdate", null);
    setBdayPickerOpen(false);
  };
  const [theme, setTheme] = useState<ThemeId>(() => getStoredTheme());
  const [fontSize, setFontSize] = useState<number>(() => getStoredFontSize());
  const [contactsCount, setContactsCount] = useState<number>(0);

  useEffect(() => { applyTheme(theme, fontSize); }, [theme, fontSize]);

  useEffect(() => {
    let cancelled = false;
    api("get_contacts", {}, currentUser.id).then((d) => {
      if (cancelled) return;
      if (Array.isArray(d.contacts)) setContactsCount(d.contacts.length);
    }).catch(() => { /* ignore */ });
    return () => { cancelled = true; };
  }, [currentUser.id]);

  const formatPhone = (phone: string) => {
    const d = phone.replace(/\D/g, "");
    if (d.length === 11) return `+7 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9)}`;
    return phone;
  };

  const saveName = async () => {
    if (editName.trim().length < 2) return;
    setSaving(true);
    try {
      const data = await api("update_profile", { name: editName.trim() }, currentUser.id);
      if (data.user) {
        onUserUpdate?.(data.user);
        localStorage.setItem("nova_user", JSON.stringify(data.user));
        setEditing(false);
      }
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  const onPickAvatar = () => fileInputRef.current?.click();

  const onAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setAvatarError("Можно загрузить только изображение");
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setAvatarError("Файл слишком большой (макс 5 МБ)");
      return;
    }
    setAvatarError("");
    setUploadingAvatar(true);
    try {
      const up = await uploadMedia(file, currentUser.id);
      const data = await api("update_profile", { avatar_url: up.url }, currentUser.id);
      if (data.user) {
        onUserUpdate?.(data.user);
        localStorage.setItem("nova_user", JSON.stringify(data.user));
      } else {
        setAvatarError(data.error || "Не удалось обновить аватар");
      }
    } catch (err) {
      setAvatarError((err as Error).message || "Ошибка загрузки");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const removeAvatar = async () => {
    setUploadingAvatar(true);
    try {
      const data = await api("update_profile", { avatar_url: null }, currentUser.id);
      if (data.user) {
        onUserUpdate?.(data.user);
        localStorage.setItem("nova_user", JSON.stringify(data.user));
      }
    } finally { setUploadingAvatar(false); }
  };

  return (
    <div className="flex flex-col h-full animate-fade-in overflow-y-auto">
      {onBack && (
        <div className="md:hidden px-3 pt-3 flex items-center" style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top))" }}>
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-white/8 transition-colors">
            <Icon name="ChevronLeft" size={20} />
          </button>
          <span className="text-sm text-muted-foreground ml-1">Назад</span>
        </div>
      )}
      {/* Hero */}
      <div className="relative px-6 pt-4 pb-6 text-center">
        <div className="relative inline-block mb-4">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-4xl font-bold text-white overflow-hidden animate-pulse-glow">
            {currentUser.avatar_url ? (
              <img src={currentUser.avatar_url} alt={currentUser.name} className="w-full h-full object-cover" />
            ) : (
              currentUser.name[0]?.toUpperCase() || "Я"
            )}
            {uploadingAvatar && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                <div className="w-7 h-7 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </div>
          <button
            onClick={onPickAvatar}
            disabled={uploadingAvatar}
            title="Загрузить фото"
            className="absolute bottom-0 right-0 w-8 h-8 grad-primary rounded-full flex items-center justify-center text-white shadow-lg disabled:opacity-60"
          >
            <Icon name="Camera" size={14} />
          </button>
          {currentUser.avatar_url && !uploadingAvatar && (
            <button
              onClick={removeAvatar}
              title="Убрать фото"
              className="absolute -top-1 -right-1 w-6 h-6 bg-black/70 hover:bg-red-500 rounded-full flex items-center justify-center text-white"
            >
              <Icon name="X" size={12} />
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onAvatarFile}
          />
        </div>
        {avatarError && (
          <p className="text-red-400 text-xs mb-2">{avatarError}</p>
        )}
        {editing ? (
          <div className="flex items-center justify-center gap-2 mt-1">
            <input
              autoFocus
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditing(false); }}
              className="text-xl font-bold bg-transparent border-b-2 border-violet-500 outline-none text-center w-48"
            />
            <button onClick={saveName} disabled={saving} className="p-1.5 grad-primary rounded-lg text-white">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Icon name="Check" size={14} />}
            </button>
            <button onClick={() => setEditing(false)} className="p-1.5 glass rounded-lg text-muted-foreground">
              <Icon name="X" size={14} />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 mt-1">
            <h2 className="text-2xl font-bold" style={{ color: currentUser.name_color || undefined }}>{currentUser.name}</h2>
            <button onClick={() => { setEditName(currentUser.name); setEditing(true); }} className="p-1 text-muted-foreground hover:text-violet-400 transition-colors">
              <Icon name="Pencil" size={14} />
            </button>
          </div>
        )}
        <p className="text-muted-foreground text-sm mt-1">{formatPhone(currentUser.phone)}</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-emerald-400 text-xs font-medium">В сети</span>
        </div>
        {editingAbout ? (
          <div className="mt-3 glass rounded-2xl p-3 text-left">
            <textarea
              autoFocus
              value={aboutDraft}
              maxLength={MAX_ABOUT_LEN}
              onChange={(e) => setAboutDraft(e.target.value)}
              placeholder="Расскажи о себе…"
              rows={3}
              className="w-full bg-white/5 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[11px] text-muted-foreground">{aboutDraft.length}/{MAX_ABOUT_LEN}</span>
              <div className="flex gap-2">
                <button onClick={() => setEditingAbout(false)} className="px-3 py-1.5 rounded-lg text-xs hover:bg-white/8">Отмена</button>
                <button
                  onClick={saveAbout}
                  disabled={savingAbout}
                  className="px-3 py-1.5 grad-primary rounded-lg text-xs text-white font-semibold disabled:opacity-50"
                >
                  {savingAbout ? "Сохраняем..." : "Сохранить"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => { setAboutDraft(currentUser.about || ""); setEditingAbout(true); }}
            className="mt-3 w-full px-4 py-2.5 glass rounded-2xl text-sm text-left hover:bg-white/8 transition-colors group flex items-start gap-2"
          >
            <span className={`flex-1 ${currentUser.about ? "text-foreground" : "text-muted-foreground italic"}`}>
              {currentUser.about || "Расскажи о себе — это увидят твои контакты"}
            </span>
            <Icon name="Pencil" size={13} className="text-muted-foreground group-hover:text-violet-400 mt-0.5 flex-shrink-0" />
          </button>
        )}

        {/* Пол и дата рождения */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          {/* Пол */}
          <div className="glass rounded-2xl p-3">
            <div className="text-[11px] text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Icon name="User" size={11} />
              Пол
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => updateField("gender", currentUser.gender === "male" ? null : "male")}
                disabled={savingMeta}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentUser.gender === "male"
                    ? "grad-primary text-white"
                    : "bg-white/5 text-muted-foreground hover:bg-white/10"
                }`}
              >
                <Icon name="Mars" size={12} className="inline mr-1" fallback="User" />
                М
              </button>
              <button
                onClick={() => updateField("gender", currentUser.gender === "female" ? null : "female")}
                disabled={savingMeta}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentUser.gender === "female"
                    ? "bg-pink-500 text-white"
                    : "bg-white/5 text-muted-foreground hover:bg-white/10"
                }`}
              >
                <Icon name="Venus" size={12} className="inline mr-1" fallback="User" />
                Ж
              </button>
            </div>
          </div>

          {/* Дата рождения */}
          <button
            onClick={() => {
              const b = parseBd(currentUser.birthdate);
              setBdDay(b.d); setBdMonth(b.mo); setBdYear(b.y);
              setBdayPickerOpen(true);
            }}
            className="glass rounded-2xl p-3 text-left active:scale-[0.98] transition"
          >
            <div className="text-[11px] text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Icon name="Cake" size={11} />
              Дата рождения
            </div>
            <div className="text-xs font-semibold text-foreground truncate">
              {formatBirthdate(currentUser.birthdate)}
            </div>
            {calcAge(currentUser.birthdate) !== null && (
              <div className="text-[10px] text-violet-400 mt-0.5">
                {calcAge(currentUser.birthdate)} {(() => {
                  const a = calcAge(currentUser.birthdate)!;
                  const m = a % 100;
                  if (m >= 11 && m <= 14) return "лет";
                  const l = a % 10;
                  if (l === 1) return "год";
                  if (l >= 2 && l <= 4) return "года";
                  return "лет";
                })()}
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 px-4 mb-4">
        {[
          { label: "Контакты", value: String(contactsCount), icon: "Users" },
          { label: "Чаты", value: String(chatsCount), icon: "MessageCircle" },
          { label: "Уровень", value: String(currentUser.level || 1), icon: "Trophy", action: onOpenProgress },
        ].map((s, i) => (
          <button key={s.label} onClick={s.action || undefined} disabled={!s.action}
            className={`glass rounded-2xl p-3 text-center animate-fade-in stagger-${i + 1} ${s.action ? "hover:bg-white/8 active:scale-95 transition" : ""}`}>
            <Icon name={s.icon as IconName} size={18} className="text-violet-400 mx-auto mb-1" />
            <div className="text-lg font-bold grad-text">{s.value}</div>
            <div className="text-[11px] text-muted-foreground">{s.label}</div>
          </button>
        ))}
      </div>

      {/* Кошелёк */}
      {onOpenWallet && (
        <div className="px-4 mb-3">
          <button onClick={onOpenWallet}
            className="w-full rounded-2xl p-4 text-white relative overflow-hidden text-left"
            style={{ background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)" }}>
            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" />
            <div className="relative flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0">
                <Icon name="Wallet" size={20} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-white/80 mb-0.5">Nova Кошелёк</div>
                <div className="text-xl font-black truncate">
                  {(currentUser.wallet_balance || 0).toLocaleString("ru", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽
                </div>
              </div>
              <Icon name="ChevronRight" size={20} className="text-white/60 flex-shrink-0" />
            </div>
          </button>
        </div>
      )}

      {/* Мои боты */}
      {onOpenBots && (
        <div className="px-4 mb-3">
          <button
            onClick={onOpenBots}
            className="w-full glass rounded-2xl p-3 flex items-center gap-3 hover:bg-white/8 transition"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #6366f1, #06b6d4)" }}>
              <Icon name="Bot" size={18} className="text-white" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="text-sm font-bold truncate">Мои боты</div>
              <div className="text-[11px] text-muted-foreground truncate">Создавай ботов для автоматизации</div>
            </div>
            <Icon name="ChevronRight" size={16} className="text-muted-foreground flex-shrink-0" />
          </button>
        </div>
      )}

      {/* Поддержка */}
      {onOpenSupport && (
        <div className="px-4 mb-3">
          <button
            onClick={onOpenSupport}
            className="w-full glass rounded-2xl p-3 flex items-center gap-3 hover:bg-white/8 transition"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #8b5cf6, #ec4899)" }}>
              <Icon name="LifeBuoy" size={18} className="text-white" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="text-sm font-bold truncate">Поддержка Nova</div>
              <div className="text-[11px] text-muted-foreground truncate">Помощь, баги, идеи</div>
            </div>
            <Icon name="ChevronRight" size={16} className="text-muted-foreground flex-shrink-0" />
          </button>
        </div>
      )}

      {/* Pro статус */}
      {onOpenPro && (
        <div className="px-4 mb-4">
          <button onClick={onOpenPro}
            className="w-full rounded-2xl p-3 flex items-center gap-3 transition"
            style={{
              background: currentUser.is_pro
                ? "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(249,115,22,0.15))"
                : "rgba(255,255,255,0.05)",
              border: currentUser.is_pro ? "1px solid rgba(245,158,11,0.3)" : "1px solid rgba(255,255,255,0.08)",
            }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)" }}>
              👑
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="text-sm font-bold truncate">
                {currentUser.is_pro ? "Nova Pro активен" : "Оформить Nova Pro"}
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                {currentUser.is_pro && currentUser.pro_until
                  ? `до ${new Date(currentUser.pro_until * 1000).toLocaleDateString("ru")}`
                  : "Эмодзи-статус, цвет ника, инкогнито и больше"}
              </div>
            </div>
            <Icon name="ChevronRight" size={16} className="text-muted-foreground flex-shrink-0" />
          </button>
        </div>
      )}

      {/* Invite link */}
      <div className="glass rounded-2xl p-4 border border-violet-500/20 mx-4 mb-4">
        <p className="text-sm font-semibold mb-1">Пригласить друзей</p>
        <p className="text-xs text-muted-foreground mb-3">Поделитесь ссылкой — друг скачает Nova и вы сразу найдёте друг друга</p>
        <button
          onClick={() => {
            const url = window.location.origin;
            if (navigator.share) {
              navigator.share({ title: "Nova — мессенджер", text: `Привет! Давай общаться в Nova — безопасном мессенджере. Мой номер: ${currentUser.phone}`, url });
            } else {
              navigator.clipboard.writeText(url).then(() => alert("Ссылка скопирована!"));
            }
          }}
          className="w-full py-3 grad-primary rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 glow-primary"
        >
          <Icon name="Share2" size={16} /> Поделиться ссылкой
        </button>
      </div>

      {/* Actions */}
      <div className="px-4 space-y-2 mb-6" style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom) + 80px)" }}>
        {[
          { icon: "Edit3", label: "Редактировать профиль", sub: "Имя, фото, статус", action: () => { setEditName(currentUser.name); setEditing(true); window.scrollTo({ top: 0, behavior: "smooth" }); } },
          ...(onOpenProSettings ? [{ icon: "Sparkles", label: "Персонализация", sub: "Эмодзи-статус, цвет, инкогнито", action: onOpenProSettings }] : []),
          ...(onOpenProgress ? [{ icon: "Trophy", label: "Прокачка", sub: `${currentUser.level ? `Уровень ${currentUser.level} · ${currentUser.xp || 0} XP` : "Уровни, бейджи, топ"}`, action: onOpenProgress }] : []),
          { icon: "Bell", label: "Уведомления", sub: "Звуки, вибрация", action: onSettings },
          { icon: "Shield", label: "Конфиденциальность", sub: "Блокировки, кто видит", action: onSettings },
          { icon: "Lock", label: "Шифрование", sub: "Управление ключами E2E", action: onSettings },
          { icon: "Palette", label: "Оформление", sub: "Тема, шрифт, фон", action: () => setShowAppearance(true) },
        ].map((item, i) => (
          <button
            key={item.icon}
            onClick={item.action}
            className={`w-full flex items-center gap-3 px-4 py-3 glass rounded-2xl hover:bg-white/8 transition-all animate-fade-in stagger-${Math.min(i + 1, 5)}`}
          >
            <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center">
              <Icon name={item.icon as IconName} size={18} className="text-violet-400" />
            </div>
            <div className="text-left flex-1">
              <div className="text-sm font-medium">{item.label}</div>
              <div className="text-xs text-muted-foreground">{item.sub}</div>
            </div>
            <Icon name="ChevronRight" size={16} className="text-muted-foreground" />
          </button>
        ))}
      </div>

      {showAppearance && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-4 animate-fade-in" onClick={() => setShowAppearance(false)}>
          <div className="glass-strong rounded-2xl p-5 w-full max-w-md animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-base">Оформление</h3>
              <button onClick={() => setShowAppearance(false)} className="p-1.5 rounded-lg hover:bg-white/8">
                <Icon name="X" size={16} />
              </button>
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Тема</div>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {THEMES_META.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setTheme(t.id); applyTheme(t.id); }}
                  className={`relative p-2 rounded-xl border-2 transition-all ${theme === t.id ? "border-violet-500 bg-violet-500/10" : "border-white/10 hover:border-white/20"}`}
                  title={t.name}
                >
                  {t.pro && (
                    <span className="absolute -top-1 -right-1 text-[9px] px-1 py-0.5 rounded-md bg-amber-500 text-white font-bold leading-none shadow">PRO</span>
                  )}
                  <div className={`w-full h-8 rounded-lg mb-1.5 bg-gradient-to-br ${t.preview}`} />
                  <div className="text-[10px] font-medium leading-tight">{t.name}</div>
                </button>
              ))}
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Размер шрифта</div>
            <div className="flex items-center gap-2 mb-1">
              {([
                { v: 14, l: "S" },
                { v: 16, l: "M" },
                { v: 18, l: "L" },
              ] as const).map(s => (
                <button
                  key={s.v}
                  onClick={() => { setFontSize(s.v); applyFontSize(s.v); }}
                  className={`flex-1 py-2 rounded-xl border-2 ${fontSize === s.v ? "border-violet-500 bg-violet-500/10" : "border-white/10"} text-sm font-bold`}
                >{s.l}</button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">Настройки сохраняются на этом устройстве.</p>
          </div>
        </div>
      )}

      {/* Birthday picker */}
      {bdayPickerOpen && (() => {
        const months = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
        const currentYear = new Date().getFullYear();
        const years: number[] = [];
        for (let y = currentYear; y >= 1920; y--) years.push(y);
        const daysInMonth = new Date(bdYear, bdMonth, 0).getDate();
        const days: number[] = [];
        for (let d = 1; d <= daysInMonth; d++) days.push(d);
        const dayValid = bdDay <= daysInMonth ? bdDay : daysInMonth;
        return (
          <div className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-4 animate-fade-in" onClick={() => setBdayPickerOpen(false)}>
            <div className="glass-strong rounded-3xl p-5 w-full max-w-sm animate-scale-in" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Icon name="Cake" size={18} className="text-violet-400" />
                  Дата рождения
                </h3>
                <button onClick={() => setBdayPickerOpen(false)} className="p-1.5 rounded-lg hover:bg-white/8">
                  <Icon name="X" size={18} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div>
                  <div className="text-[10px] text-muted-foreground mb-1 px-1">День</div>
                  <select value={dayValid} onChange={e => setBdDay(parseInt(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-2 py-3 text-sm font-semibold outline-none">
                    {days.map(d => <option key={d} value={d} className="bg-zinc-900">{d}</option>)}
                  </select>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground mb-1 px-1">Месяц</div>
                  <select value={bdMonth} onChange={e => setBdMonth(parseInt(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-2 py-3 text-sm font-semibold outline-none">
                    {months.map((m, i) => <option key={m} value={i + 1} className="bg-zinc-900">{m}</option>)}
                  </select>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground mb-1 px-1">Год</div>
                  <select value={bdYear} onChange={e => setBdYear(parseInt(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-2 py-3 text-sm font-semibold outline-none">
                    {years.map(y => <option key={y} value={y} className="bg-zinc-900">{y}</option>)}
                  </select>
                </div>
              </div>
              <div className="text-center text-sm text-violet-300 font-semibold mb-4">
                {dayValid} {months[bdMonth - 1].toLowerCase()} {bdYear} г.
              </div>
              <div className="flex gap-2">
                {currentUser.birthdate && (
                  <button onClick={clearBirthdate}
                    className="flex-1 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-sm font-semibold text-muted-foreground">
                    Очистить
                  </button>
                )}
                <button onClick={saveBirthdate} disabled={savingMeta}
                  className="flex-1 py-3 rounded-2xl grad-primary text-white font-bold text-sm disabled:opacity-60">
                  {savingMeta ? "Сохраняем..." : "Сохранить"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── SettingsPanel ────────────────────────────────────────────────────────────

export function SettingsPanel({ onLogout, onBack }: { onLogout: () => void; onBack?: () => void }) {
  useEdgeSwipeBack(onBack);
  const readBool = (k: string, def: boolean) => {
    const v = localStorage.getItem(k);
    return v == null ? def : v === "1";
  };
  const writeBool = (k: string, v: boolean) => localStorage.setItem(k, v ? "1" : "0");

  const [e2e, setE2e] = useState(() => readBool("nova_sec_e2e", true));
  const [twofa, setTwofa] = useState(() => Boolean(localStorage.getItem("nova_sec_pin")));
  const [biometric, setBiometric] = useState(() => readBool("nova_sec_biometric", true));
  const [notifications, setNotifications] = useState(() => readBool("nova_sec_notifications", true));
  const [msgPreview, setMsgPreview] = useState(() => readBool("nova_sec_msg_preview", false));

  // Звуки
  const [ringtone, setRingtone] = useState<RingtoneId>(() => getRingtoneId());
  const [notifySnd, setNotifySnd] = useState<NotifyId>(() => getNotifyId());
  const [volume, setVolumeS] = useState<number>(() => getVolume());
  const [customMeta, setCustomMeta] = useState<{ name: string; size: number; type: string } | null>(null);
  const ringFileRef = useRef<HTMLInputElement | null>(null);
  const [pushPerm, setPushPerm] = useState<NotificationPermission>(() => (typeof Notification !== "undefined" ? Notification.permission : "default"));
  const [soundError, setSoundError] = useState<string>("");

  useEffect(() => { getCustomRingtoneMeta().then(setCustomMeta); }, []);
  useEffect(() => {
    if (!soundError) return;
    const t = setTimeout(() => setSoundError(""), 3500);
    return () => clearTimeout(t);
  }, [soundError]);

  const onPickRingFile = () => ringFileRef.current?.click();
  const onRingFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("audio/")) { setSoundError("Можно загрузить только аудио"); return; }
    if (f.size > MAX_RINGTONE_SIZE) { setSoundError("Файл слишком большой (макс 10 МБ)"); return; }
    try {
      const meta = await saveCustomRingtone(f);
      setCustomMeta({ name: meta.name, size: meta.size, type: f.type });
      setRingtoneId("custom");
      setRingtone("custom");
    } catch {
      setSoundError("Не удалось сохранить файл");
    }
  };

  const requestPushPerm = async () => {
    if (typeof Notification === "undefined") return;
    const p = await Notification.requestPermission();
    setPushPerm(p);
  };

  const [pinFlow, setPinFlow] = useState<null | { step: "set" | "confirm" | "verify"; first?: string; value: string; error?: string }>(null);

  useEffect(() => { writeBool("nova_sec_e2e", e2e); }, [e2e]);
  useEffect(() => { writeBool("nova_sec_biometric", biometric); }, [biometric]);
  useEffect(() => { writeBool("nova_sec_notifications", notifications); }, [notifications]);
  useEffect(() => { writeBool("nova_sec_msg_preview", msgPreview); }, [msgPreview]);

  const toggle2FA = () => {
    if (twofa) {
      // Запросить текущий PIN перед отключением
      setPinFlow({ step: "verify", value: "" });
    } else {
      setPinFlow({ step: "set", value: "" });
    }
  };

  const submitPin = () => {
    if (!pinFlow) return;
    const v = pinFlow.value;
    if (pinFlow.step === "set") {
      if (v.length < 4) { setPinFlow({ ...pinFlow, error: "Минимум 4 цифры" }); return; }
      setPinFlow({ step: "confirm", first: v, value: "", error: undefined });
      return;
    }
    if (pinFlow.step === "confirm") {
      if (v !== pinFlow.first) { setPinFlow({ ...pinFlow, value: "", error: "Коды не совпадают" }); return; }
      localStorage.setItem("nova_sec_pin", v);
      setTwofa(true);
      setPinFlow(null);
      return;
    }
    if (pinFlow.step === "verify") {
      const saved = localStorage.getItem("nova_sec_pin");
      if (v !== saved) { setPinFlow({ ...pinFlow, value: "", error: "Неверный код" }); return; }
      localStorage.removeItem("nova_sec_pin");
      setTwofa(false);
      setPinFlow(null);
    }
  };

  const Toggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
    <button onClick={onToggle} className={`w-12 h-6 rounded-full transition-all duration-300 relative ${on ? "grad-primary" : "bg-white/10"}`}>
      <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300" style={{ left: on ? "calc(100% - 22px)" : "2px" }} />
    </button>
  );

  return (
    <div className="flex flex-col h-full animate-fade-in overflow-y-auto">
      <div className="px-4 pt-4 pb-4 flex items-start gap-2" style={{ paddingTop: "calc(1rem + env(safe-area-inset-top))" }}>
        {onBack && (
          <button onClick={onBack} className="md:hidden p-2 -ml-2 rounded-xl hover:bg-white/8 transition-colors flex-shrink-0">
            <Icon name="ChevronLeft" size={20} />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold mb-1">Безопасность</h2>
          <p className="text-sm text-muted-foreground">Управление защитой аккаунта</p>
        </div>
      </div>

      <div className="mx-4 mb-4 glass rounded-2xl p-4 border border-violet-500/20">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl grad-primary flex items-center justify-center">
            <Icon name="ShieldCheck" size={20} className="text-white" />
          </div>
          <div>
            <div className="font-semibold text-sm">Защита активна</div>
            <div className="text-xs text-violet-400">Все данные зашифрованы</div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground leading-relaxed">
          Nova использует сквозное шифрование (E2E). Ваши сообщения не могут быть прочитаны третьими лицами.
        </div>
      </div>

      <div className="px-4 space-y-2 pb-6">
        {[
          { icon: "Lock", label: "Сквозное шифрование", sub: "E2E для всех чатов", state: e2e, toggle: () => setE2e(v => !v), badge: "Signal" },
          { icon: "KeyRound", label: "Двухфакторная аутентификация", sub: twofa ? "PIN установлен" : "Код при входе", state: twofa, toggle: toggle2FA },
          { icon: "Fingerprint", label: "Биометрия", sub: "Вход по Face ID / Touch ID", state: biometric, toggle: () => setBiometric(v => !v) },
          { icon: "Bell", label: "Уведомления", sub: "Показывать оповещения", state: notifications, toggle: () => setNotifications(v => !v) },
          { icon: "Eye", label: "Предпросмотр сообщений", sub: "Текст в уведомлениях", state: msgPreview, toggle: () => setMsgPreview(v => !v) },
        ].map((item, i) => (
          <div key={item.icon} className={`flex items-center gap-3 px-4 py-3 glass rounded-2xl animate-fade-in stagger-${Math.min(i + 1, 5)}`}>
            <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center flex-shrink-0">
              <Icon name={item.icon as IconName} size={18} className="text-violet-400" />
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium truncate">{item.label}</span>
                {item.badge && <span className="text-[9px] bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">{item.badge}</span>}
              </div>
              <div className="text-xs text-muted-foreground truncate">{item.sub}</div>
            </div>
            <Toggle on={item.state} onToggle={item.toggle} />
          </div>
        ))}

        {/* Превью уведомления — наглядно показывает работу «Предпросмотра» */}
        <div className="px-4 py-3 glass rounded-2xl mt-1">
          <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">Пример уведомления</div>
          <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5">
            <div className="w-9 h-9 rounded-full grad-primary flex items-center justify-center text-white font-bold text-sm">N</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">Nova {notifications ? "" : "(выкл.)"}</div>
              <div className="text-xs text-muted-foreground truncate">
                {!notifications ? "Уведомления отключены" : msgPreview ? "Алексей: Привет! Как дела?" : "Новое сообщение"}
              </div>
            </div>
          </div>
        </div>

        {/* Push-разрешение */}
        {pushPerm !== "granted" && (
          <div className="px-4 py-3 glass rounded-2xl mt-1 flex items-center gap-3 border border-amber-500/30">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
              <Icon name="BellRing" size={18} className="text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">
                {pushPerm === "denied" ? "Уведомления заблокированы" : "Включи уведомления"}
              </div>
              <div className="text-xs text-muted-foreground">
                {pushPerm === "denied"
                  ? "Разреши в настройках браузера, чтобы видеть звонки и сообщения при заблокированном экране"
                  : "Чтобы получать звонки и сообщения, когда телефон заблокирован"}
              </div>
            </div>
            {pushPerm !== "denied" && (
              <button onClick={requestPushPerm} className="px-3 py-1.5 grad-primary text-white rounded-xl text-xs font-semibold flex-shrink-0">
                Включить
              </button>
            )}
          </div>
        )}

        {/* Звуки */}
        <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mt-4 mb-1 px-1">Звуки</div>
        {soundError && (
          <div className="px-4 py-2 glass rounded-xl border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <Icon name="AlertCircle" size={14} />
            <span>{soundError}</span>
          </div>
        )}

        {/* Громкость */}
        <div className="px-4 py-3 glass rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <Icon name="Volume2" size={16} className="text-violet-400" />
            <span className="text-sm font-medium">Громкость</span>
            <span className="ml-auto text-xs text-muted-foreground">{Math.round(volume * 100)}%</span>
          </div>
          <input
            type="range" min={0} max={100} step={5}
            value={Math.round(volume * 100)}
            onChange={(e) => { const v = Number(e.target.value) / 100; setVolumeS(v); setVolume(v); }}
            className="w-full accent-violet-500"
          />
        </div>

        {/* Мелодия звонка */}
        <div className="px-4 py-3 glass rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <Icon name="Phone" size={16} className="text-violet-400" />
            <span className="text-sm font-medium">Мелодия звонка</span>
          </div>
          <div className="space-y-1.5">
            {RINGTONES.map((r) => (
              <div key={r.id} className={`flex items-center gap-3 px-3 py-2 rounded-xl border ${ringtone === r.id ? "border-violet-500 bg-violet-500/10" : "border-white/5 hover:bg-white/5"}`}>
                <button
                  onClick={() => { setRingtone(r.id); setRingtoneId(r.id); }}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  <div className={`w-5 h-5 rounded-full border-2 ${ringtone === r.id ? "border-violet-500" : "border-white/20"} flex items-center justify-center flex-shrink-0`}>
                    {ringtone === r.id && <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{r.name}</div>
                    {r.id === "custom" && customMeta && <div className="text-[11px] text-muted-foreground truncate">{customMeta.name}</div>}
                    {r.id === "custom" && !customMeta && <div className="text-[11px] text-muted-foreground">Файл не загружен</div>}
                  </div>
                </button>
                {r.id === "custom" ? (
                  <>
                    <button onClick={onPickRingFile} className="p-1.5 rounded-lg hover:bg-white/8" title="Загрузить">
                      <Icon name="Upload" size={14} className="text-violet-400" />
                    </button>
                    {customMeta && (
                      <>
                        <button onClick={() => previewRingtone("custom")} className="p-1.5 rounded-lg hover:bg-white/8" title="Прослушать">
                          <Icon name="Play" size={14} />
                        </button>
                        <button onClick={async () => { await clearCustomRingtone(); setCustomMeta(null); if (ringtone === "custom") { setRingtone("nova"); setRingtoneId("nova"); } }} className="p-1.5 rounded-lg hover:bg-red-500/15 text-red-400" title="Удалить">
                          <Icon name="Trash2" size={14} />
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <button onClick={() => previewRingtone(r.id)} className="p-1.5 rounded-lg hover:bg-white/8" title="Прослушать">
                      <Icon name="Play" size={14} />
                    </button>
                    <button onClick={() => stopRingtone()} className="p-1.5 rounded-lg hover:bg-white/8" title="Остановить">
                      <Icon name="Square" size={14} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
          <input ref={ringFileRef} type="file" accept="audio/*" className="hidden" onChange={onRingFile} />
          <p className="text-[11px] text-muted-foreground mt-2">Загрузи MP3, WAV или другой аудиофайл — он будет играть как в Telegram при входящем звонке.</p>
        </div>

        {/* Звук уведомлений */}
        <div className="px-4 py-3 glass rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <Icon name="Bell" size={16} className="text-violet-400" />
            <span className="text-sm font-medium">Звук уведомлений</span>
          </div>
          <div className="space-y-1.5">
            {NOTIFY_SOUNDS.map((s) => (
              <div key={s.id} className={`flex items-center gap-3 px-3 py-2 rounded-xl border ${notifySnd === s.id ? "border-violet-500 bg-violet-500/10" : "border-white/5 hover:bg-white/5"}`}>
                <button
                  onClick={() => { setNotifySnd(s.id); setNotifyId(s.id); previewNotifySound(s.id); }}
                  className="flex items-center gap-3 flex-1 text-left"
                >
                  <div className={`w-5 h-5 rounded-full border-2 ${notifySnd === s.id ? "border-violet-500" : "border-white/20"} flex items-center justify-center flex-shrink-0`}>
                    {notifySnd === s.id && <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />}
                  </div>
                  <span className="text-sm">{s.name}</span>
                </button>
                <button onClick={() => previewNotifySound(s.id)} className="p-1.5 rounded-lg hover:bg-white/8">
                  <Icon name="Play" size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={async () => {
            try {
              const chats = await api("get_chats", {}, currentUser.id);
              const out: { exported_at: string; user: { id: number; name: string; phone: string }; chats: unknown[] } = {
                exported_at: new Date().toISOString(),
                user: { id: currentUser.id, name: currentUser.name, phone: currentUser.phone },
                chats: [],
              };
              for (const ch of (chats.chats || [])) {
                const msgs = await api("get_messages", { chat_id: ch.id, since: 0 }, currentUser.id);
                out.chats.push({ chat: ch, messages: msgs.messages || [] });
              }
              const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `nova_backup_${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
            } catch { /* ignore */ }
          }}
          className="w-full flex items-center gap-3 px-4 py-3 glass rounded-2xl hover:bg-white/5 transition-all mt-2"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <Icon name="Download" size={18} className="text-emerald-400" />
          </div>
          <div className="flex-1 text-left">
            <div className="text-sm font-medium">Резервная копия</div>
            <div className="text-xs text-muted-foreground">Скачать все чаты в файл JSON</div>
          </div>
          <Icon name="ChevronRight" size={16} className="text-muted-foreground ml-auto" />
        </button>

        <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 glass rounded-2xl hover:bg-red-500/10 transition-all mt-2">
          <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center">
            <Icon name="LogOut" size={18} className="text-red-400" />
          </div>
          <span className="text-sm font-medium text-red-400">Выйти из аккаунта</span>
          <Icon name="ChevronRight" size={16} className="text-red-400/50 ml-auto" />
        </button>
      </div>

      {pinFlow && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in" onClick={() => setPinFlow(null)}>
          <div className="glass-strong rounded-2xl p-5 w-full max-w-sm animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl grad-primary flex items-center justify-center">
                <Icon name="KeyRound" size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="font-semibold">
                  {pinFlow.step === "set" && "Придумайте PIN-код"}
                  {pinFlow.step === "confirm" && "Повторите PIN-код"}
                  {pinFlow.step === "verify" && "Введите PIN-код"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {pinFlow.step === "verify" ? "Чтобы отключить 2FA" : "От 4 до 6 цифр"}
                </div>
              </div>
            </div>
            <input
              autoFocus
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pinFlow.value}
              onChange={(e) => setPinFlow({ ...pinFlow, value: e.target.value.replace(/\D/g, ""), error: undefined })}
              onKeyDown={(e) => { if (e.key === "Enter") submitPin(); }}
              className="w-full text-center text-2xl tracking-[0.5em] font-bold bg-white/5 rounded-xl py-3 outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="••••"
            />
            {pinFlow.error && <p className="text-red-400 text-xs mt-2 text-center">{pinFlow.error}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setPinFlow(null)} className="flex-1 px-4 py-2.5 rounded-xl hover:bg-white/8 text-sm">Отмена</button>
              <button onClick={submitPin} className="flex-1 grad-primary text-white rounded-xl py-2.5 text-sm font-semibold">
                {pinFlow.step === "verify" ? "Отключить" : pinFlow.step === "set" ? "Далее" : "Готово"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}