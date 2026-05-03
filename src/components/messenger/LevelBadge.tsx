import Icon from "@/components/ui/icon";

const TIERS: { min: number; gradient: string; icon: string; iconColor: string }[] = [
  { min: 25, gradient: "linear-gradient(135deg, #f59e0b, #eab308)", icon: "Trophy", iconColor: "#fff" },
  { min: 10, gradient: "linear-gradient(135deg, #a855f7, #ec4899)", icon: "Award", iconColor: "#fff" },
  { min: 5,  gradient: "linear-gradient(135deg, #6366f1, #8b5cf6)", icon: "Star", iconColor: "#fff" },
  { min: 0,  gradient: "linear-gradient(135deg, #475569, #64748b)", icon: "Sparkles", iconColor: "#fff" },
];

export default function LevelBadge({ level, size = 16, showIcon = true }: { level?: number | null; size?: number; showIcon?: boolean }) {
  const lvl = Math.max(1, level || 1);
  const tier = TIERS.find(t => lvl >= t.min)!;
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-md font-black text-white px-1 py-0"
      style={{ background: tier.gradient, fontSize: size * 0.7, lineHeight: 1.4, height: size + 4, minWidth: size + 8 }}
      title={`Уровень ${lvl}`}
    >
      {showIcon && <Icon name={tier.icon} size={size * 0.6} style={{ color: tier.iconColor }} />}
      <span>{lvl}</span>
    </span>
  );
}
