import { useEffect, useState } from "react";
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
  const [index] = useState(startIndex);
  const current = items[index];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] bg-black animate-fade-in">
      <div
        className="absolute inset-0 flex items-center justify-center"
        onClick={onClose}
      >
        {current.type === "image" ? (
          <img
            src={current.url}
            alt=""
            className="max-w-full max-h-full w-auto h-auto object-contain select-none"
            draggable={false}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <video
            src={current.url}
            controls
            autoPlay
            playsInline
            className="max-w-full max-h-full"
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>

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
    </div>
  );
}
