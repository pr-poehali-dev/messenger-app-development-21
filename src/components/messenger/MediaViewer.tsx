import { useCallback, useEffect, useRef, useState } from "react";
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
  const [index, setIndex] = useState(Math.max(0, Math.min(startIndex, items.length - 1)));
  const [closing, setClosing] = useState(false);
  // Свайп / drag-to-dismiss
  const [dragY, setDragY] = useState(0);
  const dragStartY = useRef<number | null>(null);
  const dragStartX = useRef<number | null>(null);
  const dragAxis = useRef<"y" | "x" | null>(null);
  // Pinch zoom (для image)
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null);

  const current = items[index];

  const close = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 180);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") setIndex(i => Math.min(items.length - 1, i + 1));
      if (e.key === "ArrowLeft") setIndex(i => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [close, items.length]);

  // Сброс zoom при смене медиа
  useEffect(() => {
    setScale(1); setPan({ x: 0, y: 0 });
  }, [index]);

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && current.type === "image") {
      const [a, b] = [e.touches[0], e.touches[1]];
      const dx = a.clientX - b.clientX;
      const dy = a.clientY - b.clientY;
      pinchStart.current = { dist: Math.hypot(dx, dy), scale };
      dragStartY.current = null;
      dragStartX.current = null;
      return;
    }
    if (scale > 1) return; // zoom активен — не свайпаем
    dragStartY.current = e.touches[0].clientY;
    dragStartX.current = e.touches[0].clientX;
    dragAxis.current = null;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStart.current) {
      const [a, b] = [e.touches[0], e.touches[1]];
      const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const next = Math.max(1, Math.min(4, pinchStart.current.scale * (d / pinchStart.current.dist)));
      setScale(next);
      return;
    }
    if (dragStartY.current === null || dragStartX.current === null) return;
    const dy = e.touches[0].clientY - dragStartY.current;
    const dx = e.touches[0].clientX - dragStartX.current;
    if (!dragAxis.current) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        dragAxis.current = Math.abs(dy) > Math.abs(dx) ? "y" : "x";
      }
    }
    if (dragAxis.current === "y") {
      setDragY(dy);
    } else if (dragAxis.current === "x") {
      // переключение между галереей
      // визуального трекинга нет — переключим в onTouchEnd
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (pinchStart.current && e.touches.length < 2) {
      pinchStart.current = null;
    }
    if (dragAxis.current === "y") {
      if (dragY > 100) close();
      setDragY(0);
    } else if (dragAxis.current === "x" && dragStartX.current !== null) {
      const dx = (e.changedTouches[0]?.clientX ?? dragStartX.current) - dragStartX.current;
      if (dx < -50 && index < items.length - 1) setIndex(i => i + 1);
      if (dx > 50 && index > 0) setIndex(i => i - 1);
    }
    dragStartY.current = null;
    dragStartX.current = null;
    dragAxis.current = null;
  };

  const onDoubleClickImg = () => {
    setScale(s => (s > 1 ? 1 : 2));
    setPan({ x: 0, y: 0 });
  };

  if (!current) return null;

  const dragProgress = Math.min(1, Math.abs(dragY) / 400);
  const bgOpacity = closing ? 0 : 1 - dragProgress * 0.6;
  const contentTransform = `translate3d(0, ${dragY}px, 0) scale(${closing ? 0.9 : 1 - dragProgress * 0.1})`;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center select-none"
      style={{ background: `rgba(0,0,0,${bgOpacity})`, transition: closing ? "background 180ms ease-out" : (dragY === 0 ? "background 200ms ease-out" : "none") }}
      onClick={close}
    >
      {/* Top bar */}
      <div
        className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-3 bg-gradient-to-b from-black/70 to-transparent"
        style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top))" }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={close}
          className="w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white active:scale-95 transition"
        >
          <Icon name="X" size={20} />
        </button>
        {items.length > 1 && (
          <div className="text-white text-sm font-medium px-3 py-1 rounded-full bg-black/40 backdrop-blur">
            {index + 1} / {items.length}
          </div>
        )}
        {current.type === "image" && (
          <a
            href={current.url}
            target="_blank"
            rel="noopener noreferrer"
            download
            onClick={e => e.stopPropagation()}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white active:scale-95 transition"
          >
            <Icon name="Download" size={18} />
          </a>
        )}
        {current.type !== "image" && <div className="w-10 h-10" />}
      </div>

      {/* Содержимое */}
      <div
        className="w-full h-full flex items-center justify-center"
        style={{ transform: contentTransform, transition: closing ? "transform 180ms ease-out" : (dragY === 0 ? "transform 200ms ease-out" : "none") }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={e => e.stopPropagation()}
      >
        {current.type === "image" ? (
          <img
            src={current.url}
            alt=""
            draggable={false}
            onDoubleClick={onDoubleClickImg}
            className="max-w-full max-h-full w-auto h-auto object-contain select-none"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transition: pinchStart.current ? "none" : "transform 150ms ease-out" }}
          />
        ) : (
          <video
            src={current.url}
            controls
            autoPlay
            playsInline
            className="max-w-full max-h-full"
          />
        )}
      </div>

      {/* Навигация (desktop) */}
      {items.length > 1 && (
        <>
          {index > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setIndex(i => i - 1); }}
              className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 backdrop-blur items-center justify-center text-white hover:bg-black/60 z-10"
            >
              <Icon name="ChevronLeft" size={22} />
            </button>
          )}
          {index < items.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setIndex(i => i + 1); }}
              className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 backdrop-blur items-center justify-center text-white hover:bg-black/60 z-10"
            >
              <Icon name="ChevronRight" size={22} />
            </button>
          )}
        </>
      )}

      {/* Подсказка свайпа */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/40 text-[11px] pointer-events-none" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        свайп вниз — закрыть
      </div>
    </div>
  );
}
