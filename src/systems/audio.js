// All sound is synthesized with the Web Audio API — no external assets.
import { Game } from '../core/state.js';

let ctx = null, master = null, musicGain = null, rainNode = null;
let musicTimer = null, musicMode = 'ambient', step = 0;

function ensure() {
  if (ctx) return true;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = Game.settings.volume;
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.3;
    musicGain.connect(master);
    startMusic();
    return true;
  } catch { return false; }
}

function tone({ f = 440, f2 = null, type = 'sine', dur = 0.15, vol = 0.3, delay = 0, out = null }) {
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t0);
  if (f2 !== null) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g).connect(out || master);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noiseBurst({ dur = 0.2, vol = 0.2, freq = 1200, q = 1, delay = 0 }) {
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = 'bandpass';
  filt.frequency.value = freq;
  filt.Q.value = q;
  const g = ctx.createGain();
  g.gain.value = vol;
  src.connect(filt).connect(g).connect(master);
  src.start(t0);
}

const SFX = {
  laser: () => { tone({ f: 1400, f2: 180, type: 'sawtooth', dur: 0.18, vol: 0.25 }); noiseBurst({ dur: 0.08, vol: 0.1, freq: 3000 }); },
  laserBig: () => { tone({ f: 900, f2: 90, type: 'sawtooth', dur: 0.3, vol: 0.32 }); tone({ f: 1800, f2: 200, type: 'square', dur: 0.2, vol: 0.12 }); },
  crit: () => { tone({ f: 500, f2: 2200, type: 'square', dur: 0.2, vol: 0.2 }); tone({ f: 250, f2: 60, type: 'sawtooth', dur: 0.35, vol: 0.25, delay: 0.03 }); },
  key: () => tone({ f: 2200 + Math.random() * 600, type: 'square', dur: 0.025, vol: 0.06 }),
  error: () => { tone({ f: 160, type: 'square', dur: 0.18, vol: 0.2 }); tone({ f: 110, type: 'square', dur: 0.22, vol: 0.2, delay: 0.1 }); },
  ui: () => tone({ f: 700, f2: 1000, type: 'triangle', dur: 0.07, vol: 0.12 }),
  phone: () => { for (let i = 0; i < 3; i++) { tone({ f: 1800, dur: 0.07, vol: 0.14, delay: i * 0.14 }); tone({ f: 2200, dur: 0.07, vol: 0.14, delay: i * 0.14 + 0.07 }); } },
  alert: () => { tone({ f: 880, dur: 0.18, vol: 0.2, type: 'square' }); tone({ f: 660, dur: 0.18, vol: 0.2, type: 'square', delay: 0.2 }); tone({ f: 880, dur: 0.25, vol: 0.2, type: 'square', delay: 0.4 }); },
  step: () => noiseBurst({ dur: 0.05, vol: 0.05, freq: 300, q: 0.7 }),
  jump: () => tone({ f: 250, f2: 500, type: 'triangle', dur: 0.14, vol: 0.12 }),
  dash: () => noiseBurst({ dur: 0.18, vol: 0.14, freq: 900 }),
  swing: () => noiseBurst({ dur: 0.1, vol: 0.1, freq: 600 }),
  punch: () => { noiseBurst({ dur: 0.08, vol: 0.25, freq: 180, q: 1.5 }); tone({ f: 140, f2: 60, dur: 0.12, vol: 0.2 }); },
  hurt: () => tone({ f: 300, f2: 120, type: 'sawtooth', dur: 0.2, vol: 0.2 }),
  shieldHit: () => tone({ f: 900, f2: 500, type: 'sine', dur: 0.15, vol: 0.18 }),
  shieldUp: () => tone({ f: 300, f2: 900, type: 'sine', dur: 0.4, vol: 0.18 }),
  coin: () => { tone({ f: 1100, dur: 0.07, vol: 0.14, type: 'square' }); tone({ f: 1500, dur: 0.14, vol: 0.14, type: 'square', delay: 0.07 }); },
  levelup: () => [523, 659, 784, 1047].forEach((f, i) => tone({ f, dur: 0.16, vol: 0.16, type: 'triangle', delay: i * 0.1 })),
  achieve: () => [784, 988, 1175].forEach((f, i) => tone({ f, dur: 0.2, vol: 0.14, type: 'sine', delay: i * 0.12 })),
  win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ f, dur: 0.22, vol: 0.15, type: 'triangle', delay: i * 0.09 })),
  fail: () => [392, 330, 262, 196].forEach((f, i) => tone({ f, dur: 0.25, vol: 0.16, type: 'sawtooth', delay: i * 0.14 })),
  door: () => { noiseBurst({ dur: 0.12, vol: 0.1, freq: 500 }); tone({ f: 180, f2: 120, dur: 0.15, vol: 0.1, delay: 0.05 }); },
  talk: () => tone({ f: 350 + Math.random() * 250, type: 'triangle', dur: 0.03, vol: 0.05 }),
  virus: () => tone({ f: 600, f2: 300, type: 'square', dur: 0.12, vol: 0.1 }),
  lock: () => { tone({ f: 220, type: 'square', dur: 0.3, vol: 0.2 }); tone({ f: 165, type: 'square', dur: 0.4, vol: 0.2, delay: 0.15 }); },
  enemyDown: () => { tone({ f: 800, f2: 60, type: 'sawtooth', dur: 0.4, vol: 0.25 }); noiseBurst({ dur: 0.3, vol: 0.18, freq: 800 }); },
  arrest: () => { tone({ f: 660, dur: 0.1, vol: 0.14 }); tone({ f: 880, dur: 0.1, vol: 0.14, delay: 0.12 }); noiseBurst({ dur: 0.15, vol: 0.1, freq: 2000, delay: 0.2 }); },
  restore: () => [392, 523, 659, 784].forEach((f, i) => tone({ f, dur: 0.3, vol: 0.12, type: 'sine', delay: i * 0.08 })),
  combatStart: () => { tone({ f: 110, type: 'sawtooth', dur: 0.5, vol: 0.25 }); tone({ f: 220, type: 'square', dur: 0.3, vol: 0.15, delay: 0.1 }); },
  quest: () => [659, 784, 988].forEach((f, i) => tone({ f, dur: 0.15, vol: 0.14, type: 'triangle', delay: i * 0.1 })),
};

// simple generative music: pad chords + arpeggio; combat adds a driving bass
const CHORDS = [
  [220, 261.6, 329.6],   // Am
  [174.6, 220, 261.6],   // F
  [196, 246.9, 293.7],   // G
  [261.6, 329.6, 392],   // C
];

function startMusic() {
  if (musicTimer) return;
  step = 0;
  musicTimer = setInterval(() => {
    if (!ctx || Game.paused) return;
    const beat = musicMode === 'combat' ? 0.22 : 0.5;
    const chord = CHORDS[Math.floor(step / 8) % CHORDS.length];
    if (step % 8 === 0) {
      // pad
      for (const f of chord) {
        tone({ f: f / 2, type: 'triangle', dur: beat * 7, vol: musicMode === 'combat' ? 0.04 : 0.06, out: musicGain });
      }
    }
    if (musicMode === 'combat') {
      tone({ f: chord[0] / 4, type: 'square', dur: 0.12, vol: 0.09, out: musicGain });
      if (step % 2 === 0) noiseBurst({ dur: 0.04, vol: 0.05, freq: 6000 });
      if (step % 4 === 2) tone({ f: chord[(step / 2) % 3], type: 'sawtooth', dur: 0.1, vol: 0.05, out: musicGain });
    } else if (step % 4 === 0 && Math.random() < 0.6) {
      // gentle pluck
      tone({ f: chord[step % 3] * 2, type: 'sine', dur: 0.5, vol: 0.05, out: musicGain });
    }
    step++;
  }, musicMode === 'combat' ? 220 : 500);
}

export function initAudio() {
  const A = {
    sfx(name) {
      if (!ensure()) return;
      if (ctx.state === 'suspended') ctx.resume();
      const fn = SFX[name];
      if (fn) fn();
    },
    music(mode) {
      musicMode = mode;
      if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
      if (ctx) startMusic();
    },
    setRain(on) {
      if (!ctx) return;
      if (on && !rainNode) {
        const len = ctx.sampleRate * 2;
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource();
        src.buffer = buf; src.loop = true;
        const filt = ctx.createBiquadFilter();
        filt.type = 'lowpass'; filt.frequency.value = 900;
        const g = ctx.createGain(); g.gain.value = 0.045;
        src.connect(filt).connect(g).connect(master);
        src.start();
        rainNode = src;
      } else if (!on && rainNode) {
        try { rainNode.stop(); } catch { /* already stopped */ }
        rainNode = null;
      }
    },
    setVolume(v) {
      Game.settings.volume = v;
      if (master) master.gain.value = v;
    },
  };

  // unlock audio on first gesture
  const unlock = () => { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); };
  window.addEventListener('pointerdown', unlock, { once: false });
  window.addEventListener('keydown', unlock, { once: false });

  Game.audio = A;
  return A;
}
