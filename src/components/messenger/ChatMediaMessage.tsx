import { useState, useRef } from "react";
import Icon from "@/components/ui/icon";
import { type Message, type Reaction } from "@/lib/api";

// ─── QUICK_REACTIONS ──────────────────────────────────────────────────────────

export const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

// ─── MediaMessage ─────────────────────────────────────────────────────────────

export function MediaMessage({ msg }: { msg: Message }) {
  const [playing, setPlaying] = useState(false);
  const [curTime, setCurTime] = useState(0);
  const [duration, setDuration] = useState(0);
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

  const formatTime = (sec: number) => {
    if (!isFinite(sec) || sec < 0) sec = 0;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
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
      <img
        src={mediaUrl}
        alt="фото"
        className="w-full max-w-[260px] rounded-xl object-cover cursor-pointer"
        onError={() => setImgError(true)}
        onClick={(e) => { e.stopPropagation(); window.open(mediaUrl, "_blank"); }}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
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
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        />
      </div>
    );
  }

  if (mediaType === "audio") {
    const togglePlay = (e: React.MouseEvent) => {
      e.stopPropagation();
      const a = audioRef.current;
      if (!a) return;
      if (playing) { a.pause(); setPlaying(false); }
      else {
        a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
      }
    };
    const progress = duration > 0 ? (curTime / duration) * 100 : 0;
    return (
      <div
        className="flex items-center gap-3 px-1 py-1 min-w-[220px]"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(139,92,246,0.25)" }}
        >
          <Icon name={playing ? "Pause" : "Play"} size={18} className="text-violet-400" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium">Голосовое</div>
            <div className="text-[10px] text-muted-foreground tabular-nums">
              {formatTime(playing || curTime > 0 ? curTime : duration)}
            </div>
          </div>
          <div className="w-full h-1 bg-white/20 rounded-full mt-1">
            <div className="h-full bg-violet-400 rounded-full" style={{ width: `${progress}%`, transition: "width 0.1s" }} />
          </div>
        </div>
        <audio
          ref={audioRef}
          src={mediaUrl}
          preload="metadata"
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration;
            if (isFinite(d)) setDuration(d);
          }}
          onTimeUpdate={(e) => setCurTime(e.currentTarget.currentTime)}
          onEnded={() => { setPlaying(false); setCurTime(0); }}
          onPause={() => setPlaying(false)}
          onPlay={() => setPlaying(true)}
        />
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