/* ============================================================
JEU.JS — LOGIQUE DE JEU COMPLÈTE
============================================================ */

/* ============================================================
1. CONSTANTES
============================================================ */
// ⏱️ Fenêtre combo : temps max entre 2 bons clics pour garder le combo.
// Règle ici : 10000 = 10s (recommandé). Remets 20000 si trop dur.
const COMBO_TIERS = { TIER1: 15, TIER2: 30, PERFECTION: 35 };
function getComboWindowMs() {
  const m = (typeof soloMode !== 'undefined') ? soloMode
          : (typeof currentMode !== 'undefined') ? currentMode
          : 'classique';
  return (m === 'aleatoire' || m === 'random') ? 3000 : 1700;
}
const MALUS_POWERS = ['quake', 'micro', 'eclipse', 'chaos'];
const SOLO_TIME_LIMIT = 50;
const AVALANCHE_TIME_LIMIT = 30;
const MATCH_TIME_LIMIT = 30;

/* ============================================================
2. VARIABLES D'ÉTAT DU JEU
============================================================ */
let currentMatchCharges = {};
let currentSoloCharges = {};
let current1v1Time = MATCH_TIME_LIMIT;
let radarInterval = null;
let activeTrainingMode = "classic";
let soloTarget = 1;
let soloScore = 0;
let soloTimeLeft = SOLO_TIME_LIMIT;
let soloTimerInterval = null;
let isTimeFrozen = false;
let currentCoinsGained = 0;
let rewardDoubled = false;
let avalancheGridData = [];
let avalancheTarget = null;
let avalancheInterval = null;
let avalancheTimerInterval = null;
let avalancheTimeLeft = AVALANCHE_TIME_LIMIT;

window.addEventListener("load", () => {
  if (typeof preloadGhostAnimation === "function") preloadGhostAnimation();
});

window.IS_LOW_PERF = /Android|iPhone|iPad|iPod|Tablet|Mobile/i.test(navigator.userAgent) || 
                     (navigator.maxTouchPoints > 2 && Math.min(screen.width, screen.height) < 900);

/* ============================================================
3. SYSTÈME COMBO (solo)
============================================================ */
let currentCombo = 0;
let lastComboTime = 0;
let soloPerfection = false;
let comboFXEnabled = false;
let comboTimerInterval = null;
let pendingRecapAfterPopup = false;

/* ============================================================
4. HELPERS THÈME (factorisation)
============================================================ */
function getEquippedThemeId() {
  return (myProfile.inventory && myProfile.inventory.__equipped && myProfile.inventory.__equipped.theme) || "";
}

function getThemeConfig() {
  const theme = getEquippedThemeId();
  const configs = {
    theme_glacial: { color: "#7be8ff", emojis: ["❄️", "🧊", "✨", "💥"], crackStyle: { color: "#7be8ff", width: 2, jag: 30 } },
    theme_alt: { color: "#f8b500", emojis: ["✨", "🪙", "💰", "⚡"], crackStyle: { color: "#f8b500", width: 3, jag: 18 } },
    theme_neon: { color: "#ff00c8", emojis: ["💜", "", "✨", "💥"], crackStyle: { color: "#ff00c8", width: 2, jag: 34 } },
    theme_eclair: { color: "#fff34d", emojis: ["⚡", "", "✨", "💥"], crackStyle: { color: "#fff34d", width: 3, jag: 20 } },
    theme_obsidian: { color: "#ff003c", emojis: ["🖤", "", "🔥", ""], crackStyle: { color: "#ff003c", width: 3, jag: 26 } },
    theme_citrouille: { color: "#ff8a00", emojis: ["🎃", "", "", "💀"], crackStyle: { color: "#ff8a00", width: 3, jag: 24 } },
    theme_fantome: { color: "#b06bff", emojis: ["👻", "", "💜", "✨"], crackStyle: { color: "#b06bff", width: 2, jag: 30 } }
  };
  return configs[theme] || { color: "#00d2ff", emojis: ["⚡", "", "✨", ""], crackStyle: { color: "#00d2ff", width: 2, jag: 38 } };
}

function getComboColor() {
  return getThemeConfig().color;
}

function getComboEmojis() {
  return getThemeConfig().emojis;
}

function getComboCrackStyle() {
  return getThemeConfig().crackStyle;
}

/* ============================================================
5. CATALOGUE TROPHÉES CLIENT (16 trophées)
============================================================ */
function getTrophyCatalogClient() {
  const d = i18n[currentLang];
  return {
    first_victory: { name: d.trophy_name_first_victory, emoji: "⚔️", shelf: "combat", rarity: "bronze", condition: d.trophy_cond_first_victory, progress: p => `${Math.min(p.wins||0,1)}/1` },
    unstoppable: { name: d.trophy_name_unstoppable, emoji: "🔥", shelf: "combat", rarity: "silver", condition: d.trophy_cond_unstoppable, progress: p => `${Math.min(p.win_streak||0,5)}/5` },
    gladiator: { name: d.trophy_name_gladiator, emoji: "🛡️", shelf: "combat", rarity: "silver", condition: d.trophy_cond_gladiator, progress: p => `${Math.min(p.matches_played||0,30)}/30` },
    champion: { name: d.trophy_name_champion, emoji: "👑", shelf: "combat", rarity: "gold", condition: d.trophy_cond_champion, progress: () => d.trophy_soon, dormant: true },
    awakening: { name: d.trophy_name_awakening, emoji: "⚡", shelf: "skill", rarity: "bronze", condition: d.trophy_cond_awakening, progress: p => `x${Math.min(p.best_combo||0,15)}/15` },
    furnace: { name: d.trophy_name_furnace, emoji: "💥", shelf: "skill", rarity: "silver", condition: d.trophy_cond_furnace, progress: p => `x${Math.min(p.best_combo||0,30)}/30` },
    perfection: { name: d.trophy_name_perfection, emoji: "💎", shelf: "skill", rarity: "legendary", condition: d.trophy_cond_perfection, progress: p => `x${Math.min(p.best_combo||0,35)}/35` },
    avalanche_master: { name: d.trophy_name_avalanche_master, emoji: "🎯", shelf: "skill", rarity: "gold", condition: d.trophy_cond_avalanche_master, progress: p => `${Math.min(p.best_avalanche||0,400)}/400` },
    combatant: { name: d.trophy_name_combatant, emoji: "🎖️", shelf: "progression", rarity: "bronze", condition: d.trophy_cond_combatant, progress: () => "—" },
    elite: { name: d.trophy_name_elite, emoji: "🏵️", shelf: "progression", rarity: "gold", condition: d.trophy_cond_elite, progress: () => "—" },
    worker: { name: d.trophy_name_worker, emoji: "⛏️", shelf: "progression", rarity: "silver", condition: d.trophy_cond_worker, progress: p => `${Math.min(p.total_coins_earned||0,1000)}/1000` },
    rising_star: { name: d.trophy_name_rising_star, emoji: "⭐", shelf: "progression", rarity: "silver", condition: d.trophy_cond_rising_star, progress: p => `${Math.min(p.points||0,500)}/500` },
    local_king: { name: d.trophy_name_local_king, emoji: "🏰", shelf: "domination", rarity: "gold", condition: d.trophy_cond_local_king, progress: () => d.trophy_end_season },
    midas: { name: d.trophy_name_midas, emoji: "💰", shelf: "domination", rarity: "gold", condition: d.trophy_cond_midas, progress: () => d.trophy_end_season },
    dynasty: { name: d.trophy_name_dynasty, emoji: "🏛️", shelf: "domination", rarity: "legendary", condition: d.trophy_cond_dynasty, progress: p => `${p.season_n1_count||0}/3` },
    world_n1: { name: d.trophy_name_world_n1, emoji: "🌍", shelf: "domination", rarity: "legendary", condition: d.trophy_cond_world_n1, progress: () => d.trophy_end_season }
  };
}

function getTrophyShelves() {
  const d = i18n[currentLang];
  return [
    { id: "combat", label: d.shelf_combat, color: "#ff4b2b" },
    { id: "skill", label: d.shelf_skill, color: "#00d2ff" },
    { id: "progression", label: d.shelf_progression, color: "#00ff88" },
    { id: "domination", label: d.shelf_domination, color: "#f8b500" }
  ];
}

/* ============================================================
6. EFFETS VISUELS (shake, flash, explosion)
============================================================ */
function shakeScreen(intensity) {
  const el = document.getElementById("screen-game") || document.body;
  const d = 12 * intensity;
  el.animate([
    { transform: "translate(0, 0)" },
    { transform: `translate(${(Math.random() - 0.5) * 2 * d}px, ${(Math.random() - 0.5) * 2 * d}px)` },
    { transform: `translate(${(Math.random() - 0.5) * 2 * d}px, ${(Math.random() - 0.5) * 2 * d}px)` },
    { transform: "translate(0, 0)" }
  ], { duration: 160 });
}

function flashScreen() {
  const color = getComboColor();
  const flash = document.createElement("div");
  flash.className = "perfection-flash";
  flash.style.background = `radial-gradient(circle, rgba(255,255,255,0.95) 0%, ${color} 55%, transparent 100%)`;
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 700);
}

function shatterExplosion() {
  const color = getComboColor();
  const shardCount = IS_LOW_PERF ? 15 : 50;
  for (let i = 0; i < shardCount; i++) {
    const s = document.createElement("div");
    s.className = "shard-particle";
    s.style.background = i % 3 === 0 ? "#ffffff" : color;
    const angle = Math.random() * Math.PI * 2;
    const dist = 120 + Math.random() * 260;
    s.style.setProperty("--dx", Math.cos(angle) * dist + "px");
    s.style.setProperty("--dy", Math.sin(angle) * dist + "px");
    s.style.setProperty("--rot", (Math.random() - 0.5) * 720 + "deg");
    s.style.left = "50%";
    s.style.top = "50%";
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 1200);
  }
}

function spawnExplosionParticles() {
  const emojis = getComboEmojis();
  const partCount = IS_LOW_PERF ? 12 : 40;
  for (let i = 0; i < partCount; i++) {
    const p = document.createElement("div");
    p.className = "explosion-particle";
    p.innerText = emojis[i % emojis.length];
    const angle = (Math.PI * 2 * i) / partCount;
    const dist = 80 + Math.random() * 180;
    p.style.setProperty("--dx", Math.cos(angle) * dist + "px");
    p.style.setProperty("--dy", Math.sin(angle) * dist + "px");
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1200);
  }
}

/* ============================================================
7. SYSTÈME COMBO (HUD, timer, reset)
============================================================ */
function ensureEquippedGrid() {
  if (!myProfile.inventory) myProfile.inventory = {};
  if (!myProfile.inventory.__equipped) myProfile.inventory.__equipped = {};
  const equipped = myProfile.inventory.__equipped.theme || "";
  const unlocked = myProfile.unlocked_items || [];
  if (equipped && unlocked.length > 0 && !unlocked.includes(equipped)) {
    delete myProfile.inventory.__equipped.theme;
    if (socket.connected) socket.emit("equip_cosmetic", "none_theme");
  }
}

function ensureComboHUD() {
  let hud = document.getElementById("combo-hud");
  if (!hud) {
    hud = document.createElement("div");
    hud.id = "combo-hud";
    hud.innerHTML = `<span id="combo-count">x0</span><div id="combo-timer-bar"><div id="combo-timer-fill"></div></div>`;
    const target = document.getElementById("game-target-giant");
    const parent = target ? target.parentElement : null;
    if (parent) {
      if (getComputedStyle(parent).position === "static") parent.style.position = "relative";
      parent.appendChild(hud);
    } else {
      document.body.appendChild(hud);
    }
  }
  return hud;
}

function updateComboHUD() {
  const hud = ensureComboHUD();
  hud.style.display = "flex";
  hud.style.color = getComboColor();
  document.getElementById("combo-count").innerText = "x" + currentCombo;
  startComboTimer();
}

function startComboTimer() {
  if (comboTimerInterval) clearInterval(comboTimerInterval);
  const start = Date.now();
  const fill = document.getElementById("combo-timer-fill");
  comboTimerInterval = setInterval(() => {
    const remaining = Math.max(0, 1 - (Date.now() - start) / getComboWindowMs());
    if (fill) fill.style.width = (remaining * 100) + "%";
    if (remaining <= 0) { clearInterval(comboTimerInterval); comboTimerInterval = null; }
  }, 50);
}

function hideComboHUD() {
  if (comboTimerInterval) { clearInterval(comboTimerInterval); comboTimerInterval = null; }
  const hud = document.getElementById("combo-hud");
  if (hud) hud.style.display = "none";
}

function resetCombo() {
  if (typeof stopComboVideo === "function") stopComboVideo();
  if (typeof clearElectricFx === "function") clearElectricFx();
  if (typeof clearObsidianFx === "function") clearObsidianFx();
  if (typeof neonResetSpeed === "function") neonResetSpeed();
  clearCracks();
  hideComboHUD();
  if (soloPerfection) return;
  currentCombo = 0;
  const grid = document.getElementById("grid");
  if (grid) {
    grid.classList.remove("combo-tier1", "combo-tier2", "combo-perfection");
    grid.style.setProperty("--combo-color", getComboColor());
  }
  const banner = document.getElementById("combo-banner");
  if (banner) banner.remove();
}

function showComboBanner(text) {
  const banner = document.createElement("div");
  banner.id = "combo-banner";
  banner.style.color = getComboColor();
  banner.innerText = text;
  banner.style.animation = "comboPop 0.5s ease";
  document.body.appendChild(banner);
  setTimeout(() => banner.remove(), 1500);
}

function registerComboHit() {
  const d = i18n[currentLang];
  if (soloPerfection) return;
  const now = Date.now();
  if (now - lastComboTime > getComboWindowMs()) {
    currentCombo = 0;
    clearCracks();
    hideComboHUD();
    const g = document.getElementById("grid");
    if (g) g.classList.remove("combo-tier1", "combo-tier2");
  }
  lastComboTime = now;
  currentCombo++;
  if (getEquippedThemeId() === "theme_neon" && typeof neonComboBoost === "function") neonComboBoost();
  if (comboFXEnabled) {
    updateComboHUD();
    if (currentCombo >= 10) SoundEngine.playComboTick(currentCombo);
  }
  const grid = document.getElementById("grid");
  if (grid) grid.style.setProperty("--combo-color", getComboColor());
  if (currentCombo === COMBO_TIERS.TIER1) {
    if (grid) grid.classList.add("combo-tier1");
    showComboBanner(d.combo_x15);
    spawnCrack();
  } else if (currentCombo === COMBO_TIERS.TIER2) {
    if (grid) { grid.classList.remove("combo-tier1"); grid.classList.add("combo-tier2"); }
    showComboBanner(d.combo_x30);
    const burstCount = IS_LOW_PERF ? 2 : 6;
    for (let i = 0; i < burstCount; i++) setTimeout(() => spawnCrack(), i * 60);
    shakeScreen(0.5);
  } else if (currentCombo >= COMBO_TIERS.PERFECTION) {
    triggerPerfection();
  } else if (currentCombo > COMBO_TIERS.TIER1) {
    spawnCrack();
  }
}

/* ============================================================
8. PERFECTION (combo x35)
============================================================ */
function triggerPerfection() {
  const d = i18n[currentLang];
  if (soloPerfection) return;
  soloPerfection = true;
  if (soloTimerInterval) clearInterval(soloTimerInterval);
  if (avalancheTimerInterval) clearInterval(avalancheTimerInterval);
  if (avalancheInterval) clearInterval(avalancheInterval);
  const grid = document.getElementById("grid");
  if (grid) { grid.classList.remove("combo-tier1", "combo-tier2"); grid.classList.add("combo-perfection"); }
  showComboBanner(d.combo_perfection);
  const themeNow = getEquippedThemeId();
  SoundEngine.playPerfectionBoom(themeNow);
  
  // Effets spéciaux par thème
  if (themeNow === "theme_eclair") {
    playElectroExplosionSound();
    for (let i = 0; i < 5; i++) setTimeout(() => spawnLightningBurst(true), i * 90);
  } else if (themeNow === "theme_obsidian") {
    playObsidianExplosionSound();
    for (let i = 0; i < 6; i++) setTimeout(() => spawnObsidianRock(), i * 80);
    setTimeout(() => shakeScreen(1.2), 500);
  } else if (themeNow === "theme_neon") {
    if (typeof neonHyperspace === "function") neonHyperspace();
  } else if (themeNow === "theme_citrouille") {
    spawnLanterns(true); playLanternSound(); shakeScreen(1.2);
  } else if (themeNow === "theme_fantome") {
    spawnGhostLotties(true); playGhostSound(); shakeScreen(1.2);
  } else if (themeNow === "theme_bonbon") {
    if (typeof spawnBonbons === "function") spawnBonbons(true);
    if (typeof playBonbonSound === "function") playBonbonSound();
    shakeScreen(1.0);
  } else if (themeNow === "theme_sapin") {
    if (typeof spawnSapinSparkles === "function") spawnSapinSparkles(true);
    if (typeof playSapinSound === "function") playSapinSound();
    shakeScreen(1.0);
  } else if (themeNow === "theme_lutin") {
    if (typeof spawnLutins === "function") spawnLutins(true);
    if (typeof playLutinSound === "function") playLutinSound();
    shakeScreen(1.0);
  }
  
  const crackCount = IS_LOW_PERF ? 6 : 18;
  for (let i = 0; i < crackCount; i++) {
    setTimeout(() => {
      spawnCrack();
      shakeScreen(0.2 + (i / crackCount) * 0.8);
    }, i * 70);
  }
  const explosionTime = crackCount * 70 + 350;
  setTimeout(() => {
    flashScreen();
    shatterExplosion();
    spawnExplosionParticles();
    shakeScreen(1.5);
    clearCracks();
    SoundEngine.playVictory();
  }, explosionTime);
  setTimeout(() => { SoundEngine.stopBoom(); }, explosionTime + 1200);
  setTimeout(() => { endSoloGame(); }, explosionTime + 1000);
}

/* ============================================================
9. FISSURES & PIÈCES (combo visuals)
============================================================ */
function ensureCracksLayer() {
  let layer = document.getElementById("combo-cracks-layer");
  if (!layer) {
    layer = document.createElement("div");
    layer.id = "combo-cracks-layer";
    document.body.appendChild(layer);
  }
  return layer;
}

function ensureCoinsLayer() {
  let layer = document.getElementById("combo-coins-layer");
  if (!layer) {
    layer = document.createElement("div");
    layer.id = "combo-coins-layer";
    document.body.appendChild(layer);
  }
  return layer;
}

function spawnCoin() {
  const layer = ensureCoinsLayer();
  if (layer.childElementCount > 180) layer.removeChild(layer.firstChild);
  const coin = document.createElement("div");
  coin.className = "combo-coin";
  coin.innerText = "🪙";
  coin.style.left = Math.random() * 100 + "%";
  coin.style.top = Math.random() * 100 + "%";
  coin.style.fontSize = (28 + Math.random() * 24) + "px";
  coin.style.animationDuration = (0.8 + Math.random() * 1) + "s";
  layer.appendChild(coin);
}

function coinStorm() {
  const layer = ensureCoinsLayer();
  for (let i = 0; i < 150; i++) {
    setTimeout(() => {
      if (layer.childElementCount > 220) layer.removeChild(layer.firstChild);
      const coin = document.createElement("div");
      coin.className = "combo-coin";
      coin.innerText = Math.random() > 0.6 ? "💰" : "🪙";
      coin.style.left = Math.random() * 100 + "%";
      coin.style.top = Math.random() * 100 + "%";
      coin.style.fontSize = (32 + Math.random() * 32) + "px";
      coin.style.animationDuration = (0.9 + Math.random() * 1.4) + "s";
      layer.appendChild(coin);
    }, i * 18);
  }
}

function spawnCrack() {
  const themeNow = getEquippedThemeId();
  if (!themeNow) return;
  
  // Thèmes spéciaux
  if (themeNow === "theme_alt") {
    for (let i = 0; i < 8; i++) setTimeout(() => spawnCoin(), i * 60);
    SoundEngine.playCrack(themeNow);
    return;
  }
  if (themeNow === "theme_neon") return;
  if (themeNow === "theme_citrouille") { spawnLanterns(false); playLanternSound(); return; }
  if (themeNow === "theme_fantome") { spawnGhostLotties(false); playGhostSound(); return; }
  if (themeNow === "theme_bonbon") { if (typeof spawnBonbons === "function") spawnBonbons(false); if (typeof playBonbonSound === "function") playBonbonSound(); return; }
  if (themeNow === "theme_sapin") { if (typeof spawnSapinSparkles === "function") spawnSapinSparkles(false); if (typeof playSapinSound === "function") playSapinSound(); return; }
  if (themeNow === "theme_lutin") { if (typeof spawnLutins === "function") spawnLutins(false); if (typeof playLutinSound === "function") playLutinSound(); return; }
  if (themeNow === "theme_eclair") { spawnLightningBurst(false); playElectricArcSound(); return; }
  if (themeNow === "theme_obsidian") { spawnObsidianRock(); playObsidianImpactSound(); return; }
  
  // Fissure standard
  const layer = ensureCracksLayer();
  if (layer.childElementCount > 20) layer.removeChild(layer.firstChild);
  const style = getComboCrackStyle();
  const w = window.innerWidth, h = window.innerHeight;
  const side = Math.floor(Math.random() * 4);
  let sx, sy;
  if (side === 0) { sx = Math.random() * w; sy = 0; }
  else if (side === 1) { sx = w; sy = Math.random() * h; }
  else if (side === 2) { sx = Math.random() * w; sy = h; }
  else { sx = 0; sy = Math.random() * h; }
  const tx = w * (0.3 + Math.random() * 0.4);
  const ty = h * (0.3 + Math.random() * 0.4);
  const steps = 8 + Math.floor(Math.random() * 6);
  let points = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const jag = style.jag * (1 - t * 0.3);
    const x = sx + (tx - sx) * t + (Math.random() - 0.5) * jag;
    const y = sy + (ty - sy) * t + (Math.random() - 0.5) * jag;
    points.push({ x: Math.round(x), y: Math.round(y) });
  }
  const pointsStr = points.map(p => `${p.x},${p.y}`).join(' ');
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "combo-crack");
  svg.setAttribute("width", w);
  svg.setAttribute("height", h);
  svg.style.color = style.color;
  
  const mainCrack = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  mainCrack.setAttribute("class", "crack-main");
  mainCrack.setAttribute("points", pointsStr);
  mainCrack.setAttribute("fill", "none");
  mainCrack.setAttribute("stroke", style.color);
  mainCrack.setAttribute("stroke-width", style.width);
  mainCrack.setAttribute("stroke-linecap", "round");
  mainCrack.setAttribute("stroke-linejoin", "round");
  svg.appendChild(mainCrack);
  
  const innerCrack = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  innerCrack.setAttribute("class", "crack-inner");
  innerCrack.setAttribute("points", pointsStr);
  innerCrack.setAttribute("fill", "none");
  innerCrack.setAttribute("stroke", "#ffffff");
  innerCrack.setAttribute("stroke-width", style.width * 0.4);
  innerCrack.setAttribute("stroke-linecap", "round");
  innerCrack.setAttribute("stroke-linejoin", "round");
  svg.appendChild(innerCrack);
  
  const branchCount = 2 + Math.floor(Math.random() * 3);
  for (let b = 0; b < branchCount; b++) {
    const branchStart = Math.floor(Math.random() * (points.length - 1));
    const startPoint = points[branchStart];
    const branchAngle = Math.random() * Math.PI * 2;
    const branchLength = 40 + Math.random() * 80;
    const branchSteps = 3 + Math.floor(Math.random() * 3);
    let branchPoints = [{ x: startPoint.x, y: startPoint.y }];
    for (let i = 1; i <= branchSteps; i++) {
      const t = i / branchSteps;
      const x = startPoint.x + Math.cos(branchAngle) * branchLength * t + (Math.random() - 0.5) * 20;
      const y = startPoint.y + Math.sin(branchAngle) * branchLength * t + (Math.random() - 0.5) * 20;
      branchPoints.push({ x: Math.round(x), y: Math.round(y) });
    }
    const branchPointsStr = branchPoints.map(p => `${p.x},${p.y}`).join(' ');
    const branch = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    branch.setAttribute("class", "crack-branch");
    branch.setAttribute("points", branchPointsStr);
    branch.setAttribute("fill", "none");
    branch.setAttribute("stroke", style.color);
    branch.setAttribute("stroke-width", style.width * 0.6);
    branch.setAttribute("stroke-linecap", "round");
    branch.setAttribute("stroke-linejoin", "round");
    svg.appendChild(branch);
  }
  layer.appendChild(svg);
  SoundEngine.playCrack(themeNow);
}

function clearCracks() {
  const layer = document.getElementById("combo-cracks-layer");
  if (layer) layer.innerHTML = "";
  const coins = document.getElementById("combo-coins-layer");
  if (coins) coins.innerHTML = "";
}

function closeRewardPopUp() {
  const popup = document.getElementById("reward-popup-overlay");
  if (popup) popup.style.display = "none";
  if (pendingRecapAfterPopup) {
    pendingRecapAfterPopup = false;
    document.getElementById("recap-modal").style.display = "flex";
  }
}

/* ============================================================
10. NAVIGATION / ÉCRANS
============================================================ */
function hideAllScreens() {
  setMenuFX(false);
  hideGameModeBadge();
  resetCombo();
  if (typeof stopNeonFx === "function") stopNeonFx();
  ["screen-title","screen-menu","screen-solo-menu","screen-avalanche-menu","screen-1v1-hub","screen-1v1-lobby","screen-rooms","screen-join-custom","screen-room-waiting","screen-tournament","screen-game","recap-modal","modal-leaderboard","modal-shop","modal-blitz-pass","countdown-overlay","modal-create-room","modal-launch-ad","simulated-ad-overlay","modal-ranked-loadout","modal-jackpot-wheel","modal-friends","admin-modal"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
  const rewardPopup = document.getElementById("reward-popup-overlay");
  if (rewardPopup) rewardPopup.style.display = "none";
  if (radarInterval) clearInterval(radarInterval);
  if (soloTimerInterval) clearInterval(soloTimerInterval);
  if (avalancheInterval) clearInterval(avalancheInterval);
  if (avalancheTimerInterval) clearInterval(avalancheTimerInterval);
  isTimeFrozen = false;
}

function setGameModeBadge(text, color) {
  let badge = document.getElementById("game-mode-badge");
  if (!badge) {
    badge = document.createElement("div");
    badge.id = "game-mode-badge";
  }
  badge.innerText = text;
  badge.style.cssText = `
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    z-index: 5;
    background: rgba(15, 5, 29, 0.92);
    border: 1.5px solid ${color};
    color: ${color};
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 1px;
    padding: 4px 10px;
    border-radius: 14px;
    pointer-events: none;
    box-shadow: 0 0 10px ${color}55;
    text-shadow: 0 0 5px ${color};
  `;
  badge.style.display = "block";
  const target = document.getElementById("game-target-giant");
  if (target && target.parentElement) {
    const bar = target.parentElement;
    if (getComputedStyle(bar).position === "static") bar.style.position = "relative";
    if (badge.parentElement !== bar) bar.appendChild(badge);
  } else {
    document.body.appendChild(badge);
  }
}

function hideGameModeBadge() {
  const badge = document.getElementById("game-mode-badge");
  if (badge) badge.style.display = "none";
}

function initMenuBackgroundFX() {
  if (document.getElementById('bg-fx')) return;
  const fx = document.createElement('div');
  fx.id = 'bg-fx';
  const glow = document.createElement('div');
  glow.id = 'bg-glow';
  fx.appendChild(glow);
  const shapes = ['◆','▲','■','●'];
  const colors = ['#00d2ff','#ff007f','#ffe600','#00ff88'];
  for (let i = 0; i < 12; i++) {
    const s = document.createElement('div');
    s.className = 'bg-shape';
    s.innerText = shapes[i % shapes.length];
    s.style.fontSize = (14 + Math.random() * 26) + 'px';
    s.style.left = Math.random() * 100 + '%';
    s.color = colors[i % colors.length];
    s.style.animationDuration = (14 + Math.random() * 16) + 's';
    s.style.animationDelay = (-Math.random() * 25) + 's';
    fx.appendChild(s);
  }
  document.body.appendChild(fx);
}

function setMenuFX(visible) {
  const fx = document.getElementById('bg-fx');
  if (fx) fx.style.opacity = visible ? '1' : '0';
}

function showTitleScreen() {
  hideAllScreens();
  window.history.replaceState({}, "", window.location.pathname);
  document.getElementById("screen-title").style.display = "block";
  SoundEngine.startMusic("menu");
  setMenuFX(true);
}

function showMainMenu() {
  recapActive = false;
  updateEconomyUI();
  leaveRoomIfInRoom();
  hideAllScreens();
  window.history.replaceState({}, "", window.location.pathname);
  const menuEl = document.getElementById("screen-menu");
  if (menuEl) { menuEl.style.display = "flex"; setMenuFX(true); }
  SoundEngine.startMusic("menu");
}

function leaveRoomIfInRoom() {
  const codeEl = document.getElementById("current-room-code");
  if (codeEl && codeEl.innerText && codeEl.innerText !== "----") {
    if (socket.connected) socket.emit("leave_room");
    codeEl.innerText = "----";
  }
}

function openLaunchAdModal() {
  // ✅ Pub de lancement désactivée : accès direct au menu
  SoundEngine.init();
  launchAdWatched = true;
  showMainMenu();
}

function playLaunchAd() {
  document.getElementById("modal-launch-ad").style.display = "none";
  simulateAd(() => {
    launchAdWatched = true;
    showMainMenu();
  });
}

function simulateAd(callback) {
  SoundEngine.stopMusic(false);
  document.getElementById("recap-modal").style.display = "none";
  const overlay = document.getElementById("simulated-ad-overlay");
  const timerEl = document.getElementById("ad-timer");
  const closeBtn = document.getElementById("ad-close-btn");
  overlay.style.display = "flex";
  closeBtn.style.display = "none";
  let timeLeft = 5;
  timerEl.innerText = timeLeft;
  const interval = setInterval(() => {
    timeLeft--;
    timerEl.innerText = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(interval);
      timerEl.innerText = "✓";
      closeBtn.style.display = "block";
      adCallbackFunction = callback;
    }
  }, 1000);
}

function closeSimulatedAd() {
  document.getElementById("simulated-ad-overlay").style.display = "none";
  SoundEngine.startMusic("menu");
  if (adCallbackFunction) {
    adCallbackFunction();
    adCallbackFunction = null;
  }
}

function watchAdToDoubleReward() {
  const d = i18n[currentLang];
  if (rewardDoubled) return;
  simulateAd(() => {
    rewardDoubled = true;
    socket.emit("double_reward");
    currentCoinsGained *= 2;
    document.getElementById("recap-coins-gained").innerText = `+${currentCoinsGained} (x2 ⚡)`;
    const doubleBtn = document.getElementById("btn-double-reward");
    doubleBtn.disabled = true;
    doubleBtn.style.opacity = "0.5";
    doubleBtn.innerText = d.reward_doubled;
    document.getElementById("recap-modal").style.display = "flex";
  });
}

function openSoloMenu() {
  if (!isProfileValid()) { checkAndShowProfileModal(); return; }
  hideAllScreens();
  document.getElementById("screen-solo-menu").style.display = "flex";
  SoundEngine.startMusic("menu");
}

function openAvalancheDifficulties() {
  hideAllScreens();
  document.getElementById("screen-avalanche-menu").style.display = "flex";
  SoundEngine.startMusic("menu");
}

function open1v1Hub() {
  if (!isProfileValid()) { checkAndShowProfileModal(); return; }
  hideAllScreens();
  document.getElementById("screen-1v1-hub").style.display = "flex";
  SoundEngine.startMusic("menu");
}

function sanitizeEquippedPower() {
  if (!myProfile.inventory) myProfile.inventory = {};
  if (myProfile.equippedPower && (myProfile.inventory[myProfile.equippedPower] || 0) <= 0) myProfile.equippedPower = null;
  if (myProfile.equippedPowers && myProfile.equippedPowers.length > 0) myProfile.equippedPowers = myProfile.equippedPowers.filter(p => (myProfile.inventory[p] || 0) > 0);
}

function getOptionalLoadout() {
  sanitizeEquippedPower();
  const p = myProfile.equippedPower;
  if (p && (myProfile.inventory[p] || 0) > 0) return [p];
  return [];
}

function startTugOfWarQueue() {
  if (!isProfileValid()) { checkAndShowProfileModal(); return; }
  hideAllScreens();
  document.getElementById("screen-1v1-lobby").style.display = "flex";
  let digit = 1;
  radarInterval = setInterval(() => {
    digit = (digit % 50) + 1;
    document.getElementById("radar-digit").innerText = digit;
  }, 70);
  socket.emit("find_tug_of_war_match", getOptionalLoadout());
}

function startRandom1v1() {
  if (!isProfileValid()) { checkAndShowProfileModal(); return; }
  hideAllScreens();
  document.getElementById("screen-1v1-lobby").style.display = "flex";
  let digit = 1;
  radarInterval = setInterval(() => {
    digit = (digit % 50) + 1;
    document.getElementById("radar-digit").innerText = digit;
  }, 70);
  socket.emit("find_1v1_match", getOptionalLoadout());
}

function openRankedLoadoutModal() {
  if (!isProfileValid()) { checkAndShowProfileModal(); return; }
  selectedRankedItems = [];
  document.getElementById("modal-ranked-loadout").style.display = "flex";
  renderRankedLoadoutItems();
}

function closeRankedLoadoutModal() {
  document.getElementById("modal-ranked-loadout").style.display = "none";
}

function renderRankedLoadoutItems() {
  const d = i18n[currentLang];
  const container = document.getElementById("ranked-items-container");
  if (!container) return;
  container.innerHTML = "";
  const powersDict = d.powers;
  const ownedPowers = POWERS_CATALOG.filter(p => p.type !== "cosmetics" && p.type !== "packs" && (myProfile.inventory[p.id] || 0) > 0);
  if (ownedPowers.length === 0) {
    container.innerHTML = `<div style="grid-column: span 2; text-align:center; color:#aaa; padding:12px; font-size:11px;">${d.ranked_empty}</div>`;
    return;
  }
  const summary = document.createElement("div");
  summary.style.cssText = `grid-column: span 2; background: rgba(0,210,255,0.08); border: 1px solid #00d2ff; border-radius: 10px; padding: 8px; font-size: 11px; color: #fff; margin-bottom: 6px;`;
  summary.innerHTML = `<b>${d.ranked_summary.replace('X', selectedRankedItems.length)}</b><br>${selectedRankedItems.length === 2 ? d.ranked_ready : d.ranked_warning}`;
  container.appendChild(summary);
  ownedPowers.forEach(p => {
    const powerInfo = powersDict[p.id];
    const qty = myProfile.inventory[p.id] || 0;
    const selectedCount = selectedRankedItems.filter(i => i === p.id).length;
    const card = document.createElement("div");
    card.className = `power-card ${selectedCount > 0 ? "equipped" : ""}`;
    card.innerHTML = `
      <h4>${powerInfo.name}</h4><p>${powerInfo.desc}</p>
      <div class="stock-badge">Stock : ${qty}</div>
      <div style="font-weight:bold; font-size:10px; color:${selectedCount > 0 ? "#00ff88" : "#f8b500"};">${d.ranked_selected} ${selectedCount}</div>
      <div style="display:flex; gap:4px; margin-top:6px;">
        <button class="power-btn buy" onclick="addRankedItem('${p.id}')" ${(selectedRankedItems.length >= 2 || selectedCount >= qty) ? "disabled" : ""}>${d.ranked_add}</button>
        <button class="power-btn" onclick="removeRankedItem('${p.id}')" ${selectedCount === 0 ? "disabled" : ""}>${d.ranked_remove}</button>
      </div>`;
    container.appendChild(card);
  });
}

function addRankedItem(id) {
  const d = i18n[currentLang];
  if (selectedRankedItems.length >= 2) return;
  const owned = myProfile.inventory[id] || 0;
  const sel = selectedRankedItems.filter(i => i === id).length;
  if (sel >= owned) { alert(d.ranked_no_stock); return; }
  selectedRankedItems.push(id);
  renderRankedLoadoutItems();
}

function removeRankedItem(id) {
  const i = selectedRankedItems.lastIndexOf(id);
  if (i !== -1) selectedRankedItems.splice(i, 1);
  renderRankedLoadoutItems();
}

function startRankedMatch() {
  const d = i18n[currentLang];
  if (selectedRankedItems.length !== 2) { alert(d.ranked_must_2); return; }
  closeRankedLoadoutModal();
  hideAllScreens();
  document.getElementById("screen-1v1-lobby").style.display = "flex";
  let digit = 1;
  radarInterval = setInterval(() => {
    digit = (digit % 50) + 1;
    document.getElementById("radar-digit").innerText = digit;
  }, 70);
  myProfile.equippedPowers = selectedRankedItems.slice();
  socket.emit("find_ranked_match", { items: selectedRankedItems.slice() });
}

function cancel1v1Search() { showMainMenu(); }

function requestRematch() {
  socket.emit("request_rematch");
  document.getElementById("recap-modal").style.display = "none";
  const roomCodeText = document.getElementById("current-room-code").innerText;
  if (roomCodeText && roomCodeText !== "----") {
    document.getElementById("screen-room-waiting").style.display = "block";
  } else {
    document.getElementById("screen-1v1-lobby").style.display = "flex";
    let digit = 1;
    if (radarInterval) clearInterval(radarInterval);
    radarInterval = setInterval(() => {
      digit = (digit % 50) + 1;
      document.getElementById("radar-digit").innerText = digit;
    }, 70);
  }
}

socket.on("opponent_wants_rematch", () => {
  showNotificationToast(i18n[currentLang].opp_wants_rematch, "gift");
});

/* ============================================================
11. POUVOIRS / HUD
============================================================ */
function preparePowerHUD() {
  const zone = document.getElementById('power-zone');
  zone.innerHTML = '';
  const isSolo = document.getElementById('hud-solo').style.display !== 'none';
  const charges = isSolo ? currentSoloCharges : currentMatchCharges;
  let usableCount = 0;
  for (const powerId in charges) {
    const remaining = charges[powerId] || 0;
    if (remaining > 0) {
      usableCount++;
      const powerInfo = i18n[currentLang].powers[powerId];
      const btn = document.createElement('button');
      btn.className = 'btn-power-hud';
      btn.innerHTML = `⚡ ${powerInfo ? powerInfo.name : powerId} (${remaining})`;
      btn.onclick = () => triggerSpecificPower(powerId, btn);
      zone.appendChild(btn);
    }
  }
  zone.style.display = usableCount > 0 ? 'block' : 'none';
}

function triggerSpecificPower(powerId, btnEl) {
  const isSolo = document.getElementById('hud-solo').style.display !== "none";
  const charges = isSolo ? currentSoloCharges : currentMatchCharges;
  if ((charges[powerId] || 0) <= 0 || btnEl.disabled) return;
  charges[powerId]--;
  btnEl.disabled = true;
  btnEl.style.opacity = '0.5';
  socket.emit('use_power', powerId);
  if (MALUS_POWERS.includes(powerId) && !isSolo) socket.emit('send_malus', { type: powerId });
  const currentTarget = parseInt(document.getElementById('game-target-giant').innerText) || 1;
  if (powerId === 'spotlight') {
    document.querySelectorAll('.tile').forEach(t => {
      if (parseInt(t.innerText) === currentTarget) {
        t.classList.add('highlight-target');
        setTimeout(() => t.classList.remove('highlight-target'), 2000);
      }
    });
  } else if (powerId === 'joker') autoValidateTarget();
  else if (powerId === 'freeze') {
    isTimeFrozen = true;
    const timerEl = document.getElementById('game-timer');
    timerEl.classList.add('frozen');
    setTimeout(() => {
      isTimeFrozen = false;
      timerEl.classList.remove('frozen');
    }, 3000);
  } else if (powerId === 'nova') {
    autoValidateTarget();
    setTimeout(() => autoValidateTarget(), 250);
    setTimeout(() => autoValidateTarget(), 500);
  }
  setTimeout(() => preparePowerHUD(), 100);
}

socket.on("power_used_success", () => {
  if (document.getElementById("screen-game").style.display === "block") preparePowerHUD();
});

socket.on("power_use_denied", () => {
  if (document.getElementById("screen-game").style.display === "block") preparePowerHUD();
});

function autoValidateTarget() {
  const is1v1 = document.getElementById("hud-1v1").style.display !== "none";
  if (is1v1) {
    const targetVal = parseInt(document.getElementById("game-target-giant").innerText) || 1;
    document.querySelectorAll("#grid .tile").forEach((t, idx) => {
      if (parseInt(t.innerText) === targetVal) handle1v1TileClick(targetVal, idx);
    });
  } else handleSoloTileClick(soloTarget);
}

socket.on("receive_malus", (data) => {
  const d = i18n[currentLang];
  const grid = document.getElementById("grid");
  SoundEngine.playError();
  showNotificationToast(d.malus_received, "announcement");
  if (!grid) return;
  if (data.type === "quake") {
    grid.classList.add("effect-quake");
    setTimeout(() => grid.classList.remove("effect-quake"), 2000);
  } else if (data.type === "micro") {
    grid.classList.add("effect-micro");
    setTimeout(() => grid.classList.remove("effect-micro"), 2000);
  } else if (data.type === "eclipse") {
    grid.classList.add("effect-eclipse");
    setTimeout(() => grid.classList.remove("effect-eclipse"), 1500);
  } else if (data.type === "chaos") {
    grid.classList.add("effect-quake");
    setTimeout(() => {
      grid.classList.remove("effect-quake");
      grid.classList.add("effect-micro");
    }, 1500);
    setTimeout(() => {
      grid.classList.remove("effect-micro");
      grid.classList.add("effect-eclipse");
    }, 3000);
    setTimeout(() => {
      grid.classList.remove("effect-eclipse");
    }, 4500);
  }
});

/* ============================================================
LIMITES QUOTIDIENNES (pub + roulette)
============================================================ */
socket.on('ad_limit_reached', (d) => {
  showNotificationToast(currentLang === 'fr'
    ? `📺 Limite de pubs atteinte (${d.limit}/jour). Reviens demain !`
    : `📺 Ad limit reached (${d.limit}/day). Come back tomorrow!`, 'announcement');
});

socket.on('wheel_limit_reached', (d) => {
  showNotificationToast(currentLang === 'fr'
    ? `🎰 Limite de roulette atteinte (${d.limit}/jour). Reviens demain !`
    : `🎰 Wheel limit reached (${d.limit}/day). Come back tomorrow!`, 'announcement');
});

/* ============================================================
12. CLASSEMENT
============================================================ */
let currentLbCategory = "points";
let currentLbScope = "regional";

function openLeaderboard() {
  if (!isProfileValid()) { checkAndShowProfileModal(); return; }
  updateLbRegionLabel();
  document.getElementById("modal-leaderboard").style.display = "flex";
  updateCombinedExplanationVisibility();
  fetchLeaderboard();
}

function closeLeaderboard() {
  document.getElementById("modal-leaderboard").style.display = "none";
}

function setLbCategory(cat) {
  currentLbCategory = cat;
  ["points", "trophies", "coins", "combined"].forEach(c => {
    const btn = document.getElementById(`lb-cat-${c}`);
    if (btn) btn.classList.toggle("active", c === cat);
  });
  updateCombinedExplanationVisibility();
  fetchLeaderboard();
}

function updateCombinedExplanationVisibility() {
  const el = document.getElementById("lb-combined-explanation");
  if (el) el.style.display = (currentLbCategory === "combined") ? "block" : "none";
}

function setLbScope(scope) {
  currentLbScope = scope;
  ["regional", "national", "global"].forEach(s => {
    const btn = document.getElementById(`lb-scope-${s}`);
    if (btn) btn.classList.toggle("active", s === scope);
  });
  fetchLeaderboard();
}

function updateLbRegionLabel() {
  const d = i18n[currentLang];
  const btn = document.getElementById("lb-scope-regional");
  if (btn && myProfile && myProfile.region) btn.innerText = d.lb_regional_label + " (" + myProfile.region + ")";
}

socket.on("player_registered", () => { updateLbRegionLabel(); });

function fetchLeaderboard() {
  const type = `${currentLbCategory}_${currentLbScope}`;
  document.getElementById("lb-list").innerHTML = `<div style="text-align:center; color:#aaa; margin-top:15px; font-size:11px;" data-i18n="loading">${i18n[currentLang].loading || 'Chargement...'}</div>`;
  socket.emit("get_leaderboard", type);
}

socket.on("leaderboard_data", (res) => {
  const d = i18n[currentLang];
  const container = document.getElementById("lb-list");
  container.innerHTML = "";
  if (!res.data || res.data.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:#aaa; margin-top:15px; font-size:11px;">${d.lb_no_players}</div>`;
    return;
  }
  const category = res.type ? res.type.split("_")[0] : "points";
  const parsedList = res.data.map(p => parsePlayer(p));
  if (category === "combined") parsedList.sort((a, b) => {
    if ((b.trophies - a.trophies) !== 0) return b.trophies - a.trophies;
    return b.points - a.points;
  });
  parsedList.forEach((p, index) => {
    const row = document.createElement("div");
    row.className = "lb-row";
    const badgeHtml = getAvatarBadgeHTML(p.flag, p.avatar, null, p);
    const equippedTitle = p.inventory && p.inventory.__equipped && p.inventory.__equipped.title;
    const titleHtml = equippedTitle ? `<span style="font-size:8px; color:#f8b500; font-weight:bold; margin-left:4px;">[${getTitleDisplayNames()[equippedTitle] || equippedTitle}]</span>` : "";
    let rightBadge = `<span class="lb-pts" style="color:#00ff88;">${p.points} pts</span>`;
    if (category === "coins") rightBadge = `<span class="lb-pts" style="color:#f8b500;">${p.coins} 🪙</span>`;
    else if (category === "trophies") rightBadge = `<span class="lb-pts" style="color:#fceabb;">${p.trophies} 👑</span>`;
    else if (category === "combined") rightBadge = `<span class="lb-pts" style="color:#00d2ff; font-size:11px;">👑${p.trophies} | ${p.points}pts</span>`;
    let rankDisplay = `#${index + 1}`, rankColor = "#00d2ff";
    if (index === 0) { rankDisplay = "🥇"; rankColor = "#f8b500"; }
    else if (index === 1) { rankDisplay = "🥈"; rankColor = "#e0e0e0"; }
    else if (index === 2) { rankDisplay = "🥉"; rankColor = "#cd7f32"; }
    const safeName = String(p.username || "").replace(/'/g, "\\'");
    row.innerHTML = `<span class="lb-rank" style="color:${rankColor};">${rankDisplay}</span>
      <div class="lb-user-info"><div class="lb-name-row">${badgeHtml}<span class="lb-clickable-name" onclick="openPlayerActions('${safeName}', event)">${p.username}</span>${titleHtml}</div>
      <div class="lb-sub-details"><span>👑 ${p.trophies}</span><span>🪙 ${p.coins}</span><span>⚔️ ${currentLang === "fr" ? "V" : "W"}:${p.wins}/${currentLang === "fr" ? "D" : "L"}:${p.losses}</span></div></div>${rightBadge}`;
    container.appendChild(row);
  });
});

function openPlayerActions(username, e) {
  const d = i18n[currentLang];
  closePlayerActions();
  const safeName = String(username).replace(/'/g, "\\'");
  const menu = document.createElement('div');
  menu.id = 'player-actions-menu';
  menu.style.cssText = 'position:fixed; z-index:10001; background:#0f051d; border:1px solid #00d2ff; border-radius:10px; padding:10px; box-shadow:0 0 20px rgba(0,210,255,0.5); min-width:170px;';
  menu.style.left = Math.min(e.clientX, window.innerWidth - 190) + 'px';
  menu.style.top = Math.min(e.clientY, window.innerHeight - 120) + 'px';
  const isMe = myProfile.username && myProfile.username.toLowerCase() === username.toLowerCase();
  menu.innerHTML = `
    <div style="font-size:12px; font-weight:900; color:#f8b500; margin-bottom:6px;">${username}</div>
    ${!isMe ? `<button class="btn-main" style="width:100%; margin:2px 0; padding:8px; font-size:11px;" onclick="requestFriendFromMenu('${safeName}')">${d.action_friend_request}</button>` : ''}
    <button class="btn-main" style="width:100%; margin:2px 0; padding:8px; font-size:11px;" onclick="openTrophyRoom('${safeName}'); closePlayerActions();">${d.action_trophy_room}</button>
  `;
  document.body.appendChild(menu);
  setTimeout(() => document.addEventListener('click', closePlayerActions, { once: true }), 0);
}

function requestFriendFromMenu(username) {
  socket.emit('send_friend_request', username);
  closePlayerActions();
}

function closePlayerActions() {
  const m = document.getElementById('player-actions-menu');
  if (m) m.remove();
}

/* ============================================================
13. 1V1 / ADVERSAIRE / RÉCAP
============================================================ */
function extractOpponentInfo(data) {
  if (!data) return cachedOpponent;
  let rawOpp = data.opponent || data.player2 || data.opp;
  if (!rawOpp && data.players) {
    if (Array.isArray(data.players)) rawOpp = data.players.find(p => (p.socketId || p.id) !== socket.id);
    else if (typeof data.players === "object") {
      const oppId = Object.keys(data.players).find(id => id !== socket.id);
      if (oppId) rawOpp = data.players[oppId];
    }
  }
  return rawOpp ? parsePlayer(rawOpp) : cachedOpponent;
}

function updateOpponentDisplay(opp) {
  if (!opp) return;
  cachedOpponent = parsePlayer(opp);
  document.getElementById("opp-profile-name").innerText = cachedOpponent.username;
  document.getElementById("opp-profile-badge").innerHTML = getAvatarBadgeHTML(cachedOpponent.flag, cachedOpponent.avatar);
  const oppTitle = cachedOpponent.inventory && cachedOpponent.inventory.__equipped && cachedOpponent.title;
  const el = document.getElementById("opp-profile-title");
  if (el) el.innerText = oppTitle ? `[ ${getTitleDisplayNames()[oppTitle] || oppTitle} ]` : "";
}

socket.on("start_countdown", (data) => {
  const d = i18n[currentLang];
  if (radarInterval) clearInterval(radarInterval);
  latest1v1StartData = data;
  currentMatchCharges = {};
  resetCombo();
  comboFXEnabled = false;
  let loadout = (myProfile.equippedPowers && myProfile.equippedPowers.length > 0) ? myProfile.equippedPowers : (myProfile.equippedPower ? [myProfile.equippedPower] : []);
  loadout.forEach(id => {
    const stock = myProfile.inventory[id] || 0;
    if (stock > 0) currentMatchCharges[id] = Math.min((currentMatchCharges[id] || 0) + 1, stock);
  });
  let oppData = extractOpponentInfo(data);
  if (oppData) updateOpponentDisplay(oppData);
  hideAllScreens();
  const roomCodeEl = document.getElementById("current-room-code");
  const inRoom = roomCodeEl && roomCodeEl.innerText && roomCodeEl.innerText !== "----";
  if (data.isRanked) setGameModeBadge(d.badge_ranked, "#f8b500");
  else if (data.isTugOfWar) setGameModeBadge(d.badge_tow, "#ff4b2b");
  else if (inRoom) setGameModeBadge(d.badge_private, "#00d2ff");
  else if (latestGlobalEvents.chaosMode) setGameModeBadge(d.badge_chaos, "#ff007f");
  else if (latestGlobalEvents.expressoMatch) setGameModeBadge(d.badge_expresso, "#ffe600");
  else setGameModeBadge(d.badge_1v1, "#00ff88");
  document.getElementById("countdown-overlay").style.display = "flex";
  let count = 3;
  document.getElementById("countdown-number").innerText = count;
  const timer = setInterval(() => {
    count--;
    if (count > 0) document.getElementById("countdown-number").innerText = count;
    else {
      clearInterval(timer);
      document.getElementById("countdown-overlay").style.display = "none";
      document.getElementById("screen-game").style.display = "block";
      document.getElementById("hud-1v1").style.display = "grid";
      document.getElementById("hud-solo").style.display = "none";
      const towHud = document.getElementById("hud-tow");
      if (data.isTugOfWar) { towHud.style.display = "block"; updateTugOfWarGauge(0); } else towHud.style.display = "none";
      if (latest1v1StartData) {
        ensureEquippedGrid();
        document.getElementById("game-target-giant").innerText = latest1v1StartData.myTarget || 1;
        renderGrid(latest1v1StartData.myPool, handle1v1TileClick);
      }
      preparePowerHUD();
      current1v1Time = latest1v1StartData ? latest1v1StartData.timeLeft : MATCH_TIME_LIMIT;
      isTimeFrozen = false;
      SoundEngine.startMusic("1v1");
      if (getEquippedThemeId() === "theme_neon" && typeof startNeonFx === "function") startNeonFx();
    }
  }, 1000);
});

socket.on("timer_update", (time) => {
  if (!isTimeFrozen) {
    current1v1Time = time;
    document.getElementById("game-timer").innerText = Math.max(0, time);
  }
});

socket.on("tug_of_war_update", (data) => { updateTugOfWarGauge(data.ropePosition); });

function updateTugOfWarGauge(pos) {
  const ind = document.getElementById("tow-indicator");
  if (!ind) return;
  let percent = 50 + (pos / 6) * 45;
  ind.style.left = `${Math.max(5, Math.min(95, percent))}%`;
}

socket.on("my_grid_updated", (data) => {
  document.getElementById("game-target-giant").innerText = data.target;
  renderGrid(data.newPool, handle1v1TileClick);
  if (data.success) {
    SoundEngine.playClick();
    registerComboHit();
  } else {
    SoundEngine.playError();
    resetCombo();
  }
});

socket.on("opponent_progress", (data) => {
  document.getElementById("opp-target").innerText = data.target;
  let o = extractOpponentInfo(data);
  if (o) updateOpponentDisplay(o);
});

socket.on("trigger_jackpot_wheel", () => {
  document.getElementById("recap-modal").style.display = "none";
  const wheelModal = document.getElementById("modal-jackpot-wheel");
  const spinBtn = document.getElementById("btn-spin-wheel");
  const wheelEl = document.getElementById("wheel-element");
  wheelEl.style.transition = "none";
  wheelEl.style.transform = "rotate(0deg)";
  spinBtn.disabled = false;
  spinBtn.style.opacity = "1";
  document.getElementById("wheel-result-text").innerText = "";
  wheelModal.style.display = "flex";
});

function spinJackpotWheel() {
  const b = document.getElementById("btn-spin-wheel");
  b.disabled = true;
  b.style.opacity = "0.5";
  document.getElementById("wheel-result-text").innerText = "";
  socket.emit("spin_jackpot_wheel");
}

socket.on("jackpot_wheel_result", (data) => {
  const d = i18n[currentLang];
  const wheelEl = document.getElementById("wheel-element");
  const resultText = document.getElementById("wheel-result-text");
  const randomSpin = 1440 + Math.floor(Math.random() * 360);
  wheelEl.style.transition = "transform 3.5s cubic-bezier(0.15,0.75,0.1,1)";
  wheelEl.style.transform = `rotate(${data.targetAngle || randomSpin}deg)`;
  setTimeout(() => {
    if (data.outcome === "jackpot") {
      resultText.innerHTML = `🎉 <span style="color:#f8b500;">${d.jackpot_win.replace('X', data.coinDelta)}</span>`;
      SoundEngine.playVictory();
    } else if (data.outcome === "objet") {
      resultText.innerHTML = `🎁 <span style="color:#00c6ff;">${d.jackpot_item}</span>`;
      SoundEngine.playVictory();
    } else if (data.outcome === "banqueroute") {
      resultText.innerHTML = `💀 <span style="color:#ff4b2b;">${d.jackpot_lost.replace('X', data.coinDelta)}</span>`;
      SoundEngine.playError();
    } else resultText.innerHTML = `❌ <span style="color:#38ef7d;">${d.jackpot_nothing}</span>`;
    setTimeout(() => {
      document.getElementById("modal-jackpot-wheel").style.display = "none";
      if (pendingGameOverData) {
        showGameOverRecap(pendingGameOverData);
        pendingGameOverData = null;
      }
    }, 2200);
  }, 3600);
});

socket.on("game_over_1v1", (data) => {
  const wheelModal = document.getElementById("modal-jackpot-wheel");
  if (wheelModal && wheelModal.style.display === "flex") {
    pendingGameOverData = data;
    return;
  }
  showGameOverRecap(data);
});

function getWinnerAvatarShowcaseHTML(playerObj) {
  if (!playerObj) return "";
  const d = i18n[currentLang];
  const equippedAvatar = playerObj.inventory && playerObj.inventory.__equipped && playerObj.inventory.__equipped.avatar;
  const equippedFrame = playerObj.inventory && playerObj.inventory.__equipped && playerObj.inventory.__equipped.frame;
  let iconContent = playerObj.avatar || 1;
  if (equippedAvatar === "avatar_lottie_palier30") iconContent = `<div class="lottie-avatar-large" data-lottie-url="black-rainbow-cat.json" style="width:75px; height:75px;"></div>`;
  else if (equippedAvatar === "avatar_lottie_palier15") iconContent = `<div class="lottie-avatar-large" data-lottie-url="cat-assistant.json" style="width:75px; height:75px;"></div>`;
  else if (equippedAvatar === "avatar_tigre") iconContent = `<video class="tft-avatar-video" src="tiger-siberien.mp4" autoplay loop muted playsinline style="width:75px; height:75px;"></video>`;
  else if (equippedAvatar === "avatar_s2_squelette") iconContent = `<div class="lottie-avatar-large" data-lottie-url="squelette-danse.json" style="width:75px; height:75px;"></div>`;
  else if (equippedAvatar === "avatar_s2_chauve") iconContent = `<video class="tft-avatar-video" src="bat-halloween.mp4" autoplay loop muted playsinline style="width:75px; height:75px;"></video>`;
  else if (equippedAvatar === "avatar_s2_citrouille") iconContent = `<div class="lottie-avatar-large" data-lottie-url="citrouille-chateau.json" style="width:75px; height:75px;"></div>`;
  const frameClass = getFrameClass(equippedFrame);
  setTimeout(() => initAllLottieBadges(), 50);
  return `<div class="victory-avatar-showcase"><div class="victory-badge-large ${frameClass}" style="display:flex; align-items:center; justify-content:center;"><span style="font-weight:900; color:#fff;">${iconContent}</span><span style="position:absolute; bottom:-2px; right:-2px; font-size:14px; background:#0f051d; border-radius:50%; width:22px; height:22px; display:flex; align-items:center; justify-content:center; border:2px solid #fff; z-index:3;">${playerObj.flag || "🇫🇷"}</span></div><div style="font-size:13px; font-weight:900; color:#f8b500; margin-top:4px;">${playerObj.username || "Joueur"} ${d.triomphe}</div></div>`;
}

function showGameOverRecap(data) {
  const d = i18n[currentLang];
  recapActive = true;
  if (typeof clearCatchArena === "function") clearCatchArena();
  hideAllScreens();
  window.history.replaceState({}, "", window.location.pathname);
  const modal = document.getElementById("recap-modal");
  const modalCard = modal.querySelector(".modal-card");
  const banner = document.getElementById("recap-banner");
  document.getElementById("recap-1v1-rows").style.display = "block";
  if (data.isCatch) document.getElementById("recap-1v1-rows").style.display = "none";
  const myId = socket.id;
  const myData = data.players[myId];
  const oppId = Object.keys(data.players).find(id => id !== myId);
  const oppData = oppId ? data.players[oppId] : { target: "-", score: 0 };
  rewardDoubled = false;
  const doubleBtn = document.getElementById("btn-double-reward");
  doubleBtn.disabled = false;
  doubleBtn.style.opacity = "1";
  doubleBtn.innerText = d.double_reward;
  const rematchBtn = document.getElementById("btn-rematch");
  if (rematchBtn) {
    if (data.isRanked) { rematchBtn.style.display = "none"; }
    else { rematchBtn.style.display = "block"; rematchBtn.disabled = false; rematchBtn.style.opacity = "1"; rematchBtn.innerText = d.rematch_btn; }
  }
  const myReward = data.rewards && data.rewards[myId] ? data.rewards[myId] : { baseCoins: 30, rushBonus: 0, totalCoins: 30 };
  currentCoinsGained = myReward.totalCoins;
  const winnerId = data.winnerId;
  const isWinner = (winnerId === myId);
  const cinematic = document.getElementById("winner-cinematic-container");
  if (modalCard) {
    modalCard.classList.remove("defeat-theme");
    if (!isWinner && winnerId) modalCard.classList.add("defeat-theme");
  }
  let winnerObj = null;
  if (winnerId) {
    if (winnerId === myId) winnerObj = { username: myProfile.username, avatar: myProfile.avatar, flag: myProfile.flag, inventory: myProfile.inventory, unlocked_items: myProfile.unlocked_items };
    else if (cachedOpponent && (winnerId === cachedOpponent.id || winnerId === cachedOpponent.socketId)) winnerObj = cachedOpponent;
    else if (data.players[winnerId]) winnerObj = parsePlayer(data.players[winnerId]);
  }
  if (winnerObj) cinematic.innerHTML = getWinnerAvatarShowcaseHTML(winnerObj);
  else cinematic.innerHTML = `<div class="victory-avatar-showcase"><div style="font-size:28px; margin-bottom:4px;">🤝</div><div style="font-size:13px; font-weight:900; color:#00d2ff;">${d.equality}</div></div>`;
  if (isWinner) {
    banner.innerText = d.victory_supreme;
    banner.style.color = "#00ff88";
    SoundEngine.playVictory();
  } else if (winnerId) {
    banner.innerText = d.defeat_bitter;
    banner.style.color = "#ff4b2b";
  } else {
    banner.innerText = d.equality_timeout;
    banner.style.color = "#ff8a00";
  }
  document.getElementById("recap-reason").innerText = data.reason;
  document.getElementById("recap-my-target").innerText = myData ? myData.target : "-";
  document.getElementById("recap-opp-target").innerText = oppData ? oppData.target : "-";
  document.getElementById("recap-my-score").innerText = myData ? myData.score : 0;
  let htmlCoins = `+${myReward.baseCoins}`;
  if (myReward.rushBonus > 0) htmlCoins += ` <span style="color:#ff8a00;">+${myReward.rushBonus} ${d.rush_bonus}</span>`;
  document.getElementById("recap-coins-gained").innerHTML = htmlCoins;
  modal.style.display = "flex";
  registerIfPossible();
}

/* ============================================================
14. RÉCOMPENSES SOLO
============================================================ */
socket.on("solo_reward_result", (data) => {
  const d = i18n[currentLang];
  
  // 🛡️ Gestion des erreurs serveur
  if (data.error === 'cooldown') {
    currentCoinsGained = 0;
    document.getElementById("recap-coins-gained").innerHTML = `<span style="color:#ff4b2b;">Partie trop courte (min 3s)</span>`;
    document.getElementById("recap-reason").innerText = "⚠️ Anti-triche : les parties très courtes ne donnent pas de récompenses";
    return;
  }
  if (data.error === 'suspicious') {
    currentCoinsGained = 0;
    document.getElementById("recap-coins-gained").innerHTML = `<span style="color:#ff4b2b;">Partie non enregistrée</span>`;
    document.getElementById("recap-reason").innerText = "⚠️ La partie n'a pas été correctement enregistrée par le serveur";
    return;
  }
  
  currentCoinsGained = data.earnedCoins;
  let htmlCoins = `+${data.baseCoins}`;
  if (data.rushBonus > 0) htmlCoins += `<span style="color:#ff8a00;">+${data.rushBonus} ${d.rush_bonus}</span>`;
  document.getElementById("recap-coins-gained").innerHTML = htmlCoins;
  if (data.perfection) {
    pendingRecapAfterPopup = true;
    setTimeout(() => {
      SoundEngine.stopBoom();
      showRewardPopUp(d.perfection_popup_text, "⭐");
      const btn = document.querySelector("#reward-popup-overlay .btn-gold");
      if (btn) btn.onclick = closeRewardPopUp;
    }, 900);
  }
  if (data.triggerWheel && !data.perfection) {
    setTimeout(() => {
      document.getElementById("recap-modal").style.display = "none";
      document.getElementById("modal-jackpot-wheel").style.display = "flex";
      const wheelEl = document.getElementById("wheel-element");
      wheelEl.style.transition = "none";
      wheelEl.style.transform = "rotate(0deg)";
      document.getElementById("btn-spin-wheel").disabled = false;
      document.getElementById("btn-spin-wheel").style.opacity = "1";
      document.getElementById("wheel-result-text").innerText = "";
    }, 800);
  }
});

/* ============================================================
15. TROPHÉES : handler de déblocage (popup dorée)
============================================================ */
socket.on('trophy_unlocked', (trophies) => {
  const d = i18n[currentLang];
  trophies.forEach((t, i) => {
    setTimeout(() => {
      const popup = document.getElementById('trophy-unlock-popup');
      if (!popup) return;
      document.getElementById('trophy-unlock-emoji').innerText = t.emoji;
      document.getElementById('trophy-unlock-name').innerText = t.name;
      document.getElementById('trophy-unlock-title').innerText = `${d.trophy_title_unlocked} ${t.title}`;
      popup.style.display = 'block';
      setTimeout(() => { popup.style.display = 'none'; }, 3500);
    }, i * 800);
  });
});

function handle1v1TileClick(num, index) {
  if (current1v1Time <= 0) return;
  const tiles = document.querySelectorAll("#grid .tile");
  if (tiles[index]) {
    tiles[index].classList.add("ripple-active");
    setTimeout(() => tiles[index].classList.remove("ripple-active"), 400);
  }
  socket.emit("player_click_1v1", index);
}

/* ============================================================
16. ENTRAÎNEMENT SOLO
============================================================ */
function startSoloTraining(mode) {
  const d = i18n[currentLang];
  if (!isProfileValid()) { checkAndShowProfileModal(); return; }
  if (typeof socket === 'undefined' || !socket.connected) {
  showNotificationToast(currentLang === 'fr' ? '❌ Connexion serveur perdue. Attends 2-3 s puis réessaie.' : '❌ Server connection lost. Wait 2-3 s and retry.', 'announcement');
  return;
}
  activeTrainingMode = mode || "classic";
  hideAllScreens();
  ensureEquippedGrid();
  if (activeTrainingMode === "random") setGameModeBadge(d.badge_solo_random, "#00ff88");
  else setGameModeBadge(d.badge_solo_classic, "#00d2ff");
  soloTarget = (activeTrainingMode === "random") ? Math.floor(Math.random() * 50) + 1 : 1;
  soloScore = 0;
  soloTimeLeft = SOLO_TIME_LIMIT;
  isTimeFrozen = false;
  currentSoloCharges = {};
  resetCombo();
  comboFXEnabled = true;
  if (myProfile.equippedPower && (myProfile.inventory[myProfile.equippedPower] || 0) > 0) currentSoloCharges[myProfile.equippedPower] = 1;
  
  // ✅ ANTI-TRICHE : annoncer le début de la partie solo au serveur
  socket.emit("solo_start");
  socket.emit("start_solo_training", { mode: activeTrainingMode, loadout: getOptionalLoadout ? getOptionalLoadout() : [] });
  
  document.getElementById("screen-game").style.display = "block";
  document.getElementById("hud-solo").style.display = "grid";
  document.getElementById("hud-1v1").style.display = "none";
  document.getElementById("hud-tow").style.display = "none";
  document.getElementById("game-target-giant").innerText = soloTarget;
  document.getElementById("solo-score").innerText = soloScore;
  document.getElementById("game-timer").innerText = soloTimeLeft;
  preparePowerHUD();
  generateSoloGrid();
  SoundEngine.startMusic("solo");
  if (getEquippedThemeId() === "theme_neon" && typeof startNeonFx === "function") startNeonFx();
  soloTimerInterval = setInterval(() => {
    if (!isTimeFrozen) {
      soloTimeLeft--;
      document.getElementById("game-timer").innerText = Math.max(0, soloTimeLeft);
      if (soloTimeLeft <= 0) endSoloGame();
    }
  }, 1000);
}

function generateSoloGrid() {
  let pool = [soloTarget];
  let candidates = [];
  for (let i = 1; i <= 50; i++) {
    if (i !== soloTarget) candidates.push(i);
  }
  // ✅ Fisher-Yates shuffle (vraiment aléatoire)
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  pool = pool.concat(candidates.slice(0, 11));
  // ✅ Fisher-Yates sur le pool final
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  renderGrid(pool, handleSoloTileClick);
}

function handleSoloTileClick(num, index) {
  if (soloTimeLeft <= 0) return;
  const tiles = document.querySelectorAll("#grid .tile");
  if (tiles[index]) {
    // ✅ Feedback tactile instantané
    tiles[index].classList.add("ripple-active");
    tiles[index].style.transform = "scale(0.92)";
    setTimeout(() => { 
      tiles[index].classList.remove("ripple-active"); 
      if (tiles[index]) tiles[index].style.transform = "";
    }, 150);
  }
  if (activeTrainingMode === "classic") {
    if (num === soloTarget) {
      SoundEngine.playClick();
      registerComboHit();
      soloTarget++;
      soloScore += 10;
      document.getElementById("game-target-giant").innerText = soloTarget;
      document.getElementById("solo-score").innerText = soloScore;
      generateSoloGrid();
    } else {
      SoundEngine.playError();
      resetCombo();
      if (!isTimeFrozen) {
        soloTimeLeft = Math.max(0, soloTimeLeft - 1);
        document.getElementById("game-timer").innerText = Math.max(0, soloTimeLeft);
        if (soloTimeLeft <= 0) endSoloGame();
      }
    }
  } else if (activeTrainingMode === "random") {
    if (num === soloTarget) {
      SoundEngine.playClick();
      registerComboHit();
      soloScore += 15;
      soloTarget = Math.floor(Math.random() * 50) + 1;
      document.getElementById("game-target-giant").innerText = soloTarget;
      document.getElementById("solo-score").innerText = soloScore;
      generateSoloGrid();
    } else {
      SoundEngine.playError();
      resetCombo();
      if (!isTimeFrozen) {
        soloTimeLeft = Math.max(0, soloTimeLeft - 1);
        document.getElementById("game-timer").innerText = Math.max(0, soloTimeLeft);
        if (soloTimeLeft <= 0) endSoloGame();
      }
    }
  }
}

/* ============================================================
17. AVALANCHE
============================================================ */
function startAvalancheGame(speed, initialCount) {
  const d = i18n[currentLang];
  if (!isProfileValid()) { checkAndShowProfileModal(); return; }
  if (typeof socket === 'undefined' || !socket.connected) {
  showNotificationToast(currentLang === 'fr' ? '❌ Connexion serveur perdue. Attends 2-3 s puis réessaie.' : '❌ Server connection lost. Wait 2-3 s and retry.', 'announcement');
  return;
}
  hideAllScreens();
  ensureEquippedGrid();
  setGameModeBadge(d.badge_avalanche, "#7be8ff");
  document.getElementById("screen-game").style.display = "block";
  document.getElementById("hud-solo").style.display = "grid";
  document.getElementById("hud-1v1").style.display = "none";
  document.getElementById("hud-tow").style.display = "none";
  soloScore = 0;
  avalancheTimeLeft = AVALANCHE_TIME_LIMIT;
  isTimeFrozen = false;
  resetCombo();
  comboFXEnabled = true;
  currentSoloCharges = {};
  if (myProfile.equippedPower && (myProfile.inventory[myProfile.equippedPower] || 0) > 0) {
    currentSoloCharges[myProfile.equippedPower] = 1;
  }
  
  // ✅ ANTI-TRICHE : annoncer le début de la partie au serveur
  socket.emit("solo_start");
  socket.emit("start_solo_training", { mode: "avalanche", loadout: getOptionalLoadout ? getOptionalLoadout() : [] });
  
  document.getElementById("solo-score").innerText = soloScore;
  document.getElementById("game-timer").innerText = avalancheTimeLeft;
  avalancheGridData = Array(16).fill(null);
  avalancheTarget = null;
  for (let i = 0; i < initialCount; i++) { spawnAvalancheNumber(); }
  updateAvalancheTarget();
  renderAvalancheGrid();
  preparePowerHUD();
  SoundEngine.startMusic("solo");
  if (getEquippedThemeId() === "theme_neon" && typeof startNeonFx === "function") startNeonFx();
  avalancheTimerInterval = setInterval(() => {
    if (!isTimeFrozen) {
      avalancheTimeLeft--;
      document.getElementById("game-timer").innerText = Math.max(0, avalancheTimeLeft);
      if (avalancheTimeLeft <= 0) {
        clearInterval(avalancheTimerInterval);
        clearInterval(avalancheInterval);
        endSoloGame();
      }
    }
  }, 1000);
  avalancheInterval = setInterval(() => {
    if (!isTimeFrozen) {
      let added = spawnAvalancheNumber();
      renderAvalancheGrid();
      if (!added) {
        clearInterval(avalancheTimerInterval);
        clearInterval(avalancheInterval);
        endSoloGame();
      }
    }
  }, speed);
}

function spawnAvalancheNumber() {
  let emptyIndices = [];
  avalancheGridData.forEach((val, idx) => { if (val === null) emptyIndices.push(idx); });
  if (emptyIndices.length === 0) return false;
  let randomIdx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
  avalancheGridData[randomIdx] = Math.floor(Math.random() * 50) + 1;
  if (avalancheTarget === null) updateAvalancheTarget();
  return true;
}

function updateAvalancheTarget() {
  let activeNumbers = avalancheGridData.filter(v => v !== null);
  if (activeNumbers.length > 0) {
    avalancheTarget = activeNumbers[Math.floor(Math.random() * activeNumbers.length)];
    document.getElementById("game-target-giant").innerText = avalancheTarget;
  } else {
    avalancheTarget = null;
    document.getElementById("game-target-giant").innerText = "-";
  }
}

function renderAvalancheGrid() {
  const grid = document.getElementById("grid");
  if (!grid) return;
  grid.innerHTML = "";
  avalancheGridData.forEach((val, idx) => {
    const tile = document.createElement("div");
    if (val !== null) {
      tile.className = "tile";
      const themeClass = getEquippedThemeId() ? `${getEquippedThemeId().replace('theme_', '')}-theme` : "";
      if (themeClass) tile.classList.add(themeClass);
      tile.innerText = val;
      tile.onclick = () => handleAvalancheClick(val, idx);
    } else {
      tile.className = "tile empty";
      tile.innerText = "";
    }
    grid.appendChild(tile);
  });
}

function handleAvalancheClick(val, idx) {
  const tiles = document.querySelectorAll("#grid .tile");
  if (tiles[idx]) {
    tiles[idx].classList.add("ripple-active");
    setTimeout(() => tiles[idx].classList.remove("ripple-active"), 400);
  }
  if (val === avalancheTarget) {
    SoundEngine.playClick();
    registerComboHit();
    avalancheGridData[idx] = null;
    soloScore += 20;
    document.getElementById("solo-score").innerText = soloScore;
    updateAvalancheTarget();
    renderAvalancheGrid();
  } else {
    SoundEngine.playError();
    resetCombo();
  }
}

/* ============================================================
18. FIN DE PARTIE SOLO
============================================================ */
function endSoloGame() {
  const d = i18n[currentLang];
  recapActive = true;
  hideAllScreens();
  const wasPerfection = soloPerfection;
  const modal = document.getElementById("recap-modal");
  rewardDoubled = false;
  const doubleBtn = document.getElementById("btn-double-reward");
  doubleBtn.disabled = false;
  doubleBtn.style.opacity = "1";
  doubleBtn.innerText = d.double_reward;
  const rematchBtn = document.getElementById("btn-rematch");
  if (rematchBtn) rematchBtn.style.display = "none";
  socket.emit("claim_solo_reward", {
    score: soloScore,
    perfection: wasPerfection,
    best_combo: currentCombo,
    avalanche_score: activeTrainingMode === "avalanche" ? soloScore : 0
  });
  document.getElementById("winner-cinematic-container").innerHTML = `
    <div class="victory-avatar-showcase">
      <div class="victory-badge-large">
        <span style="font-size: 28px;">🏋️</span>
      </div>
    </div>`;
  if (wasPerfection) {
    document.getElementById("recap-banner").innerText = d.solo_perfection_banner;
    document.getElementById("recap-banner").style.color = "#f8b500";
    document.getElementById("recap-reason").innerText = d.solo_perfection_reason;
  } else {
    document.getElementById("recap-banner").innerText = d.solo_training_done;
    document.getElementById("recap-banner").style.color = "#00d2ff";
    document.getElementById("recap-reason").innerText = `${d.solo_score_label} ${soloScore}`;
  }
  document.getElementById("recap-1v1-rows").style.display = "none";
  document.getElementById("recap-my-score").innerText = soloScore;
  SoundEngine.playVictory();
  if (!wasPerfection) modal.style.display = "flex";
  soloPerfection = false;
  resetCombo();
}

/* ============================================================
19. SALLE DES TROPHÉES
============================================================ */
function openTrophyRoom(targetUsername = null) {
  document.getElementById('modal-trophy-room').style.display = 'flex';
  if (targetUsername) socket.emit('get_trophy_room', targetUsername);
  else socket.emit('get_my_trophy_room');
}

function enterTrophyRoom() {
  const flash = document.createElement('div');
  flash.className = 'trophy-enter-flash';
  flash.innerText = '🏛️';
  document.body.appendChild(flash);
  setTimeout(() => {
    openTrophyRoom();
    setTimeout(() => flash.remove(), 600);
  }, 450);
}

function closeTrophyRoom() {
  document.getElementById('modal-trophy-room').style.display = 'none';
}

socket.on('trophy_room_data', (data) => {
  if (!data || !data.ok) return;
  document.getElementById('trophy-room-flag').innerText = data.flag || '🇫';
  document.getElementById('trophy-room-username').innerText = data.username;
  const unlockedCount = Object.keys(data.trophies_collection || {}).length;
  document.getElementById('trophy-room-count').innerText = `${unlockedCount}/16 🏆`;

  // 🎵 Rendu décalé : laisse la musique respirer avant de construire les 16 vitrines
  setTimeout(() => {
    const shelvesContainer = document.getElementById('trophy-room-shelves');
    if (!shelvesContainer) return;
    shelvesContainer.innerHTML = '';
    const TROPHY_CATALOG = getTrophyCatalogClient();
    const TROPHY_SHELVES = getTrophyShelves();
    TROPHY_SHELVES.forEach(shelf => {
      const shelfEl = document.createElement('div');
      shelfEl.className = 'trophy-shelf';
      const shelfTrophies = Object.entries(TROPHY_CATALOG).filter(([_, t]) => t.shelf === shelf.id);
      shelfEl.innerHTML = `<div class="trophy-shelf-title" style="color:${shelf.color}; text-shadow:0 0 8px ${shelf.color};">${shelf.label}</div>`;
      const grid = document.createElement('div');
      grid.className = 'trophy-shelf-grid';
      shelfTrophies.forEach(([id, trophy]) => {
        const isUnlocked = !!(data.trophies_collection && data.trophies_collection[id]);
        const vitrine = document.createElement('div');
        vitrine.className = `trophy-vitrine rarity-${trophy.rarity} ${!isUnlocked ? 'locked' : ''}`;
        vitrine.innerHTML = `
          <div class="trophy-emoji">${isUnlocked ? trophy.emoji : '❓'}</div>
          <div class="trophy-name">${isUnlocked ? trophy.name : '???'}</div>
          ${!isUnlocked ? '<div class="trophy-lock">🔒</div>' : ''}
        `;
        vitrine.onmouseenter = (e) => showTrophyTooltip(e, trophy, data, isUnlocked);
        vitrine.onmousemove = (e) => moveTrophyTooltip(e);
        vitrine.onmouseleave = hideTrophyTooltip;
        grid.appendChild(vitrine);
      });
      shelfEl.appendChild(grid);
      shelvesContainer.appendChild(shelfEl);
    });
  }, 60);
});

let tooltipEl = null;

function showTrophyTooltip(e, trophy, playerData, isUnlocked) {
  const d = i18n[currentLang];
  hideTrophyTooltip();
  tooltipEl = document.createElement('div');
  tooltipEl.className = 'trophy-tooltip';
  const progressText = trophy.progress(playerData);
  tooltipEl.innerHTML = `
    <div style="font-size:13px; font-weight:900; color:#f8b500;">${trophy.emoji} ${trophy.name}</div>
    <div style="margin:6px 0; color:#00d2ff;">${trophy.condition}</div>
    <div style="color:#fff;">${d.trophy_progress_label} <b>${progressText}</b></div>
    <div style="margin-top:6px; font-size:10px; color:${isUnlocked ? "#00ff88" : "#ff4b2b"};">${isUnlocked ? d.trophy_unlocked_status : d.trophy_locked_status}</div>
  `;
  document.body.appendChild(tooltipEl);
  moveTrophyTooltip(e);
}

function moveTrophyTooltip(e) {
  if (!tooltipEl) return;
  tooltipEl.style.left = (e.clientX + 15) + 'px';
  tooltipEl.style.top = (e.clientY + 15) + 'px';
}

function hideTrophyTooltip() {
  if (tooltipEl) {
    tooltipEl.remove();
    tooltipEl = null;
  }
}

/* ============================================================
20. RENDU DE LA GRILLE
============================================================ */
function renderGrid(pool, handler) {
  const grid = document.getElementById("grid");
  if (!grid) return;
  grid.innerHTML = "";
  if (!pool) return;
  const themeClass = getEquippedThemeId() ? `${getEquippedThemeId().replace('theme_', '')}-theme` : "";
  pool.forEach((num, index) => {
    const tile = document.createElement("div");
    tile.className = "tile";
    if (themeClass) tile.classList.add(themeClass);
    tile.innerText = num;
    tile.onclick = () => handler(num, index);
    grid.appendChild(tile);
  });
}

function openSupportModal() {
  document.getElementById('modal-support').style.display = 'flex';
}
function closeSupportModal() {
  document.getElementById('modal-support').style.display = 'none';
}
