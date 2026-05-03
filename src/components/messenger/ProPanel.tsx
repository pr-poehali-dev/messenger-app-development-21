import { useState } from "react";
import Icon from "@/components/ui/icon";
import { api, type User } from "@/lib/api";

interface Props {
  currentUser: User;
  onClose: () => void;
  onUserUpdate?: (u: User) => void;
  onOpenWallet?: () => void;
}

const PLANS = [
  { id: "test", title: "Тест 7 дней", price: 1, sub: "Только для разработки", badge: "DEV" },
  { id: "month", title: "1 месяц", price: 299, sub: "299 ₽/мес", badge: "" },
  { id: "year", title: "1 год", price: 1990, sub: "166 ₽/мес · −44%", badge: "ВЫГОДНО" },
];

const FEATURES = [
  { icon: "Crown", text: "Эмодзи-статус и цветной ник" },
  { icon: "Eye", text: "Инкогнито (скрыть «в сети»)" },
  { icon: "Image", text: "Отправка файлов до 4 ГБ" },
  { icon: "Lock", text: "Контроль входящих от незнакомцев" },
  { icon: "Zap", text: "Без рекламы навсегда" },
  { icon: "Headphones", text: "Приоритетная поддержка 24/7" },
  { icon: "Palette", text: "Эксклюзивные темы и стикеры" },
  { icon: "Users", text: "Групповые звонки до 50 человек" },
];

export default function ProPanel({ currentUser, onClose, onUserUpdate, onOpenWallet }: Props) {
  const [selected, setSelected] = useState<string>("month");
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState("");

  const balance = currentUser.wallet_balance || 0;
  const isPro = currentUser.is_pro || (currentUser.pro_until && currentUser.pro_until > Date.now() / 1000);
  const plan = PLANS.find(p => p.id === selected)!;

  const buy = async () => {
    setBuying(true); setError("");
    const r = await api("buy_pro", { plan: selected }, currentUser.id);
    setBuying(false);
    if (r.is_pro) {
      const userR = await api("get_me", { phone: currentUser.phone });
      if (userR.user) {
        onUserUpdate?.(userR.user);
        localStorage.setItem("nova_user", JSON.stringify(userR.user));
      }
      onClose();
    } else {
      setError(r.error || "Не удалось оформить");
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-md glass-strong rounded-t-3xl sm:rounded-3xl p-5 pb-7 max-h-[90vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
            style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)" }}>
            👑
          </div>
        </div>
        <h2 className="text-2xl font-black text-center mb-1">Nova Pro</h2>
        <p className="text-muted-foreground text-sm text-center mb-4">Полный доступ к расширенным возможностям</p>

        {/* Active Pro */}
        {isPro && (
          <div className="rounded-2xl p-3 mb-4 flex items-center gap-3"
            style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(249,115,22,0.15))", border: "1px solid rgba(245,158,11,0.3)" }}>
            <Icon name="ShieldCheck" size={20} className="text-amber-400" />
            <div className="flex-1">
              <div className="text-sm font-bold text-amber-400">Pro активен</div>
              <div className="text-xs text-muted-foreground">
                до {currentUser.pro_until ? new Date(currentUser.pro_until * 1000).toLocaleDateString("ru") : "—"}
              </div>
            </div>
          </div>
        )}

        {/* Features */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          {FEATURES.map(f => (
            <div key={f.icon} className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(245,158,11,0.15)" }}>
                <Icon name={f.icon} size={14} style={{ color: "#f59e0b" }} />
              </div>
              <span className="text-[11px] font-medium leading-tight">{f.text}</span>
            </div>
          ))}
        </div>

        {/* Plans */}
        <div className="space-y-2 mb-3">
          {PLANS.map(p => (
            <button key={p.id} onClick={() => setSelected(p.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${
                selected === p.id
                  ? "border-amber-400 bg-amber-500/10"
                  : "border-white/10 hover:border-white/20"
              }`}>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                selected === p.id ? "border-amber-400 bg-amber-400" : "border-white/30"
              }`}>
                {selected === p.id && <Icon name="Check" size={12} className="text-black" />}
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{p.title}</span>
                  {p.badge && (
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                      p.badge === "DEV" ? "bg-violet-500/20 text-violet-300" : "bg-emerald-500/20 text-emerald-300"
                    }`}>{p.badge}</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">{p.sub}</div>
              </div>
              <div className="font-black text-base">{p.price} ₽</div>
            </button>
          ))}
        </div>

        {/* Wallet info */}
        <div className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2 mb-3 text-sm">
          <div className="flex items-center gap-2">
            <Icon name="Wallet" size={14} className="text-violet-400" />
            <span className="text-muted-foreground">Баланс:</span>
            <span className="font-bold">{balance.toLocaleString("ru", { minimumFractionDigits: 2 })} ₽</span>
          </div>
          {onOpenWallet && (
            <button onClick={onOpenWallet} className="text-xs text-violet-400 font-semibold hover:underline">
              Пополнить
            </button>
          )}
        </div>

        {balance < plan.price && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 mb-3 text-xs text-amber-300">
            Недостаточно средств. Не хватает {(plan.price - balance).toFixed(2)} ₽
          </div>
        )}

        {error && <p className="text-sm text-red-400 text-center mb-3">{error}</p>}

        <button
          onClick={buy}
          disabled={buying || balance < plan.price}
          className="w-full py-4 rounded-2xl font-black text-white text-base disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)" }}
        >
          {buying ? "Оформляем..." : isPro ? `Продлить за ${plan.price} ₽` : `Оформить за ${plan.price} ₽`}
        </button>
        <button onClick={onClose} className="w-full py-3 text-sm text-muted-foreground mt-1">
          Не сейчас
        </button>
      </div>
    </div>
  );
}
