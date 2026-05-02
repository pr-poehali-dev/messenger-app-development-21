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
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const current = items[index];
  const hasPrev = index > 0;
  const hasNext = index < items.length - 1;

  const go = (dir: "prev" | "next") => {
    if (dir === "prev" && !hasPrev) return;
    if (dir === "next" && !hasNext) return;
    setIndex((i) => (dir === "next" ? i + 1 : i - 1));
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
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    // Горизонтальный свайп — навигация
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
      go(dx < 0 ? "next" : "prev");
    } else if (dy > 100 && Math.abs(dy) > Math.abs(dx)) {
      // Свайп вниз — закрытие
      onClose();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black animate-fade-in"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Фото на весь экран */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        onClick={onClose}
      >
        <div
          className="w-full h-full flex items-center justify-center animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {current.type === "image" ? (
            <img
              key={current.url}
              src={current.url}
              alt=""
              className="max-w-full max-h-full w-auto h-auto object-contain select-none"
              draggable={false}
            />
          ) : (
            <video
              key={current.url}
              src={current.url}
              controls
              autoPlay
              playsInline
              className="max-w-full max-h-full"
            />
          )}
        </div>
      </div>

      {/* Верхняя панель — поверх фото с градиентом */}
      <div
        className="absolute top-0 left-0 right-0 z-20 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%)",
        }}
      >
        <div
          className="flex items-center justify-between px-4 pointer-events-auto"
          style={{
            paddingTop: "calc(0.75rem + env(safe-area-inset-top))",
            paddingBottom: "1.25rem",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors active:scale-90"
          >
            <Icon name="X" size={22} className="text-white" />
          </button>
          {items.length > 1 && (
            <span className="text-sm font-medium text-white tabular-nums">
              {index + 1} / {items.length}
            </span>
          )}
          <a
            href={current.url}
            download
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors active:scale-90"
          >
            <Icon name="Download" size={20} className="text-white" />
          </a>
        </div>
      </div>

      {/* Стрелки навигации (десктоп) */}
      {hasPrev && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); go("prev"); }}
          className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm items-center justify-center hover:bg-black/60 transition-colors"
        >
          <Icon name="ChevronLeft" size={24} className="text-white" />
        </button>
      )}
      {hasNext && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); go("next"); }}
          className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm items-center justify-center hover:bg-black/60 transition-colors"
        >
          <Icon name="ChevronRight" size={24} className="text-white" />
        </button>
      )}

      {/* Точки-индикаторы внизу */}
      {items.length > 1 && items.length <= 20 && (
        <div
          className="absolute bottom-0 left-0 right-0 z-20 flex justify-center gap-1.5"
          style={{
            paddingBottom: "calc(1rem + env(safe-area-inset-bottom))",
            paddingTop: "1.5rem",
            background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 100%)",
          }}
        >
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => { e.stopPropagation(); setIndex(i); }}
              className={`rounded-full transition-all ${
                i === index ? "w-5 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
