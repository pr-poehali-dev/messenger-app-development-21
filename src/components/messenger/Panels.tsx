import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Avatar } from "./types";
import type { Story, IconName } from "./types";
import { CONTACTS } from "./types";

export function SearchPanel() {
  const [query, setQuery] = useState("");
  const results = query.length > 0 ? CONTACTS.filter(c => c.name.toLowerCase().includes(query.toLowerCase())) : CONTACTS;

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="px-4 pt-4 pb-3">
        <h2 className="text-xl font-bold mb-3">Поиск</h2>
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
        {!query && <div className="text-xs text-muted-foreground px-2 pb-2 uppercase tracking-widest font-semibold">Все контакты</div>}
        {results.map((c, i) => (
          <button key={c.id} className={`w-full flex items-center gap-3 p-3 glass rounded-2xl hover:bg-white/8 transition-all animate-fade-in stagger-${Math.min(i + 1, 5)}`}>
            <Avatar label={c.avatar} id={c.id} online={c.online} />
            <div className="text-left">
              <div className="font-semibold text-sm">{c.name}</div>
              <div className="text-xs text-muted-foreground">{c.status}</div>
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

export function ProfilePanel({ onSettings }: { onSettings: () => void }) {
  return (
    <div className="flex flex-col h-full animate-fade-in overflow-y-auto">
      {/* Hero */}
      <div className="relative px-6 pt-8 pb-6 text-center">
        <div className="relative inline-block mb-4">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-4xl font-bold text-white animate-pulse-glow">
            Я
          </div>
          <button className="absolute bottom-0 right-0 w-8 h-8 grad-primary rounded-full flex items-center justify-center text-white shadow-lg">
            <Icon name="Camera" size={14} />
          </button>
        </div>
        <h2 className="text-2xl font-bold">Алексей Петров</h2>
        <p className="text-muted-foreground text-sm mt-1">+7 (999) 123-45-67</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-emerald-400 text-xs font-medium">В сети</span>
        </div>
        <div className="mt-3 px-4 py-2.5 glass rounded-2xl text-sm text-muted-foreground text-left">
          🚀 Запускаю новые проекты. Люблю технологии и кофе ☕
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 px-4 mb-4">
        {[
          { label: "Контакты", value: "248", icon: "Users" },
          { label: "Медиа", value: "1.2K", icon: "Image" },
          { label: "Группы", value: "14", icon: "Hash" },
        ].map((s, i) => (
          <div key={s.label} className={`glass rounded-2xl p-3 text-center animate-fade-in stagger-${i + 1}`}>
            <Icon name={s.icon as IconName} size={18} className="text-violet-400 mx-auto mb-1" />
            <div className="text-lg font-bold grad-text">{s.value}</div>
            <div className="text-[11px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="px-4 space-y-2 mb-6">
        {[
          { icon: "Edit3", label: "Редактировать профиль", sub: "Имя, фото, статус" },
          { icon: "Bell", label: "Уведомления", sub: "Звуки, вибрация" },
          { icon: "Shield", label: "Конфиденциальность", sub: "Блокировки, кто видит" },
          { icon: "Lock", label: "Шифрование", sub: "Управление ключами E2E" },
          { icon: "Palette", label: "Оформление", sub: "Тема, шрифт, фон" },
        ].map((item, i) => (
          <button
            key={item.icon}
            onClick={item.icon === "Shield" || item.icon === "Lock" ? onSettings : undefined}
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
    </div>
  );
}

export function SettingsPanel() {
  const [e2e, setE2e] = useState(true);
  const [twofa, setTwofa] = useState(false);
  const [biometric, setBiometric] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [msgPreview, setMsgPreview] = useState(false);

  const Toggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
    <button onClick={onToggle} className={`w-12 h-6 rounded-full transition-all duration-300 relative ${on ? "grad-primary" : "bg-white/10"}`}>
      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300 ${on ? "left-6.5" : "left-0.5"}`} style={{ left: on ? "calc(100% - 22px)" : "2px" }} />
    </button>
  );

  return (
    <div className="flex flex-col h-full animate-fade-in overflow-y-auto">
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-xl font-bold mb-1">Безопасность</h2>
        <p className="text-sm text-muted-foreground">Управляйте защитой аккаунта</p>
      </div>

      {/* Encryption card */}
      <div className="mx-4 my-3 p-4 rounded-2xl bg-gradient-to-br from-violet-600/20 to-indigo-600/10 border border-violet-500/20">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
            <Icon name="ShieldCheck" size={20} className="text-violet-400" />
          </div>
          <div>
            <div className="font-semibold text-sm">Сквозное шифрование</div>
            <div className="text-xs text-violet-400">Протокол Signal E2E</div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">Все сообщения шифруются на вашем устройстве. Никто — даже наши серверы — не может их прочитать.</p>
      </div>

      <div className="px-4 space-y-2 pb-6">
        {[
          { icon: "Lock", label: "Сквозное шифрование", sub: "E2E для всех чатов", state: e2e, toggle: () => setE2e(v => !v), badge: "Signal" },
          { icon: "KeyRound", label: "Двухфакторная аутентификация", sub: "Код при входе", state: twofa, toggle: () => setTwofa(v => !v) },
          { icon: "Fingerprint", label: "Биометрия", sub: "Вход по Face ID / Touch ID", state: biometric, toggle: () => setBiometric(v => !v) },
          { icon: "Bell", label: "Уведомления", sub: "Показывать оповещения", state: notifications, toggle: () => setNotifications(v => !v) },
          { icon: "Eye", label: "Предпросмотр сообщений", sub: "Текст в уведомлениях", state: msgPreview, toggle: () => setMsgPreview(v => !v) },
        ].map((item, i) => (
          <div key={item.icon} className={`flex items-center gap-3 px-4 py-3 glass rounded-2xl animate-fade-in stagger-${Math.min(i + 1, 5)}`}>
            <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center flex-shrink-0">
              <Icon name={item.icon as IconName} size={18} className="text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{item.label}</span>
                {item.badge && <span className="text-[9px] bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded-full font-bold">{item.badge}</span>}
              </div>
              <div className="text-xs text-muted-foreground">{item.sub}</div>
            </div>
            <Toggle on={item.state} onToggle={item.toggle} />
          </div>
        ))}

        <button className="w-full flex items-center gap-3 px-4 py-3 glass rounded-2xl hover:bg-white/8 transition-all mt-2">
          <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center">
            <Icon name="LogOut" size={18} className="text-red-400" />
          </div>
          <span className="text-sm font-medium text-red-400">Выйти из аккаунта</span>
          <Icon name="ChevronRight" size={16} className="text-red-400/50 ml-auto" />
        </button>
      </div>
    </div>
  );
}

export function StoryViewer({ story, onClose }: { story: Story; onClose: () => void }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setProgress(p => { if (p >= 100) { onClose(); return 100; } return p + 2; }), 60);
    return () => clearInterval(t);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-lg animate-scale-in">
      <div className="relative w-full max-w-sm h-[85vh] rounded-3xl overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${story.gradient}`} />
        <div className="absolute inset-0 flex flex-col p-5">
          <div className="w-full h-1 bg-white/20 rounded-full mb-4">
            <div className="h-full bg-white rounded-full transition-none" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-white">{story.avatar}</div>
            <span className="text-white font-semibold">{story.name}</span>
            <span className="text-white/60 text-sm ml-auto">сейчас</span>
            <button onClick={onClose} className="text-white/80 hover:text-white ml-2">
              <Icon name="X" size={20} />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="text-6xl mb-4">✨</div>
              <p className="text-xl font-bold">История {story.name}</p>
              <p className="text-white/60 mt-2 text-sm">Сегодня · 10 просмотров</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1 glass rounded-2xl px-4 py-3 flex items-center gap-2">
              <input className="flex-1 bg-transparent outline-none text-white text-sm placeholder-white/40" placeholder="Ответить..." />
            </div>
            <button className="w-12 h-12 grad-primary rounded-2xl flex items-center justify-center text-white">
              <Icon name="Send" size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
