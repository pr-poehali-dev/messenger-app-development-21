import { useEffect, useState } from "react";

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
    <div
      className="fixed inset-0 z-[100] bg-black animate-fade-in flex items-center justify-center"
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
  );
}
