import { useState, useRef } from "react";
import Icon from "@/components/ui/icon";
import { type Message, type Reaction } from "@/lib/api";

// ─── QUICK_REACTIONS ──────────────────────────────────────────────────────────

export const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

// ─── MediaMessage ─────────────────────────────────────────────────────────────

export function MediaMessage({ msg }: { msg: Message }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [imgError, setImgError] = useState(false);

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
      <div className="w-full max-w-[260px] h-32 rounded-xl bg-white/10 flex items-center justify-center">
        <Icon name="ImageOff" size={24} className="text-muted-foreground" />
      </div>
    );
    return (
      <img
        src={mediaUrl}
        alt="фото"
        className="w-full max-w-[260px] rounded-xl object-cover cursor-pointer"
        onError={() => setImgError(true)}
        onClick={() => window.open(mediaUrl, "_blank")}
      />
    );
  }

  if (mediaType === "video") {
    return (
      <div className="w-full max-w-[260px] rounded-xl overflow-hidden">
        <video
          src={mediaUrl}
          controls
          className="w-full rounded-xl"
          style={{ maxHeight: 300 }}
          playsInline
        />
      </div>
    );
  }

  if (mediaType === "audio") {
    const togglePlay = () => {
      if (!audioRef.current) return;
      if (playing) { audioRef.current.pause(); setPlaying(false); }
      else { audioRef.current.play(); setPlaying(true); }
    };
    return (
      <div className="flex items-center gap-3 px-1 py-1 min-w-[200px]">
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(139,92,246,0.25)" }}
        >
          <Icon name={playing ? "Pause" : "Play"} size={18} className="text-violet-400" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium">Голосовое</div>
          <div className="w-full h-1 bg-white/20 rounded-full mt-1">
            <div className="h-full bg-violet-400 rounded-full" style={{ width: playing ? "50%" : "0%", transition: "width 0.1s" }} />
          </div>
        </div>
        <audio ref={audioRef} src={mediaUrl} onEnded={() => setPlaying(false)} />
      </div>
    );
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
