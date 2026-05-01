import { useEffect } from "react";
import Icon from "@/components/ui/icon";

export function MediaViewer({
  url,
  type,
  onClose,
}: {
  url: string;
  type: "image" | "video";
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3" style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top))" }}>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-white/15 transition-colors"
        >
          <Icon name="X" size={20} className="text-white" />
        </button>
        <a
          href={url}
          download
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-white/15 transition-colors"
        >
          <Icon name="Download" size={18} className="text-white" />
        </a>
      </div>

      <div
        className="max-w-[95vw] max-h-[90vh] flex items-center justify-center animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {type === "image" ? (
          <img
            src={url}
            alt="Просмотр"
            className="max-w-[95vw] max-h-[90vh] object-contain rounded-lg"
          />
        ) : (
          <video
            src={url}
            controls
            autoPlay
            playsInline
            className="max-w-[95vw] max-h-[90vh] rounded-lg"
          />
        )}
      </div>
    </div>
  );
}
