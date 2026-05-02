import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { api, avatarGrad, type Contact, type User, type Chat } from "@/lib/api";
import { Avatar } from "@/components/messenger/ChatComponents";

export function ContactsPanel({
  currentUser,
  onStartChat,
  onCall,
  onBack,
}: {
  currentUser: User;
  onStartChat: (chat: Chat) => void;
  onCall: (contact: Contact) => void;
  onBack?: () => void;
}) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [search, setSearch] = useState("");

  const loadContacts = async () => {
    setLoading(true);
    const data = await api("get_contacts", {}, currentUser.id);
    if (data.contacts) setContacts(data.contacts);
    setLoading(false);
  };

  useEffect(() => { loadContacts(); }, []);

  const addContact = async () => {
    if (!phone.trim()) return;
    setAdding(true);
    setAddError("");
    const data = await api("add_contact", { phone: phone.trim(), name: name.trim() || undefined }, currentUser.id);
    if (data.ok) {
      setPhone("");
      setName("");
      setShowAdd(false);
      loadContacts();
    } else {
      setAddError(data.error || "Ошибка");
    }
    setAdding(false);
  };

  const removeContact = async (contactId: number) => {
    await api("remove_contact", { contact_id: contactId }, currentUser.id);
    setContacts(prev => prev.filter(c => c.id !== contactId));
  };

  const openChat = async (contact: Contact) => {
    const data = await api("get_or_create_chat", { partner_id: contact.id }, currentUser.id);
    if (data.chat_id) {
      onStartChat({
        id: data.chat_id,
        name: contact.name,
        avatar: contact.name[0]?.toUpperCase() || "?",
        lastMsg: "",
        time: "",
        partner_id: contact.id,
      });
    }
  };

  const filtered = contacts.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );

  // Group by first letter
  const grouped = filtered.reduce<Record<string, Contact[]>>((acc, c) => {
    const letter = c.name[0]?.toUpperCase() || "#";
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(c);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="px-4 py-4 glass-strong border-b border-white/5" style={{ paddingTop: "calc(1rem + env(safe-area-inset-top))" }}>
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-1 min-w-0">
            {onBack && (
              <button onClick={onBack} className="md:hidden p-2 -ml-2 rounded-xl hover:bg-white/8 transition-colors flex-shrink-0">
                <Icon name="ChevronLeft" size={20} />
              </button>
            )}
            <h2 className="text-lg font-bold truncate">Контакты</h2>
          </div>
          <button
            onClick={() => { setShowAdd(v => !v); setAddError(""); }}
            className={`p-2 rounded-xl transition-all flex-shrink-0 ${showAdd ? "grad-primary text-white" : "glass hover:bg-white/8 text-muted-foreground"}`}
          >
            <Icon name={showAdd ? "X" : "UserPlus"} size={18} />
          </button>
        </div>
        {/* Search */}
        <div className="flex items-center gap-2 glass rounded-xl px-3 py-2">
          <Icon name="Search" size={15} className="text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск контактов..."
            className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder-muted-foreground"
          />
        </div>
      </div>

      {/* Add contact form */}
      {showAdd && (
        <div className="px-4 py-4 border-b border-white/5 glass animate-fade-in">
          <p className="text-xs text-muted-foreground mb-3">Добавить по номеру телефона</p>
          <input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="Номер телефона (+79991234567)"
            className="w-full glass rounded-xl px-4 py-2.5 text-sm outline-none text-foreground placeholder-muted-foreground mb-2"
          />
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Имя (необязательно)"
            className="w-full glass rounded-xl px-4 py-2.5 text-sm outline-none text-foreground placeholder-muted-foreground mb-2"
          />
          {addError && <p className="text-red-400 text-xs mb-2">{addError}</p>}
          <button
            onClick={addContact}
            disabled={adding || !phone.trim()}
            className="w-full grad-primary text-white rounded-xl py-2.5 text-sm font-semibold glow-primary transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {adding ? "Добавляем..." : "Добавить контакт"}
          </button>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          </div>
        )}

        {!loading && contacts.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center px-8">
            <div className="w-16 h-16 glass rounded-3xl flex items-center justify-center mb-4">
              <Icon name="Users" size={28} className="text-violet-400" />
            </div>
            <p className="font-semibold mb-1">Контактов пока нет</p>
            <p className="text-sm text-muted-foreground">Нажми + чтобы добавить первый контакт</p>
          </div>
        )}

        {!loading && Object.keys(grouped).sort().map(letter => (
          <div key={letter}>
            <div className="px-4 py-1.5">
              <span className="text-[11px] font-bold text-violet-400 uppercase tracking-wider">{letter}</span>
            </div>
            {grouped[letter].map(contact => (
              <div
                key={contact.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer group"
                onClick={() => openChat(contact)}
              >
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0 ${avatarGrad(contact.id)}`}
                >
                  {contact.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{contact.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{contact.phone}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => { e.stopPropagation(); onCall(contact); }}
                    className="p-2 glass rounded-xl text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                  >
                    <Icon name="Phone" size={15} />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); removeContact(contact.id); }}
                    className="p-2 glass rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Icon name="UserMinus" size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}