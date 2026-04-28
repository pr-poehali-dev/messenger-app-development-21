import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import { api, avatarGrad, type User } from "@/lib/api";
import { startRingtone, stopRingtone, startDialTone, stopDialTone, playHangupSound } from "@/lib/sounds";

type CallState = "calling" | "ringing" | "connected" | "ended";

interface CallScreenProps {
  currentUser: User;
  remoteUserId: number;
  remoteName: string;
  callId: string;
  isIncoming: boolean;
  onClose: () => void;
}

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export function CallScreen({ currentUser, remoteUserId, remoteName, callId, isIncoming, onClose }: CallScreenProps) {
  const isVideo = callId.startsWith("video_");
  const [state, setState] = useState<CallState>(isIncoming ? "ringing" : "calling");
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [speaker, setSpeaker] = useState(true);
  const [duration, setDuration] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sinceRef = useRef(Math.floor(Date.now() / 1000) - 5);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    pcRef.current?.close();
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    stopRingtone();
    stopDialTone();
  };

  const sendSignal = async (type: string, payload?: unknown) => {
    await api("call_signal", { call_id: callId, to_user_id: remoteUserId, type, payload }, currentUser.id);
  };

  const startTimer = () => {
    stopRingtone();
    stopDialTone();
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
  };

  const initPC = async () => {
    const constraints = isVideo ? { audio: true, video: { facingMode: "user" } } : { audio: true };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    localStreamRef.current = stream;

    if (isVideo && localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.play().catch(() => {});
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    pc.onicecandidate = (e) => {
      if (e.candidate) sendSignal("candidate", e.candidate.toJSON());
    };

    pc.ontrack = (e) => {
      if (isVideo && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = e.streams[0];
        remoteVideoRef.current.play().catch(() => {});
      } else if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = e.streams[0];
        remoteAudioRef.current.play().catch(() => {});
      }
      setState("connected");
      startTimer();
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        setState("ended");
        setTimeout(() => { cleanup(); onClose(); }, 1500);
      }
    };

    return pc;
  };

  const startCall = async () => {
    const pc = await initPC();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await sendSignal("offer", { sdp: offer.sdp, type: offer.type });
    pollSignals();
  };

  const acceptCall = async () => {
    setState("calling");
    const pc = await initPC();
    pollSignals(pc);
  };

  const pollSignals = (existingPc?: RTCPeerConnection) => {
    pollRef.current = setInterval(async () => {
      const pc = existingPc || pcRef.current;
      if (!pc) return;
      const data = await api("get_call_signals", { call_id: callId, since: sinceRef.current }, currentUser.id);
      if (!data.signals) return;
      for (const sig of data.signals) {
        sinceRef.current = Math.max(sinceRef.current, sig.created_at);
        if (sig.type === "offer" && pc.signalingState === "stable") {
          await pc.setRemoteDescription(new RTCSessionDescription(sig.payload));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await sendSignal("answer", { sdp: answer.sdp, type: answer.type });
        } else if (sig.type === "answer" && pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(sig.payload));
        } else if (sig.type === "candidate") {
          try { await pc.addIceCandidate(new RTCIceCandidate(sig.payload)); } catch { /* ignore */ }
        } else if (sig.type === "hangup") {
          playHangupSound();
          setState("ended");
          setTimeout(() => { cleanup(); onClose(); }, 1500);
        }
      }
    }, 1500);
  };

  useEffect(() => {
    if (isIncoming) {
      startRingtone();
    } else {
      startDialTone();
      startCall();
    }
    return cleanup;
  }, []);

  const hangup = async () => {
    playHangupSound();
    await sendSignal("hangup");
    setState("ended");
    setTimeout(() => { cleanup(); onClose(); }, 800);
  };

  const reject = () => {
    playHangupSound();
    sendSignal("hangup");
    cleanup();
    onClose();
  };

  const fmtDuration = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const stateLabel = {
    calling: "Вызов...",
    ringing: "Входящий звонок",
    connected: fmtDuration(duration),
    ended: "Звонок завершён",
  }[state];

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-between bg-[#0d0d1a] py-16 px-8 animate-fade-in">
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Video views */}
      {isVideo && (
        <>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: state === "connected" ? 1 : 0 }}
          />
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute bottom-32 right-4 w-28 h-40 object-cover rounded-2xl border-2 border-white/20 z-10"
            style={{ display: !videoOff ? "block" : "none" }}
          />
        </>
      )}

      {/* Top info */}
      <div className="flex flex-col items-center gap-4 mt-8 relative z-10">
        {(!isVideo || state !== "connected") && (
          <div className={`w-28 h-28 rounded-full flex items-center justify-center text-5xl font-bold text-white animate-pulse-glow bg-gradient-to-br ${avatarGrad(remoteUserId)}`}>
            {remoteName[0]?.toUpperCase()}
          </div>
        )}
        <h2 className="text-2xl font-bold text-white drop-shadow">{remoteName}</h2>
        <p className={`text-sm font-medium ${state === "connected" ? "text-emerald-400" : "text-muted-foreground"}`}>
          {stateLabel}
        </p>
        {isVideo && <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 text-xs text-white/70"><Icon name="Video" size={12} />Видеозвонок</div>}
      </div>

      {/* Waveform placeholder (audio only) */}
      {state === "connected" && !isVideo && (
        <div className="flex items-end gap-1 h-10">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="w-1.5 bg-violet-500/60 rounded-full animate-pulse"
              style={{ height: `${8 + Math.random() * 24}px`, animationDelay: `${i * 0.07}s` }}
            />
          ))}
        </div>
      )}
      {state !== "connected" && !isVideo && <div className="h-10" />}
      {isVideo && <div className="h-10" />}

      {/* Controls */}
      <div className="w-full">
        {state === "ringing" ? (
          <div className="flex items-center justify-center gap-12">
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={reject}
                className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30 hover:bg-red-600 transition-colors"
              >
                <Icon name="PhoneOff" size={26} className="text-white" />
              </button>
              <span className="text-xs text-muted-foreground">Отклонить</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={acceptCall}
                className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 transition-colors animate-pulse"
              >
                <Icon name="Phone" size={26} className="text-white" />
              </button>
              <span className="text-xs text-muted-foreground">Принять</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => {
                  setMuted(m => {
                    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = m; });
                    return !m;
                  });
                }}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${muted ? "bg-red-500/20 text-red-400" : "glass text-foreground"}`}
              >
                <Icon name={muted ? "MicOff" : "Mic"} size={22} />
              </button>
              <span className="text-xs text-muted-foreground">{muted ? "Включить" : "Выкл. микро"}</span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <button
                onClick={hangup}
                className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30 hover:bg-red-600 transition-colors"
              >
                <Icon name="PhoneOff" size={26} className="text-white" />
              </button>
              <span className="text-xs text-muted-foreground">Завершить</span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => setSpeaker(s => !s)}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${speaker ? "grad-primary text-white" : "glass text-muted-foreground"}`}
              >
                <Icon name={speaker ? "Volume2" : "VolumeX"} size={22} />
              </button>
              <span className="text-xs text-muted-foreground">Динамик</span>
            </div>

            {isVideo && (
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={() => {
                    setVideoOff(v => {
                      localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = v; });
                      return !v;
                    });
                  }}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${videoOff ? "bg-red-500/20 text-red-400" : "glass text-foreground"}`}
                >
                  <Icon name={videoOff ? "VideoOff" : "Video"} size={22} />
                </button>
                <span className="text-xs text-muted-foreground">Камера</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}