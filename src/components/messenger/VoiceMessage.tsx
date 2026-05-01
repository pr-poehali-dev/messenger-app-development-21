import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";

// Генерируем псевдо-случайные bars на основе url (детерминировано)
function generateBars(seed: string, count = 40): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    h = (Math.imul(1664525, h) + 1013904223) | 0;
    const v = ((h >>> 0) % 80) + 20; // 20–100%
    bars.push(v);
  }
  return bars;
}

export function VoiceMessage({
  url,
  out,
}: {
  url: string;
  out: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const [duration, setDuration] = useState(0);
  const [curTime, setCurTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const bars = useRef(generateBars(url, 40)).current;

  useEffect(() => {
    return () => { audioRef.current?.pause(); };
  }, [url]);

  const togglePlay = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    (e as React.MouseEvent).preventDefault?.();
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); }
    else { a.play().catch(() => {}); }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const a = audioRef.current;
    if (!a || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    a.currentTime = ratio * duration;
    setProgress(ratio);
  };

  const fmt = (s: number) => {
    if (!isFinite(s) || s < 0) s = 0;
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  };

  const filledBars = Math.round(progress * bars.length);

  const activeColor = out ? "rgba(255,255,255,0.9)" : "rgba(139,92,246,1)";
  const inactiveColor = out ? "rgba(255,255,255,0.3)" : "rgba(139,92,246,0.3)";

  return (
    <div
      className="flex items-center gap-2.5 px-1 py-1 select-none"
      style={{ minWidth: 220, maxWidth: 280 }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {/* Play button */}
      <button
        onMouseDown={togglePlay}
        onTouchEnd={togglePlay}
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-transform active:scale-90"
        style={{
          background: out ? "rgba(255,255,255,0.2)" : "rgba(139,92,246,0.25)",
        }}
      >
        {playing ? (
          <span className="flex gap-[3px] items-center">
            <span className="w-[3px] h-3.5 rounded-full" style={{ background: out ? "white" : "#a78bfa", animation: "voice-bar 0.6s ease-in-out infinite" }} />
            <span className="w-[3px] h-3.5 rounded-full" style={{ background: out ? "white" : "#a78bfa", animation: "voice-bar 0.6s ease-in-out 0.15s infinite" }} />
            <span className="w-[3px] h-2 rounded-full" style={{ background: out ? "white" : "#a78bfa", animation: "voice-bar 0.6s ease-in-out 0.3s infinite" }} />
          </span>
        ) : (
          <Icon name="Play" size={18} className={out ? "text-white ml-0.5" : "text-violet-400 ml-0.5"} />
        )}
      </button>

      {/* Waveform + time */}
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        {/* Bars */}
        <div
          className="flex items-end gap-[2px] h-8 cursor-pointer"
          onClick={seek}
        >
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-full transition-colors duration-100"
              style={{
                height: `${h}%`,
                background: i < filledBars ? activeColor : inactiveColor,
              }}
            />
          ))}
        </div>

        {/* Time */}
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] tabular-nums"
            style={{ color: out ? "rgba(255,255,255,0.6)" : "hsl(var(--muted-foreground))" }}
          >
            {fmt(curTime > 0 ? curTime : duration)}
          </span>
          <span
            className="text-[10px]"
            style={{ color: out ? "rgba(255,255,255,0.5)" : "hsl(var(--muted-foreground))" }}
          >
            Голосовое
          </span>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (isFinite(d)) setDuration(d);
        }}
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          setCurTime(a.currentTime);
          if (a.duration > 0) setProgress(a.currentTime / a.duration);
        }}
        onEnded={() => { setPlaying(false); setProgress(0); setCurTime(0); }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
    </div>
  );
}
