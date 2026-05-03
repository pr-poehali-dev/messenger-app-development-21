import Icon from "@/components/ui/icon";
import type { Message, GiftPayload, FundraiserPayload } from "@/lib/api";

export function GiftBubble({ msg }: { msg: Message }) {
  const p = (msg.payload || {}) as GiftPayload;
  const qty = p.quantity || 0;
  const text = p.message || "";

  return (
    <div className={`relative max-w-[280px] w-full rounded-3xl overflow-hidden ${msg.out ? "ml-auto" : ""}`}
      style={{ background: "linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #eab308 100%)", boxShadow: "0 8px 24px rgba(245,158,11,0.35)" }}>
      <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/15" />
      <div className="absolute -left-4 -bottom-4 w-16 h-16 rounded-full bg-white/10" />
      <div className="relative p-4 text-white">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-3xl">⚡</span>
          <span className="font-black text-sm uppercase tracking-wider">Подарок</span>
        </div>
        <div className="text-4xl font-black mb-1">{qty}</div>
        <div className="text-xs text-white/80 mb-2">молн{qty === 1 ? "ия" : qty >= 2 && qty <= 4 ? "ии" : "ий"}</div>
        {text && (
          <div className="bg-white/15 rounded-xl px-3 py-2 text-xs italic mb-2 backdrop-blur">
            «{text}»
          </div>
        )}
        <div className="text-[10px] text-white/70">
          ≈ {(qty * 3).toLocaleString("ru")} ₽ · от {msg.out ? "тебя" : msg.sender_name || "друга"}
        </div>
        <div className="absolute bottom-2 right-3 text-[10px] text-white/80">{msg.time}</div>
      </div>
    </div>
  );
}

export function FundraiserBubble({ msg, onOpen }: { msg: Message; onOpen: (id: number) => void }) {
  const p = (msg.payload || {}) as FundraiserPayload;
  const collected = p.collected_amount || 0;
  const target = p.target_amount || 1;
  const pct = Math.min(100, Math.round((collected / target) * 100));

  return (
    <button
      onClick={() => p.fundraiser_id && onOpen(p.fundraiser_id)}
      className={`relative max-w-[300px] w-full rounded-3xl overflow-hidden text-left active:scale-[0.98] transition ${msg.out ? "ml-auto" : ""}`}
      style={{ background: "linear-gradient(135deg, #ec4899 0%, #a855f7 100%)", boxShadow: "0 8px 24px rgba(168,85,247,0.35)" }}>
      {p.cover_url ? (
        <img src={p.cover_url} alt="" className="w-full h-32 object-cover" />
      ) : (
        <div className="h-20 flex items-center justify-center">
          <Icon name="HandHeart" size={36} className="text-white" />
        </div>
      )}
      <div className="p-3 text-white">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Icon name="HandHeart" size={12} className="text-white/85" />
          <span className="text-[10px] uppercase tracking-wider font-black text-white/85">Сбор средств</span>
        </div>
        <div className="font-bold text-sm mb-2 line-clamp-2">{p.title || "Сбор"}</div>
        <div className="space-y-1">
          <div className="flex items-baseline justify-between text-xs">
            <span className="font-black">{collected.toLocaleString("ru")} ₽</span>
            <span className="text-white/70">из {target.toLocaleString("ru")} ₽</span>
          </div>
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex items-center justify-between text-[10px] text-white/80">
            <span>{pct}% собрано</span>
            <span>Поддержать →</span>
          </div>
        </div>
        <div className="text-right text-[10px] text-white/70 mt-2">{msg.time}</div>
      </div>
    </button>
  );
}

export function StickerBubble({ msg }: { msg: Message }) {
  const p = (msg.payload || {}) as { image_url?: string; emoji?: string };
  if (!p.image_url) return null;
  return (
    <div className={`max-w-[180px] ${msg.out ? "ml-auto" : ""}`}>
      <img src={p.image_url} alt={p.emoji || "sticker"} className="w-full h-auto" draggable={false} />
      <div className={`text-[10px] text-muted-foreground mt-0.5 ${msg.out ? "text-right" : ""}`}>{msg.time}</div>
    </div>
  );
}
