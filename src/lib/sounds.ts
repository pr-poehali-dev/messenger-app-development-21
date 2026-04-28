// Генерация звуков через Web Audio API — не нужны файлы

let ctx: AudioContext | null = null;
let ringtoneInterval: ReturnType<typeof setInterval> | null = null;
let ringtoneNodes: AudioNode[] = [];

function getCtx(): AudioContext {
  if (!ctx || ctx.state === "closed") ctx = new AudioContext();
  return ctx;
}

function playTone(freq: number, duration: number, type: OscillatorType = "sine", gain = 0.3, startOffset = 0): AudioNode[] {
  const c = getCtx();
  const osc = c.createOscillator();
  const gainNode = c.createGain();
  osc.connect(gainNode);
  gainNode.connect(c.destination);
  osc.type = type;
  osc.frequency.value = freq;
  gainNode.gain.setValueAtTime(0, c.currentTime + startOffset);
  gainNode.gain.linearRampToValueAtTime(gain, c.currentTime + startOffset + 0.01);
  gainNode.gain.linearRampToValueAtTime(0, c.currentTime + startOffset + duration - 0.02);
  osc.start(c.currentTime + startOffset);
  osc.stop(c.currentTime + startOffset + duration);
  return [osc, gainNode];
}

// Мелодия звонка (похожа на Telegram)
function ringOnce() {
  const c = getCtx();
  const notes = [
    { freq: 880, dur: 0.12, start: 0.0 },
    { freq: 1109, dur: 0.12, start: 0.14 },
    { freq: 1319, dur: 0.12, start: 0.28 },
    { freq: 1109, dur: 0.12, start: 0.42 },
    { freq: 880, dur: 0.22, start: 0.56 },
    { freq: 1109, dur: 0.22, start: 0.82 },
  ];
  const nodes: AudioNode[] = [];
  notes.forEach(n => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = "triangle";
    osc.frequency.value = n.freq;
    gain.gain.setValueAtTime(0, c.currentTime + n.start);
    gain.gain.linearRampToValueAtTime(0.35, c.currentTime + n.start + 0.01);
    gain.gain.linearRampToValueAtTime(0, c.currentTime + n.start + n.dur - 0.02);
    osc.start(c.currentTime + n.start);
    osc.stop(c.currentTime + n.start + n.dur);
    nodes.push(osc, gain);
  });
  ringtoneNodes = [...ringtoneNodes, ...nodes];
}

export function startRingtone() {
  stopRingtone();
  ringOnce();
  ringtoneInterval = setInterval(() => ringOnce(), 2000);
}

export function stopRingtone() {
  if (ringtoneInterval) { clearInterval(ringtoneInterval); ringtoneInterval = null; }
  ringtoneNodes.forEach(n => { try { (n as OscillatorNode).stop?.(); } catch { /* already stopped */ } });
  ringtoneNodes = [];
}

// Звук исходящего звонка (гудки)
let dialNodes: AudioNode[] = [];
let dialInterval: ReturnType<typeof setInterval> | null = null;

function dialBeep() {
  const nodes = playTone(440, 0.8, "sine", 0.2);
  dialNodes = [...dialNodes, ...nodes];
}

export function startDialTone() {
  stopDialTone();
  dialBeep();
  dialInterval = setInterval(() => dialBeep(), 2000);
}

export function stopDialTone() {
  if (dialInterval) { clearInterval(dialInterval); dialInterval = null; }
  dialNodes.forEach(n => { try { (n as OscillatorNode).stop?.(); } catch { /* ok */ } });
  dialNodes = [];
}

// Звук нового сообщения
export function playMessageSound() {
  try {
    const c = getCtx();
    const notes = [
      { freq: 880, dur: 0.08, start: 0.0 },
      { freq: 1320, dur: 0.1, start: 0.1 },
    ];
    notes.forEach(n => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain);
      gain.connect(c.destination);
      osc.type = "sine";
      osc.frequency.value = n.freq;
      gain.gain.setValueAtTime(0, c.currentTime + n.start);
      gain.gain.linearRampToValueAtTime(0.15, c.currentTime + n.start + 0.01);
      gain.gain.linearRampToValueAtTime(0, c.currentTime + n.start + n.dur);
      osc.start(c.currentTime + n.start);
      osc.stop(c.currentTime + n.start + n.dur + 0.05);
    });
  } catch { /* ignore */ }
}

// Звук завершения/отклонения звонка
export function playHangupSound() {
  try {
    playTone(320, 0.4, "sine", 0.25);
  } catch { /* ignore */ }
}
