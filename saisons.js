/* ============================================================
SAISONS.JS — MODULE DA VISUELLE SAISONNIÈRE
Gère les scènes Halloween (S2) et Noël (S3) avec Lottie
============================================================ */

/* ============================================================
1. CONSTANTES
============================================================ */
const SEASON_CONFIG = {
  MUSIC_RESTART_DELAY: 150,
  HALLOWEEN_AMBIENCE_INTERVAL: 1500,
  LOTTIE_RETRY_INTERVAL: 1000,
  LOTTIE_RETRY_TIMEOUT: 15000,
  NOEL_SLEIGH_INTERVAL: 7000,
  NOEL_SLEIGH_INITIAL_DELAY: 1500,
  NOEL_STAR_INTERVAL: 4000,
  NOEL_SLEIGH_LIFETIME: 19000,
  GHOST_LIFETIME: 5500,
  BAT_LIFETIME: 8000,
  SPIDER_LIFETIME: 9000,
  ORB_LIFETIME: 3500,
  LANTERN_SPAWN_DELAY: 90,
  BONBON_SPAWN_DELAY: 90,
  SAPIN_SPAWN_DELAY: 90,
  LUTIN_SPAWN_DELAY: 150,
  SHOOTING_STAR_LIFETIME_OFFSET: 200
};

const HALLOWEEN_LOTTIE_FILES = {
  citrouille: "CITROUILLE.json",
  fantome: "fantome.json",
  chauve: "chauve-souris.json",
  araignee: "araignée.json"
};

const NOEL_LOTTIE_FILES = {
  flocon: "flocon-decors.json",
  guirlandes: "guirlandes-decors.json",
  perenoel: "pere-noel-decors.json",
  sapin: "sapin-decors.json",
  bonhomme: "bonhomme-de-neige-avatar.json"
};

const SEASON_SHAPES = {
  s1: { shapes: ["◆", "▲", "■", "●"], colors: ["#00d2ff", "#ff007f", "#ffe600", "#00ff88"] },
  s3: { shapes: ["❄️", "⛄", "🎄", ""], colors: ["#ffffff", "#7be8ff", "#ff4b2b", "#38ef7d"] }
};

/* ============================================================
2. ÉTAT GLOBAL
============================================================ */
let lastAppliedSeason = null;
let _musicRestartTimer = null;
let halloweenAmbienceTimer = null;
let _lanternAudioCtx = null;
let _ghostAudioCtx = null;
let noelSleighTimer = null;
let noelStarTimer = null;

// Lottie Halloween
let _hlData = {};
let _hlPreloaded = false;
let _hlPumpkins = [];
const _hlActive = { chauve: [], fantome: [], araignee: [] };

// Lottie Noël
let _nxData = {};
let _nxPreloaded = false;
let _nxAnims = [];

/* ============================================================
3. HELPERS GÉNÉRIQUES
============================================================ */
function getCurrentSeasonId() {
  if (typeof myProfile !== "undefined" && myProfile) {
    return myProfile.currentSeasonId || myProfile.seasonId || myProfile.season_id || "s1";
  }
  return window.CURRENT_SEASON || "s1";
}

function isLowPerf() {
  return (typeof IS_LOW_PERF !== "undefined") && IS_LOW_PERF;
}

function isMutedGlobal() {
  if (typeof isMuted === "function") return isMuted();
  return false;
}

function cloneLottieData(data) {
  if (!data) return null;
  return (typeof structuredClone === "function") ? structuredClone(data) : JSON.parse(JSON.stringify(data));
}

/* ============================================================
4. MUSIQUE SAISONNIÈRE
============================================================ */
function restartSeasonMusic() {
  if (typeof SoundEngine === "undefined") return;

  if (_musicRestartTimer) clearTimeout(_musicRestartTimer);

  _musicRestartTimer = setTimeout(() => {
    try {
      const seasonId = window.CURRENT_SEASON || getCurrentSeasonId();
      const gameScreen = document.getElementById("screen-game");
      const inGame = gameScreen && gameScreen.style.display === "block";
      const mode = inGame ? "game" : "menu";

      if (typeof SoundEngine.stopMusic === "function") {
        SoundEngine.stopMusic(false);
      }

      if (typeof SoundEngine.startMusic === "function") {
        SoundEngine.startMusic(mode);
      }
    } catch (e) {
      console.warn("Erreur restartSeasonMusic:", e);
    }
  }, SEASON_CONFIG.MUSIC_RESTART_DELAY);
}

/* ============================================================
5. APPLICATION DA SAISONNIÈRE
============================================================ */
function applySeasonDA() {
  const seasonId = getCurrentSeasonId();
  window.CURRENT_SEASON = seasonId;

  document.body.classList.remove("season-s1", "season-s2", "season-s3");
  document.body.classList.add("season-" + seasonId);

  if (lastAppliedSeason !== seasonId) {
    lastAppliedSeason = seasonId;
    restartSeasonMusic();
  }

  if (seasonId === "s2") buildHalloweenScene();
  else if (seasonId === "s3") buildNoelScene();
  else { clearHalloweenScene(); clearNoelScene(); }

  setupHalloweenDecor(seasonId);
  setupNoelDecor(seasonId);

  const fx = document.getElementById("bg-fx");
  if (!fx) return;
  fx.querySelectorAll(".bg-shape").forEach(s => s.remove());
  if (seasonId === "s2") return;

  const config = SEASON_SHAPES[seasonId] || SEASON_SHAPES.s1;

  for (let i = 0; i < 12; i++) {
    const s = document.createElement("div");
    s.className = "bg-shape";
    s.innerText = config.shapes[i % config.shapes.length];
    s.style.fontSize = (14 + Math.random() * 26) + "px";
    s.style.left = Math.random() * 100 + "%";
    s.style.color = config.colors[i % config.colors.length];
    s.style.animationDuration = (14 + Math.random() * 16) + "s";
    s.style.animationDelay = (-Math.random() * 25) + "s";
    fx.appendChild(s);
  }
}

/* ============================================================
6. SCÈNE HALLOWEEN (S2)
============================================================ */
function buildHalloweenScene() {
  let bg = document.getElementById("season-bg");
  if (!bg) {
    bg = document.createElement("div");
    bg.id = "season-bg";
    document.body.prepend(bg);
  }
  if (bg.dataset.built === "s2") return;
  bg.dataset.built = "s2";
  clearNoelLotties();
  
  bg.innerHTML = `
    <div class="hw-sky"></div>
    <div class="hw-moon"></div>
    <div class="hw-cloud hw-c1"></div>
    <div class="hw-cloud hw-c2"></div>
    <div class="hw-cloud hw-c3"></div>
    <div class="hw-castle">
      <svg viewBox="0 0 400 300" preserveAspectRatio="none">
        <defs>
          <linearGradient id="castleGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#1a0033"/>
            <stop offset="100%" stop-color="#0a001a"/>
          </linearGradient>
        </defs>
        <g fill="url(#castleGrad)" stroke="#2a0a4d" stroke-width="1">
          <polygon points="45,300 52,140 44,120 60,70 74,125 70,300"/>
          <polygon points="70,300 70,190 130,180 130,300"/>
          <polygon points="130,300 138,120 128,95 150,30 172,100 162,130 168,300"/>
          <polygon points="168,300 168,170 200,160 210,140 220,165 250,170 250,300"/>
          <polygon points="250,300 258,130 250,110 268,55 284,115 278,300"/>
          <polygon points="278,300 278,200 330,190 330,300"/>
          <polygon points="330,300 336,150 330,130 344,90 358,135 352,300"/>
        </g>
        <g fill="#ff8a00">
          <rect class="win" x="56" y="150" width="7" height="11"/>
          <rect class="win" x="146" y="120" width="8" height="13" style="animation-delay:1s"/>
          <rect class="win" x="150" y="180" width="7" height="11" style="animation-delay:1.4s"/>
          <rect class="win" x="196" y="190" width="9" height="13" style="animation-delay:0.4s"/>
          <rect class="win" x="228" y="195" width="8" height="12" style="animation-delay:0.9s"/>
          <rect class="win" x="264" y="150" width="7" height="11" style="animation-delay:2s"/>
          <rect class="win" x="300" y="215" width="6" height="10" style="animation-delay:0.6s"/>
          <rect class="win" x="340" y="170" width="6" height="10" style="animation-delay:1.7s"/>
        </g>
        <g stroke="#0a001a" stroke-width="1.5" fill="none" opacity="0.4">
          <path d="M60,200 q10,20 -4,40"/>
          <path d="M150,220 q-8,25 6,45"/>
          <path d="M265,210 q8,20 -5,40"/>
        </g>
      </svg>
    </div>
    <div class="hw-tree hw-tree-left">
      <svg viewBox="0 0 200 300" preserveAspectRatio="none">
        <g stroke="#0d0016" fill="none" stroke-linecap="round">
          <path d="M30,300 C28,240 24,190 30,140 C34,100 30,70 26,40" stroke-width="18"/>
          <path d="M30,220 C70,190 110,170 150,150 C170,140 185,125 195,110" stroke-width="10"/>
          <path d="M32,170 C60,150 90,140 120,120 C140,108 155,95 165,80" stroke-width="8"/>
          <path d="M28,120 C50,105 75,95 100,80 C115,70 125,60 132,48" stroke-width="6"/>
          <path d="M110,170 C120,155 128,145 138,132" stroke-width="5"/>
          <path d="M150,150 C158,138 165,128 172,116" stroke-width="4"/>
          <path d="M90,140 C98,128 105,118 112,106" stroke-width="4"/>
          <path d="M120,120 C130,108 138,98 146,86" stroke-width="3"/>
          <path d="M70,100 C78,90 85,80 92,68" stroke-width="3"/>
          <path d="M28,200 C18,185 12,170 8,155" stroke-width="5"/>
          <path d="M26,150 C18,138 14,126 10,112" stroke-width="4"/>
        </g>
      </svg>
    </div>
    <div class="hw-tree hw-tree-right">
      <svg viewBox="0 0 200 300" preserveAspectRatio="none">
        <g stroke="#0d0016" fill="none" stroke-linecap="round">
          <path d="M30,300 C28,240 24,190 30,140 C34,100 30,70 26,40" stroke-width="18"/>
          <path d="M30,220 C70,190 110,170 150,150 C170,140 185,125 195,110" stroke-width="10"/>
          <path d="M32,170 C60,150 90,140 120,120 C140,108 155,95 165,80" stroke-width="8"/>
          <path d="M28,120 C50,105 75,95 100,80 C115,70 125,60 132,48" stroke-width="6"/>
          <path d="M110,170 C120,155 128,145 138,132" stroke-width="5"/>
          <path d="M150,150 C158,138 165,128 172,116" stroke-width="4"/>
          <path d="M90,140 C98,128 105,118 112,106" stroke-width="4"/>
          <path d="M28,200 C18,185 12,170 8,155" stroke-width="5"/>
        </g>
      </svg>
    </div>
    <div class="hw-fence"></div>
    <div class="hw-ground"></div>
    <div class="hw-mist"></div>
  `;
  
  preloadHalloweenLotties();
  addScenePumpkins(bg);
}

function clearHalloweenScene() {
  const bg = document.getElementById("season-bg");
  if (bg) {
    bg.innerHTML = "";
    bg.dataset.built = "";
  }
  clearHalloweenLotties();
}

/* ============================================================
7. DÉCOR VIVANT HALLOWEEN (toiles + spawner)
============================================================ */
function setupHalloweenDecor(seasonId) {
  document.querySelectorAll(".halloween-web").forEach(el => el.remove());
  if (halloweenAmbienceTimer) {
    clearInterval(halloweenAmbienceTimer);
    halloweenAmbienceTimer = null;
  }
  if (seasonId !== "s2") return;

  const webTL = document.createElement("div");
  webTL.className = "halloween-web tl";
  webTL.innerText = "🕸️";
  document.body.appendChild(webTL);

  const webTR = document.createElement("div");
  webTR.className = "halloween-web tr";
  webTR.innerText = "🕸️";
  document.body.appendChild(webTR);

  halloweenAmbienceTimer = setInterval(() => {
    const inGame = document.getElementById("screen-game") && document.getElementById("screen-game").style.display === "block";
    if (inGame) return;
    const roll = Math.random();
    if (roll < 0.25) spawnSceneGhost();
    else if (roll < 0.6) spawnSceneBat();
    else spawnSceneSpider();
  }, SEASON_CONFIG.HALLOWEEN_AMBIENCE_INTERVAL);
}

/* ============================================================
8. LOTTIE HALLOWEEN — préchargement + recyclage
============================================================ */
function hlMax(type) {
  const low = isLowPerf();
  if (type === "araignee") return low ? 2 : 3;
  return low ? 2 : 3;
}

function preloadHalloweenLotties() {
  if (_hlPreloaded || typeof lottie === "undefined") return;
  _hlPreloaded = true;
  Object.keys(HALLOWEEN_LOTTIE_FILES).forEach(key => {
    const tryLoad = (attempt) => {
      fetch(HALLOWEEN_LOTTIE_FILES[key])
        .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(data => { _hlData[key] = data; console.log("✅ Lottie chargé : " + key); })
        .catch(() => {
          if (attempt < 3) setTimeout(() => tryLoad(attempt + 1), 800);  // ✅ retry (course SW/réseau)
          else { _hlData[key] = null; console.log("❌ Lottie introuvable : " + HALLOWEEN_LOTTIE_FILES[key]); }
        });
    };
    tryLoad(0);
  });
}

function hlRecycle(type) {
  const arr = _hlActive[type];
  while (arr.length >= hlMax(type)) {
    const old = arr.shift();
    if (old) {
      if (old.anim) old.anim.destroy();
      if (old.el && old.el.parentNode) old.el.remove();
    }
  }
}

function hlRegister(type, obj, lifetime) {
  _hlActive[type].push(obj);
  setTimeout(() => {
    if (obj.anim) obj.anim.destroy();
    if (obj.el && obj.el.parentNode) obj.el.remove();
    const idx = _hlActive[type].indexOf(obj);
    if (idx !== -1) _hlActive[type].splice(idx, 1);
  }, lifetime);
}

/* ============================================================
9. CITROUILLES HALLOWEEN (Lottie ou fallback CSS)
============================================================ */
function addScenePumpkins(bg) {
  clearHalloweenPumpkins();
  const low = isLowPerf();
  const spots = low
    ? [
        { left: "-4%", bottom: "-2%", size: 150 },
        { right: "-4%", bottom: "-1%", size: 170 }
      ]
    : [
        { left: "-2%", bottom: "-2%", size: 280 },
        { left: "16%", bottom: "-4%", size: 190 },
        { right: "-3%", bottom: "-1%", size: 320 },
        { right: "22%", bottom: "-4%", size: 170 }
      ];

  const build = () => {
    clearHalloweenPumpkins();
    for (let i = 0; i < spots.length; i++) {
      const s = spots[i];
      const el = document.createElement("div");
      el.className = "hw-pumpkin-lottie";
      el.style.width = s.size + "px";
      el.style.height = s.size + "px";
      if (s.left) el.style.left = s.left;
      if (s.right) el.style.right = s.right;
      el.style.bottom = s.bottom;
      bg.appendChild(el);

      let anim = null;
      const data = cloneLottieData(_hlData.citrouille);
      if (data) {
        // ✅ Fichier chargé → vrai Lottie
        anim = lottie.loadAnimation({
          container: el,
          renderer: "svg",
          loop: true,
          autoplay: true,
          animationData: data
        });
      } else if (_hlData.citrouille === null) {
        // ✅ Échec DÉFINITIF (fichier manque vraiment) → fallback
        el.innerHTML = `<div class="lantern" style="width:100%;height:100%;"><div class="face"><div class="eye-left"></div><div class="eye-right"></div><div class="mouth"></div></div></div>`;
      }
      // ⚠️ Si _hlData.citrouille === undefined (encore en chargement) →
      //    l'élément reste VIDE (invisible) : plus jamais de mauvais skin !
      _hlPumpkins.push({ el, anim });
    }
  };

  build();   // 1er passage : Lottie si prêt, sinon rien (pas de fallback)

  if (!_hlData.citrouille) {
    const retry = setInterval(() => {
      if (_hlData.citrouille && window.CURRENT_SEASON === "s2" && document.getElementById("season-bg")) {
        clearInterval(retry);
        build();   // ✅ recharge avec le vrai Lottie dès qu'il arrive
      }
    }, SEASON_CONFIG.LOTTIE_RETRY_INTERVAL);
    setTimeout(() => {
      clearInterval(retry);
      if (_hlData.citrouille === null) build();  // échec définitif → affiche fallback
    }, SEASON_CONFIG.LOTTIE_RETRY_TIMEOUT);
  }
}

function clearHalloweenPumpkins() {
  _hlPumpkins.forEach(p => {
    if (p.anim) p.anim.destroy();
    if (p.el && p.el.parentNode) p.el.remove();
  });
  _hlPumpkins = [];
}

function clearHalloweenLotties() {
  clearHalloweenPumpkins();
  Object.keys(_hlActive).forEach(type => {
    _hlActive[type].forEach(o => {
      if (o.anim) o.anim.destroy();
      if (o.el && o.el.parentNode) o.el.remove();
    });
    _hlActive[type] = [];
  });
}

/* ============================================================
10. SPAWNERS HALLOWEEN (chauve-souris, fantôme, araignée)
============================================================ */
function hlWaitLoaded(key, fn, retry) {
  if (_hlData[key] === undefined && (retry || 0) < 10) {
    setTimeout(() => fn((retry || 0) + 1), 400);
    return true;
  }
  return false;
}

function spawnSceneBat(retry) {
  if (hlWaitLoaded("chauve", spawnSceneBat, retry)) return;
  hlRecycle("chauve");
  const el = document.createElement("div");
  el.className = "hw-bat-lottie";
  const size = 90 + Math.random() * 60;
  el.style.width = size + "px";
  el.style.height = size + "px";
  el.style.top = (5 + Math.random() * 28) + "%";
  el.style.animationDuration = (4 + Math.random() * 3) + "s";
  (document.getElementById("season-bg") || document.body).appendChild(el);

  const data = cloneLottieData(_hlData.chauve);
  let anim = null;
  if (data) {
    anim = lottie.loadAnimation({
      container: el,
      renderer: "canvas",
      loop: true,
      autoplay: true,
      animationData: data,
      rendererSettings: { dpr: window.devicePixelRatio || 2, clearCanvas: true }
    });
  } else {
    el.innerText = "🦇";
    el.style.fontSize = size * 0.6 + "px";
  }
  hlRegister("chauve", { el, anim }, SEASON_CONFIG.BAT_LIFETIME);
}

function spawnSceneGhost() {
  hlRecycle("fantome");
  const el = document.createElement("div");
  el.className = "hw-ghost-lottie";
  const size = 110 + Math.random() * 70;
  el.style.width = size + "px";
  el.style.height = size + "px";
  el.style.left = (10 + Math.random() * 80) + "%";
  el.style.top = (15 + Math.random() * 55) + "%";
  el.style.animationDuration = (3.5 + Math.random() * 1.5) + "s";
  el.innerHTML = `
    <div class="scene-ghost">
      <div class="sg-body"></div>
      <div class="sg-fringe"></div>
      <div class="sg-eye l"></div>
      <div class="sg-eye r"></div>
      <div class="sg-mouth"></div>
    </div>`;
  (document.getElementById("season-bg") || document.body).appendChild(el);
  hlRegister("fantome", { el, anim: null }, SEASON_CONFIG.GHOST_LIFETIME);
}

function spawnSceneSpider(retry) {
  if (hlWaitLoaded("araignee", spawnSceneSpider, retry)) return;
  hlRecycle("araignee");
  const el = document.createElement("div");
  el.className = "hw-spider-lottie";
  const w = 160 + Math.random() * 90;
  el.style.width = w + "px";
  el.style.height = (50 + Math.random() * 15) + "vh";
  el.style.left = (8 + Math.random() * 84) + "%";
  (document.getElementById("season-bg") || document.body).appendChild(el);

  const data = cloneLottieData(_hlData.araignee);
  let anim = null;
  if (data) {
    anim = lottie.loadAnimation({
      container: el,
      renderer: "canvas",
      loop: false,
      autoplay: true,
      animationData: data,
      rendererSettings: {
        dpr: window.devicePixelRatio || 2,
        clearCanvas: true,
        preserveAspectRatio: "xMidYMin meet"
      }
    });
  } else {
    el.innerHTML = `<div style="position:absolute;top:0;left:50%;width:1.5px;height:60%;background:linear-gradient(rgba(255,255,255,0),rgba(255,255,255,0.4));"></div><div style="position:absolute;top:60%;left:50%;transform:translateX(-50%);font-size:46px;">🕷️</div>`;
  }
  hlRegister("araignee", { el, anim }, SEASON_CONFIG.SPIDER_LIFETIME);
}

/* ============================================================
11. FX LANTERNES (grille Citrouille)
============================================================ */
function playLanternSound() {
  if (isMutedGlobal()) return;
  try {
    if (!_lanternAudioCtx) _lanternAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (_lanternAudioCtx.state === "suspended") _lanternAudioCtx.resume();
    const ctx = _lanternAudioCtx;
    [110, 116.54].forEach(freq => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.8, ctx.currentTime + 1.2);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.5);
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(300, ctx.currentTime);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.5);
    });
  } catch (e) {}
}

function spawnLanterns(big) {
  const count = big ? 14 : 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    setTimeout(() => createLantern(), i * SEASON_CONFIG.LANTERN_SPAWN_DELAY);
  }
}

function createLantern() {
  const wrapper = document.createElement("div");
  wrapper.className = "lantern-wrapper";
  wrapper.style.left = (Math.random() * (window.innerWidth - 120) + 60) + "px";
  const duration = Math.random() * 1.0 + 3.2;
  wrapper.style.animationDuration = duration + "s";
  wrapper.style.setProperty("--drift", ((Math.random() - 0.5) * 100) + "px");
  wrapper.style.setProperty("--rot", ((Math.random() - 0.5) * 120) + "deg");
  
  const lantern = document.createElement("div");
  lantern.className = "lantern";
  const face = document.createElement("div");
  face.className = "face";
  const eyeLeft = document.createElement("div");
  eyeLeft.className = "eye-left";
  const eyeRight = document.createElement("div");
  eyeRight.className = "eye-right";
  const mouth = document.createElement("div");
  mouth.className = "mouth";
  face.appendChild(eyeLeft);
  face.appendChild(eyeRight);
  face.appendChild(mouth);
  lantern.appendChild(face);
  
  const particlesContainer = document.createElement("div");
  particlesContainer.className = "lantern-particles";
  for (let p = 0; p < 3; p++) {
    const particle = document.createElement("div");
    particle.className = "lantern-particle";
    const size = Math.random() * 4 + 3;
    particle.style.width = size + "px";
    particle.style.height = size + "px";
    particle.style.left = ((Math.random() - 0.5) * 15) + "px";
    particle.style.top = (p * 12) + "px";
    particle.style.animationDelay = (Math.random() * 0.4) + "s";
    particlesContainer.appendChild(particle);
  }
  
  wrapper.appendChild(lantern);
  wrapper.appendChild(particlesContainer);
  document.body.appendChild(wrapper);
  setTimeout(() => wrapper.remove(), duration * 1000);
}

/* ============================================================
12. FX ORBE FANTÔME (CSS pure)
============================================================ */
function playGhostSound() {
  if (isMutedGlobal()) return;
  try {
    if (!_ghostAudioCtx) _ghostAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (_ghostAudioCtx.state === "suspended") _ghostAudioCtx.resume();
    const ctx = _ghostAudioCtx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.linearRampToValueAtTime(180, t + 0.5);
    osc.frequency.linearRampToValueAtTime(240, t + 1.0);
    osc.frequency.linearRampToValueAtTime(150, t + 1.6);
    gainNode.gain.setValueAtTime(0.001, t);
    gainNode.gain.linearRampToValueAtTime(0.12, t + 0.3);
    gainNode.gain.linearRampToValueAtTime(0.08, t + 1.0);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(500, t);
    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 1.6);
  } catch (e) {}
}

function spawnGhostLotties(big) {
  const count = big ? (isLowPerf() ? 3 : 6) : (isLowPerf() ? 1 : 2 + Math.floor(Math.random() * 2));
  for (let i = 0; i < count; i++) {
    setTimeout(() => createGhostOrb(), i * 180);
  }
}

function createGhostOrb() {
  const lite = isLowPerf();
  const orb = document.createElement("div");
  orb.className = "ghost-orb";
  const size = lite ? (60 + Math.random() * 30) : (80 + Math.random() * 60);
  orb.style.width = size + "px";
  orb.style.height = size + "px";
  orb.style.left = (Math.random() * 80 + 10) + "%";
  orb.style.top = (Math.random() * 70 + 15) + "%";
  orb.style.animationDuration = (2.4 + Math.random() * 0.8) + "s";

  if (lite) {
    orb.innerHTML = `
      <div class="ghost-orb-body">
        <div class="ghost-orb-face">
          <div class="ghost-orb-eye left"></div>
          <div class="ghost-orb-eye right"></div>
          <div class="ghost-orb-mouth"></div>
        </div>
      </div>`;
  } else {
    orb.innerHTML = `
      <div class="ghost-orb-halo"></div>
      <div class="ghost-orb-body">
        <div class="ghost-orb-face">
          <div class="ghost-orb-eye left"></div>
          <div class="ghost-orb-eye right"></div>
          <div class="ghost-orb-mouth"></div>
        </div>
      </div>`;
    for (let i = 0; i < 4; i++) {
      const sparkle = document.createElement("div");
      sparkle.className = "ghost-orb-sparkle";
      const angle = (i / 4) * Math.PI * 2;
      const distance = 60 + Math.random() * 20;
      sparkle.style.setProperty("--sx", Math.cos(angle) * distance + "px");
      sparkle.style.setProperty("--sy", Math.sin(angle) * distance + "px");
      sparkle.style.left = "50%";
      sparkle.style.top = "50%";
      sparkle.style.animationDelay = (i * 0.3) + "s";
      orb.appendChild(sparkle);
    }
  }

  document.body.appendChild(orb);
  setTimeout(() => orb.remove(), SEASON_CONFIG.ORB_LIFETIME);
}

/* ============================================================
13. FX COMBOS NOËL (S3) — bonbons, boules, lutins
============================================================ */
function spawnBonbons(big) {
  const count = big ? 14 : 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    setTimeout(() => createBonbon(), i * SEASON_CONFIG.BONBON_SPAWN_DELAY);
  }
}

function createBonbon() {
  const w = document.createElement("div");
  w.className = "bonbon-wrapper";
  w.style.left = (Math.random() * (window.innerWidth - 80) + 40) + "px";
  const d = Math.random() * 1 + 2.6;
  w.style.animationDuration = d + "s";
  w.style.setProperty("--drift", ((Math.random() - 0.5) * 120) + "px");
  w.style.setProperty("--rot", ((Math.random() - 0.5) * 360) + "deg");
  w.innerHTML = `<div class="bonbon"></div>`;
  document.body.appendChild(w);
  setTimeout(() => w.remove(), d * 1000);
}

function spawnSapinSparkles(big) {
  const count = big ? 14 : 3 + Math.floor(Math.random() * 3);
  const colors = ["#ff4b4b", "#ffd700", "#4bb3ff", "#38ef7d", "#ff8ae2"];
  for (let i = 0; i < count; i++) {
    setTimeout(() => createSapinSparkle(colors[i % colors.length]), i * SEASON_CONFIG.SAPIN_SPAWN_DELAY);
  }
}

function createSapinSparkle(color) {
  const s = document.createElement("div");
  s.className = "sapin-sparkle";
  s.style.left = (Math.random() * (window.innerWidth - 60) + 30) + "px";
  const d = Math.random() * 1 + 2.4;
  s.style.animationDuration = d + "s";
  s.innerHTML = `<div class="sapin-boule" style="--c:${color}"></div>`;
  document.body.appendChild(s);
  setTimeout(() => s.remove(), d * 1000);
}

function spawnLutins(big) {
  const count = big ? 8 : 3 + Math.floor(Math.random() * 2);
  for (let i = 0; i < count; i++) {
    setTimeout(() => createLutin(), i * SEASON_CONFIG.LUTIN_SPAWN_DELAY);
  }
}

function createLutin() {
  const variants = ["v-grimace", "v-kdo", "v-bonnet", "v-cerf"];
  const variant = variants[Math.floor(Math.random() * variants.length)];
  const isCerf = variant === "v-cerf";
  const isMobile = window.innerWidth <= 600;
  const scale = isMobile ? 0.6 : 1;
  const mode = Math.random();

  if (mode < 0.6) {
    const l = document.createElement("div");
    const dirLR = Math.random() < 0.5;
    const size = ((isCerf ? 150 : 110) + Math.random() * 50) * scale;
    l.className = "lutin-runner " + (dirLR ? "lr" : "rl");
    l.style.width = size + "px";
    l.style.height = (size * (isCerf ? 0.8 : 1.3)) + "px";
    l.style.bottom = (10 + Math.random() * 20) + "%";
    l.style.animationDuration = (2.5 + Math.random() * 2) + "s";
    l.innerHTML = `<div class="lutin-flip${dirLR ? "" : " flip"}"><div class="lutin-body ${variant}"></div></div>`;
    document.body.appendChild(l);
    setTimeout(() => l.remove(), 5000);
  } else {
    const l = document.createElement("div");
    const size = ((isCerf ? 140 : 100) + Math.random() * 50) * scale;
    l.className = "lutin-peek";
    l.style.width = size + "px";
    l.style.height = (size * (isCerf ? 0.8 : 1.3)) + "px";
    l.style.left = (5 + Math.random() * 85) + "%";
    l.innerHTML = `<div class="lutin-body ${variant}"></div>`;
    document.body.appendChild(l);
    setTimeout(() => l.remove(), 3200);
  }
}

/* ============================================================
14. WATCHER ÉCRAN DE JEU (relance musique menu↔game)
============================================================ */
function _watchScreenGame() {
  const gameScreen = document.getElementById("screen-game");
  if (!gameScreen) return;
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.attributeName === "style") {
        restartSeasonMusic();
      }
    }
  });
  observer.observe(gameScreen, { attributes: true, attributeFilter: ["style"] });
}

/* ============================================================
15. SCÈNE NOËL (S3) — Lottie + traîneau
============================================================ */
function spawnShootingStar() {
  const bg = document.getElementById("season-bg");
  if (!bg) return;
  const s = document.createElement("div");
  s.className = "nx-shoot";
  s.style.top = (5 + Math.random() * 30) + "%";
  s.style.left = (40 + Math.random() * 55) + "%";
  const dur = 1.2 + Math.random() * 1.2;
  s.style.animationDuration = dur + "s";
  bg.appendChild(s);
  setTimeout(() => s.remove(), dur * 1000 + SEASON_CONFIG.SHOOTING_STAR_LIFETIME_OFFSET);
}

function preloadNoelLotties() {
  if (_nxPreloaded || typeof lottie === "undefined") return;
  _nxPreloaded = true;
  Object.keys(NOEL_LOTTIE_FILES).forEach(key => {
    fetch(NOEL_LOTTIE_FILES[key])
      .then(r => {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      })
      .then(d => { _nxData[key] = d; })
      .catch(() => { _nxData[key] = null; });
  });
}

function clearNoelLotties() {
  _nxAnims.forEach(a => {
    if (a.anim) a.anim.destroy();
    if (a.el && a.el.parentNode) a.el.remove();
  });
  _nxAnims = [];
}

function clearNoelScene() {
  const bg = document.getElementById("season-bg");
  if (bg && bg.dataset.built === "s3") {
    bg.innerHTML = "";
    bg.dataset.built = "";
  }
  clearNoelLotties();
  if (noelSleighTimer) {
    clearInterval(noelSleighTimer);
    noelSleighTimer = null;
  }
  if (noelStarTimer) {
    clearInterval(noelStarTimer);
    noelStarTimer = null;
  }
}

function buildNoelScene() {
  let bg = document.getElementById("season-bg");
  if (!bg) {
    bg = document.createElement("div");
    bg.id = "season-bg";
    document.body.prepend(bg);
  }
  if (bg.dataset.built === "s3") return;
  clearHalloweenLotties();
  bg.dataset.built = "s3";
  
  let stars = "";
  for (let i = 0; i < 40; i++) {
    stars += `<div class="nx-star" style="left:${Math.random()*100}%; top:${Math.random()*55}%; animation-delay:${Math.random()*2}s;"></div>`;
  }
  
  bg.innerHTML = `
    <div class="nx-sky"></div>${stars}<div class="nx-moon"></div>
    <div class="nx-village">
      <svg viewBox="0 0 400 160" preserveAspectRatio="none">
        <defs>
          <linearGradient id='hred' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#a83232'/><stop offset='1' stop-color='#6e1f1f'/></linearGradient>
          <linearGradient id='hblue' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#3d5a86'/><stop offset='1' stop-color='#243b5c'/></linearGradient>
          <linearGradient id='hgreen' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#2f6b4f'/><stop offset='1' stop-color='#1c4433'/></linearGradient>
          <radialGradient id='win' cx='0.5' cy='0.5' r='0.6'><stop offset='0' stop-color='#fff3c4'/><stop offset='1' stop-color='#ffb347'/></radialGradient>
        </defs>
        <rect x='30' y='92' width='70' height='50' fill='url(#hblue)'/><polygon points='24,92 65,58 106,92' fill='#e8f4ff'/>
        <rect x='45' y='105' width='16' height='14' fill='url(#win)'/><rect x='70' y='105' width='16' height='14' fill='url(#win)'/>
        <rect x='300' y='92' width='70' height='50' fill='url(#hgreen)'/><polygon points='294,92 335,58 376,92' fill='#e8f4ff'/>
        <rect x='315' y='105' width='16' height='14' fill='url(#win)'/><rect x='340' y='105' width='16' height='14' fill='url(#win)'/>
        <rect x='140' y='62' width='120' height='80' fill='url(#hred)'/><polygon points='130,62 200,14 270,62' fill='#f4faff'/>
        <polygon points='130,62 200,14 270,62 258,62 200,24 142,62' fill='#ffffff'/>
        <rect x='182' y='100' width='36' height='42' fill='#4a1717'/><circle cx='200' cy='80' r='10' fill='url(#win)'/>
        <rect x='152' y='78' width='20' height='18' fill='url(#win)'/><rect x='228' y='78' width='20' height='18' fill='url(#win)'/>
        <rect x='236' y='24' width='14' height='28' fill='#6e1f1f'/><rect x='233' y='20' width='20' height='7' fill='#fff'/>
        <circle cx='243' cy='12' r='5' fill='#fff' opacity='0.5'/><circle cx='248' cy='5' r='4' fill='#fff' opacity='0.35'/>
        <circle cx='150' cy='52' r='2.5' fill='#ffd76b'/><circle cx='170' cy='40' r='2.5' fill='#7be8ff'/><circle cx='190' cy='30' r='2.5' fill='#ff8ae2'/><circle cx='210' cy='30' r='2.5' fill='#7be8ff'/><circle cx='230' cy='40' r='2.5' fill='#ffd76b'/><circle cx='250' cy='52' r='2.5' fill='#ff8ae2'/>
        <circle cx='60' cy='40' r='1.5' fill='#fff' opacity='0.8'/><circle cx='340' cy='36' r='1.5' fill='#fff' opacity='0.8'/><circle cx='120' cy='30' r='1.2' fill='#fff' opacity='0.6'/><circle cx='290' cy='26' r='1.2' fill='#fff' opacity='0.6'/>
      </svg>
    </div>
    <div class="nx-ground"></div>
    <div class="nx-guirlande nx-guirlande-tl"></div>
    <div class="nx-guirlande nx-guirlande-tr"></div>
    <div class="nx-sapin nx-sapin-left"></div>
    <div class="nx-sapin nx-sapin-right"></div>
    <div class="nx-bonhomme"></div>
    <div class="nx-flocons"></div>
  `;
  
  preloadNoelLotties();
  attachNoelLotties(bg);
}

function attachNoelLotties(bg) {
  const put = (sel, key, speed) => {
    const el = bg.querySelector(sel);
    if (!el) return;
    const load = () => {
      const data = cloneLottieData(_nxData[key]);
      if (data) {
        const anim = lottie.loadAnimation({
          container: el,
          renderer: "svg",
          loop: true,
          autoplay: true,
          animationData: data
        });
        if (speed && typeof anim.setSpeed === "function") anim.setSpeed(speed);
        _nxAnims.push({ el, anim });
      }
    };
    if (_nxData[key]) load();
    else {
      const r = setInterval(() => {
        if (_nxData[key]) {
          clearInterval(r);
          load();
        }
      }, SEASON_CONFIG.LOTTIE_RETRY_INTERVAL);
      setTimeout(() => clearInterval(r), SEASON_CONFIG.LOTTIE_RETRY_TIMEOUT);
    }
  };
  
  put(".nx-guirlande-tl", "guirlandes", 1);
  put(".nx-guirlande-tr", "guirlandes", 1);
  put(".nx-sapin-left", "sapin", 1);
  put(".nx-sapin-right", "sapin", 1);
  put(".nx-bonhomme", "bonhomme", 1);
  put(".nx-flocons", "flocon", 0.35);
}

function setupNoelDecor(seasonId) {
  if (noelSleighTimer) {
    clearInterval(noelSleighTimer);
    noelSleighTimer = null;
  }
  if (seasonId !== "s3") return;
  
  setTimeout(() => spawnNoelSleigh(), SEASON_CONFIG.NOEL_SLEIGH_INITIAL_DELAY);
  
  noelSleighTimer = setInterval(() => {
    const inGame = document.getElementById("screen-game") && document.getElementById("screen-game").style.display === "block";
    if (inGame) return;
    spawnNoelSleigh();
  }, SEASON_CONFIG.NOEL_SLEIGH_INTERVAL);
  
  noelStarTimer = setInterval(() => {
    if (Math.random() < 0.6) spawnShootingStar();
  }, SEASON_CONFIG.NOEL_STAR_INTERVAL);
}

function spawnNoelSleigh() {
  const el = document.createElement("div");
  el.className = "nx-sleigh";
  el.style.top = (8 + Math.random() * 18) + "%";
  el.style.animationDuration = (13 + Math.random() * 5) + "s";
  (document.getElementById("season-bg") || document.body).appendChild(el);
  
  const data = cloneLottieData(_nxData.perenoel);
  let anim = null;
  if (data) {
    anim = lottie.loadAnimation({
      container: el,
      renderer: "svg",
      loop: true,
      autoplay: true,
      animationData: data
    });
  } else {
    el.innerText = "🎅";
  }
  
  _nxAnims.push({ el, anim });
  setTimeout(() => {
    if (anim) anim.destroy();
    if (el.parentNode) el.remove();
  }, SEASON_CONFIG.NOEL_SLEIGH_LIFETIME);
}

/* ============================================================
16. INITIALISATION
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    if (typeof initMenuBackgroundFX === "function") initMenuBackgroundFX();
    applySeasonDA();
    _watchScreenGame();
  }, 100);
});

if (typeof socket !== "undefined") {
  socket.on("player_registered", () => {
    setTimeout(() => { applySeasonDA(); }, 50);
  });
  
  socket.on("season_updated", (data) => {
    if (data && data.seasonId) {
      window.CURRENT_SEASON = data.seasonId;
      if (typeof myProfile !== "undefined" && myProfile) {
        myProfile.currentSeasonId = data.seasonId;
        myProfile.seasonId = data.seasonId;
        myProfile.season_id = data.seasonId;
      }
    }

    setTimeout(() => {
      applySeasonDA();
      restartSeasonMusic();
    }, 50);
  });
}
