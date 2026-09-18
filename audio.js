/* ============================================================
AUDIO.JS — Moteur audio WebAudio + fichiers .mp3
============================================================ */

const SoundEngine = {
  ctx: null,
  isMuted: false,
  timerId: null,
  currentMode: null,
  step: 0,
  bpm: 115,
  _currentBoom: null,
  _noiseBuffers: {},
  _isPaused: false,  // ⬅️ Nouveau : état de pause

  /* ============================================================
  1. INITIALISATION & CONTRÔLE
  ============================================================ */
  init() {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === "suspended") this.ctx.resume();
    } catch (e) {
      console.warn("AudioContext non supporté :", e);
    }
  },

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) this.stopMusic(false);
    else if (this.currentMode) this.startMusic(this.currentMode);
    return this.isMuted;
  },

  stopMusic(clear = true) {
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = null;
    if (clear) this.currentMode = null;
  },

  startMusic(mode) {
    if (this.isMuted) return;
    if (this.timerId && this.currentMode === mode) return;  // ⬅️ Évite les doubles starts
    
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === "suspended") this.ctx.resume();
    
    this.stopMusic(false);
    this.currentMode = mode;
    this.step = 0;
    this._isPaused = false;
    this.bpm = (mode === "menu") ? 108 : 150;
    const intervalMs = (60 / this.bpm / 4) * 1000;
    
    this.timerId = setInterval(() => {
      if (this.isMuted || !this.ctx || this.ctx.state !== "running" || this._isPaused) return;
      if (this.currentMode === "menu") this.tickMenu8Bit(this.step % 128);
      else this.tickGameMusic(this.step);
      this.step = (this.step + 1) % 256;
    }, intervalMs);
  },

  // ⬅️ NOUVEAU : Pause propre (utilisée par les listeners)
  pause() {
    if (this._isPaused) return;
    this._isPaused = true;
    
    // Arrête le timer
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    
    // Suspend le contexte AudioContext
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend();
    }
  },

  // ⬅️ NOUVEAU : Reprise propre
  resume() {
    if (!this._isPaused) return;
    this._isPaused = false;
    
    // Relance le contexte
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    
    // Relance la musique si un mode était actif
    if (this.currentMode && !this.isMuted) {
      this.startMusic(this.currentMode);
    }
  },

  /* ============================================================
  2. EFFETS SONORES COURTS
  ============================================================ */
  playClick() {
    if (this.isMuted || !this.ctx || this._isPaused) return;
    this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.05);
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.05);
  },

  playError() {
    if (this.isMuted || !this.ctx || this._isPaused) return;
    this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.linearRampToValueAtTime(60, t + 0.12);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.12);
  },

  playVictory() {
    if (this.isMuted || !this.ctx || this._isPaused) return;
    this.init();
    [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98].forEach((freq, i) => {
      setTimeout(() => {
        if (this.isMuted || !this.ctx || this._isPaused) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.25);
      }, i * 80);
    });
  },

  /* ============================================================
  3. MUSIQUE MENU (chill 8-bit)
  ============================================================ */
  tickMenu8Bit(step) {
    if (!this.ctx || this._isPaused) return;
    const t = this.ctx.currentTime;
    const bar = Math.floor(step / 16);
    const inBar = step % 16;

    const chords = [
      { root: 110.00, notes: [220.00, 261.63, 329.63] },
      { root: 87.31, notes: [174.61, 220.00, 261.63] },
      { root: 130.81, notes: [261.63, 329.63, 392.00] },
      { root: 98.00, notes: [196.00, 246.94, 293.66] }
    ];
    const chord = chords[bar % 4];

    // Kick (temps 0 et 8)
    if (inBar === 0 || inBar === 8) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    }

    // Hi-hat (temps 2, 6, 10, 14)
    if (inBar % 4 === 2) {
      const noise = this._getNoiseBuffer(0.03);
      const src = this.ctx.createBufferSource();
      src.buffer = noise;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(6000, t);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.02, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      src.start(t);
    }

    // Basse (temps pairs)
    if (inBar % 2 === 0) {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(chord.root, t);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, t);
      filter.frequency.exponentialRampToValueAtTime(180, t + 0.1);
      gain.gain.setValueAtTime(0.045, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.11);
    }

    // Mélodie (temps pairs)
    if (inBar % 2 === 0) {
      const melodyA = [
        [440, 493.88, 523.25, 659.25, 587.33, 523.25, 493.88, 440],
        [349.23, 392, 440, 523.25, 440, 392, 349.23, 392],
        [392, 440, 392, 329.63, 261.63, 293.66, 329.63, 392],
        [293.66, 329.63, 369.99, 392, 369.99, 329.63, 293.66, 246.94]
      ];
      const melodyB = [
        [659.25, 587.33, 523.25, 493.88, 523.25, 587.33, 659.25, 523.25],
        [523.25, 440, 392, 440, 523.25, 440, 392, 349.23],
        [392, 329.63, 261.63, 329.63, 392, 523.25, 493.88, 392],
        [293.66, 392, 493.88, 587.33, 493.88, 392, 293.66, 0]
      ];
      const table = (bar < 4) ? melodyA : melodyB;
      const note = table[bar % 4][inBar / 2];
      if (note > 0) {
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(note, t);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1600, t);
        filter.frequency.exponentialRampToValueAtTime(500, t + 0.22);
        gain.gain.setValueAtTime(0.035, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.32);
      }
    }

    // Pad (début de mesure)
    if (inBar === 0) {
      chord.notes.forEach((f) => {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.012, t + 0.4);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
        o.connect(g);
        g.connect(this.ctx.destination);
        o.start(t);
        o.stop(t + 2.2);
      });

      // Effet visuel (glow)
      const glow = document.getElementById('bg-glow');
      if (glow) {
        glow.style.opacity = '0.22';
        setTimeout(() => { glow.style.opacity = '0.08'; }, 350);
      }
    }
  },

  /* ============================================================
  4. MUSIQUE JEU (try hard, 4 sections)
  ============================================================ */
  tickGameMusic(step) {
    if (!this.ctx || this._isPaused) return;
    const t = this.ctx.currentTime;
    const bar = Math.floor(step / 16);
    const inBar = step % 16;
    const section = Math.floor(step / 64);

    const progs = [
      [110.00, 87.31, 130.81, 98.00],
      [110.00, 87.31, 65.41, 98.00],
      [55.00, 87.31, 130.81, 98.00],
      [110.00, 130.81, 87.31, 98.00]
    ];
    const root = progs[section][bar % 4];

    // Kick (temps 0, 4, 8, 12)
    if (inBar % 4 === 0) this._kick(t, 0.28);

    // Snare (temps 4 et 12)
    if (inBar === 4 || inBar === 12) this._snare(t, section >= 2 ? 0.2 : 0.13);

    // Hi-hat (temps pairs, section 1+)
    if (section >= 1 && inBar % 2 === 0) this._hat(t, inBar % 4 === 2 ? 0.05 : 0.03);

    // Snare roll (fin section 3)
    if (section === 3 && inBar >= 14) this._snare(t, 0.08 + (inBar - 14) * 0.05);

    // Basse
    if (!(section === 3 && inBar >= 8)) {
      if (inBar % 2 === 0) this._bass(t, root, 0.14);
      else this._bass(t, root * 2, 0.09);
    }

    // Lead (section 1+)
    if (section >= 1) {
      const leadNotes = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33];
      const patterns = [
        [0, -1, 2, -1, 3, -1, 2, 4, -1, 3, -1, 2, 0, -1, -1, -1],
        [0, 2, 3, 4, 5, 4, 3, 2, 0, 2, 3, 5, 7, 5, 3, 2],
        [7, 5, 4, 3, 5, 4, 3, 2, 4, 3, 2, 0, 2, 3, 4, 5],
        [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 0, 2, 3, 4]
      ];
      const idx = patterns[section][inBar];
      if (idx >= 0) this._lead(t, leadNotes[idx] * (section === 2 ? 2 : 1), 0.06);
    }

    // Pad (section 0 et 3, début de mesure)
    if ((section === 0 || section === 3) && inBar === 0) this._pad(t, root);
  },

  /* ============================================================
  5. INSTRUMENTS INTERNES (kick, snare, hat, bass, lead, pad)
  ============================================================ */
  _kick(t, vol) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.12);
  },

  _snare(t, vol) {
    const dur = 0.09;
    const noise = this._getNoiseBuffer(dur);
    const src = this.ctx.createBufferSource();
    src.buffer = noise;
    const f = this.ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.setValueAtTime(1800, t);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.ctx.destination);
    src.start(t);
  },

  _hat(t, vol) {
    const dur = 0.03;
    const noise = this._getNoiseBuffer(dur);
    const src = this.ctx.createBufferSource();
    src.buffer = noise;
    const f = this.ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.setValueAtTime(7000, t);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    src.connect(f);
    f.connect(g);
    g.connect(this.ctx.destination);
    src.start(t);
  },

  _bass(t, freq, vol) {
    const osc = this.ctx.createOscillator();
    const f = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, t);
    f.type = "lowpass";
    f.frequency.setValueAtTime(500, t);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
    osc.connect(f);
    f.connect(g);
    g.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.11);
  },

  _lead(t, freq, vol) {
    const osc = this.ctx.createOscillator();
    const f = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(freq, t);
    f.type = "lowpass";
    f.frequency.setValueAtTime(2500, t);
    f.frequency.exponentialRampToValueAtTime(700, t + 0.18);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    osc.connect(f);
    f.connect(g);
    g.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  },

  _pad(t, root) {
    [root * 2, root * 3, root * 4].forEach(fr => {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(fr, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.02, t + 0.3);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.0);
      o.connect(g);
      g.connect(this.ctx.destination);
      o.start(t);
      o.stop(t + 2.0);
    });
  },

  /* ============================================================
  6. BUFFER NOISE RÉUTILISABLE (optimisation performance)
  ============================================================ */
  _getNoiseBuffer(duration) {
    const key = duration.toFixed(3);
    if (!this._noiseBuffers[key]) {
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }
      this._noiseBuffers[key] = buffer;
    }
    return this._noiseBuffers[key];
  },

  /* ============================================================
  7. SONS DE COMBO (par thème)
  ============================================================ */
  playCrack(theme) {
    if (this.isMuted || !this.ctx || this._isPaused) return;
    this.init();
    const t = this.ctx.currentTime;

    if (theme === "theme_glacial") {
      for (let i = 0; i < 3; i++) {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(1800 + Math.random() * 2500, t + i * 0.03);
        g.gain.setValueAtTime(0.14, t + i * 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.03 + 0.12);
        osc.connect(g);
        g.connect(this.ctx.destination);
        osc.start(t + i * 0.03);
        osc.stop(t + i * 0.03 + 0.12);
      }
    } else if (theme === "theme_alt") {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(1200 + Math.random() * 600, t);
      osc.frequency.exponentialRampToValueAtTime(2400, t + 0.06);
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.1);
    } else {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(2200, t);
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.08);
      g.gain.setValueAtTime(0.16, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.08);
    }
  },

  playComboTick(combo) {
    if (this.isMuted || !this.ctx || this._isPaused) return;
    this.init();
    const t = this.ctx.currentTime;
    const freq = 400 + Math.min(combo, 35) * 40;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.13, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.08);
  },

  playPerfectionBoom(theme) {
    if (this.isMuted || !this.ctx || this._isPaused) return;
    this.init();
    const t = this.ctx.currentTime;

    if (theme === "theme_glacial") {
      this.boom(t, 0.6, 90);
      for (let i = 0; i < 24; i++) {
        const when = t + Math.random() * 0.5;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(1500 + Math.random() * 3500, when);
        g.gain.setValueAtTime(0.11, when);
        g.gain.exponentialRampToValueAtTime(0.0001, when + 0.15);
        osc.connect(g);
        g.connect(this.ctx.destination);
        osc.start(when);
        osc.stop(when + 0.15);
      }
    } else if (theme === "theme_alt") {
      for (let i = 0; i < 20; i++) {
        const when = t + i * 0.04;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(1000 + Math.random() * 1500, when);
        g.gain.setValueAtTime(0.11, when);
        g.gain.exponentialRampToValueAtTime(0.0001, when + 0.12);
        osc.connect(g);
        g.connect(this.ctx.destination);
        osc.start(when);
        osc.stop(when + 0.12);
      }
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        const when = t + 0.3 + i * 0.09;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(f, when);
        g.gain.setValueAtTime(0.14, when);
        g.gain.exponentialRampToValueAtTime(0.0001, when + 0.25);
        osc.connect(g);
        g.connect(this.ctx.destination);
        osc.start(when);
        osc.stop(when + 0.25);
      });
    } else {
      for (let i = 0; i < 5; i++) this.zap(t + Math.random() * 0.4);
      this.thunder(t + 0.35);
    }
  },

  boom(t, vol, freq) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(28, t + 0.7);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.8);
  },

  zap(when) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(3000, when);
    osc.frequency.exponentialRampToValueAtTime(150, when + 0.1);
    g.gain.setValueAtTime(0.15, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.1);
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start(when);
    osc.stop(when + 0.1);
  },

  thunder(when) {
    const dur = 1.6;
    const noise = this._getNoiseBuffer(dur);
    const src = this.ctx.createBufferSource();
    src.buffer = noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(900, when);
    filter.frequency.exponentialRampToValueAtTime(60, when + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.65, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.ctx.destination);
    src.start(when);
  },

  stopBoom() {
    if (this._currentBoom) {
      this._currentBoom.pause();
      this._currentBoom.currentTime = 0;
      this._currentBoom = null;
    }
  }
};

/* ============================================================
8. SONS LIBRES DE DROIT (fichiers .mp3)
============================================================ */
const CRACK_FILES = {
  theme_glacial: "sound/crack-glace.mp3",
  theme_alt: "sound/crack-or.mp3",
  default: ""
};

const BOOM_FILES = {
  theme_glacial: "sound/boom-glace.mp3",
  theme_alt: "sound/boom-or.mp3",
  default: ""
};

// Précharge les fichiers (zéro latence au premier play)
Object.values(CRACK_FILES).concat(Object.values(BOOM_FILES)).forEach(f => {
  if (f) {
    const p = new Audio(f);
    p.preload = "auto";
  }
});

// Override avec fichiers .mp3 si disponibles
SoundEngine._synthCrack = SoundEngine.playCrack;
SoundEngine._synthBoom = SoundEngine.playPerfectionBoom;

SoundEngine.playCrack = function(theme) {
  if (this.isMuted || this._isPaused) return;
  const file = CRACK_FILES[theme] || CRACK_FILES.default;
  if (file) {
    const a = new Audio(file);
    a.volume = 0.7;
    a.playbackRate = 0.9 + Math.random() * 0.25;
    a.play().catch(() => {});
    return;
  }
  this._synthCrack(theme);
};

SoundEngine.playPerfectionBoom = function(theme) {
  if (this.isMuted || this._isPaused) return;
  this.stopBoom();
  const file = BOOM_FILES[theme] || BOOM_FILES.default;
  if (file) {
    const a = new Audio(file);
    a.volume = 0.5;
    this._currentBoom = a;
    a.onended = () => {
      if (this._currentBoom === a) this._currentBoom = null;
    };
    a.play().catch(() => {});
    return;
  }
  this._synthBoom(theme);
};

/* ============================================================
9. INITIALISATION AU PREMIER CLIC
============================================================ */
function toggleMute() {
  const muted = SoundEngine.toggleMute();
  const muteBtn = document.getElementById("mute-btn");
  if (muteBtn) muteBtn.innerText = muted ? "🔇" : "🔊";
}

document.addEventListener("click", () => {
  SoundEngine.init();
}, { once: true });

/* ============================================================
10. GESTION PAUSE/RESUME AUTOMATIQUE (mobile + PC)
============================================================ */
let _audioListenersAdded = false;

function setupAudioListeners() {
  if (_audioListenersAdded) return;
  _audioListenersAdded = true;

  // ⬅️ Mobile : verrouillage écran, retour accueil, changement d'app
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      SoundEngine.pause();
    } else {
      setTimeout(() => SoundEngine.resume(), 100);
    }
  });

  // ⬅️ PC : perte de focus (changement d'onglet, Alt+Tab)
  window.addEventListener('blur', () => {
    SoundEngine.pause();
  });
  
  window.addEventListener('focus', () => {
    setTimeout(() => SoundEngine.resume(), 100);
  });

  // ⬅️ Mobile : navigation away, fermeture d'onglet
  window.addEventListener('pagehide', () => {
    SoundEngine.pause();
  });
  
  window.addEventListener('pageshow', () => {
    setTimeout(() => SoundEngine.resume(), 100);
  });

  // ⬅️ Reprend la musique après un reload (push Render, refresh)
  window.addEventListener('load', () => {
    setTimeout(() => {
      if (!document.hidden && !SoundEngine._isPaused) {
        // Si un mode était actif avant le reload, le relancer
        const savedMode = localStorage.getItem('cb_music_mode');
        if (savedMode && !SoundEngine.isMuted) {
          SoundEngine.startMusic(savedMode);
        }
      }
    }, 300);
  });
}

// ⬅️ Sauvegarde le mode de musique pour reprise après reload
const _originalStartMusic = SoundEngine.startMusic;
SoundEngine.startMusic = function(mode) {
  localStorage.setItem('cb_music_mode', mode);
  return _originalStartMusic.call(this, mode);
};

const _originalStopMusic = SoundEngine.stopMusic;
SoundEngine.stopMusic = function(clear = true) {
  if (clear) localStorage.removeItem('cb_music_mode');
  return _originalStopMusic.call(this, clear);
};

// ⬅️ Initialise les listeners au chargement
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupAudioListeners);
} else {
  setupAudioListeners();
}
