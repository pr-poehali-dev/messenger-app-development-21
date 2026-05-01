import { useEffect, useState, useRef } from "react";
import Icon from "@/components/ui/icon";

export interface MediaItem {
  url: string;
  type: "image" | "video";
}

export interface OriginRect {
  top: number; left: number; width: number; height: number;
}

export function MediaViewer({
  items,
  startIndex = 0,
  onClose,
}: {
  items: MediaItem[];
  startIndex?: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);

  const [scale, setScale] = useState(1);
  const lastDist = useRef<number | null>(null);

  const current = items[index];
  const hasPrev = index > 0;
  const hasNext = index < items.length - 1;

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") go("prev");
      if (e.key === "ArrowRight") go("next");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, hasPrev, hasNext]);

  const close = () => {
    setClosing(true);
    setDragY(0);
    setTimeout(onClose, 250);
  };

  const go = (dir: "prev" | "next") => {
    if (dir === "prev" && !hasPrev) return;
    if (dir === "next" && !hasNext) return;
    setScale(1);
    setIndex(i => dir === "next" ? i + 1 : i - 1);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      lastDist.current = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY,
      );
      return;
    }
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setDragging(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastDist.current !== null) {
      const dist = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY,
      );
      setScale(s => Math.max(1, Math.min(4, s * (dist / lastDist.current!))));
      lastDist.current = dist;
      return;
    }
    if (touchStartY.current !== null && scale <= 1) {
      const dy = e.touches[0].clientY - touchStartY.current;
      if (dy > 0) setDragY(dy);
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    lastDist.current = null;
    setDragging(false);
    if (dragY > 100) { setDragY(0); close(); return; }
    if (touchStartX.current !== null && touchStartY.current !== null && scale <= 1) {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
      if (Math.abs(dx) > 50 && dy < 60) go(dx < 0 ? "next" : "prev");
    }
    setDragY(0);
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const bgOpacity = closing ? 0 : visible ? Math.max(0, 1 - dragY / 300) : 0;
  const imgTransform = `translateY(${dragY}px) scale(${
    dragging && dragY > 0 ? Math.max(0.85, 1 - dragY / 600) : scale
  })`;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col"
      style={{
        background: `rgba(0,0,0,${bgOpacity * 0.96})`,
        transition: "background 0.3s",
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 flex-shrink-0 transition-opacity duration-300"
        style={{
          paddingTop: "calc(0.75rem + env(safe-area-inset-top))",
          paddingBottom: "0.75rem",
          opacity: visible && !closing ? 1 : 0,
        }}
      >
        <button
          onClick={close}
          className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-white/15 transition-colors"
        >
          <Icon name="X" size={20} className="text-white" />
        </button>
        {items.length > 1 && (
          <span className="text-sm font-medium text-white/80 tabular-nums">
            {index + 1} / {items.length}
          </span>
        )}
        <a
          href={current.url}
          download
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-white/15 transition-colors"
        >
          <Icon name="Download" size={18} className="text-white" />
        </a>
      </div>

      {/* Media area */}
      <div
        className="flex-1 flex items-center justify-center relative overflow-hidden"
        onClick={() => { if (scale <= 1) close(); }}
        onDoubleClick={(e) => { e.stopPropagation(); setScale(s => s > 1 ? 1 : 2.5); }}
      >
        {hasPrev && (
          <button
            onClick={(e) => { e.stopPropagation(); go("prev"); }}
            className="absolute left-3 z-10 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center transition-opacity opacity-0 md:opacity-70 hover:opacity-100"
          >
            <Icon name="ChevronLeft" size={22} className="text-white" />
          </button>
        )}

        <div
          className="max-w-[96vw] max-h-[84vh] flex items-center justify-center"
          style={{
            transform: imgTransform,
            transition: dragging ? "none" : "transform 0.28s cubic-bezier(0.25,0.46,0.45,0.94)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {current.type === "image" ? (
            <img
              key={current.url}
              src={current.url}
              alt=""
              className="max-w-[96vw] max-h-[84vh] object-contain rounded-2xl shadow-2xl"
              style={{
                opacity: visible && !closing ? 1 : 0,
                transform: visible && !closing ? "scale(1)" : "scale(0.88)",
                transition: "opacity 0.28s, transform 0.28s cubic-bezier(0.34,1.56,0.64,1)",
                userSelect: "none",
                WebkitUserSelect: "none",
              }}
              draggable={false}
            />
          ) : (
            <video
              key={current.url}
              src={current.url}
              controls
              autoPlay
              playsInline
              className="max-w-[96vw] max-h-[84vh] rounded-2xl shadow-2xl"
              style={{
                opacity: visible && !closing ? 1 : 0,
                transition: "opacity 0.28s",
              }}
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>

        {hasNext && (
          <button
            onClick={(e) => { e.stopPropagation(); go("next"); }}
            className="absolute right-3 z-10 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center transition-opacity opacity-0 md:opacity-70 hover:opacity-100"
          >
            <Icon name="ChevronRight" size={22} className="text-white" />
          </button>
        )}
      </div>

      {/* Dot indicators */}
      {items.length > 1 && items.length <= 20 && (
        <div
          className="flex justify-center gap-1.5 flex-shrink-0 transition-opacity duration-300"
          style={{
            paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))",
            paddingTop: "0.75rem",
            opacity: visible && !closing ? 1 : 0,
          }}
        >
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => { setScale(1); setIndex(i); }}
              className={`rounded-full transition-all duration-300 ${i === index ? "w-5 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/35 hover:bg-white/60"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
