import { useState } from "react";
import Icon from "@/components/ui/icon";
import { type Message, type Reaction } from "@/lib/api";
import { MediaViewer, type MediaItem } from "@/components/messenger/MediaViewer";
import { VoiceMessage } from "@/components/messenger/VoiceMessage";

// ─── QUICK_REACTIONS ──────────────────────────────────────────────────────────

export const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

// ─── MediaMessage ─────────────────────────────────────────────────────────────

export function MediaMessage({ msg, gallery = [], galleryIndex = 0, out = false }: { msg: Message; gallery?: MediaItem[]; galleryIndex?: number; out?: boolean }) {
  const [imgError, setImgError] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  const mediaUrl = msg.media_url || msg.image_url;
  const mediaType = msg.media_type || (msg.image_url ? "image" : null);

  if (!mediaType || !mediaUrl) return null;

  const formatSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
  };

  if (mediaType === "image") {
    if (imgError) return (
      <a
        href={mediaUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        className="w-full max-w-[260px] h-32 rounded-xl bg-white/10 flex flex-col items-center justify-center gap-1 hover:bg-white/15 transition-colors"
      >
        <Icon name="ImageOff" size={24} className="text-muted-foreground" />
        <span className="text-[11px] text-muted-foreground">Открыть фото</span>
      </a>
    );
    return (
      <>
        <img
          src={mediaUrl}
          alt="фото"
          className="w-full max-w-[260px] rounded-xl object-cover cursor-pointer"
          onError={() => setImgError(true)}
          onClick={(e) => { e.stopPropagation(); setViewerOpen(true); }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        />
        {viewerOpen && (
          <MediaViewer
            items={gallery.length > 0 ? gallery : [{ url: mediaUrl, type: "image" }]}
            startIndex={gallery.length > 0 ? galleryIndex : 0}
            onClose={() => setViewerOpen(false)}
          />
        )}
      </>
    );
  }

  if (mediaType === "video") {
    return (
      <>
        <div
          className="w-full max-w-[260px] rounded-xl overflow-hidden relative cursor-pointer group"
          onClick={(e) => { e.stopPropagation(); setViewerOpen(true); }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <video
            src={mediaUrl}
            className="w-full rounded-xl pointer-events-none"
            style={{ maxHeight: 300 }}
            playsInline
            preload="metadata"
            muted
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
            <div className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
              <Icon name="Play" size={24} className="text-white ml-0.5" />
            </div>
          </div>
        </div>
        {viewerOpen && (
          <MediaViewer
            items={gallery.length > 0 ? gallery : [{ url: mediaUrl, type: "video" }]}
            startIndex={gallery.length > 0 ? galleryIndex : 0}
            onClose={() => setViewerOpen(false)}
          />
        )}
      </>
    );
  }

  if (mediaType === "audio") {
    return <VoiceMessage url={mediaUrl} out={out} />;
  }

  if (mediaType === "file") {
    return (
      <a
        href={mediaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 px-1 py-1 min-w-[200px] hover:opacity-80 transition-opacity"
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(16,185,129,0.2)" }}>
          <Icon name="FileText" size={18} className="text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium truncate">{msg.file_name || "Файл"}</div>
          <div className="text-[10px] text-muted-foreground">{formatSize(msg.file_size)}</div>
        </div>
        <Icon name="Download" size={16} className="text-muted-foreground flex-shrink-0" />
      </a>
    );
  }

  return null;
}

// ─── ReactionBar ──────────────────────────────────────────────────────────────

export function ReactionBar({ reactions, currentUserId, onReact }: { reactions: Reaction[]; currentUserId: number; onReact: (emoji: string) => void }) {
  const grouped: Record<string, { count: number; users: string[]; mine: boolean }> = {};
  for (const r of reactions) {
    if (r.emoji === "__removed__") continue;
    if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, users: [], mine: false };
    grouped[r.emoji].count++;
    grouped[r.emoji].users.push(r.user_name);
    if (r.user_id === currentUserId) grouped[r.emoji].mine = true;
  }
  const entries = Object.entries(grouped).filter(([, v]) => v.count > 0);
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 px-2 pb-1">
      {entries.map(([emoji, data]) => (
        <button
          key={emoji}
          onClick={() => onReact(emoji)}
          title={data.users.join(", ")}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all ${
            data.mine ? "bg-violet-500/30 border border-violet-500/50" : "bg-white/10 hover:bg-white/20"
          }`}
        >
          <span>{emoji}</span>
          {data.count > 1 && <span className="text-[10px] font-bold">{data.count}</span>}
        </button>
      ))}
    </div>
  );
}