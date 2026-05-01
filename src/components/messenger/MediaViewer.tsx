import { useEffect, useState, useRef } from "react";
import Icon from "@/components/ui/icon";

export interface MediaItem {
  url: string;
  type: "image" | "video";
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
  const [animDir, setAnimDir] = useState<"left" | "right" | null>(null);
  const touchStartX = useRef<number | null>(null);

  const current = items[index];
  const hasPrev = index > 0;
  const hasNext = index < items.length - 1;

  const go = (dir: "prev" | "next") => {
    if (dir === "prev" && !hasPrev) return;
    if (dir === "next" && !hasNext) return;
    setAnimDir(dir === "next" ? "left" : "right");
    setTimeout(() => {
      setIndex(i => dir === "next" ? i + 1 : i - 1);
      setAnimDir(null);
    }, 150);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") go("prev");
      if (e.key === "ArrowRight") go("next");
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [index, hasPrev, hasNext]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) go(dx < 0 ? "next" : "prev");
    touchStartX.current = null;
  };

  const slideClass = animDir === "left"
    ? "opacity-0 -translate-x-8"
    : animDir === "right"
      ? "opacity-0 translate-x-8"
      : "opacity-100 translate-x-0";

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex flex-col animate-fade-in"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top))" }}
      >
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-white/15 transition-colors"
        >
          <Icon name="X" size={20} className="text-white" />
        </button>

        {items.length > 1 && (
          <span className="text-sm text-white/70 tabular-nums">
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
        onClick={onClose}
      >
        {/* Prev arrow */}
        {hasPrev && (
          <button
            onClick={(e) => { e.stopPropagation(); go("prev"); }}
            className="absolute left-3 z-10 w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-white/15 transition-colors"
          >
            <Icon name="ChevronLeft" size={22} className="text-white" />
          </button>
        )}

        {/* Media */}
        <div
          className={`max-w-[92vw] max-h-[82vh] flex items-center justify-center transition-all duration-150 ${slideClass}`}
          onClick={(e) => e.stopPropagation()}
        >
          {current.type === "image" ? (
            <img
              key={current.url}
              src={current.url}
              alt=""
              className="max-w-[92vw] max-h-[82vh] object-contain rounded-lg"
              draggable={false}
            />
          ) : (
            <video
              key={current.url}
              src={current.url}
              controls
              autoPlay
              playsInline
              className="max-w-[92vw] max-h-[82vh] rounded-lg"
            />
          )}
        </div>

        {/* Next arrow */}
        {hasNext && (
          <button
            onClick={(e) => { e.stopPropagation(); go("next"); }}
            className="absolute right-3 z-10 w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-white/15 transition-colors"
          >
            <Icon name="ChevronRight" size={22} className="text-white" />
          </button>
        )}
      </div>

      {/* Dot indicators */}
      {items.length > 1 && items.length <= 20 && (
        <div className="flex justify-center gap-1.5 py-3 flex-shrink-0" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`rounded-full transition-all ${i === index ? "w-5 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/30"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
