import Icon from "@/components/ui/icon";
import { SupportTicket, SupportMsg, fmtTime } from "./AdminAPI";

interface AdminSupportTabProps {
  visible: boolean;
  tickets: SupportTicket[];
  ticketStatusFilter: "all" | "open" | "closed";
  onChangeStatusFilter: (s: "all" | "open" | "closed") => void;
  onOpenTicket: (t: SupportTicket) => void;

  // active ticket
  activeTicket: SupportTicket | null;
  ticketMessages: SupportMsg[];
  ticketReply: string;
  setTicketReply: (v: string) => void;
  ticketSending: boolean;
  onCloseActiveTicket: () => void;
  onCloseTicket: () => void;
  onSendReply: () => void;
}

export function AdminSupportTab({
  visible,
  tickets,
  ticketStatusFilter,
  onChangeStatusFilter,
  onOpenTicket,
  activeTicket,
  ticketMessages,
  ticketReply,
  setTicketReply,
  ticketSending,
  onCloseActiveTicket,
  onCloseTicket,
  onSendReply,
}: AdminSupportTabProps) {
  return (
    <>
      {visible && <div className="space-y-2 animate-fade-in">
        <div className="flex gap-1 glass rounded-xl p-1">
          {(["open", "all", "closed"] as const).map(s => (
            <button
              key={s}
              onClick={() => onChangeStatusFilter(s)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${ticketStatusFilter === s ? "bg-violet-500/30 text-violet-200" : "text-muted-foreground"}`}
            >
              {s === "open" ? "Открытые" : s === "all" ? "Все" : "Закрытые"}
            </button>
          ))}
        </div>
        {tickets.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">Тикетов нет</p>
        ) : tickets.map(t => (
          <button
            key={t.id}
            onClick={() => onOpenTicket(t)}
            className="w-full glass rounded-2xl p-3 flex items-start gap-3 hover:bg-white/8 transition text-left"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center font-bold text-white text-sm flex-shrink-0">
              {t.user_avatar ? <img src={t.user_avatar} alt={t.user_name} className="w-full h-full object-cover" /> : (t.user_name || "?")[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm truncate flex-1">{t.user_name || `User #${t.user_id}`}</span>
                {t.unread > 0 && (
                  <span className="px-1.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{t.unread}</span>
                )}
                {t.status === "closed" && <span className="text-[10px] bg-zinc-500/20 text-zinc-300 px-2 py-0.5 rounded-full">закрыт</span>}
              </div>
              <p className="text-[11px] text-violet-400 font-medium truncate">{t.subject}</p>
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{t.last_text}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{fmtTime(t.last_message_at)}</p>
            </div>
          </button>
        ))}
      </div>}

      {/* Active ticket modal */}
      {activeTicket && (
        <div className="fixed inset-0 z-[230] bg-black/60 backdrop-blur flex items-end" onClick={onCloseActiveTicket}>
          <div className="w-full max-w-lg mx-auto glass-strong rounded-t-3xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 p-4 border-b border-white/5">
              <button onClick={onCloseActiveTicket} className="p-2 rounded-xl hover:bg-white/8">
                <Icon name="X" size={18} />
              </button>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate">{activeTicket.user_name || `User #${activeTicket.user_id}`}</div>
                <div className="text-[11px] text-muted-foreground truncate">{activeTicket.subject} · {activeTicket.user_phone}</div>
              </div>
              {activeTicket.status === "open" && (
                <button
                  onClick={onCloseTicket}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/20"
                >
                  Закрыть
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {ticketMessages.map(m => (
                <div key={m.id} className={`flex ${m.is_admin ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.is_admin ? "grad-primary text-white rounded-tr-md" : "bg-white/5 text-foreground rounded-tl-md"}`}>
                    {!m.is_admin && <div className="text-[10px] font-bold text-muted-foreground mb-0.5">{activeTicket.user_name}</div>}
                    {m.is_admin && <div className="text-[10px] font-bold text-white/70 mb-0.5">Поддержка (вы)</div>}
                    <p className="whitespace-pre-wrap break-words">{m.text}</p>
                    <div className={`text-[10px] mt-1 ${m.is_admin ? "text-white/70" : "text-muted-foreground"}`}>
                      {new Date(m.created_at * 1000).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {activeTicket.status === "open" ? (
              <div className="p-3 flex items-center gap-2 border-t border-white/5">
                <input
                  value={ticketReply}
                  onChange={e => setTicketReply(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      onSendReply();
                    }
                  }}
                  placeholder="Ответ пользователю..."
                  className="flex-1 glass rounded-xl px-3 py-2 text-sm outline-none"
                />
                <button
                  onClick={onSendReply}
                  disabled={!ticketReply.trim() || ticketSending}
                  className="w-10 h-10 grad-primary rounded-xl text-white flex items-center justify-center disabled:opacity-50"
                >
                  {ticketSending
                    ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <Icon name="Send" size={14} />}
                </button>
              </div>
            ) : (
              <div className="p-3 text-center text-xs text-muted-foreground border-t border-white/5">
                Тикет закрыт
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default AdminSupportTab;