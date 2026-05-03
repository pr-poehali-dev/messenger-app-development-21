import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";

export default function ExpiringIndicator({ expiresAt, out }: { expiresAt: number; out: boolean }) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, expiresAt - now);
  if (left <= 0) return null;
  const label =
    left < 60 ? `${left}с` :
    left < 3600 ? `${Math.ceil(left / 60)}м` :
    left < 86400 ? `${Math.ceil(left / 3600)}ч` :
    `${Math.ceil(left / 86400)}д`;
  return (
    <span className={`text-[10px] italic flex items-center gap-0.5 ${out ? "text-white/70" : "text-amber-400/80"}`}>
      <Icon name="Timer" size={10} />
      {label}
    </span>
  );
}
