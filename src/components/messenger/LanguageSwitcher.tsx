import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { LANGS, type Lang } from "@/lib/i18n";
import { useT } from "@/hooks/useT";

interface Props {
  variant?: "icon" | "compact" | "full";
}

export function LanguageSwitcher({ variant = "icon" }: Props) {
  const { lang, setLang, t } = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const current = LANGS.find(l => l.code === lang) || LANGS[0];

  const choose = (code: Lang) => {
    setLang(code);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      {variant === "icon" && (
        <button
          onClick={() => setOpen(v => !v)}
          title={t("nav.language")}
          aria-label={t("nav.language")}
          className="w-10 h-10 rounded-xl glass flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <span className="text-base leading-none">🌐</span>
        </button>
      )}
      {variant === "compact" && (
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl glass hover:bg-white/10 text-xs font-semibold"
        >
          <span className="text-base leading-none">🌐</span>
          <span className="uppercase">{current.code}</span>
          <Icon name="ChevronDown" size={12} />
        </button>
      )}
      {variant === "full" && (
        <button
          onClick={() => setOpen(v => !v)}
          className="w-full flex items-center gap-3 px-4 py-3 glass rounded-2xl hover:bg-white/8 transition-all"
        >
          <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center text-lg">🌐</div>
          <div className="flex-1 text-left">
            <div className="text-sm font-medium">{t("nav.language")}</div>
            <div className="text-xs text-muted-foreground">{current.flag} {current.label}</div>
          </div>
          <Icon name="ChevronRight" size={16} className="text-muted-foreground" />
        </button>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 min-w-[170px] rounded-2xl glass-strong border border-white/10 shadow-2xl overflow-hidden animate-scale-in">
            {LANGS.map(l => (
              <button
                key={l.code}
                onClick={() => choose(l.code)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 transition-colors text-sm ${
                  l.code === lang ? "bg-violet-500/10 text-violet-300" : ""
                }`}
              >
                <span className="text-lg leading-none">{l.flag}</span>
                <span className="flex-1 text-left font-medium">{l.label}</span>
                {l.code === lang && <Icon name="Check" size={14} className="text-violet-400" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default LanguageSwitcher;
