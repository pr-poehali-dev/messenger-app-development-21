import { useRef, useState, type ReactNode } from "react";
import Icon from "@/components/ui/icon";

const SWIPE_THRESHOLD = 60;
const MAX_SWIPE = 90;

export function SwipeableMessage({
  out,
  onReply,
  children,
}: {
  out: boolean;
  onReply: () => void;
  children: ReactNode;
}) {
  const [dx, setDx] = useState(0);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const locked = useRef<"x" | "y" | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    locked.current = null;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (startX.current === null || startY.current === null) return;
    const diffX = e.touches[0].clientX - startX.current;
    const diffY = e.touches[0].clientY - startY.current;

    if (locked.current === null) {
      if (Math.abs(diffX) > 8 || Math.abs(diffY) > 8) {
        locked.current = Math.abs(diffX) > Math.abs(diffY) ? "x" : "y";
      }
    }
    if (locked.current !== "x") return;

    // свайп вправо для всех
    if (diffX > 0) {
      setDx(Math.min(diffX, MAX_SWIPE));
    }
  };

  const onTouchEnd = () => {
    if (dx >= SWIPE_THRESHOLD) {
      onReply();
      if (navigator.vibrate) try { navigator.vibrate(15); } catch { /* ignore */ }
    }
    setDx(0);
    startX.current = null;
    startY.current = null;
    locked.current = null;
  };

  const triggered = dx >= SWIPE_THRESHOLD;

  return (
    <div className="relative">
      <div
        className={`absolute inset-y-0 left-0 flex items-center pl-2 transition-opacity ${dx > 10 ? "opacity-100" : "opacity-0"}`}
        style={{ width: dx }}
      >
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${triggered ? "bg-violet-500 scale-110" : "bg-white/10"}`}
        >
          <Icon name="Reply" size={16} className={triggered ? "text-white" : "text-violet-400"} />
        </div>
      </div>
      <div
        className={out ? "flex justify-end" : "flex justify-start"}
        style={{
          transform: `translateX(${dx}px)`,
          transition: dx === 0 ? "transform 0.2s ease" : "none",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
