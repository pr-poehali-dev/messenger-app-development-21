import { useEffect } from "react";
import Icon from "@/components/ui/icon";
import type { IconName } from "@/lib/api";

interface Feature {
  id: string;
  title: string;
  desc: string;
  icon: IconName;
  color: string;
  status: "soon" | "beta" | "preview";
}

const FEATURES: Feature[] = [
  {
    id: "groups",
    title: "Группы и каналы",
    desc: "Чаты до 200 000 человек, каналы с трансляциями, аватарка группы, права участников и админов.",
    icon: "Users",
    color: "from-sky-500 to-cyan-500",
    status: "soon",
  },
  {
    id: "stories",
    title: "Истории на сервере",
    desc: "Реальные сторис с просмотрами, реакциями и приватностью «только друзья».",
    icon: "Circle",
    color: "from-pink-500 to-rose-500",
    status: "preview",
  },
  {
    id: "secret",
    title: "Секретные чаты E2E",
    desc: "Сквозное шифрование на устройстве: ключи никогда не покидают телефон. Исчезающие сообщения уже работают — выбери таймер в меню любого чата.",
    icon: "ShieldCheck",
    color: "from-emerald-500 to-teal-500",
    status: "beta",
  },
  {
    id: "bots",
    title: "Bot API",
    desc: "Уже работает! Создавай ботов в Профиле → Мои боты. Получи токен, подключи webhook или long-polling, и бот начнёт отвечать в чатах.",
    icon: "Bot",
    color: "from-violet-500 to-purple-600",
    status: "beta",
  },
];

export function ComingSoon({ open, onClose, focus }: { open: boolean; onClose: () => void; focus?: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const items = focus ? FEATURES.filter(f => f.id === focus) : FEATURES;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-lg bg-[#15151f] border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Скоро в Nova</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/8">
            <Icon name="X" size={16} />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Эти возможности уже в работе. Бэкенд готовится — следи за обновлениями.
        </p>
        <div className="space-y-2">
          {items.map(f => (
            <div key={f.id} className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center flex-shrink-0`}>
                <Icon name={f.icon} size={20} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">{f.title}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${
                    f.status === "beta" ? "bg-amber-500/20 text-amber-300" :
                    f.status === "preview" ? "bg-sky-500/20 text-sky-300" :
                    "bg-violet-500/20 text-violet-300"
                  }`}>
                    {f.status === "beta" ? "БЕТА" : f.status === "preview" ? "ПРЕВЬЮ" : "СКОРО"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ComingSoon;