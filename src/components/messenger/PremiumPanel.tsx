import Icon from "@/components/ui/icon";
import { type User, type IconName } from "@/lib/api";
import { useEdgeSwipeBack } from "@/hooks/useEdgeSwipeBack";
import { useT } from "@/hooks/useT";

interface Props {
  currentUser: User;
  onClose: () => void;
  onSubscribe?: () => void;
}

export default function PremiumPanel({ currentUser, onClose, onSubscribe }: Props) {
  useEdgeSwipeBack(onClose);
  const { t } = useT();
  const isPro = !!currentUser.pro_until && currentUser.pro_until > Math.floor(Date.now() / 1000);

  const features: { icon: IconName; title: string; desc: string; color: string }[] = [
    {
      icon: "Film",
      title: t("premium.feature1"),
      desc: t("premium.feature1Desc"),
      color: "from-fuchsia-500 to-pink-500",
    },
    {
      icon: "Sticker",
      title: t("premium.feature2"),
      desc: t("premium.feature2Desc"),
      color: "from-violet-500 to-indigo-500",
    },
    {
      icon: "Heart",
      title: t("premium.feature3"),
      desc: t("premium.feature3Desc"),
      color: "from-rose-500 to-orange-500",
    },
    {
      icon: "Zap",
      title: t("premium.feature4"),
      desc: t("premium.feature4Desc"),
      color: "from-amber-500 to-yellow-500",
    },
    {
      icon: "Lock",
      title: t("premium.feature5"),
      desc: t("premium.feature5Desc"),
      color: "from-emerald-500 to-teal-500",
    },
  ];

  return (
    <div className="fixed inset-0 z-[260] bg-background flex flex-col animate-fade-in">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b border-white/5 glass-strong"
        style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top))" }}
      >
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-xl hover:bg-white/5 transition-colors"
          aria-label={t("common.back")}
        >
          <Icon name="ChevronLeft" size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-base truncate flex items-center gap-2">
            <span>👑</span>
            <span>{t("premium.title")}</span>
          </h2>
          <p className="text-[11px] text-muted-foreground truncate">{t("premium.subtitle")}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Hero блок */}
        <div className="relative px-5 pt-6 pb-5 text-center overflow-hidden">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background:
                "radial-gradient(circle at 30% 20%, #f59e0b 0%, transparent 50%), radial-gradient(circle at 70% 80%, #ec4899 0%, transparent 50%)",
            }}
          />
          <div className="relative">
            <div
              className="inline-flex w-20 h-20 rounded-3xl items-center justify-center text-4xl mb-4 shadow-xl"
              style={{ background: "linear-gradient(135deg, #f59e0b, #ec4899)" }}
            >
              👑
            </div>
            <h1 className="text-2xl font-black mb-2">
              {t("premium.title")}
            </h1>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              {t("premium.subtitle")}
            </p>
            {isPro && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                <Icon name="CheckCircle2" size={14} className="text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-300">Premium активен</span>
              </div>
            )}
          </div>
        </div>

        {/* Список преимуществ */}
        <div className="px-4 pb-4 space-y-2">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`glass rounded-2xl p-4 flex items-start gap-3 animate-fade-in stagger-${Math.min(i + 1, 5)}`}
            >
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center flex-shrink-0 shadow-lg`}
              >
                <Icon name={f.icon} size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold mb-0.5">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
              <Icon name="Check" size={14} className="text-emerald-400 flex-shrink-0 mt-1" />
            </div>
          ))}
        </div>

        {/* CTA */}
        {!isPro && (
          <div
            className="sticky bottom-0 px-4 pt-3 pb-4 bg-gradient-to-t from-background via-background/95 to-transparent"
            style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
          >
            <button
              onClick={onSubscribe}
              className="w-full h-14 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-2 shadow-2xl active:scale-95 transition-transform"
              style={{ background: "linear-gradient(135deg, #f59e0b, #ec4899)" }}
            >
              <span>👑</span>
              {t("premium.subscribe")}
              <Icon name="ChevronRight" size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
