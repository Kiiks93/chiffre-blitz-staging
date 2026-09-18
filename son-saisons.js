/* ============================================================
SON-SAISONS.JS — MUSIQUES SAISONNIÈRES & SONS THÉMATIQUES
Halloween 🎃 (S2) & Noël 🎄 (S3)
============================================================ */

/* ============================================================
1. CONSTANTES MUSICALES
============================================================ */
const SEASONAL_BPM = {
  s2menu: 75,
  s2game: 100,
  s3menu: 100,
  s3game: 126
};

const HALLOWEEN_PROGRESSIONS = {
  A: [
    { root: 55.00, pad: [110.00, 130.81, 164.81, 220.00] },
    { root: 43.65, pad: [87.31, 110.00, 130.81, 174.61] },
    { root: 36.71, pad: [73.42, 87.31, 110.00, 146.83] },
    { root: 41.20, pad: [82.41, 103.83, 123.47, 164.81] }
  ],
  B: [
    { root: 55.00, pad: [110.00, 130.81, 164.81, 220.00] },
    { root: 49.00, pad: [98.00, 123.47, 146.83, 196.00] },
    { root: 43.65, pad: [87.31, 110.00, 130.81, 174.61] },
    { root: 41.20, pad: [82.41, 103.83, 123.47, 164.81] }
  ],
  game: [
    { root: 55.00, pad: [110.00, 130.81, 164.81] },
    { root: 43.65, pad: [87.31, 110.00, 130.81] },
    { root: 36.71, pad: [73.42, 87.31, 110.00] },
    { root: 41.20, pad: [82.41, 103.83, 123.47] }
  ]
};

const NOEL_PROGRESSION = [
  { root: 130.81, pad: [261.63, 329.63, 392.00] },
  { root: 130.81, pad: [261.63, 329.63, 392.00] },
  { root: 130.81, pad: [261.63, 329.63, 392.00] },
  { root: 87.31, pad: [174.61, 261.63, 349.23] },
  { root: 130.81, pad: [261.63, 329.63, 392.00] },
  { root: 98.00, pad: [196.00, 246.94, 293.66] },
  { root: 98.00, pad: [196.00, 246.94, 293.66] },
  { root: 130.81, pad: [261.63, 329.63, 392.00] }
];

const NOEL_MELODIES = {
  low: {
    0: { 0: 329.63, 4: 329.63, 8: 329.63 },
    1: { 0: 329.63, 4: 329.63, 8: 329.63 },
    2: { 0: 329.63, 4: 392.00, 8: 261.63, 10: 293.66, 12: 329.63 },
    3: { 0: 349.23, 4: 349.23, 8: 349.23, 12: 349.23 },
    4: { 0: 349.23, 4: 329.63, 8: 329.63, 12: 329.63 },
    5: { 0: 329.63, 4: 293.66, 8: 293.66, 12: 329.63 },
    6: { 0: 293.66, 8: 392.00 },
    7: { 0: 329.63, 8: 261.63 }
  },
  high: {
    0: { 0: 659.25, 4: 659.25, 8: 659.25 },
    1: { 0: 659.25, 4: 659.25, 8: 659.25 },
    2: { 0: 659.25, 4: 783.99, 8: 523.25, 10: 587.33, 12: 659.25 },
    3: { 0: 698.46, 4: 698.46, 8: 698.46, 12: 698.46 },
    4: { 0: 698.46, 4: 659.25, 8: 659.25, 12: 659.25 },
    5: { 0: 659.25, 4: 587.33, 8: 587.33, 12: 659.25 },
    6: { 0: 587.33, 8: 783.99 },
    7: { 0: 659.25, 8: 523.25 }
  }
};

const LUTIN_LAUGH_PATTERN = [
  { freq: 2200, time: 0.0, dur: 0.08 },
  { freq: 2400, time: 0.12, dur: 0.08 },
  { freq: 2600, time: 0.24, dur: 0.08 },
  { freq: 2800, time: 0.4, dur: 0.1 },
  { freq: 2200, time: 0.55, dur: 0.08 },
  { freq: 2400, time: 0.67, dur: 0.08 }
];

const HALLOWEEN_SCALE = [220.00, 261.63, 329.63, 349.23, 415.30, 440.00];
const HALLOWEEN_MELODIES = {
  A: { 2: 0, 6: 2, 10: 4, 14: 3 },
  B: { 0: 5, 4: 4, 8: 2, 12: 1 }
};

/* ============================================================
2. DÉMARRAGE MUSIQUE SAISONNIÈRE
============================================================ */
SoundEngine.startMusicSeasonal = function(key) {
  if (this.isMuted) return;
  this.init();
  if (!this.ctx) return;
  if (this.ctx.state === "suspended") this.ctx.resume();
  if (this.timerId && this.currentMode === key) return;
  if (this.timerId) {
    clearInterval(this.timerId);
    this.timerId = null;
  }
  if (typeof this.stopMusic === "function") this.stopMusic(false);
  
  this.currentMode = key;
  this.step = 0;
  this.bpm = SEASONAL_BPM[key] || 100;
  const intervalMs = (60 / this.bpm / 4) * 1000;
  
  this.timerId = setInterval(() => {
    if (this.isMuted || !this.ctx || this.ctx.state !== "running") return;
    if (key === "s2menu") this.tickHalloweenMenu(this.step % 256);
    else if (key === "s2game") this.tickHalloweenGame(this.step % 128);
    else if (key === "s3menu") this.tickNoelMenu(this.step % 192);
    else if (key === "s3game") this.tickNoelGame(this.step % 256);
    this.step = (this.step + 1) % 256;
  }, intervalMs);
};

/* ============================================================
3. OVERRIDE startMusic (route vers saison en cours)
============================================================ */
SoundEngine._originalStartMusic = SoundEngine.startMusic;

SoundEngine.startMusic = function(mode) {
  this._baseMode = mode;
  let season = (typeof window !== "undefined") ? (window.CURRENT_SEASON || "s1") : "s1";
  const pref = localStorage.getItem('cb_music_season');
  const ctx = localStorage.getItem('cb_music_season_ctx');
  
  if (pref) {
    if (ctx !== season) {
      localStorage.removeItem('cb_music_season');
      localStorage.removeItem('cb_music_season_ctx');
    } else if (getReleasedSeasons().some(s => s.id === pref)) {
      season = pref;
    }
  }
  
  const isGame = (mode !== "menu");
  if (season === "s2") {
    this.startMusicSeasonal(isGame ? "s2game" : "s2menu");
    return;
  }
  if (season === "s3") {
    this.startMusicSeasonal(isGame ? "s3game" : "s3menu");
    return;
  }
  this._originalStartMusic.call(this, mode);
};

/* ============================================================
4. HALLOWEEN MENU (chill-horreur ~51s)
============================================================ */
SoundEngine.tickHalloweenMenu = function(step) {
  const t = this.ctx.currentTime;
  const bar = Math.floor(step / 16);
  const inBar = step % 16;
  const half = bar < 8 ? 0 : 1;
  const prog = (half === 0 ? HALLOWEEN_PROGRESSIONS.A : HALLOWEEN_PROGRESSIONS.B);
  const chord = prog[bar % 4];
  if (inBar === 0 && bar % 2 === 0) this._heart(t, 0.24);
  if (inBar === 3 && bar % 2 === 0) this._heart(t, 0.15);
  if (inBar === 0) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(chord.root, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.075, t + 1.2);
    g.gain.linearRampToValueAtTime(0.0001, t + 3.8);
    o.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t + 3.8);
  }
  if (inBar === 0) {
    chord.pad.forEach((f, i) => {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = "triangle"; o.frequency.setValueAtTime(f, t);
      o.detune.setValueAtTime(i % 2 === 0 ? -4 : 4, t);
      const lp = this.ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.setValueAtTime(900, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.033, t + 1.0);
      g.gain.linearRampToValueAtTime(0.0001, t + 3.6);
      o.connect(lp); lp.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t + 3.6);
    });
  }
  if (inBar === 8 && bar % 4 === 2) {
    const f = chord.pad[2] * 2;
    [f, f * 1.005].forEach(fr => {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(fr, t);
      g.gain.setValueAtTime(0.06, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
      o.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t + 2.4);
    });
  }
  const mel = half === 0 ? HALLOWEEN_MELODIES.A : HALLOWEEN_MELODIES.B;
  if (mel[inBar] !== undefined && Math.random() < 0.85) {
    this._eerie(t, HALLOWEEN_SCALE[mel[inBar]], 0.075);
  }
  if ((inBar === 6 || inBar === 12) && Math.random() < 0.6) {
    const bufferSize = this.ctx.sampleRate * 1.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
    const noise = this.ctx.createBufferSource(); noise.buffer = buffer;
    const f = this.ctx.createBiquadFilter(); f.type = "bandpass";
    f.frequency.setValueAtTime(600 + Math.random() * 500, t); f.Q.setValueAtTime(6, t);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.045, t + 0.5);
    g.gain.linearRampToValueAtTime(0.0001, t + 1.1);
    noise.connect(f); f.connect(g); g.connect(this.ctx.destination); noise.start(t);
  }
  if (inBar === 0 && bar % 4 === 3) {
    const bufferSize = this.ctx.sampleRate * 3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
    const noise = this.ctx.createBufferSource(); noise.buffer = buffer;
    const f = this.ctx.createBiquadFilter(); f.type = "lowpass";
    f.frequency.setValueAtTime(200, t);
    f.frequency.linearRampToValueAtTime(800, t + 1.5);
    f.frequency.linearRampToValueAtTime(200, t + 3);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.06, t + 1.2);
    g.gain.linearRampToValueAtTime(0.0001, t + 3);
    noise.connect(f); f.connect(g); g.connect(this.ctx.destination); noise.start(t);
  }
  if (inBar === 4 && Math.random() < 0.35) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(880 + Math.random() * 440, t);
    g.gain.setValueAtTime(0.03, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    o.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t + 1.8);
  }
  if (inBar === 0) {
    const glow = document.getElementById('bg-glow');
    if (glow) { glow.style.opacity = '0.16'; setTimeout(() => { glow.style.opacity = '0.06'; }, 600); }
  }
};

/* ============================================================
5. HALLOWEEN GAME (tendu, pulsé)
============================================================ */
SoundEngine.tickHalloweenGame = function(step) {
  const t = this.ctx.currentTime;
  const bar = Math.floor(step / 16);
  const inBar = step % 16;
  const chord = HALLOWEEN_PROGRESSIONS.game[bar % 4];
  if (inBar % 4 === 0) this._heart(t, 0.48);
  if (inBar % 2 === 0) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
    o.type = "sawtooth"; o.frequency.setValueAtTime(chord.root * 2, t);
    f.type = "lowpass"; f.frequency.setValueAtTime(700, t);
    g.gain.setValueAtTime(0.24, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(f); f.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t + 0.12);
  }
  if (inBar % 4 === 2) {
    this._eerie(t, 440.00, 0.105);
    this._eerie(t, 466.16, 0.075);
  }
  if (inBar === 0 && bar % 2 === 0) {
    chord.pad.forEach((fq, i) => {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = "triangle"; o.frequency.setValueAtTime(fq, t);
      o.detune.setValueAtTime(i % 2 === 0 ? -5 : 5, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.0525, t + 0.4);
      g.gain.linearRampToValueAtTime(0.0001, t + 2.5);
      o.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t + 2.5);
    });
  }
  if (inBar === 8 && Math.random() < 0.3) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
    o.type = "sawtooth"; o.frequency.setValueAtTime(chord.root * 1.414 * 4, t);
    f.type = "bandpass"; f.frequency.setValueAtTime(900, t);
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    o.connect(f); f.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t + 0.7);
  }
};

/* ============================================================
6. NOËL (menu + game)
============================================================ */
SoundEngine._voice = function(t, f, vol, dur) {
  const lp = this.ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(2400, t);
  lp.connect(this.ctx.destination);
  
  const g = this.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  g.connect(lp);
  
  const o = this.ctx.createOscillator();
  o.type = "triangle";
  o.frequency.setValueAtTime(f, t);
  
  const vib = this.ctx.createOscillator();
  vib.frequency.setValueAtTime(5.3, t);
  const vg = this.ctx.createGain();
  vg.gain.setValueAtTime(f * 0.005, t);
  vib.connect(vg);
  vg.connect(o.frequency);
  
  const o2 = this.ctx.createOscillator();
  o2.type = "sine";
  o2.frequency.setValueAtTime(f, t);
  o2.detune.setValueAtTime(5, t);
  const g2 = this.ctx.createGain();
  g2.gain.setValueAtTime(0.5, t);
  
  o.connect(g);
  o2.connect(g2);
  g2.connect(g);
  
  o.start(t);
  o2.start(t);
  vib.start(t);
  o.stop(t + dur + 0.1);
  o2.stop(t + dur + 0.1);
  vib.stop(t + dur + 0.1);
};

SoundEngine.tickNoelMenu = function(step) {
  const t = this.ctx.currentTime;
  const bar = Math.floor(step / 16);
  const inBar = step % 16;
  const chord = NOEL_PROGRESSION[bar % 8];
  const seq = bar < 8 ? NOEL_MELODIES.low : NOEL_MELODIES.high;

  // Pad d'accords
  if (inBar === 0) {
    chord.pad.forEach((f, i) => {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(f, t);
      o.detune.setValueAtTime(i % 2 ? 3 : -3, t);
      const lp = this.ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(700, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.022, t + 0.6);
      g.gain.linearRampToValueAtTime(0.0001, t + 4.4);
      o.connect(lp);
      lp.connect(g);
      g.connect(this.ctx.destination);
      o.start(t);
      o.stop(t + 4.4);
    });
  }
  
  // Basse
  if (inBar === 0 || inBar === 8) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(chord.root, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.05, t + 0.1);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start(t);
    o.stop(t + 1.8);
  }
  
  // Cloches
  if ([2, 6, 10, 14].includes(inBar)) {
    this._voice(t, chord.pad[Math.floor(inBar / 2) % 3], 0.022, 1.0);
  }
  
  // Mélodie
  const m = seq[bar % 8];
  if (m && m[inBar] !== undefined) {
    this._voice(t, m[inBar], 0.06, 1.3);
  }
};

SoundEngine.tickNoelGame = function(step) {
  const t = this.ctx.currentTime;
  const bar = Math.floor(step / 16);
  const inBar = step % 16;
  const chord = NOEL_PROGRESSION[bar % 8];
  const seq = bar < 8 ? NOEL_MELODIES.low : NOEL_MELODIES.high;

  // Battement de cœur
  if (inBar % 4 === 0) this._heart(t, 0.18);
  
  // Pulsation
  if (inBar % 2 === 0) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(chord.root * 2, t);
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start(t);
    o.stop(t + 0.12);
  }
  
  // Pad
  if (inBar === 0) {
    chord.pad.forEach((f) => {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.018, t + 0.4);
      g.gain.linearRampToValueAtTime(0.0001, t + 2.6);
      o.connect(g);
      g.connect(this.ctx.destination);
      o.start(t);
      o.stop(t + 2.6);
    });
  }
  
  // Cloches
  if ([2, 6, 10, 14].includes(inBar)) {
    this._voice(t, chord.pad[Math.floor(inBar / 2) % 3], 0.02, 0.7);
  }
  
  // Mélodie
  const m = seq[bar % 8];
  if (m && m[inBar] !== undefined) {
    this._voice(t, m[inBar], 0.055, 0.9);
  }
};

/* ============================================================
7. HELPERS AUDIO (réutilisables)
============================================================ */
SoundEngine._heart = function(t, vol) {
  const o = this.ctx.createOscillator(), g = this.ctx.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(55, t);
  o.frequency.exponentialRampToValueAtTime(30, t + 0.12);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  o.connect(g);
  g.connect(this.ctx.destination);
  o.start(t);
  o.stop(t + 0.16);
};

SoundEngine._eerie = function(t, freq, vol) {
  const o = this.ctx.createOscillator(), g = this.ctx.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(freq, t);
  const vib = this.ctx.createOscillator();
  const vibG = this.ctx.createGain();
  vib.frequency.setValueAtTime(5.5, t);
  vibG.gain.setValueAtTime(6, t);
  vib.connect(vibG);
  vibG.connect(o.frequency);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.15);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
  o.connect(g);
  g.connect(this.ctx.destination);
  o.start(t);
  vib.start(t);
  o.stop(t + 1.4);
  vib.stop(t + 1.4);
};

/* ============================================================
8. OVERRIDES THÉMATIQUES (combo crack + perfection)
============================================================ */
SoundEngine._originalCrack = SoundEngine.playCrack;

SoundEngine.playCrack = function(theme) {
  if (this.isMuted) return;
  this.init();
  if (!this.ctx) return;
  if (this.ctx.state === "suspended") this.ctx.resume();
  
  if (theme === "theme_bonbon") { playBonbonSound(); return; }
  if (theme === "theme_sapin") { playSapinSound(); return; }
  if (theme === "theme_lutin") { playLutinSound(); return; }
  if (theme === "theme_citrouille" || theme === "theme_fantome") {
    this._originalCrack.call(this, theme);
    return;
  }
  this._originalCrack.call(this, theme);
};

SoundEngine._originalBoom = SoundEngine.playPerfectionBoom;

SoundEngine.playPerfectionBoom = function(theme) {
  if (this.isMuted) return;
  this.init();
  if (!this.ctx) return;
  if (this.ctx.state === "suspended") this.ctx.resume();
  
  if (theme === "theme_bonbon" || theme === "theme_sapin" || theme === "theme_lutin") {
    this.stopBoom();
    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(f, t + i * 0.09);
      g.gain.setValueAtTime(0.14, t + i * 0.09);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + 0.4);
      o.connect(g);
      g.connect(this.ctx.destination);
      o.start(t + i * 0.09);
      o.stop(t + i * 0.09 + 0.4);
    });
    return;
  }
  if (theme === "theme_citrouille" || theme === "theme_fantome") {
    this._originalBoom.call(this, theme);
    return;
  }
  this._originalBoom.call(this, theme);
};

/* ============================================================
9. SONS COMBO NOËL (S3)
============================================================ */
function playBonbonSound() {
  if (isMuted()) return;
  try {
    SoundEngine.init();
    const ctx = SoundEngine.ctx;
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    const t = ctx.currentTime;
    [2200, 2800, 3400].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(f, t + i * 0.03);
      g.gain.setValueAtTime(0.11, t + i * 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.03 + 0.18);
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.setValueAtTime(1800, t);
      o.connect(hp);
      hp.connect(g);
      g.connect(ctx.destination);
      o.start(t + i * 0.03);
      o.stop(t + i * 0.03 + 0.18);
    });
  } catch (e) {}
}

function playSapinSound() {
  if (isMuted()) return;
  try {
    SoundEngine.init();
    const ctx = SoundEngine.ctx;
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    const t = ctx.currentTime;
    [783.99, 987.77, 1174.66].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(f, t + i * 0.08);
      g.gain.setValueAtTime(0.13, t + i * 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.08 + 0.5);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t + i * 0.08);
      o.stop(t + i * 0.08 + 0.5);
    });
  } catch (e) {}
}

function playLutinSound() {
  if (isMuted()) return;
  try {
    SoundEngine.init();
    const ctx = SoundEngine.ctx;
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    const t = ctx.currentTime;
    LUTIN_LAUGH_PATTERN.forEach(note => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "square";
      o.frequency.setValueAtTime(note.freq, t + note.time);
      o.frequency.exponentialRampToValueAtTime(note.freq * 0.9, t + note.time + note.dur);
      g.gain.setValueAtTime(0.09, t + note.time);
      g.gain.exponentialRampToValueAtTime(0.0001, t + note.time + note.dur);
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.setValueAtTime(note.freq, t + note.time);
      bp.Q.setValueAtTime(12, t + note.time);
      o.connect(bp);
      bp.connect(g);
      g.connect(ctx.destination);
      o.start(t + note.time);
      o.stop(t + note.time + note.dur + 0.01);
    });
  } catch (e) {}
}

/* ============================================================
10. SÉLECTEUR DE BANDE SON
============================================================ */
function getReleasedSeasons() {
  const list = (typeof getSeasonsClient !== "undefined") ? getSeasonsClient() : ((typeof SEASONS_CLIENT !== "undefined") ? SEASONS_CLIENT : []);
  const now = new Date();
  return list.filter(s => {
    const [d, m, y] = s.start.split("/").map(Number);
    return now >= new Date(y, m - 1, d);
  });
}

function openMusicChooser() {
  const d = i18n[currentLang];
  closeMusicChooser();
  const released = getReleasedSeasons();
  const cur = localStorage.getItem('cb_music_season') || 'auto';
  
  let btns = `<button class="btn-main ${cur === 'auto' ? 'btn-gold' : 'btn-blue'}" onclick="setMusicSeason('auto')">🎵 ${d.music_auto}</button>`;
  released.forEach(s => {
    const num = s.id.replace('s', '');
    btns += `<button class="btn-main ${cur === s.id ? 'btn-gold' : 'btn-blue'}" onclick="setMusicSeason('${s.id}')">${s.emoji} ${d.music_season_label} ${num} — ${s.name}</button>`;
  });
  
  const ov = document.createElement('div');
  ov.id = 'music-chooser';
  ov.className = 'modal-overlay';
  ov.innerHTML = `
    <div class="modal-card" style="max-width:320px;text-align:center;">
      <h2 style="color:#00d2ff;margin:0 0 8px 0;">${d.music_title}</h2>
      <p style="font-size:10px;color:#aaa;margin-bottom:10px;">${d.music_no_spoiler}</p>
      ${btns}
      <button class="btn-secondary" onclick="closeMusicChooser()">${d.close}</button>
    </div>`;
  document.body.appendChild(ov);
}

function closeMusicChooser() {
  const o = document.getElementById('music-chooser');
  if (o) o.remove();
}

function setMusicSeason(id) {
  if (id === 'auto') {
    localStorage.removeItem('cb_music_season');
    localStorage.removeItem('cb_music_season_ctx');
  } else {
    localStorage.setItem('cb_music_season', id);
    localStorage.setItem('cb_music_season_ctx', (window.CURRENT_SEASON || 's1'));
  }
  closeMusicChooser();
  if (typeof restartSeasonMusic === "function") restartSeasonMusic();
}
