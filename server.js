// 🔒 Passe de Saison : activation AUTOMATIQUE à la date de début de la saison en cours
// (S1 = 01/10/2026 → paliers, claims et achat s'activent tout seuls ce jour-là)
function isSeasonPassLive(){
  const s = getCurrentSeason();
  return Date.now() >= new Date(s.start + "T00:00:00Z").getTime();
}
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const RECOVERY_SECRET = process.env.RECOVERY_SECRET || 'change-moi-en-prod-une-longue-chaine-secrete';

function generateRecoveryKey(username) {
  return crypto.createHmac('sha256', RECOVERY_SECRET)
    .update(String(username).toLowerCase().trim())
    .digest('hex').substring(0, 12).toUpperCase().match(/.{4}/g).join('-');
}
function generateSecureCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*+-';
  let code = '';
  for (let i = 0; i < 10; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}
function isStrongCode(code) {
  if (!code || code.length < 8) return false;
  const hasLetter = /[a-zA-Z]/.test(code);
  const hasDigit = /\d/.test(code);
  const hasSpecial = /[!@#$%&*+\-_=]/.test(code);
  return hasLetter && hasDigit && hasSpecial;
}
function hashSecret(code) { return crypto.createHash('sha256').update(String(code)).digest('hex'); }
function isHashed(v) { return /^[a-f0-9]{64}$/.test(v || ''); }

function ensureDailyCounters(p) {
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: p.timezone || 'Europe/Paris' });
  if (!p.daily_ads || p.daily_ads.date !== today) p.daily_ads = { count: 0, date: today };
  if (!p.daily_roulette || p.daily_roulette.date !== today) p.daily_roulette = { count: 0, date: today };
}

function setLastAction(p, key) { p._cooldowns = p._cooldowns || {}; p._cooldowns[key] = Date.now(); }
function getLastAction(p, key) { return (p._cooldowns && p._cooldowns[key]) || 0; }
function checkCooldown(p, key, minMs) {
  const elapsed = Date.now() - getLastAction(p, key);
  if (elapsed < minMs) return { ok: false, remaining: minMs - elapsed };
  return { ok: true };
}

const app = express();
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  next();
});
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error("SUPABASE_URL et SUPABASE_KEY doivent etre definies."); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) { console.error("ADMIN_PASSWORD doit etre definie."); process.exit(1); }

/* ----- VERSION GATING ----- */
const VERSION_GATE = {
  latest:   "1.3.0",
  minWeb:   "1.3.0",
  minShell: 3,
  urlWeb:   "https://chiffre-blitz.fr",
  urlAndroid: "market://details?id=com.chiffreblitz.app"
};
app.get("/version", (req, res) => res.json(VERSION_GATE));
app.get('/api/maintenance', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({ enabled: !!maintenanceState.enabled, message: maintenanceState.message });
});

function vgCompareServer(a, b) {
  const pa = String(a).split(".").map(Number), pb = String(b).split(".").map(Number);
  for (let i = 0; i < 3; i++) { const x = pa[i]||0, y = pb[i]||0; if (x < y) return -1; if (x > y) return 1; }
  return 0;
}

/* ----- ❤️ VIES + 🃏 JOKERS (premium) ----- */
const TOWER_MAX_LIVES = 10;
const TOWER_REGAIN_MS = 20 * 60 * 1000;
const TOWER_SHOP = { vies: { price: 150 } };
function towerRegenLives(p) {
  const now = Date.now();
  if (p.lives === undefined) p.lives = TOWER_MAX_LIVES;
  if (p.lives >= TOWER_MAX_LIVES) { p.lives_ts = now; return; }
  if (!p.lives_ts) p.lives_ts = now;
  const gained = Math.floor((now - p.lives_ts) / TOWER_REGAIN_MS);
  if (gained > 0) {
    p.lives = Math.min(TOWER_MAX_LIVES, p.lives + gained);
    p.lives_ts = p.lives >= TOWER_MAX_LIVES ? now : p.lives_ts + gained * TOWER_REGAIN_MS;
  }
}
function towerNextLifeIn(p) {
  if ((p.lives === undefined ? TOWER_MAX_LIVES : p.lives) >= TOWER_MAX_LIVES) return 0;
  return Math.max(0, TOWER_REGAIN_MS - (Date.now() - (p.lives_ts || Date.now())));
}
function normalizeJokers(j) {
  j = j || {};
  const time = Number(j.time) || 0;
  let shield = Number(j.shield) || 0;
  if (j.skip) shield += Number(j.skip) || 0;
  return { time, shield };
}

/* ============================================================
OBJETS
============================================================ */
const POWER_IDS = ["spotlight", "freeze", "joker", "nova", "quake", "micro", "eclipse", "chaos"];
const MALUS_POWERS = ["quake", "micro", "eclipse", "chaos"];

const ITEM_CATALOG = {
  spotlight: { sources: ["shop", "pass"], type: "power", price: 300 },
  freeze: { sources: ["shop", "pass"], type: "power", price: 700 },
  joker: { sources: ["shop", "pass"], type: "power", price: 1200 },
  nova: { sources: ["shop", "pass"], type: "power", price: 2500 },
  quake: { sources: ["shop", "pass"], type: "power", price: 400 },
  micro: { sources: ["shop", "pass"], type: "power", price: 800 },
  eclipse: { sources: ["shop", "pass"], type: "power", price: 1500 },
  chaos: { sources: ["shop", "pass"], type: "power", price: 4000 },
  theme_glacial: { sources: ["shop"], type: "theme", price: 1200, permanent: true },
  frame_voltage: { sources: ["shop"], type: "frame", price: 2200, permanent: true },
  frame_obsidian: { sources: ["shop"], type: "frame", price: 4500, permanent: true },
  theme_alt: { sources: ["pass", "shop"], type: "theme", permanent: true },
  frame_chroma: { sources: ["pass"], type: "frame", permanent: true },
  frame_prism: { sources: ["pass", "shop"], type: "frame", permanent: true },
  frame_silver: { sources: ["pass"], type: "frame", permanent: true },
  frame_standard: { sources: ["default"], type: "frame", permanent: true },
  avatar_lottie_palier15: { sources: ["pass"], type: "avatar", permanent: true },
  avatar_lottie_palier30: { sources: ["pass"], type: "avatar", permanent: true },
  title_stalker: { sources: ["pass"], type: "title", permanent: true },
  title_felin: { sources: ["pass"], type: "title", permanent: true },
  title_neon: { sources: ["pass"], type: "title", permanent: true },
  title_spectre: { sources: ["pass"], type: "title", permanent: true },
  title_supreme: { sources: ["pass"], type: "title", permanent: true },
  title_champion: { sources: ["pass"], type: "title", permanent: true },
  theme_eclair: { sources: ["shop"], type: "theme", price: 1500, permanent: true },
  frame_givre: { sources: ["shop"], type: "frame", price: 2200, permanent: true },
  theme_obsidian: { sources: ["shop"], type: "theme", price: 1800, permanent: true },
  theme_neon: { sources: ["pass"], type: "theme", permanent: true },
  avatar_tigre: { sources: ["pass"], type: "avatar", permanent: true },
  pack_haute_tension: { sources: ["shop"], type: "pack", price: 2900, permanent: true, items: ["frame_voltage", "theme_eclair"] },
  pack_cryo: { sources: ["shop"], type: "pack", price: 2700, permanent: true, items: ["frame_givre", "theme_glacial"] },
  pack_solaire: { sources: ["shop"], type: "pack", price: 3200, permanent: true, items: ["frame_prism", "theme_alt"] },
  pack_obsidienne: { sources: ["shop"], type: "pack", price: 5200, permanent: true, items: ["frame_obsidian", "theme_obsidian"] },
  title_fantome: { sources: ["pass"], type: "title", permanent: true },
  title_danse_macabre: { sources: ["pass"], type: "title", permanent: true },
  title_citrouille: { sources: ["pass"], type: "title", permanent: true },
  title_spectre_automne: { sources: ["pass"], type: "title", permanent: true },
  title_roi_halloween: { sources: ["pass"], type: "title", permanent: true },
  title_esprit_halloween: { sources: ["pass"], type: "title", permanent: true },
  frame_osseux: { sources: ["pass"], type: "frame", permanent: true },
  frame_fantome: { sources: ["pass"], type: "frame", permanent: true },
  theme_citrouille: { sources: ["pass"], type: "theme", permanent: true },
  theme_fantome: { sources: ["pass"], type: "theme", permanent: true },
  avatar_s2_squelette: { sources: ["pass"], type: "avatar", permanent: true },
  avatar_s2_chauve: { sources: ["pass"], type: "avatar", permanent: true },
  avatar_s2_citrouille: { sources: ["pass"], type: "avatar", permanent: true },
  title_lutin: { sources: ["pass"], type: "title", permanent: true },
  title_traineau: { sources: ["pass"], type: "title", permanent: true },
  title_rennes: { sources: ["pass"], type: "title", permanent: true },
  title_assistant_noel: { sources: ["pass"], type: "title", permanent: true },
  title_magie_noel: { sources: ["pass"], type: "title", permanent: true },
  title_esprit_noel: { sources: ["pass"], type: "title", permanent: true },
  frame_bonbon: { sources: ["pass"], type: "frame", permanent: true },
  frame_guirlande: { sources: ["pass"], type: "frame", permanent: true },
  frame_lutin: { sources: ["pass"], type: "frame", permanent: true },
  theme_bonbon: { sources: ["pass"], type: "theme", permanent: true },
  theme_sapin: { sources: ["pass"], type: "theme", permanent: true },
  theme_lutin: { sources: ["pass"], type: "theme", permanent: true },
  avatar_s3_bonhomme: { sources: ["pass"], type: "avatar", permanent: true },
  avatar_s3_boule: { sources: ["pass"], type: "avatar", permanent: true },
  avatar_s3_perenoel: { sources: ["pass"], type: "avatar", permanent: true }
};

/* ============================================================
TROPHÉES
============================================================ */
const TROPHY_CATALOG = {
  first_victory:   { name: "Première Victoire", emoji: "⚔️", shelf: "combat", rarity: "bronze", title: "title_vainqueur" },
  unstoppable:     { name: "Inarrêtable",       emoji: "🔥", shelf: "combat", rarity: "silver", title: "title_inarrettable" },
  gladiator:       { name: "Gladiateur",        emoji: "🛡️", shelf: "combat", rarity: "silver", title: "title_gladiateur" },
  champion:        { name: "Champion",          emoji: "👑", shelf: "combat", rarity: "gold", title: "title_champion_trophy", dormant: true },
  awakening:       { name: "Éveil",             emoji: "⚡", shelf: "skill", rarity: "bronze", title: "title_eveille" },
  furnace:         { name: "Fournaise",         emoji: "💥", shelf: "skill", rarity: "silver", title: "title_flamme" },
  perfection:      { name: "PERFECTION",        emoji: "💎", shelf: "skill", rarity: "legendary", title: "title_parfait" },
  avalanche_master:{ name: "Maître Avalanche",  emoji: "🎯", shelf: "skill", rarity: "gold", title: "title_maitre_avalanche" },
  combatant:       { name: "Combattant",        emoji: "🎖️", shelf: "progression", rarity: "bronze", title: "title_combatant" },
  elite:           { name: "Élite",             emoji: "🏵️", shelf: "progression", rarity: "gold", title: "title_elite" },
  worker:          { name: "Travailleur",       emoji: "⛏️", shelf: "progression", rarity: "silver", title: "title_travailleur" },
  rising_star:     { name: "Étoile Montante",   emoji: "⭐", shelf: "progression", rarity: "silver", title: "title_etoile" },
  local_king:      { name: "Roi Local",         emoji: "🏰", shelf: "domination", rarity: "gold", title: "title_roi_local" },
  midas:            { name: "Midas",             emoji: "💰", shelf: "domination", rarity: "gold", title: "title_midas" },
  dynasty:         { name: "Dynastie",          emoji: "🏛️", shelf: "domination", rarity: "legendary", title: "title_dynastie" },
  world_n1:        { name: "N°1 Mondial",       emoji: "🌍", shelf: "domination", rarity: "legendary", title: "title_mondial" }
};

function checkAndUnlockTrophy(player, trophyId) {
  const trophy = TROPHY_CATALOG[trophyId];
  if (!trophy) return null;
  if (trophy.dormant) return null;
  player.trophies_collection = player.trophies_collection || {};
  if (player.trophies_collection[trophyId]) return null;
  player.trophies_collection[trophyId] = { unlocked: true, unlockedAt: Date.now() };
  player.unlocked_items = player.unlocked_items || [];
  if (trophy.title && !player.unlocked_items.includes(trophy.title)) player.unlocked_items.push(trophy.title);
  return trophy;
}

function evaluateTrophies(player) {
  const unlocked = [];
  if ((player.wins || 0) >= 1) { const t = checkAndUnlockTrophy(player, "first_victory"); if (t) unlocked.push(t); }
  if ((player.win_streak || 0) >= 5) { const t = checkAndUnlockTrophy(player, "unstoppable"); if (t) unlocked.push(t); }
  if ((player.matches_played || 0) >= 30) { const t = checkAndUnlockTrophy(player, "gladiator"); if (t) unlocked.push(t); }
  if ((player.best_combo || 0) >= 15) { const t = checkAndUnlockTrophy(player, "awakening"); if (t) unlocked.push(t); }
  if ((player.best_combo || 0) >= 30) { const t = checkAndUnlockTrophy(player, "furnace"); if (t) unlocked.push(t); }
  if ((player.best_combo || 0) >= 35) { const t = checkAndUnlockTrophy(player, "perfection"); if (t) unlocked.push(t); }
  if ((player.best_avalanche || 0) >= 400) { const t = checkAndUnlockTrophy(player, "avalanche_master"); if (t) unlocked.push(t); }
  const cpt = player.claimedPassTiers || {};
  const s1data = cpt["s1"] || cpt;
  if (s1data["15_free"]) { const t = checkAndUnlockTrophy(player, "combatant"); if (t) unlocked.push(t); }
  if (s1data["30_free"]) { const t = checkAndUnlockTrophy(player, "elite"); if (t) unlocked.push(t); }
  if ((player.total_coins_earned || 0) >= 1000) { const t = checkAndUnlockTrophy(player, "worker"); if (t) unlocked.push(t); }
  if ((player.points || 0) >= 500) { const t = checkAndUnlockTrophy(player, "rising_star"); if (t) unlocked.push(t); }
  return unlocked;
}

function hasSource(itemId, source) { const item = ITEM_CATALOG[itemId]; return !!(item && Array.isArray(item.sources) && item.sources.includes(source)); }
function isShopItem(itemId) { return hasSource(itemId, "shop"); }
function getCosmeticCategory(itemId) {
  const item = ITEM_CATALOG[itemId];
  if (item && ["theme", "frame", "avatar", "title"].includes(item.type)) return item.type;
  if (itemId.startsWith("avatar_")) return "avatar";
  if (itemId.startsWith("frame_")) return "frame";
  if (itemId.startsWith("title_")) return "title";
  if (itemId.startsWith("theme_")) return "theme";
  return null;
}
function ownsItemOrPack(player, itemId) {
  const u = player.unlocked_items || [];
  if (u.includes(itemId)) return true;
  for (const id of u) { const it = ITEM_CATALOG[id]; if (it && it.type === 'pack' && Array.isArray(it.items) && it.items.includes(itemId)) return true; }
  return false;
}

/* ============================================================
SAISONS
============================================================ */
const SEASONS = [
  { id: "s1", name: "Felin & Neon", start: "2026-10-01", end: "2026-10-31" },
  { id: "s2", name: "Halloween",   start: "2026-11-01", end: "2026-11-30" },
  { id: "s3", name: "Noël",        start: "2026-12-01", end: "2027-01-10" }
];
let seasonOverride = null;
function getCurrentSeason() {
  if (seasonOverride) { const s = SEASONS.find(x => x.id === seasonOverride); if (s) return s; }
  const now = new Date();
  for (const s of SEASONS) { if (now >= new Date(s.start + "T00:00:00Z") && now <= new Date(s.end + "T23:59:59Z")) return s; }
  if (now < new Date(SEASONS[0].start + "T00:00:00Z")) return SEASONS[0];
  return SEASONS[SEASONS.length - 1];
}
function isCatchEnabled(theme) {
  const season = getCurrentSeason().id;
  if (theme === 'halloween') return globalEvents.halloweenMode || season === 's2';
  if (theme === 'noel') return globalEvents.noelMode || season === 's3';
  return false;
}
function normalizeClaimedTiers(cpt) {
  cpt = cpt || {};
  const keys = Object.keys(cpt);
  if (keys.length > 0 && !SEASONS.some(s => cpt[s.id] && typeof cpt[s.id] === "object")) {
    if (keys.some(k => /^\d+_(free|premium)$/.test(k))) {
      const migrated = Object.assign({}, cpt);
      if (keys.some(k => k.endsWith("_premium") && cpt[k])) migrated.premium = true;
      return { s1: migrated };
    }
  }
  return cpt;
}

function applySeasonDates(dates) {
  if (!dates) return;
  SEASONS.forEach(s => { const d = dates[s.id]; if (d && d.start) s.start = d.start; if (d && d.end) s.end = d.end; });
}
function getSeasonDatesPublic() { return SEASONS.map(s => ({ id: s.id, name: s.name, start: s.start, end: s.end })); }
(async () => {
  try {
    const { data } = await supabase.from('settings').select('season_dates').eq('id', 1).single();
    if (data && data.season_dates) applySeasonDates(data.season_dates);
  } catch (e) { console.log('Settings saisons absentes :', e.message); }
})();

/* ============================================================
ÉTAT SERVEUR
============================================================ */
const activePlayers = {};
const rooms = {};
const matchmakingQueue = [];
const rankedQueue = [];
let tugOfWarQueue = [];
let halloweenQueue = [];
let noelQueue = [];
const activeMatches = {};
const catchSoloStarts = {}; // Horodatage Catch Solo par pseudo (anti-cheat)
const soloStarts = {}; // Horodatage Solo/Avalanche par pseudo (anti-cheat)
const lastMatchEarnings = {};
const towerSessions = {};

let globalEvents = { coinRush: false, rankShield: false, expressoMatch: false, chaosMode: false, jackpotEclair: false, tugOfWarMode: false, halloweenMode: false, noelMode: false };
let eventSchedules = {
  coinRush: { manual: false, start: null, end: null }, rankShield: { manual: false, start: null, end: null },
  expressoMatch: { manual: false, start: null, end: null }, chaosMode: { manual: false, start: null, end: null },
  jackpotEclair: { manual: false, start: null, end: null }, tugOfWarMode: { manual: false, start: null, end: null },
  halloweenMode: { manual: false, start: null, end: null }, noelMode: { manual: false, start: null, end: null }
};

setInterval(() => {
  const now = Date.now();
  let changed = false;
  for (let key in eventSchedules) {
    const ev = eventSchedules[key];
    let shouldBeActive = ev.manual;
    if (ev.start && ev.end && now >= ev.start && now <= ev.end) shouldBeActive = true;
    if (globalEvents[key] !== shouldBeActive) { globalEvents[key] = shouldBeActive; changed = true; }
  }
  if (changed) io.emit("events_state_update", globalEvents);
}, 5000);

app.get('/', (req, res) => { res.send('Chiffre Blitz Server is running ⚡'); });

const path = require('path');

// ✅ Sert la page du jeu au lieu du texte brut
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin.html', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.use(express.static(path.join(__dirname, '.'), {
    setHeaders: (res, filePath) => {
        if (/\.(html|js)$/.test(filePath)) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        }
    }
}));
app.use(express.static(path.join(__dirname, '.'), {
  setHeaders: (res, filePath) => {
    if (/\.(html|js)$/.test(filePath)) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    }
  }
}));

async function savePlayerToSupabase(socketId) {
  const p = activePlayers[socketId];
  if (!p) return;
  const core = {
    points: p.points, coins: p.coins, trophies: p.trophies, wins: p.wins, losses: p.losses,
    inventory: p.inventory, equipped_power: p.equippedPower, region: p.region, avatar: p.avatar,
    flag: p.flag, unlocked_items: p.unlocked_items, blitz_pass_premium: p.blitzPassPremium,
    claimed_pass_tiers: p.claimedPassTiers,
    tower_floor: p.towerFloor || 0,
    tower_stars: p.towerStars || {},
    tower_lives: (p.lives === undefined ? TOWER_MAX_LIVES : p.lives),
    tower_lives_ts: p.lives_ts || 0,
    tower_jokers: p.jokers || { time: 0, shield: 0 }
  };
  const extra = {
    matches_played: p.matches_played || 0, win_streak: p.win_streak || 0, best_combo: p.best_combo || 0,
    best_avalanche: p.best_avalanche || 0, solo_games: p.solo_games || 0,
    total_coins_earned: p.total_coins_earned || 0, season_n1_count: p.season_n1_count || 0,
    trophies_collection: p.trophies_collection || {},
    daily_ads: p.daily_ads || { count: 0, date: '' },
    daily_roulette: p.daily_roulette || { count: 0, date: '' }
  };
  let { error } = await supabase.from('players').update({ ...core, ...extra }).eq('id', p.dbId);
  if (error) {
    console.error("⚠️ SAVE (colonnes trophées) ÉCHEC → fallback : ", error.message);
    const retry = await supabase.from('players').update(core).eq('id', p.dbId);
    if (retry.error) console.error("❌ SAVE CORE ÉCHEC : ", retry.error.message);
  }
}
function getOnlineCount() {
  const set = new Set();
  for (const id in activePlayers) {
    const u = activePlayers[id] && activePlayers[id].username;
    if (u) set.add(String(u).toLowerCase());
  }
  return set.size;
}
function broadcastOnlineCount() { io.emit('online_count', { online: getOnlineCount() }); }

/* ============================================================
   MODE MAINTENANCE + BYPASS ADMIN
   ============================================================ */
let maintenanceState = { enabled:false, message:"🔢 Maintenance en cours : on compte jusqu'à… bah non en fait, on répare ! Retour très vite 😉", bypassCode:"", since:null };
let maintenanceKickTimer = null;
let maintenanceKickTime = 0;
function maintSockets(){ const m = io.sockets.sockets; return (typeof m.values === "function") ? [...m.values()] : Object.values(m); }
function isMaintBypass(socket){ return !!socket.isAdmin || !!socket._maintBypass; }
function maintBlocked(socket){ return maintenanceState.enabled && !isMaintBypass(socket); }
async function loadMaintenance(){ try { const { data } = await supabase.from('settings').select('maintenance').eq('id',1).maybeSingle(); if (data && data.maintenance) maintenanceState = Object.assign({}, maintenanceState, data.maintenance); console.log("Maintenance au demarrage : " + (maintenanceState.enabled ? "ACTIVE" : "inactive")); } catch(e){ console.error("loadMaintenance:", e && e.message); } }
async function saveMaintenance(){ try { await supabase.from('settings').update({ maintenance: maintenanceState }).eq('id',1); } catch(e){ console.error("saveMaintenance:", e && e.message); } }
function cbMaybeKickAfterMatch(sock){
if (sock && sock._kickAfterMatch && maintBlocked(sock)) {
setTimeout(() => {
sock.emit('maintenance_kick', { message: maintenanceState.message, afterMatch: true });
sock.disconnect(true);
}, 120000); // ⬅️ 2 MINUTES pour laisser voir le récap
}
}
function maintenanceKickAll(){ 
  for (const s of maintSockets()){ 
    if (!isMaintBypass(s)){ 
      // Ne PAS kicker les joueurs en pleine partie (match actif ou session tour active)
      const inMatch = !!(activeMatches[s.id] && !activeMatches[s.id].ended);
      const inTower = !!towerSessions[s.id];
      
      if (!inMatch && !inTower) {
        // Joueur au menu → kick immédiat
        s.emit('maintenance_kick', { message: maintenanceState.message });
        s.disconnect(true);
      } else {
        // Joueur en partie → il finit sa partie, puis sera kické
        s.emit('maintenance_announce', { 
          message: maintenanceState.message, 
          delay: 0,
          inMatch: inMatch,
          inTower: inTower
        });
        // Marquer ce socket comme "à kicker après la partie"
        s._kickAfterMatch = true;
      }
    }
  }
}
io.use((socket, next) => { const a = (socket.handshake && socket.handshake.auth) || {}; const c = String((a && a.maintCode) || ""); if (c && maintenanceState.bypassCode && c === maintenanceState.bypassCode) socket._maintBypass = true; next(); });
async function logPlayerAction(p, action, detail, currency, amount, balanceAfter) {
  try {
    await supabase.from('player_logs').insert([{
      username: p.username, socket_id: p.socketId, action, detail,
      currency: currency || null, amount: (amount === undefined ? null : amount),
      balance_after: (balanceAfter === undefined ? null : balanceAfter)
    }]);
  } catch (e) { console.log('log error:', e.message); }
}
function buildAdminCatalog() {
  const items = Object.keys(ITEM_CATALOG).map(id => ({ id, type: ITEM_CATALOG[id].type }));
  const trophies = Object.keys(TROPHY_CATALOG).map(id => ({ id, name: TROPHY_CATALOG[id].name }));
  return { items, trophies };
}

/* ============================================================
🗼 TOUR BLITZ (server-authoritative)
============================================================ */
const TOWER_CHAPTER_REWARDS = {
  1: "title_grimpeur_neon", 2: "frame_cristal", 3: "frame_circuit",
  4: "title_chasseur_hante", 5: "frame_toile", 6: "title_roi_citrouille_tour",
  7: "title_veilleur_cimes", 8: "frame_aurore", 9: "title_maitre_tour"
};
const TOWER_FPC = 200;
const TOWER_CURVE = [
[12,16,32,28],
[13,18,30,26],
[14,20,28,24],
[16,22,27,23],
[18,24,26,22],
[20,26,25,21],
[22,28,24,20],
[24,30,23,19],
[26,32,22,18]
];
const TOWER_DIFF_PATTERN = [0,1,0,2,0,3,1,2,0,3];
const TOWER_TIER_MULT = [1.30, 1.00, 0.88, 0.78];
const TOWER_TIER_GRID = [-6, 0, 2, 4];
const TOWER_MODE_PACE = { classic:1.25, reverse:1.30, forbidden:1.25, color:1.00, sprint:1.00, nofail:1.35, pairs:2.30, parity:1.10, memory:1.15 };
const TOWER_CAPS = { sprint:24, pairs:12, memory:12, parity:40 };
function towerDiffTier(floor){
const inChap = ((floor - 1) % TOWER_FPC) + 1;
if (inChap % 50 === 0) return 1;
return TOWER_DIFF_PATTERN[(inChap - 1) % 10];
}

/* ----- AIDE TOUR : mélange + pools + verrou mondes ----- */
function towerShuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const TW_COLOR_POOL = [
  { key: "red",    name: "ROUGE",  hex: "#ff4b2b" },
  { key: "blue",   name: "BLEU",   hex: "#00d2ff" },
  { key: "green",  name: "VERT",   hex: "#2ecc71" },
  { key: "yellow", name: "JAUNE",  hex: "#f8b500" },
  { key: "pink",   name: "ROSE",   hex: "#ff6fa5" },
  { key: "purple", name: "VIOLET", hex: "#9b5cff" }
];

const TW_PAIR_SYMBOLS = ["🍒","🍋","🍇","🍉","🍓","🍑","🥝","","🌟","","🔔","💎","🎲","🎯","","🌙","","❄️"];

const TOWER_WORLD_QUOTA = 240; // même quota que le client (WORLD_QUOTA)

function towerWorldUnlocked(player, world) {
  if (world <= 1) return true;
  if (world > 9) return false;
  // 1) quota d'étoiles du monde précédent
  const stars = player.towerStars || {};
  let prev = 0;
  const start = (world - 2) * TOWER_FPC + 1, end = (world - 1) * TOWER_FPC;
  for (let f = start; f <= end; f++) prev += stars[String(f)] || 0;
  if (prev < TOWER_WORLD_QUOTA) return false;
  // 2) verrou saison (mondes 4-6 = S2, mondes 7-9 = S3)
  const seasonOfWorld = world <= 3 ? 1 : (world <= 6 ? 2 : 3);
  if (seasonOfWorld > 1) {
    const flag = "season_s" + seasonOfWorld + "_unlocked";
    const hasFlag = (player.unlocked_items || []).includes(flag);
    const seasonLive = parseInt(getCurrentSeason().id.replace("s", "")) >= seasonOfWorld;
    if (!hasFlag && !seasonLive) return false;
  }
  return true;
}

function getFloorDefServer(floor) {
const chap = Math.ceil(floor / TOWER_FPC), inChap = ((floor - 1) % TOWER_FPC) + 1;
const c = TOWER_CURVE[Math.min(chap,9)-1];
const t01 = (inChap - 1) / (TOWER_FPC - 1);
let gridSize = Math.round(c[0] + (c[1]-c[0]) * t01);
if (inChap <= 10) gridSize = Math.max(10, gridSize - 2);
const wf = Math.max(0.95, 1.15 - 0.025 * (Math.min(chap,9) - 1));
if (inChap === TOWER_FPC || inChap % 50 === 0) return { floor, gridSize, time: Math.max(20, Math.round(gridSize * 0.85)), type: "boss", diff: 1 };
const PATTERN = [0,1,0,2,0,3,1,2,0,3];
const GRIDMOD = [-6,0,2,4];
const PACE = [1.45,1.30,1.20,1.15];
const tier = PATTERN[(inChap - 1) % 10];
gridSize = Math.max(8, gridSize + GRIDMOD[tier]);
const seq = ["classic","reverse","color","pairs","sprint","parity","forbidden","memory","nofail"];
const t = seq[(inChap - 1) % 9];
let g = gridSize, time;
if (t === "sprint") { g = Math.min(gridSize, 24); time = Math.max(10, Math.round(g * 1.0)); }
else if (t === "pairs") { g = (tier <= 1) ? 10 : 12; time = [22,19,17,15][tier]; }
else if (t === "memory") { g = (tier <= 1) ? 10 : 12; const reveal = (2500 + g * 600) / 1000; time = Math.max(18, Math.round(reveal + g * [1.6,1.4,1.25,1.1][tier] * wf)); }
else if (t === "parity") { g = Math.min(gridSize + 6, 28); time = Math.max(15, Math.round(Math.ceil(g/2) * PACE[tier] * 1.15 * wf)); }
else if (t === "nofail") { time = Math.max(14, Math.round(gridSize * PACE[tier] * 1.2 * wf)); }
else if (t === "reverse") { time = Math.max(12, Math.round(gridSize * PACE[tier] * 1.1 * wf)); }
else if (t === "color") { time = Math.max(12, Math.round(gridSize * PACE[tier] * 0.85 * wf)); }
else if (t === "forbidden") { time = Math.max(12, Math.round((gridSize - 1) * PACE[tier] * 1.05 * wf)); }
else { time = Math.max(12, Math.round(gridSize * PACE[tier] * wf)); }
return { floor, gridSize: g, time, type: t, diff: tier };
}
function pickColorTarget(s){
  const keys=[...new Set([...s.remaining].map(i=>s.nums[i].key))];
  if(!keys.length) return null;
  const key=keys[Math.floor(Math.random()*keys.length)];
  return TW_COLOR_POOL.find(c=>c.key===key)||TW_COLOR_POOL[0];
}
function buildTowerSession(player, floor){
  const def = getFloorDefServer(floor);
  const N = def.gridSize;
  const s = { floor, def, type: def.type, total: N, mistakes: 0, gone: {}, revealed: {}, sel: null, lock: false, done: false, start: Date.now(), ai: 0, shield: 0, replay: floor <= (player.towerFloor||0) };
  if (def.type === "color") {
    s.nums = towerShuffle([...Array(N)].map((_,i)=>TW_COLOR_POOL[(i+Math.floor(Math.random()*TW_COLOR_POOL.length))%TW_COLOR_POOL.length]));
    s.remaining = new Set([...Array(N)].map((_,i)=>i));
    s.targetColor = pickColorTarget(s);
    } else if (def.type === "pairs") {
    const half = N/2;
    s.nums = towerShuffle([...TW_PAIR_SYMBOLS.slice(0,half), ...TW_PAIR_SYMBOLS.slice(0,half)]);
    s.remaining = new Set([...Array(N)].map((_,i)=>i));
    s.revealUntil = Date.now() + [3000,3000,2500,2000][def.diff|| 0];
  } else if (def.type === "parity") {
    s.nums = towerShuffle([...Array(N)].map((_,i)=>i+1));
    s.targetParity = Math.random()<.5?"even":"odd";
    s.remaining = new Set(s.nums.filter(v=>s.targetParity==="even"?v%2===0:v%2!==0));
  } else if (def.type === "forbidden") {
  s.nums = towerShuffle([...Array(N)].map((_,i)=>i+1));
  s.forbidden = 1+Math.floor(Math.random()*N);
  s.remaining = new Set(s.nums);
  s.target = (s.forbidden === 1) ? 2 : 1;
  } else if (def.type === "memory") {
    s.nums = towerShuffle([...Array(N)].map((_,i)=>i+1));
    s.remaining = new Set(s.nums);
    s.target = 1;
    s.revealUntil = Date.now() + 2500 + N * 600;
  } else {
    s.nums = towerShuffle([...Array(N)].map((_,i)=>i+1));
    s.remaining = new Set(s.nums);
    s.target = def.type==="reverse"?N:1;
    if (def.type==="random") s.target = s.nums[Math.floor(Math.random()*s.nums.length)];
  }
  return s;
}
function towerDisplay(s){
  if (s.type==="pairs") return s.nums.map((v,i)=> s.gone[i] ? "" : ((Date.now() < (s.revealUntil||0) || s.revealed[i]) ? v : null));
  if (s.type==="memory") return s.nums.map((v,i)=> s.gone[i] ? "" : ((Date.now() < (s.revealUntil||0) || s.revealed[i]) ? v : null));
  if (s.type==="color") return s.nums.map(c=>({key:c.key,hex:c.hex}));
  return s.nums.slice();
}
function towerStatePayload(s){
  return {
    floor:s.floor, type:s.type, total:s.total,
    timeLeft: Math.max(0, s.def.time - Math.floor((Date.now()-s.start)/1000)),
    mistakes:s.mistakes, gone:s.gone, display:towerDisplay(s),
    target:s.target||null, targetColor:s.targetColor||null, targetParity:s.targetParity||null, forbidden:s.forbidden||null,
    revealed:s.revealed, sel:s.sel, ai:s.ai, defTime:s.def.time, gridSize:s.def.gridSize, 
    replay:s.replay, shield:s.shield||0,
    revealLeft: (s.type==="memory" || s.type==="pairs") ? Math.max(0, Math.round(((s.revealUntil||0) - Date.now())/1000)) : 0
  };
}
async function towerWin(player, s){
  s.done = true;
  const used = (Date.now() - s.start) / 1000;
 let stars = 1;
if (s.type === "pairs" || s.type === "memory") {
const e3 = Math.floor(s.total * 0.2), e2 = Math.floor(s.total * 0.45);
if (s.mistakes <= e3) stars = 3;
else if (s.mistakes <= e2) stars = 2;
else stars = 1;
} else if (s.type === "sprint") {
  if (used <= s.def.time * 0.6) stars = 3;
  else if (used <= s.def.time * 0.85) stars = 2;
  else stars = 1;
  } 
  else if (s.type === "forbidden") {
    if (used <= s.def.time * 0.6) stars = 3;
    else if (used <= s.def.time * 0.85) stars = 2;
    else stars = 1;
   } else if (s.type === "memory") {
    if (s.mistakes === 0) stars = 3;
    else if (s.mistakes <= 2) stars = 2;
    else stars = 1;
  } else {
    if (s.mistakes === 0 && used <= s.def.time * 0.6) stars = 3;
    else if (s.mistakes <= 2) stars = 2;
    else stars = 1;
  }

  let coins, reward = null;
  const chap = Math.ceil(s.floor / TOWER_FPC);
  if (!s.replay) {
    player.towerFloor = s.floor;
    coins = 10 + s.floor * 2 + stars * 5 + (s.type === "boss" ? 0 : towerDiffTier(s.floor) * 3);
    if (s.floor % 20 === 0 && s.floor % TOWER_FPC !== 0) coins += 20 + chap * 5;
    if (s.floor % 50 === 0 && s.floor % TOWER_FPC !== 0) coins += 50 + chap * 10;
    if (s.floor % TOWER_FPC === 0) {
      const itemId = TOWER_CHAPTER_REWARDS[s.floor / TOWER_FPC];
      if (itemId) {
        player.unlocked_items = player.unlocked_items || [];
        if (!player.unlocked_items.includes(itemId)) { player.unlocked_items.push(itemId); reward = itemId; }
      }
    }
    player.jokers = normalizeJokers(player.jokers);
    if (s.floor % 50 === 0 && s.floor % TOWER_FPC !== 0) player.jokers.shield += 1;
    if (s.floor % TOWER_FPC === 0) { player.jokers.shield += 2; player.jokers.time += 2; }
  } else {
    coins = 5 + stars * 2;
  }

  player.towerStars = player.towerStars || {};
  player.towerStars[String(s.floor)] = Math.max(player.towerStars[String(s.floor)] || 0, stars);
  player.coins = (player.coins || 0) + coins;
  await logPlayerAction(player, s.replay ? 'tower_replay' : 'tower_win', `Étage ${s.floor} (${stars}⭐) en ${used.toFixed(1)}s, ${s.mistakes} faute(s)`, 'coins', coins, player.coins);
  await savePlayerToSupabase(player.socketId);
  return { ok: true, floor: s.floor, stars, coins, reward, replay: s.replay };
}
async function towerFail(player, s, reason){
  s.done = true;
  towerRegenLives(player);
  player.lives = Math.max(0, (player.lives === undefined ? TOWER_MAX_LIVES : player.lives) - 1);
  if (!player.lives_ts) player.lives_ts = Date.now();
  await savePlayerToSupabase(player.socketId);
  await logPlayerAction(player, 'tower_fail', `Étage ${s.floor} : ${reason} (-1 vie, reste ${player.lives})`, null, null, null);
  return { ok:false, floor:s.floor, reason, lives: player.lives, nextLifeIn: towerNextLifeIn(player) };
}

setInterval(async () => {
  for (const sid in towerSessions){
    const s = towerSessions[sid];
    const player = activePlayers[sid];
    if (!s || s.done){ delete towerSessions[sid]; continue; }
    if (!player){ delete towerSessions[sid]; continue; }
    const elapsed = (Date.now()-s.start)/1000;
   if (elapsed > s.def.time){ const r = await towerFail(player, s, 'timeout'); delete towerSessions[sid]; io.to(sid).emit('tower_fail', r); cbMaybeKickAfterMatch(io.sockets.sockets.get(sid)); continue; }
  if (s.type==="boss"){
  s.ai += 0.55 + Math.ceil(s.floor / TOWER_FPC) * 0.08;
  if (s.ai >= s.total){ const r = await towerFail(player, s, 'boss'); delete towerSessions[sid]; io.to(sid).emit('tower_fail', r); cbMaybeKickAfterMatch(io.sockets.sockets.get(sid)); continue; }
  }
    io.to(sid).emit('tower_state', towerStatePayload(s));
  }
}, 1000);

/* ============================================================
SOCKET
============================================================ */
io.on('connection', (socket) => {
 const cv = socket.handshake.query.v || "0.0.0";
const isAdminConn = socket.handshake.auth && socket.handshake.auth.isAdmin;
if (!isAdminConn && vgCompareServer(cv, VERSION_GATE.minWeb) < 0) {
  socket.emit("version_blocked");
  socket.disconnect(true);
  return;
}
  console.log('Connexion : ' + socket.id);
  socket.emit('events_state_update', globalEvents);
  socket.emit('online_count', { online: getOnlineCount() });

  socket.on('get_trophy_room', async (targetUsername) => {
    try {
      const cleanTarget = (targetUsername || '').trim();
      if (!cleanTarget) { socket.emit('trophy_room_data', { ok: false }); return; }
      const { data: matched, error } = await supabase.from('players').select('*').ilike('username', cleanTarget).limit(1);
      if (error || !matched || matched.length === 0) { socket.emit('trophy_room_data', { ok: false }); return; }
      const t = matched[0];
      socket.emit('trophy_room_data', {
        ok: true, username: t.username, avatar: t.avatar, flag: t.flag, region: t.region,
        trophies_collection: t.trophies_collection || {}, wins: t.wins || 0, losses: t.losses || 0,
        points: t.points || 0, coins: t.coins || 0, matches_played: t.matches_played || 0,
        win_streak: t.win_streak || 0, best_combo: t.best_combo || 0, best_avalanche: t.best_avalanche || 0,
        solo_games: t.solo_games || 0, total_coins_earned: t.total_coins_earned || 0
      });
    } catch (e) { socket.emit('trophy_room_data', { ok: false }); }
  });

  socket.on('get_my_trophy_room', () => {
    const p = activePlayers[socket.id];
    if (!p) return;
    socket.emit('trophy_room_data', {
      ok: true, username: p.username, avatar: p.avatar, flag: p.flag, region: p.region,
      trophies_collection: p.trophies_collection || {}, wins: p.wins || 0, losses: p.losses || 0,
      points: p.points || 0, coins: p.coins || 0, matches_played: p.matches_played || 0,
      win_streak: p.win_streak || 0, best_combo: p.best_combo || 0, best_avalanche: p.best_avalanche || 0,
      solo_games: p.solo_games || 0, total_coins_earned: p.total_coins_earned || 0
    });
  });

  socket.on('check_username', async (rawUsername) => {
    try {
      const now = Date.now();
      if (socket._lastUsernameCheck && now - socket._lastUsernameCheck < 300) return;
      socket._lastUsernameCheck = now;
      const name = String(rawUsername || '').trim();
      if (name.length < 3) { socket.emit('username_check_result', { taken: false }); return; }
      const { data, error } = await supabase.from('players').select('id').ilike('username', name).limit(1);
      socket.emit('username_check_result', { taken: !error && data && data.length > 0 });
    } catch (e) { socket.emit('username_check_result', { taken: false }); }
  });

  socket.on('register_player', async (data) => {
  // Maintenance : bloque uniquement les joueurs PAS déjà connectés
  if (maintBlocked(socket) && !activePlayers[socket.id]) return socket.emit('register_result', { ok:false, reason:'maintenance', message:maintenanceState.message });
    const rawUsername = (data.username || '').trim();
    const secretCode = (data.secretCode || '').trim();
    if (rawUsername.length < 3) { socket.emit('register_result', { ok: false, reason: 'short' }); return; }
    if (secretCode.length < 4) { socket.emit('register_result', { ok: false, reason: 'nocode' }); return; }
    try {
      let wasCreated = false;
      let { data: matchedPlayers, error } = await supabase.from('players').select('*').ilike('username', rawUsername);
      let playerData;
      if (!error && matchedPlayers && matchedPlayers.length > 0) {
        const existing = matchedPlayers[0];
        const storedCode = (existing.secret_code || '').trim();
        if (storedCode) {
          const ok = isHashed(storedCode) ? (hashSecret(secretCode) === storedCode) : (storedCode.toLowerCase() === secretCode.toLowerCase());
          if (!ok) { socket.emit('register_result', { ok: false, reason: 'taken' }); return; }
          if (!isHashed(storedCode)) await supabase.from('players').update({ secret_code: hashSecret(secretCode) }).eq('id', existing.id);
        }
        playerData = existing;
      } else {
        if (data.mode === 'login') { socket.emit('register_result', { ok: false, reason: 'not_found' }); return; }
        wasCreated = true;
        const newRecord = {
          username: rawUsername, secret_code: hashSecret(secretCode), region: data.region || "Hauts-de-France",
          country: data.flag ? data.flag.replace(/['"]/g, '').trim() : "FR", avatar: data.avatar || 1, flag: data.flag || "🇫🇷",
          points: 0, coins: 100, trophies: 0, wins: 0, losses: 0,
          inventory: { __equipped: { frame: "frame_standard" } }, equipped_power: null, unlocked_items: ["frame_standard"],
          blitz_pass_premium: false, claimed_pass_tiers: {}, season_progress: {},
          matches_played: 0, win_streak: 0, best_combo: 0, best_avalanche: 0, solo_games: 0, total_coins_earned: 0,
          season_n1_count: 0, trophies_collection: {},
          daily_ads: { count: 0, date: '' }, daily_roulette: { count: 0, date: '' }
        };
        const { data: inserted, error: insertErr } = await supabase.from('players').insert([newRecord]).select().single();
        if (!insertErr && inserted) { playerData = inserted; }
        else { console.error("ERREUR INSERT SUPABASE : ", insertErr ? insertErr.message : "aucune donnee"); playerData = { ...newRecord, id: socket.id }; }
      }

      for (const [sid, player] of Object.entries(activePlayers)) {
        if (player.username && player.username.toLowerCase() === rawUsername.toLowerCase() && sid !== socket.id) {
          const oldSocket = io.sockets.sockets.get(sid);
          if (oldSocket) {
            oldSocket.emit('force_disconnect', { reason: 'Connexion depuis un autre appareil' });
            setTimeout(() => oldSocket.disconnect(true), 800);
          }
          delete activePlayers[sid];
          console.log(`🔒 Double session détectée pour ${rawUsername}, ancienne session ${sid} éjectée`);
        }
      }
      const claimedNorm = normalizeClaimedTiers(playerData.claimed_pass_tiers);
      playerData.unlocked_items = playerData.unlocked_items || [];
      if (!playerData.unlocked_items.includes("frame_standard")) playerData.unlocked_items.push("frame_standard");
      playerData.inventory = playerData.inventory || {};
      playerData.inventory.__equipped = playerData.inventory.__equipped || {};
      if (!playerData.inventory.__equipped.frame) playerData.inventory.__equipped.frame = "frame_standard";
      if (claimedNorm["s2"] && claimedNorm["s2"]["24_premium"] && !playerData.unlocked_items.includes("theme_fantome")) playerData.unlocked_items.push("theme_fantome");

      const seasonNow = getCurrentSeason();
      if (!playerData.season_progress) playerData.season_progress = {};
      const playerTz = (typeof data.timezone === 'string' && data.timezone) ? data.timezone : (playerData.timezone || 'Europe/Paris');
      let today;
      try { today = new Date().toLocaleDateString('sv-SE', { timeZone: playerTz }); }
      catch (e) { today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' }); }

      const progress = playerData.season_progress[seasonNow.id] || { unlocked_tier: 0, last_login_date: null };
        if (isSeasonPassLive()) {
        if (progress.last_login_date !== today || playerData.timezone !== playerTz) {
          if (progress.last_login_date !== today) {
            progress.unlocked_tier = Math.min(30, (progress.unlocked_tier || 0) + 1);
            progress.last_login_date = today;
          }
          playerData.season_progress[seasonNow.id] = progress;
          playerData.timezone = playerTz;
          await supabase.from('players').update({ season_progress: playerData.season_progress, timezone: playerTz }).eq('id', playerData.id);
        }
      }

      const premNow = !!(claimedNorm[seasonNow.id] && claimedNorm[seasonNow.id].premium) || (seasonNow.id === "s1" && playerData.blitz_pass_premium);
      activePlayers[socket.id] = {
        socketId: socket.id, dbId: playerData.id || socket.id, id: socket.id,
        username: playerData.username, region: playerData.region, avatar: playerData.avatar, flag: playerData.flag,
        points: playerData.points || 0, coins: playerData.coins || 0, country: playerData.country || "FR",
        trophies: playerData.trophies || 0, wins: playerData.wins || 0, losses: playerData.losses || 0,
        inventory: playerData.inventory, equippedPower: playerData.equipped_power || null,
        unlocked_items: playerData.unlocked_items, blitzPassPremium: premNow, claimedPassTiers: claimedNorm,
        current_season: seasonNow.id, seasonProgress: playerData.season_progress, unlockedTier: progress.unlocked_tier || 0,
        matches_played: playerData.matches_played || 0, win_streak: playerData.win_streak || 0,
        best_combo: playerData.best_combo || 0, best_avalanche: playerData.best_avalanche || 0,
        solo_games: playerData.solo_games || 0, total_coins_earned: playerData.total_coins_earned || 0,
        season_n1_count: playerData.season_n1_count || 0, trophies_collection: playerData.trophies_collection || {},
        daily_ads: playerData.daily_ads || { count: 0, date: '' }, daily_roulette: playerData.daily_roulette || { count: 0, date: '' },
        timezone: playerTz, towerFloor: playerData.tower_floor || 0, towerStars: playerData.tower_stars || {}
      };
      ensureDailyCounters(activePlayers[socket.id]);
      const ap = activePlayers[socket.id];
      ap.lives = (playerData.tower_lives !== undefined && playerData.tower_lives !== null) ? playerData.tower_lives : TOWER_MAX_LIVES;
      ap.lives_ts = playerData.tower_lives_ts || Date.now();
      ap.jokers = normalizeJokers(playerData.tower_jokers);
      if (wasCreated) ap.jokers = { time: 1, shield: 1 };
      towerRegenLives(ap);
      if (wasCreated) await logPlayerAction(activePlayers[socket.id], 'account_created', `Username: ${rawUsername}`, null, null, null);
      socket.emit('register_result', { ok: true, created: wasCreated });
      socket.emit('player_registered', activePlayers[socket.id]);
      broadcastOnlineCount();
    } catch (err) { console.error("Erreur enregistrement Supabase : ", err); socket.emit('register_result', { ok: false, reason: 'error' }); }
  });

  socket.on('buy_item', async (itemId) => {
    const player = activePlayers[socket.id];
    if (!player) return;
    const item = ITEM_CATALOG[itemId];
    if (!item || !isShopItem(itemId)) { socket.emit('room_error', "Cet objet ne peut pas etre achete en boutique."); return; }
    if (player.coins < item.price) {
      await logPlayerAction(player, 'buy_item_fail', `Fonds insuffisants pour ${itemId} (besoin: ${item.price}, avoir: ${player.coins})`, 'coins', 0, player.coins);
      socket.emit('room_error', "Tu n'as pas assez de pieces !");
      return;
    }
    player.inventory = player.inventory || {};
    player.unlocked_items = player.unlocked_items || [];
    if (item.type === 'power') { player.coins -= item.price; player.inventory[itemId] = (player.inventory[itemId] || 0) + 1; }
    else if (item.type === 'pack') {
      const ownedAll = item.items.every(i => player.unlocked_items.includes(i));
      if (ownedAll) { socket.emit('room_error', "Tu possedes deja tous les objets de ce pack."); return; }
      player.coins -= item.price;
      item.items.forEach(i => { if (!player.unlocked_items.includes(i)) player.unlocked_items.push(i); });
    }
    else if (item.permanent) {
      if (player.unlocked_items.includes(itemId)) { socket.emit('room_error', "Tu possedes deja cet objet."); return; }
      player.coins -= item.price; player.unlocked_items.push(itemId);
    } else { return; }
    await savePlayerToSupabase(socket.id);
    await logPlayerAction(player, 'buy_item', `${itemId} (${item.price}🪙)`, 'coins', -item.price, player.coins);
    socket.emit('player_registered', player);
  });

  socket.on('equip_power', async (powerId) => {
    const player = activePlayers[socket.id];
    if (!player) return;
    if (!POWER_IDS.includes(powerId)) return;
    if ((player.inventory[powerId] || 0) > 0) {
      player.equippedPower = powerId;
      await savePlayerToSupabase(socket.id);
      await logPlayerAction(player, 'equip_power', `Power: ${powerId}`, null, null, null);
      socket.emit('player_registered', player);
    }
  });

  socket.on('equip_cosmetic', async (itemId) => {
    const player = activePlayers[socket.id];
    if (!player) return;
    if (typeof itemId !== 'string' || itemId.length > 40) return;
    if (!player.inventory) player.inventory = {};
    if (!player.inventory.__equipped) player.inventory.__equipped = {};
    if (itemId === 'none' || itemId === 'standard' || !itemId) delete player.inventory.__equipped.avatar;
    else if (itemId === 'none_title') delete player.inventory.__equipped.title;
    else if (itemId === 'none_frame') delete player.inventory.__equipped.frame;
    else if (itemId === 'none_theme') delete player.inventory.__equipped.theme;
    else {
      const category = getCosmeticCategory(itemId);
      const owned = itemId === "frame_standard" ? true : ownsItemOrPack(player, itemId);
      if (!category || !owned) { socket.emit('room_error', "Tu ne possedes pas cet objet cosmetique."); return; }
      player.inventory.__equipped[category] = itemId;
    }
    await savePlayerToSupabase(socket.id);
    await logPlayerAction(player, 'equip_cosmetic', `Item: ${itemId}`, null, null, null);
    socket.emit('player_registered', player);
  });

  socket.on("update_profile_visuals", async (data) => {
    try {
      const player = activePlayers[socket.id];
      if (!player) return;
      const avatar = Math.max(1, Math.min(999, parseInt(data.avatar) || player.avatar || 1));
      const flag = (typeof data.flag === "string" && data.flag.length <= 8) ? data.flag.replace(/['"]/g, "").trim() : player.flag;
      player.avatar = avatar;
      player.flag = flag;
      if (player.dbId) await supabase.from("players").update({ avatar, flag }).eq("id", player.dbId);
      await logPlayerAction(player, 'profile_visuals', `Avatar: ${avatar}, Flag: ${flag}`, null, null, null);
      socket.emit("profile_visuals_updated", { ok: true });
    } catch (err) {
      console.error("Erreur update_profile_visuals :", err);
      socket.emit("profile_visuals_updated", { ok: false });
    }
  });

  socket.on('buy_blitz_pass', async () => {
    const player = activePlayers[socket.id];
    if (!player) return;
    const seasonId = getCurrentSeason().id;
    player.claimedPassTiers = normalizeClaimedTiers(player.claimedPassTiers);
    player.claimedPassTiers[seasonId] = player.claimedPassTiers[seasonId] || {};
    if (player.claimedPassTiers[seasonId].premium) return;
    if (player.coins >= 1000) {
      player.coins -= 1000;
      player.claimedPassTiers[seasonId].premium = true;
      player.blitzPassPremium = true;
      await savePlayerToSupabase(socket.id);
      await logPlayerAction(player, 'buy_blitz_pass', `Season ${seasonId} (1000🪙)`, 'coins', -1000, player.coins);
      socket.emit('player_registered', player);
      socket.emit('blitz_pass_updated', { coins: player.coins, blitzPassPremium: true, claimedPassTiers: player.claimedPassTiers });
      socket.emit('pass_reward_received', { message: "Passe Premium « " + getCurrentSeason().name + " » activé !" });
    } else {
      await logPlayerAction(player, 'buy_blitz_pass_fail', `Fonds insuffisants (besoin: 1000, avoir: ${player.coins})`, 'coins', 0, player.coins);
      socket.emit('room_error', "Tu n'as pas assez de pieces !");
    }
  });

  socket.on('claim_pass_tier', async (data) => {
    const player = activePlayers[socket.id];
    if (!player) return;
    const { tier, track } = data;
    const seasonId = getCurrentSeason().id;
    player.claimedPassTiers = normalizeClaimedTiers(player.claimedPassTiers);
    player.claimedPassTiers[seasonId] = player.claimedPassTiers[seasonId] || {};
    if (!isSeasonPassLive()) { socket.emit('pass_claim_denied', { tier, track, reason: "pass_not_live" }); return; }
    const seasonData = player.claimedPassTiers[seasonId];
    const key = tier + "_" + track;
    const unlockedTier = (player.seasonProgress && player.seasonProgress[seasonId] && player.seasonProgress[seasonId].unlocked_tier) || 0;
    if (tier > unlockedTier) { socket.emit('pass_claim_denied', { tier, track, reason: "tier_locked", unlocked: unlockedTier }); return; }
    if (seasonData[key]) { socket.emit('pass_claim_denied', { tier, track, reason: "already_claimed" }); return; }
    if (track === 'premium' && !seasonData.premium) { socket.emit('pass_claim_denied', { tier, track, reason: "premium_required" }); return; }
    seasonData[key] = true;
    player.blitzPassPremium = !!seasonData.premium;
    applyPassReward(player, tier, track, seasonId);
    const unlockedTrophies = evaluateTrophies(player);
    if (unlockedTrophies.length > 0) socket.emit('trophy_unlocked', unlockedTrophies.map(t => ({ id: Object.keys(TROPHY_CATALOG).find(k => TROPHY_CATALOG[k] === t), ...t })));
    await savePlayerToSupabase(socket.id);
    await logPlayerAction(player, 'claim_pass_tier', `Tier ${tier} (${track})`, null, null, null);
    socket.emit('player_registered', player);
    socket.emit('pass_tier_claimed', { tier, track });
    socket.emit('pass_reward_received', { message: "Recompense du Palier " + tier + " (" + track + ") recuperee !" });
  });

  socket.on('use_power', async (powerId) => {
    const player = activePlayers[socket.id];
    if (!player) return;
    if (!POWER_IDS.includes(powerId)) return;
    if ((player.inventory[powerId] || 0) <= 0) { socket.emit('power_use_denied', { powerId, reason: "no_stock" }); return; }
    const match = activeMatches[socket.id];
    if (match && !match.ended) {
      const pData = match.players[socket.id];
      if (!pData) return;
      pData.charges = pData.charges || {};
      if ((pData.charges[powerId] || 0) <= 0) { socket.emit('power_use_denied', { powerId, reason: "no_charges" }); return; }
      pData.charges[powerId]--;
    }
    player.inventory[powerId]--;
    const remaining = player.inventory[powerId] || 0;
    if (remaining <= 0) {
      if (player.equippedPower === powerId) player.equippedPower = null;
      if (Array.isArray(player.equippedPowers)) player.equippedPowers = player.equippedPowers.filter(id => id !== powerId);
    }
    await savePlayerToSupabase(socket.id);
    await logPlayerAction(player, 'use_power', `Power: ${powerId} (remaining: ${remaining})`, null, null, null);
    socket.emit('power_used_success', { powerId, remaining: player.inventory[powerId] });
    socket.emit('player_registered', player);
    if (match && MALUS_POWERS.includes(powerId)) {
      const oppId = (match.id1 === socket.id) ? match.id2 : match.id1;
      io.to(oppId).emit('receive_malus', { type: powerId });
    }
  });

  socket.on('send_malus', () => {});

  socket.on('send_emote', (data) => {
    const match = activeMatches[socket.id];
    if (match) {
      const oppId = (match.id1 === socket.id) ? match.id2 : match.id1;
      if (activePlayers[oppId]) io.to(oppId).emit('receive_emote', { senderId: socket.id, emote: data.emote });
    } else {
      for (let code in rooms) {
        const room = rooms[code];
        if (room.players.some(p => (p.socketId || p.id) === socket.id)) { io.to(code).emit('receive_emote', { senderId: socket.id, emote: data.emote }); break; }
      }
    }
  });

  socket.on('spin_jackpot_wheel', async () => {
    const player = activePlayers[socket.id];
    if (!player) return;
    ensureDailyCounters(player);
    if (player.daily_roulette.count >= 5) { socket.emit('wheel_limit_reached', { limit: 5, used: player.daily_roulette.count }); return; }
    const cd = checkCooldown(player, 'spin_wheel', 30000);
    if (!cd.ok) { socket.emit('wheel_limit_reached', { limit: 0, used: 0, cooldown: Math.ceil(cd.remaining / 1000) }); return; }
    player.daily_roulette.count++;
    const roll = Math.random();
    let outcome = 'rien', coinDelta = 0, itemId = null;
    const possiblePowerRewards = ["spotlight", "freeze", "joker", "quake"];
    if (roll < 0.30) { outcome = 'jackpot'; coinDelta = 250; }
    else if (roll < 0.45) {
      outcome = 'objet';
      itemId = possiblePowerRewards[Math.floor(Math.random() * possiblePowerRewards.length)];
      player.inventory = player.inventory || {};
      player.inventory[itemId] = (player.inventory[itemId] || 0) + 1;
    }
    else if (roll < 0.70) { outcome = 'banqueroute'; coinDelta = -150; }
    if (coinDelta < 0) player.coins = Math.max(0, player.coins + coinDelta);
    else player.coins += coinDelta;
    lastMatchEarnings[socket.id] = (lastMatchEarnings[socket.id] || 0) + coinDelta;
    setLastAction(player, 'spin_wheel');
    await savePlayerToSupabase(socket.id);
    await logPlayerAction(player, 'spin_wheel', `Outcome: ${outcome}, Delta: ${coinDelta}${itemId ? ', Item: ' + itemId : ''}`, coinDelta !== 0 ? 'coins' : null, coinDelta !== 0 ? coinDelta : null, player.coins);
    socket.emit('player_registered', player);
    socket.emit('jackpot_wheel_result', { outcome, coinDelta, itemId, newCoins: player.coins });
  });

  socket.on('get_leaderboard', async (type) => {
    try {
      const [category, scope] = type.split('_');
      let query = supabase.from('players').select('*');
      const player = activePlayers[socket.id];
      if (scope === 'regional' && player) query = query.eq('region', player.region);
      if (scope === 'national' && player) query = query.in('country', [player.country || 'FR', 'FR', '🇫🇷']);
      if (category === 'points') query = query.order('points', { ascending: false });
      else if (category === 'trophies') query = query.order('trophies', { ascending: false });
      else if (category === 'coins') query = query.order('coins', { ascending: false });
      else query = query.order('trophies', { ascending: false }).order('points', { ascending: false });
      const { data: sortedData, error } = await query.limit(50);
      socket.emit('leaderboard_data', { type, data: (!error && sortedData) ? sortedData : [] });
    } catch (err) { socket.emit('leaderboard_data', { type, data: [] }); }
  });

  socket.on('get_rooms_list', () => {
    socket.emit('rooms_list_data', Object.values(rooms).map(r => ({ code: r.code, hasPassword: !!r.password, playersCount: r.players.length })));
  });

  socket.on('create_room', (data) => {
    const code = data.code || Math.random().toString(36).substring(2, 6).toUpperCase();
    if (rooms[code]) { socket.emit('room_error', "Ce salon existe deja !"); return; }
    const currentPlayer = activePlayers[socket.id] || { socketId: socket.id, username: data.username, avatar: data.avatar, flag: data.flag };
    rooms[code] = { code, password: data.password || '', players: [currentPlayer], hostId: socket.id };
    socket.join(code);
    socket.emit('room_joined_success', { code, players: rooms[code].players });
    io.emit('rooms_list_changed');
  });

  socket.on('join_room', (data) => {
    const room = rooms[data.code];
    if (!room) { socket.emit('room_error', "Salon introuvable !"); return; }
    if (room.password && room.password !== data.password) { socket.emit('room_error', "Mot de passe incorrect !"); return; }
    if (room.players.length >= 2) { socket.emit('room_error', "Le salon est complet !"); return; }
    const currentPlayer = activePlayers[socket.id] || { socketId: socket.id, username: "Joueur", avatar: 1, flag: "🇫🇷" };
    room.players.push(currentPlayer);
    socket.join(room.code);
    socket.emit('room_joined_success', { code: room.code, players: room.players });
    io.to(room.code).emit('room_players_update', { players: room.players });
    if (room.players.length === 2) {
      setTimeout(() => { startMatchBetween(room.players[0].socketId || room.players[0].id, room.players[1].socketId || room.players[1].id, false, false, false); }, 1000);
    }
  });

  socket.on('leave_room', () => { leaveAllRooms(socket); });

  socket.on('get_friends_list', async () => {
    const player = activePlayers[socket.id];
    if (!player) return;
    try {
      const { data: friendships, error } = await supabase.from('friendships').select('*').or(`user_username.ilike.${player.username},friend_username.ilike.${player.username}`);
      if (error) throw error;
      let friendsData = [];
      for (let f of friendships) {
        const friendName = f.user_username.toLowerCase() === player.username.toLowerCase() ? f.friend_username : f.user_username;
        let isOnline = false, targetSocketId = null;
        for (let sId in activePlayers) {
          if (activePlayers[sId].username && activePlayers[sId].username.toLowerCase() === friendName.toLowerCase()) { isOnline = true; targetSocketId = sId; break; }
        }
        friendsData.push({ id: f.id, username: friendName, status: f.status, isRequester: f.user_username.toLowerCase() === player.username.toLowerCase(), isOnline, targetSocketId });
      }
      socket.emit('friends_list_data', friendsData);
    } catch (err) { console.error("Erreur amis :", err); }
  });

  socket.on('send_friend_request', async (targetUsername) => {
    const player = activePlayers[socket.id];
    if (!player || !targetUsername) return;
    const cd = checkCooldown(player, 'friend_request', 6000);
    if (!cd.ok) { socket.emit('friend_error', "Trop de demandes, attends un peu."); return; }
    setLastAction(player, 'friend_request');
    const cleanTarget = targetUsername.trim();
    if (cleanTarget.toLowerCase() === player.username.toLowerCase()) { socket.emit('friend_error', "Tu ne peux pas t'ajouter toi-meme !"); return; }
    const { data: targetExists } = await supabase.from('players').select('username').ilike('username', cleanTarget).single();
    if (!targetExists) { socket.emit('friend_error', "Ce joueur n'existe pas !"); return; }
        const { error } = await supabase.from('friendships').insert([{ user_username: player.username, friend_username: targetExists.username, status: 'pending' }]);
    if (error) socket.emit('friend_error', "Demande deja envoyee ou amitie existante.");
    else {
      socket.emit('friend_success', "Demande d'ami envoyee a " + targetExists.username + " !");
      // 📬 Notifier le joueur cible EN TEMPS RÉEL (pastille + toast)
      for (let sId in activePlayers) {
        if (activePlayers[sId].username && activePlayers[sId].username.toLowerCase() === targetExists.username.toLowerCase()) {
          io.to(sId).emit('friend_request_received', { from: player.username });
          break;
        }
      }
    }
  });

  socket.on('accept_friend_request', async (friendshipId) => { await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId); socket.emit('friend_updated'); });
  socket.on('remove_friend', async (friendshipId) => { await supabase.from('friendships').delete().eq('id', friendshipId); socket.emit('friend_updated'); });
  socket.on('invite_friend_to_game', (data) => {
    const player = activePlayers[socket.id];
    if (!player || !data.targetSocketId) return;
    io.to(data.targetSocketId).emit('receive_game_invite', { from: player.username, roomCode: data.roomCode || null });
  });

  socket.on('find_1v1_match', () => {
    if (maintBlocked(socket)) { socket.emit('maintenance_kick', { message: maintenanceState.message }); return; }
    if (!matchmakingQueue.includes(socket.id)) matchmakingQueue.push(socket.id);
    if (matchmakingQueue.length >= 2) {
      const id1 = matchmakingQueue.shift();
      let id2 = null;
      for (let i = 0; i < matchmakingQueue.length; i++) {
        const c = matchmakingQueue[i];
        const sameUser = activePlayers[id1] && activePlayers[c] && activePlayers[id1].username === activePlayers[c].username;
        if (c !== id1 && !sameUser) { id2 = c; matchmakingQueue.splice(i, 1); break; }
      }
      if (id2) startMatchBetween(id1, id2, false, true, false);
      else matchmakingQueue.unshift(id1);
    }
  });

  socket.on('find_ranked_match', (data) => {
    if (maintBlocked(socket)) { socket.emit('maintenance_kick', { message: maintenanceState.message }); return; }
    const player = activePlayers[socket.id];
    if (!player) return;
    let items = (data && Array.isArray(data.items)) ? data.items : [];
    if (items.length !== 2) { socket.emit('room_error', "En mode classe, tu dois equiper exactement 2 objets."); return; }
    const counts = {};
    items.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
    for (const id in counts) { if ((player.inventory[id] || 0) < counts[id]) { socket.emit('room_error', "Stock insuffisant pour un objet selectionne."); return; } }
    player.equippedPowers = items;
    player.equippedPower = items[0];
    if (!rankedQueue.includes(socket.id)) rankedQueue.push(socket.id);
    if (rankedQueue.length >= 2) {
      const id1 = rankedQueue.shift();
      let id2 = null;
      for (let i = 0; i < rankedQueue.length; i++) {
        const c = rankedQueue[i];
        const sameUser = activePlayers[id1] && activePlayers[c] && activePlayers[id1].username === activePlayers[c].username;
        if (c !== id1 && !sameUser) { id2 = c; rankedQueue.splice(i, 1); break; }
      }
      if (id2) startMatchBetween(id1, id2, true, true, false);
      else rankedQueue.unshift(id1);
    }
  });

  socket.on('find_tug_of_war_match', () => {
    if (maintBlocked(socket)) { socket.emit('maintenance_kick', { message: maintenanceState.message }); return; }
    if (!globalEvents.tugOfWarMode) return;
    tugOfWarQueue = tugOfWarQueue.filter(sId => sId !== socket.id);
    tugOfWarQueue.push(socket.id);
    if (tugOfWarQueue.length >= 2) startMatchBetween(tugOfWarQueue.shift(), tugOfWarQueue.shift(), false, true, true);
  });

  socket.on('find_halloween_match', () => {
    if (maintBlocked(socket)) { socket.emit('maintenance_kick', { message: maintenanceState.message }); return; }
    if (!isCatchEnabled('halloween')) return;
    halloweenQueue = halloweenQueue.filter(s => s !== socket.id);
    halloweenQueue.push(socket.id);
    if (halloweenQueue.length >= 2) startCatchMatch(halloweenQueue.shift(), halloweenQueue.shift(), 'halloween');
  });

  socket.on('find_noel_match', () => {
    if (maintBlocked(socket)) { socket.emit('maintenance_kick', { message: maintenanceState.message }); return; }
    if (!isCatchEnabled('noel')) return;
    noelQueue = noelQueue.filter(s => s !== socket.id);
    noelQueue.push(socket.id);
    if (noelQueue.length >= 2) startCatchMatch(noelQueue.shift(), noelQueue.shift(), 'noel');
  });

  socket.on('request_rematch', () => {
    const match = activeMatches[socket.id];
    if (!match) return;
    const oppId = (match.id1 === socket.id) ? match.id2 : match.id1;
    if (!activePlayers[oppId]) { socket.emit('room_error', "L'adversaire s'est deconnecte."); return; }
    match.rematchVotes = match.rematchVotes || {};
    match.rematchVotes[socket.id] = true;
    io.to(oppId).emit('opponent_wants_rematch');
    if (match.rematchVotes[match.id1] && match.rematchVotes[match.id2]) {
      delete activeMatches[match.id1];
      delete activeMatches[match.id2];
      startMatchBetween(match.id1, match.id2, match.isRanked, true, match.isTugOfWar);
    }
  });

  socket.on('player_click_1v1', (clickedIndex) => {
    const match = activeMatches[socket.id];
    if (!match || match.ended) return;
    const pData = match.players[socket.id];
    if (!pData) return;
    const now = Date.now();
    if (pData.lastClick && now - pData.lastClick < 180) return;
    pData.lastClick = now;
    const oppId = (match.id1 === socket.id) ? match.id2 : match.id1;
    if (typeof clickedIndex !== 'number' || clickedIndex < 0 || clickedIndex >= pData.pool.length) return;
    const num = pData.pool[clickedIndex];
    if (num === pData.target) {
      pData.score += 10;
      pData.target++;
      pData.pool = generatePool(pData.target);
      if (match.isTugOfWar) {
        if (socket.id === match.id1) match.ropePosition++; else match.ropePosition--;
        io.to(match.id1).emit('tug_of_war_update', { ropePosition: match.ropePosition });
        io.to(match.id2).emit('tug_of_war_update', { ropePosition: match.ropePosition });
        if (match.ropePosition >= 6 || match.ropePosition <= -6) { match.ended = true; endMatch(match.id1, match.id2, match, false); return; }
      }
      socket.emit('my_grid_updated', { target: pData.target, newPool: pData.pool, success: true, score: pData.score });
      io.to(oppId).emit('opponent_progress', { target: pData.target, score: pData.score, opponent: activePlayers[socket.id] });
    } else {
      socket.emit('my_grid_updated', { target: pData.target, newPool: pData.pool, success: false, score: pData.score });
    }
  });

  socket.on('catch_click', (data) => {
    const match = activeMatches[socket.id];
    if (!match || !match.isCatch || match.ended) return;
    const allowed = [10, -15, 20, -20, 0, -5];
    const delta = parseInt(data.delta);
    if (!allowed.includes(delta)) return;
    const pData = match.players[socket.id];
    if (!pData) return;
    const nowC = Date.now();
    if (pData.lastCatch && nowC - pData.lastCatch < 150) return;
    pData.lastCatch = nowC;
    pData.score = Math.max(0, pData.score + delta);
    const oppId = (match.id1 === socket.id) ? match.id2 : match.id1;
    io.to(oppId).emit('catch_opp_score', { score: pData.score });
  });

   socket.on('solo_start', () => {
  if (maintBlocked(socket)) { socket.emit('maintenance_kick', { message: maintenanceState.message }); return; }
  const p = activePlayers[socket.id];
  soloStarts[socket.id] = Date.now();
  if (p) soloStarts[p.username] = Date.now();
  });
  socket.on('catch_solo_start', () => {
  if (maintBlocked(socket)) { socket.emit('maintenance_kick', { message: maintenanceState.message }); return; }
  const p = activePlayers[socket.id];
  catchSoloStarts[socket.id] = Date.now();
  if (p) catchSoloStarts[p.username] = Date.now();
  });

  socket.on('claim_catch_solo', async (payload) => {
    const player = activePlayers[socket.id];
    if (!player) return;
    const cd = checkCooldown(player, 'catch_solo', 8000);
    if (!cd.ok) { socket.emit('catch_solo_result', { baseCoins: 0, bonusCoins: 0, rushBonus: 0, earnedCoins: 0, error: 'cooldown' }); return; }
    const catchStart = catchSoloStarts[player.username];
    if (!catchStart) {
    await logPlayerAction(player, 'catch_no_start', 'Pas de catch_solo_start enregistré pour ' + player.username, null, null, null);
    socket.emit('catch_solo_result', { baseCoins: 0, bonusCoins: 0, rushBonus: 0, earnedCoins: 0, error: 'suspicious' });
    return;
    }
    const serverDuration = (Date.now() - catchStart) / 1000;
    delete catchSoloStarts[socket.id]; delete catchSoloStarts[player.username];
    const score = Math.max(0, Math.min(20000, Number(payload && payload.score) || 0));
    const bonus = Math.max(0, Math.min(20000, Number(payload && payload.bonus) || 0));
    const maxAllowed = Math.min(20000, Math.max(500, serverDuration * 800));
    const safeScore = Math.min(score, maxAllowed);
    const safeBonus = Math.min(bonus, maxAllowed);
    const baseCoins = Math.min(100, Math.floor(safeScore / 3));
    const bonusCoins = Math.min(100, Math.floor(safeBonus / 3));
    const rushBonus = globalEvents.coinRush ? baseCoins : 0;
    const earned = baseCoins + bonusCoins + rushBonus;
    player.coins += earned;
    player.solo_games = (player.solo_games || 0) + 1;
    player.total_coins_earned = (player.total_coins_earned || 0) + earned;
    setLastAction(player, 'catch_solo');
    await savePlayerToSupabase(socket.id);
    await logPlayerAction(player, 'catch_solo', `Score: ${safeScore}+${safeBonus}, Durée serveur: ${serverDuration.toFixed(1)}s`, 'coins', earned, player.coins);
    socket.emit('player_registered', player);
    socket.emit('catch_solo_result', { baseCoins, bonusCoins, rushBonus, earnedCoins: earned });
  });

  socket.on('claim_solo_reward', async (payload) => {
    const player = activePlayers[socket.id];
    if (!player) return;
    const cd = checkCooldown(player, 'solo_reward', 3000);
    if (!cd.ok) { socket.emit('solo_reward_result', { baseCoins: 0, rushBonus: 0, earnedCoins: 0, triggerWheel: false, globalEvents, perfection: false, error: 'cooldown' }); return; }
    const soloStart = soloStarts[player.username];
    if (!soloStart) {
    await logPlayerAction(player, 'solo_no_start', 'Pas de solo_start enregistré pour ' + player.username, null, null, null);
    socket.emit('solo_reward_result', { baseCoins: 0, rushBonus: 0, earnedCoins: 0, triggerWheel: false, globalEvents, perfection: false, error: 'suspicious' });
    return;
    }
    const serverDuration = (Date.now() - soloStart) / 1000;
    delete soloStarts[socket.id]; delete soloStarts[player.username];
    const score = (typeof payload === 'object' && payload !== null) ? (payload.score || 0) : payload;
    const perfection = (typeof payload === 'object' && payload !== null) ? !!payload.perfection : false;
    const normalizedScore = Number(score);
    if (!Number.isFinite(normalizedScore) || normalizedScore < 0 || normalizedScore > 20000) return;
    const maxAllowed = Math.min(20000, Math.max(500, serverDuration * 800));
    const safeScore = Math.min(normalizedScore, maxAllowed);
    let baseCoins = perfection ? 100 : Math.min(100, Math.floor(safeScore / 3));
    let rushBonus = globalEvents.coinRush ? baseCoins : 0;
    let earnedCoins = baseCoins + rushBonus;
    player.coins += earnedCoins;
    player.solo_games = (player.solo_games || 0) + 1;
    player.total_coins_earned = (player.total_coins_earned || 0) + earnedCoins;
    if (payload && typeof payload.best_combo === 'number') player.best_combo = Math.max(player.best_combo || 0, payload.best_combo);
    if (payload && typeof payload.avalanche_score === 'number') player.best_avalanche = Math.max(player.best_avalanche || 0, payload.avalanche_score);
    const unlockedTrophies = evaluateTrophies(player);
    if (unlockedTrophies.length > 0) socket.emit('trophy_unlocked', unlockedTrophies.map(t => ({ id: Object.keys(TROPHY_CATALOG).find(k => TROPHY_CATALOG[k] === t), ...t })));
    lastMatchEarnings[socket.id] = earnedCoins;
    if (perfection) { player.unlocked_items = player.unlocked_items || []; if (!player.unlocked_items.includes('achievement_perfection')) player.unlocked_items.push('achievement_perfection'); }
    let triggerWheel = (globalEvents.jackpotEclair && Math.random() < 0.10);
    setLastAction(player, 'solo_reward');
    await savePlayerToSupabase(socket.id);
    await logPlayerAction(player, 'solo_reward', `Score: ${safeScore}${safeScore !== normalizedScore ? ' (tronqué de ' + normalizedScore + ')' : ''}, Durée serveur: ${serverDuration.toFixed(1)}s`, 'coins', earnedCoins, player.coins);
    socket.emit('player_registered', player);
    socket.emit('solo_reward_result', { baseCoins, rushBonus, earnedCoins, triggerWheel, globalEvents, perfection });
  });

  socket.on('double_reward', async () => {
    const player = activePlayers[socket.id];
    if (!player) return;
    ensureDailyCounters(player);
    if (player.daily_ads.count >= 15) { socket.emit('ad_limit_reached', { limit: 15, used: player.daily_ads.count }); return; }
    const cd = checkCooldown(player, 'double_reward', 15000);
    if (!cd.ok) { socket.emit('ad_limit_reached', { limit: 0, used: 0, cooldown: Math.ceil(cd.remaining / 1000) }); return; }
    const earnings = lastMatchEarnings[socket.id] || 0;
    if (earnings > 0) {
      player.coins += earnings;
      player.daily_ads.count++;
      lastMatchEarnings[socket.id] = 0;
      setLastAction(player, 'double_reward');
      await savePlayerToSupabase(socket.id);
      await logPlayerAction(player, 'double_reward', `+${earnings}🪙 (ad)`, 'coins', earnings, player.coins);
      socket.emit('player_registered', player);
    }
  });

  socket.on('delete_account', async (data) => {
    const player = activePlayers[socket.id];
    if (!player) return;
    const code = ((data && data.secretCode) || '').trim();
    try {
      const { data: matched, error } = await supabase.from('players').select('*').ilike('username', player.username);
      if (error || !matched || matched.length === 0) { socket.emit('delete_account_result', { ok: false }); return; }
      const row = matched[0];
      const stored = (row.secret_code || '').trim();
      const okCode = isHashed(stored) ? (hashSecret(code) === stored) : (stored.toLowerCase() === code.toLowerCase());
      if (stored && !okCode) {
        await logPlayerAction(player, 'delete_account_fail', 'Bad code', null, null, null);
        socket.emit('delete_account_result', { ok: false, reason: 'bad_code' });
        return;
      }
      await logPlayerAction(player, 'account_deleted', `Username: ${player.username}`, null, null, null);
      await supabase.from('players').delete().eq('id', row.id);
      delete activePlayers[socket.id];
      socket.emit('delete_account_result', { ok: true });
    } catch (e) { console.error("Erreur suppression compte :", e); socket.emit('delete_account_result', { ok: false }); }
  });

  /* ---------- ADMIN ---------- */
  socket.on('admin_auth', (password) => {
  console.log('🔐 ADMIN_AUTH reçu, tentative:', socket.adminAttempts);
  if (socket.isAdmin) { console.log('✅ Déjà admin'); return; }
  if (socket.adminAttempts >= 5) { 
    console.log('❌ Trop de tentatives');
    socket.emit('admin_auth_fail', "Trop de tentatives."); 
    return; 
  }
  if (password === ADMIN_PASSWORD) { 
    console.log('✅ Mot de passe correct, envoi admin_auth_success');
    socket.isAdmin = true; 
    socket.emit('admin_auth_success', { events: globalEvents, schedules: eventSchedules }); 
  }
  else { 
    console.log('❌ Mot de passe incorrect. Attendu:', ADMIN_PASSWORD?.substring(0,3) + '***');
    socket.adminAttempts++; 
    socket.emit('admin_auth_fail', "Mot de passe administrateur incorrect !"); 
  }
});

  socket.on('admin_update_schedule', (schedulesData) => {
    if (!socket.isAdmin) return;
    eventSchedules = schedulesData;
    const now = Date.now();
    let changed = false;
    for (let key in eventSchedules) {
      const ev = eventSchedules[key];
      let shouldBeActive = ev.manual;
      if (ev.start && ev.end && now >= ev.start && now <= ev.end) shouldBeActive = true;
      if (globalEvents[key] !== shouldBeActive) { globalEvents[key] = shouldBeActive; changed = true; }
    }
    if (changed) io.emit("events_state_update", globalEvents);
    socket.emit('admin_schedule_saved', eventSchedules);
  });

  socket.on('admin_broadcast_message', (message) => { if (!socket.isAdmin) return; io.emit('global_announcement', message); });

  socket.on('admin_give_gift', async (data) => {
    if (!socket.isAdmin) return;
    const { targetUsername, currency, amount } = data;
    if (!["coins", "points", "trophies"].includes(currency)) return;
    const currencyLabel = currency === 'coins' ? 'Pieces' : (currency === 'points' ? 'Points' : 'Trophées');
    const msg = "Cadeau Admin recu : +" + amount + " " + currencyLabel + " !";
    if (!targetUsername || targetUsername.trim() === '' || targetUsername.toUpperCase() === 'TOUS') {
      for (let sId in activePlayers) {
        activePlayers[sId][currency] = (activePlayers[sId][currency] || 0) + amount;
        await savePlayerToSupabase(sId);
        io.to(sId).emit('player_registered', activePlayers[sId]);
        io.to(sId).emit('admin_gift_received', { currency, amount, message: msg });
      }
    } else {
      const cleanTarget = targetUsername.trim().toLowerCase();
      let found = null;
      for (let sId in activePlayers) { if (activePlayers[sId].username && activePlayers[sId].username.toLowerCase() === cleanTarget) { found = sId; break; } }
      if (found) {
        activePlayers[found][currency] = (activePlayers[found][currency] || 0) + amount;
        await savePlayerToSupabase(found);
        io.to(found).emit('player_registered', activePlayers[found]);
        io.to(found).emit('admin_gift_received', { currency, amount, message: msg });
      } else {
        const { data: matchedPlayers, error } = await supabase.from('players').select('*').ilike('username', targetUsername.trim());
        if (!error && matchedPlayers && matchedPlayers.length > 0) {
          const t = matchedPlayers[0];
          await supabase.from('players').update({ [currency]: (t[currency] || 0) + amount }).eq('id', t.id);
        }
      }
    }
  });

  socket.on('admin_set_region', async (data) => {
    if (!socket.isAdmin) return;
    const targetUsername = (data.targetUsername || '').trim();
    const newRegion = (data.newRegion || '').trim();
    if (!targetUsername || !newRegion) return;
    try {
      const { data: matched, error } = await supabase.from('players').select('*').ilike('username', targetUsername).limit(1);
      if (error || !matched || matched.length === 0) { socket.emit('admin_region_result', { ok: false, reason: 'not_found' }); return; }
      const t = matched[0];
      await supabase.from('players').update({ region: newRegion }).eq('id', t.id);
      for (let sId in activePlayers) {
        if (activePlayers[sId].username && activePlayers[sId].username.toLowerCase() === t.username.toLowerCase()) { activePlayers[sId].region = newRegion; io.to(sId).emit('player_registered', activePlayers[sId]); }
      }
      socket.emit('admin_region_result', { ok: true, username: t.username, region: newRegion });
    } catch (e) { socket.emit('admin_region_result', { ok: false, reason: 'error' }); }
  });

  socket.on('admin_set_season', (seasonId) => {
    if (!socket.isAdmin) return;
    seasonOverride = (seasonId && seasonId !== 'auto') ? seasonId : null;
    const seasonNow = getCurrentSeason();
    for (let sId in activePlayers) {
      const p = activePlayers[sId];
      p.claimedPassTiers = normalizeClaimedTiers(p.claimedPassTiers);
      p.current_season = seasonNow.id;
      p.blitzPassPremium = !!(p.claimedPassTiers[seasonNow.id] && p.claimedPassTiers[seasonNow.id].premium);
      io.to(sId).emit('player_registered', p);
    }
    socket.emit('admin_season_result', { ok: true, season: seasonNow.id });
  });

  socket.on('admin_get_season_dates', () => { if (!socket.isAdmin) return; socket.emit('admin_season_dates', getSeasonDatesPublic()); });
  socket.on('admin_set_season_dates', async (dates) => {
    if (!socket.isAdmin) return;
    applySeasonDates(dates);
    try { await supabase.from('settings').update({ season_dates: dates }).eq('id', 1); } catch (e) {}
    const seasonNow = getCurrentSeason();
    for (let sId in activePlayers) { const p = activePlayers[sId]; p.current_season = seasonNow.id; io.to(sId).emit('player_registered', p); }
    io.emit('seasons_updated', getSeasonDatesPublic());
    socket.emit('admin_season_result', { ok: true, season: seasonNow.id });
  });

  socket.on('admin_get_catalog', () => {
    if (!socket.isAdmin) return;
    socket.emit('admin_catalog', buildAdminCatalog());
  });

  socket.on('admin_give_cosmetic', async (data) => {
    if (!socket.isAdmin) return;
    const { username, itemId, kind } = data || {};
    const clean = (username || '').trim();
    if (!clean || !itemId) return;
    const isPower = kind === 'item' && ITEM_CATALOG[itemId] && ITEM_CATALOG[itemId].type === 'power';

  
    let targetId = null;
    for (const sId in activePlayers) {
      if (activePlayers[sId].username && activePlayers[sId].username.toLowerCase() === clean.toLowerCase()) { targetId = sId; break; }
    }
    if (targetId) {
      const p = activePlayers[targetId];
      if (kind === 'trophy') {
        const t = checkAndUnlockTrophy(p, itemId);
        if (!t) { socket.emit('admin_give_result', { ok: false, message: 'Trophée déjà possédé ou introuvable.' }); return; }
      } else if (isPower) {
        p.inventory = p.inventory || {}; p.inventory[itemId] = (p.inventory[itemId] || 0) + 1;
      } else {
        p.unlocked_items = p.unlocked_items || [];
        if (p.unlocked_items.includes(itemId)) { socket.emit('admin_give_result', { ok: false, message: 'Déjà possédé.' }); return; }
        p.unlocked_items.push(itemId);
      }
      await savePlayerToSupabase(targetId);
      logPlayerAction(p, 'admin_give_item', 'Don admin : ' + itemId);
      io.to(targetId).emit('player_registered', p);
      socket.emit('admin_give_result', { ok: true, message: itemId + ' → ' + p.username });
      return;
    }
    const { data: matched, error } = await supabase.from('players').select('*').ilike('username', clean).limit(1);
    if (error || !matched || matched.length === 0) { socket.emit('admin_give_result', { ok: false, message: 'Pseudo introuvable.' }); return; }
    const row = matched[0];
    if (kind === 'trophy') {
      const tc = row.trophies_collection || {};
      if (tc[itemId]) { socket.emit('admin_give_result', { ok: false, message: 'Trophée déjà possédé.' }); return; }
      const trophy = TROPHY_CATALOG[itemId];
      tc[itemId] = { unlocked: true, unlockedAt: Date.now() };
      const unlocked = row.unlocked_items || [];
      if (trophy && trophy.title && !unlocked.includes(trophy.title)) unlocked.push(trophy.title);
      await supabase.from('players').update({ trophies_collection: tc, unlocked_items: unlocked }).eq('id', row.id);
    } else if (isPower) {
      const inv = row.inventory || {}; inv[itemId] = (inv[itemId] || 0) + 1;
      await supabase.from('players').update({ inventory: inv }).eq('id', row.id);
    } else {
      const unlocked = row.unlocked_items || [];
      if (unlocked.includes(itemId)) { socket.emit('admin_give_result', { ok: false, message: 'Déjà possédé.' }); return; }
      unlocked.push(itemId);
      await supabase.from('players').update({ unlocked_items: unlocked }).eq('id', row.id);
    }
    logPlayerAction({ username: row.username, socketId: null }, 'admin_give_item', 'Don admin (hors-ligne) : ' + itemId);
    socket.emit('admin_give_result', { ok: true, message: itemId + ' → ' + row.username + ' (hors-ligne)' });
  });

   socket.on('admin_reset_password', async (data2) => {
      if (!socket.isAdmin) return;
      const targetUsername = (data2 && data2.username || '').trim();
      const providedKey = (data2 && data2.recoveryKey || '').trim().toUpperCase().replace(/\s/g, '');
      if (!targetUsername || !providedKey) { socket.emit('admin_reset_result', { ok: false, message: 'Pseudo et clé requis.' }); return; }
      const expectedKey = generateRecoveryKey(targetUsername).replace(/-/g, '');
      if (providedKey !== expectedKey) { socket.emit('admin_reset_result', { ok: false, message: '❌ Clé de récupération incorrecte.' }); return; }
      const newCode = generateSecureCode();
      try {
        const { data: matched, error } = await supabase.from('players').select('*').ilike('username', targetUsername).limit(1);
        if (error || !matched || matched.length === 0) { socket.emit('admin_reset_result', { ok: false, message: 'Pseudo introuvable.' }); return; }
        const row = matched[0];
        await supabase.from('players').update({ secret_code: hashSecret(newCode) }).eq('id', row.id);
        for (const sId in activePlayers) {
          if (activePlayers[sId].username && activePlayers[sId].username.toLowerCase() === row.username.toLowerCase()) {
            io.to(sId).emit('force_logout', { reason: 'password_reset' });
          }
        }
        socket.emit('admin_reset_result', { ok: true, message: `✅ Nouveau code pour ${row.username} : ${newCode}`, newCode, username: row.username });
        logPlayerAction({ username: row.username, socketId: null }, 'admin_reset_password', 'Réinitialisation par admin (clé vérifiée)');
      } catch (e) { socket.emit('admin_reset_result', { ok: false, message: 'Erreur serveur : ' + e.message }); }
    });
  
  socket.on('get_recovery_key', (data) => {
    const player = activePlayers[socket.id];
    if (!player) return;
    const providedCode = (data && data.secretCode) || '';
    supabase.from('players').select('secret_code').eq('id', player.dbId).single().then(({ data: row, error }) => {
      if (error || !row) { socket.emit('recovery_key_result', { ok: false, message: 'Erreur serveur.' }); return; }
      const stored = (row.secret_code || '').trim();
      const okCode = isHashed(stored) ? (hashSecret(providedCode) === stored) : (stored.toLowerCase() === providedCode.toLowerCase());
      if (!okCode) { socket.emit('recovery_key_result', { ok: false, message: 'Code secret incorrect.' }); return; }
      const key = generateRecoveryKey(player.username);
      socket.emit('recovery_key_result', { ok: true, key });
    });
  });

  socket.on('change_secret_code', async (data) => {
    const player = activePlayers[socket.id];
    if (!player) return;
    const oldCode = (data && data.oldCode) || '';
    const newCode = (data && data.newCode) || '';
    if (!isStrongCode(newCode)) {
      socket.emit('change_code_result', { ok: false, message: 'Le nouveau code doit faire 8+ caractères avec lettres, chiffres et caractère spécial (!@#$%&*+-_).' });
      return;
    }
    try {
      const { data: row, error } = await supabase.from('players').select('secret_code').eq('id', player.dbId).single();
      if (error || !row) { socket.emit('change_code_result', { ok: false, message: 'Erreur serveur.' }); return; }
      const stored = (row.secret_code || '').trim();
      const okOld = isHashed(stored) ? (hashSecret(oldCode) === stored) : (stored.toLowerCase() === oldCode.toLowerCase());
      if (!okOld) {
        await logPlayerAction(player, 'change_code_fail', 'Ancien code incorrect', null, null, null);
        socket.emit('change_code_result', { ok: false, message: 'Ancien code incorrect.' });
        return;
      }
      await supabase.from('players').update({ secret_code: hashSecret(newCode) }).eq('id', player.dbId);
      await logPlayerAction(player, 'change_code_success', 'Code secret changé', null, null, null);
      socket.emit('change_code_result', { ok: true, message: '✅ Code secret changé avec succès !' });
    } catch (e) { socket.emit('change_code_result', { ok: false, message: 'Erreur serveur.' }); }
  });

  socket.on('admin_get_maintenance', () => {
if (!socket.isAdmin) return;
socket.emit('maintenance_state', { enabled:maintenanceState.enabled, message:maintenanceState.message, hasCode:!!maintenanceState.bypassCode, since:maintenanceState.since, online:getOnlineCount() });
});
socket.on('admin_set_maintenance', async (data) => {
if (!socket.isAdmin) return;
const want = !!(data && data.enabled);
const msg = String((data && data.message) || " ").trim() || "🔢 Maintenance en cours : on compte jusqu'à… bah non en fait, on répare ! Retour très vite 😉 ";
const code = String((data && data.bypassCode) || " ").trim();

// ✅ CORRECTION : On récupère le délai envoyé par l'admin (data.delay)
// Math.max(5, ...) empêche de mettre moins de 5 secondes.
// Si l'admin n'envoie rien, on met 60 secondes par défaut.
const delaySec = Math.max(5, parseInt(data && data.delay) || 60);

if (want){
    const first = !maintenanceState.enabled;
    maintenanceState = { enabled:true, message:msg, bypassCode:code, since: first ? Date.now() : maintenanceState.since };
    await saveMaintenance();
    
    maintenanceKickTime = Date.now() + (delaySec * 1000);
    
    for (const s of maintSockets()){ 
        if (!isMaintBypass(s)) {
            // ✅ On envoie le VRAI délai au client pour la bannière
            s.emit('maintenance_announce', { message:msg, delay: delaySec }); 
        }
    }
    
    if (maintenanceKickTimer) clearTimeout(maintenanceKickTimer);
    // ✅ On programme le kick avec le VRAI délai
    maintenanceKickTimer = setTimeout(maintenanceKickAll, delaySec * 1000);
    
} else if (maintenanceState.enabled){
    if (maintenanceKickTimer){ clearTimeout(maintenanceKickTimer); maintenanceKickTimer = null; }
    maintenanceState = { enabled:false, message:msg, bypassCode:"", since:null };
    maintenanceKickTime = 0;
    await saveMaintenance();
    io.emit('maintenance_end', {});
}
socket.emit('maintenance_state', { enabled:maintenanceState.enabled, message:maintenanceState.message, hasCode:!!maintenanceState.bypassCode, since:maintenanceState.since, online:getOnlineCount() });
});
  socket.on('admin_get_stats', () => {
  if (!socket.isAdmin) return;
  socket.emit('admin_stats', { online: getOnlineCount() });
  });
  socket.on('admin_get_logs', async (data) => {
    if (!socket.isAdmin) return;
    const username = ((data && data.username) || '').trim();
    let query = supabase.from('player_logs').select('*').order('id', { ascending: false }).limit(100);
    if (username) query = query.ilike('username', username);
    const { data: rows, error } = await query;
    socket.emit('admin_logs_data', { username, rows: (!error && rows) ? rows : [] });
  });

  socket.on('admin_adjust_currency', async (data) => {
    if (!socket.isAdmin) return;
    const { mode, currency, amount, pseudo, count } = data || {};
    if (!["coins", "points", "trophies"].includes(currency)) return;
    const amt = parseInt(amount) || 0;
    if (amt === 0) return;
    const apply = (p) => { p[currency] = Math.max(0, (p[currency] || 0) + amt); };
    let targets = [];
    if (mode === 'all') targets = Object.keys(activePlayers);
    else if (mode === 'pseudo') {
      const clean = (pseudo || '').trim();
      const low = clean.toLowerCase();
      targets = Object.keys(activePlayers).filter(id => activePlayers[id].username && activePlayers[id].username.toLowerCase() === low);
      if (targets.length === 0 && clean) {
        const { data: matched, error } = await supabase.from('players').select('*').ilike('username', clean).limit(1);
        if (!error && matched && matched.length > 0) {
          const t = matched[0];
          const newVal = Math.max(0, (t[currency] || 0) + amt);
          await supabase.from('players').update({ [currency]: newVal }).eq('id', t.id);
          socket.emit('admin_adjust_result', { ok: true, message: `${t.username} (hors-ligne) : ${currency} → ${newVal}` });
        } else socket.emit('admin_adjust_result', { ok: false, message: "Pseudo introuvable." });
        return;
      }
    } else if (mode === 'random') {
      const n = Math.max(1, parseInt(count) || 1);
      const ids = Object.keys(activePlayers);
      for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
      targets = ids.slice(0, n);
    }
    for (const id of targets) {
      const p = activePlayers[id];
      if (!p) continue;
      apply(p);
      logPlayerAction(p, 'admin_adjust', 'Ajustement admin', currency, amt, p[currency]);
      await savePlayerToSupabase(id);
      io.to(id).emit('player_registered', p);
    }
    socket.emit('admin_adjust_result', { ok: true, message: `${targets.length} joueur(s) modifié(s) (${amt > 0 ? '+' : ''}${amt} ${currency})` });
  });
/* ============================================================
ADMIN — AVENTURE : FLAGS SAISONS & VIES/JOKERS
============================================================ */
socket.on('admin_give_adventure', async (data) => {
  console.log('🔵 admin_give_adventure reçu:', JSON.stringify(data, null, 2));
  
  if (!socket.isAdmin) {
    console.log(' Pas admin');
    return;
  }
  
  try {
    const { username, halloween, noel, lives, jokersTime, jokersShield, starsPerWorld, maxFloor } = data || {};
    const clean = (username || '').trim();
    if (!clean) return socket.emit('admin_adv_result', { ok: false, message: 'Pseudo requis.' });
    
    console.log('🔵 Paramètres reçus:', { halloween, noel, lives, jokersTime, jokersShield, starsPerWorld, maxFloor });
    
    // Chercher le joueur en ligne
    let targetId = null;
    for (const sId in activePlayers) {
      if (activePlayers[sId].username && activePlayers[sId].username.toLowerCase() === clean.toLowerCase()) {
        targetId = sId;
        break;
      }
    }
    
    console.log('🔵 Joueur en ligne:', targetId ? 'OUI (ID: ' + targetId + ')' : 'NON');
    
    if (targetId) {
      const p = activePlayers[targetId];
      console.log('🔵 Player unlocked_items:', p.unlocked_items);
      
      let changes = [];
      
      // 1. Flags de saison
      p.unlocked_items = p.unlocked_items || [];
      let flagsAdded = [];
      
      console.log('🔵 Vérification Halloween:', halloween, 'Déjà possédé:', p.unlocked_items.includes('season_s2_unlocked'));
      if (halloween && !p.unlocked_items.includes('season_s2_unlocked')) {
        p.unlocked_items.push('season_s2_unlocked');
        flagsAdded.push('Halloween (M4-6)');
        console.log('✅ Flag Halloween ajouté');
      }
      
      console.log('🔵 Vérification Noël:', noel, 'Déjà possédé:', p.unlocked_items.includes('season_s3_unlocked'));
      if (noel && !p.unlocked_items.includes('season_s3_unlocked')) {
        p.unlocked_items.push('season_s3_unlocked');
        flagsAdded.push('Noël (M7-9)');
        console.log('✅ Flag Noël ajouté');
      }
      
      if (flagsAdded.length) changes.push(`flags: ${flagsAdded.join(', ')}`);
      
      // 2. Étoiles par monde
      if (starsPerWorld !== null && !isNaN(starsPerWorld)) {
        const stars = Math.max(0, Math.min(240, parseInt(starsPerWorld)));
        console.log(' Application étoiles:', stars, 'par monde');
        p.towerStars = {};
        for (let w = 1; w <= 9; w++) {
          const start = (w - 1) * 200 + 1;
          const end = w * 200;
          const perFloor = Math.ceil(stars / 200);
          let total = 0;
          for (let f = start; f <= end && total < stars; f++) {
            const add = Math.min(perFloor, stars - total);
            p.towerStars[String(f)] = Math.min(3, add);
            total += Math.min(3, add);
          }
        }
        changes.push(`${stars}⭐/monde`);
        console.log('✅ Étoiles appliquées:', Object.keys(p.towerStars).length, 'étages');
      }
      
      // 3. Étage max
      if (maxFloor !== null && !isNaN(maxFloor)) {
        p.towerFloor = Math.max(0, Math.min(1800, parseInt(maxFloor)));
        changes.push(`étage ${p.towerFloor}`);
        console.log('✅ Étage max:', p.towerFloor);
      }
      
      // 4. Vies
      if (lives !== null && !isNaN(lives)) {
        const newLives = Math.max(0, Math.min(10, parseInt(lives)));
        if (newLives !== p.lives) {
          p.lives = newLives;
          if (p.lives >= 10) p.lives_ts = Date.now();
          changes.push(`${p.lives} vies`);
          console.log('✅ Vies:', p.lives);
        }
      }
      
      // 5. Jokers
      p.jokers = normalizeJokers(p.jokers);
      if (jokersTime !== null && !isNaN(jokersTime)) {
        const newJt = Math.max(0, parseInt(jokersTime));
        if (newJt !== p.jokers.time) {
          p.jokers.time = newJt;
          changes.push(`${p.jokers.time} jokers temps`);
          console.log('✅ Jokers temps:', p.jokers.time);
        }
      }
      if (jokersShield !== null && !isNaN(jokersShield)) {
        const newJs = Math.max(0, parseInt(jokersShield));
        if (newJs !== p.jokers.shield) {
          p.jokers.shield = newJs;
          changes.push(`${p.jokers.shield} jokers bouclier`);
          console.log('✅ Jokers bouclier:', p.jokers.shield);
        }
      }
      
      console.log(' Changes finaux:', changes);
      
      if (!changes.length) {
        console.log('️ Aucun changement détecté');
        return socket.emit('admin_adv_result', { ok: false, message: 'Aucun changement (valeurs identiques).' });
      }
      
      // Sauvegarder
      console.log(' Appel savePlayerToSupabase...');
      await savePlayerToSupabase(targetId);
      console.log('✅ Save terminé');
      
      const detail = changes.join(' | ');
      await logPlayerAction(p, 'admin_adventure', detail, null, null, null);
      
      // Notifier le joueur
      io.to(targetId).emit('player_registered', p);
      io.to(targetId).emit('tower_data', { 
        floor: p.towerFloor || 0, 
        stars: p.towerStars || {}, 
        lives: p.lives, 
        nextLifeIn: towerNextLifeIn(p), 
        jokers: p.jokers 
      });
      
      socket.emit('admin_adv_result', { 
        ok: true, 
        message: `✅ ${p.username} : ${detail}` 
      });
      return;
    }
    
    // ===== CAS 2 : JOUEUR HORS-LIGNE =====
    console.log(' Joueur hors-ligne, requête Supabase...');
    const { data: matched, error } = await supabase.from('players').select('*').ilike('username', clean).limit(1);
    if (error || !matched || matched.length === 0) {
      console.log('❌ Joueur introuvable:', error);
      return socket.emit('admin_adv_result', { ok: false, message: 'Pseudo introuvable.' });
    }
    
    const row = matched[0];
    console.log('🔵 Row trouvé:', row.username);
    
    let updates = {};
    let changes = [];
    
    // 1. Flags de saison
    let unlocked = row.unlocked_items || [];
    if (typeof unlocked === 'string') {
      try { unlocked = JSON.parse(unlocked); } catch(e) { unlocked = []; }
    }
    if (!Array.isArray(unlocked)) unlocked = [];
    
    let flagsAdded = [];
    if (halloween && !unlocked.includes('season_s2_unlocked')) {
      unlocked.push('season_s2_unlocked');
      flagsAdded.push('Halloween (M4-6)');
    }
    if (noel && !unlocked.includes('season_s3_unlocked')) {
      unlocked.push('season_s3_unlocked');
      flagsAdded.push('Noël (M7-9)');
    }
    if (flagsAdded.length) {
      updates.unlocked_items = unlocked;
      changes.push(`flags: ${flagsAdded.join(', ')}`);
    }
    
    // 2. Étoiles par monde
    if (starsPerWorld !== null && !isNaN(starsPerWorld)) {
      const stars = Math.max(0, Math.min(240, parseInt(starsPerWorld)));
      const towerStars = {};
      for (let w = 1; w <= 9; w++) {
        const start = (w - 1) * 200 + 1;
        const end = w * 200;
        const perFloor = Math.ceil(stars / 200);
        let total = 0;
        for (let f = start; f <= end && total < stars; f++) {
          const add = Math.min(perFloor, stars - total);
          towerStars[String(f)] = Math.min(3, add);
          total += Math.min(3, add);
        }
      }
      updates.tower_stars = towerStars;
      changes.push(`${stars}⭐/monde`);
    }
    
    // 3. Étage max
    if (maxFloor !== null && !isNaN(maxFloor)) {
      updates.tower_floor = Math.max(0, Math.min(1800, parseInt(maxFloor)));
      changes.push(`étage ${updates.tower_floor}`);
    }
    
    // 4. Vies
    if (lives !== null && !isNaN(lives)) {
      const newLives = Math.max(0, Math.min(10, parseInt(lives)));
      updates.tower_lives = newLives;
      if (newLives >= 10) updates.tower_lives_ts = Date.now();
      changes.push(`${newLives} vies`);
    }
    
    // 5. Jokers
    let jokers = row.tower_jokers || { time: 0, shield: 0 };
    if (typeof jokers === 'string') {
      try { jokers = JSON.parse(jokers); } catch(e) { jokers = { time: 0, shield: 0 }; }
    }
    jokers = normalizeJokers(jokers);
    
    let jokersChanged = false;
    if (jokersTime !== null && !isNaN(jokersTime)) {
      jokers.time = Math.max(0, parseInt(jokersTime));
      jokersChanged = true;
      changes.push(`${jokers.time} jokers temps`);
    }
    if (jokersShield !== null && !isNaN(jokersShield)) {
      jokers.shield = Math.max(0, parseInt(jokersShield));
      jokersChanged = true;
      changes.push(`${jokers.shield} jokers bouclier`);
    }
    if (jokersChanged) updates.tower_jokers = jokers;
    
    console.log('🔵 Updates à envoyer:', updates);
    console.log('🔵 Changes:', changes);
    
    if (!changes.length) {
      return socket.emit('admin_adv_result', { ok: false, message: 'Aucun changement demandé.' });
    }
    
    // Update Supabase
    console.log(' Appel Supabase update...');
    const { error: updErr, data: updData } = await supabase.from('players').update(updates).eq('id', row.id);
    console.log(' Résultat Supabase:', { error: updErr, data: updData });
    
    if (updErr) {
      console.error('❌ Erreur Supabase:', updErr);
      return socket.emit('admin_adv_result', { ok: false, message: 'Erreur BDD: ' + updErr.message });
    }
    
    const detail = changes.join(' | ');
    await logPlayerAction({ username: row.username, socketId: null }, 'admin_adventure', `${detail} (hors-ligne)`, null, null, null);
    
    socket.emit('admin_adv_result', { 
      ok: true, 
      message: `✅ ${row.username} (hors-ligne) : ${detail}` 
    });
    
  } catch (e) {
    console.error('❌ admin_give_adventure error:', e);
    socket.emit('admin_adv_result', { ok: false, message: 'Erreur: ' + e.message });
  }
});

socket.on('admin_force_refresh', async (data) => {
  if (!socket.isAdmin) return;
  
  const { username } = data || {};
  const clean = (username || '').trim();
  if (!clean) return socket.emit('admin_force_refresh_result', { ok: false, message: 'Pseudo requis.' });
  
  // Chercher le joueur en ligne
  let targetId = null;
  for (const sId in activePlayers) {
    if (activePlayers[sId].username && activePlayers[sId].username.toLowerCase() === clean.toLowerCase()) {
      targetId = sId;
      break;
    }
  }
  
  if (targetId) {
    const p = activePlayers[targetId];
    // Recharger depuis la base de données
    const { data: row, error } = await supabase.from('players').select('*').eq('id', p.dbId).single();
    if (error || !row) {
      return socket.emit('admin_force_refresh_result', { ok: false, message: 'Erreur BDD' });
    }
    
    // Mettre à jour l'objet en mémoire
    p.towerFloor = row.tower_floor || 0;
    p.towerStars = row.tower_stars || {};
    p.lives = row.tower_lives !== undefined ? row.tower_lives : 10;
    p.lives_ts = row.tower_lives_ts || Date.now();
    p.jokers = normalizeJokers(row.tower_jokers);
    p.unlocked_items = row.unlocked_items || [];
    
    // Notifier le joueur
    io.to(targetId).emit('player_registered', p);
    io.to(targetId).emit('tower_data', { 
      floor: p.towerFloor, 
      stars: p.towerStars, 
      lives: p.lives, 
      nextLifeIn: towerNextLifeIn(p), 
      jokers: p.jokers 
    });
    
    return socket.emit('admin_force_refresh_result', { ok: true, username: p.username });
  }
  
  socket.emit('admin_force_refresh_result', { ok: false, message: 'Joueur hors-ligne' });
});
  /* ---------- 🗼 TOUR ---------- */
  socket.on('get_tower', () => {
    const player = activePlayers[socket.id];
    if (!player) return;
    towerRegenLives(player);
    player.jokers = normalizeJokers(player.jokers);
    socket.emit('tower_data', { floor: player.towerFloor || 0, stars: player.towerStars || {}, lives: player.lives, nextLifeIn: towerNextLifeIn(player), jokers: player.jokers });
  });

  socket.on('tower_floor_start', async (data) => {
    if (maintBlocked(socket)) { socket.emit('maintenance_kick', { message: maintenanceState.message }); return; }
    const player = activePlayers[socket.id];
    if (!player) return;
    const floor = parseInt(data && data.floor) || 0;
    if (floor < 1 || floor > (player.towerFloor || 0) + 1) return;
    const world = Math.ceil(floor / TOWER_FPC);
    if (!towerWorldUnlocked(player, world)) {
      await logPlayerAction(player, 'tower_locked', `Monde ${world} verrouillé (quota étoiles)`, null, null, null);
      return;
    }
    towerRegenLives(player);
    if (player.lives <= 0) { socket.emit('tower_no_lives', { lives: 0, nextLifeIn: towerNextLifeIn(player) }); return; }
    const s = buildTowerSession(player, floor);
    towerSessions[socket.id] = s;
    socket.emit('tower_state', towerStatePayload(s));
  });

  socket.on('tower_click', async (data) => {
    const player = activePlayers[socket.id];
    const s = towerSessions[socket.id];
    if (!player || !s || s.done || s.lock) return;
    if ((s.type === "pairs" || s.type === "memory") && s.revealUntil && Date.now() < s.revealUntil) return;
    const idx = parseInt(data && data.index);
    if (!Number.isFinite(idx) || idx < 0 || idx >= s.total || s.gone[idx]) return;
    const elapsed = (Date.now() - s.start) / 1000;
    if (elapsed > s.def.time) { const r = await towerFail(player, s, 'timeout'); delete towerSessions[socket.id]; socket.emit('tower_fail', r); cbMaybeKickAfterMatch(socket); return; }
    const v = s.nums[idx];
    let win = false, mistake = false;

    if (s.type === "color") {
      if (v.key === s.targetColor.key) {
        s.gone[idx] = true; s.remaining.delete(idx);
        if (s.remaining.size === 0) win = true;
        else if (![...s.remaining].some(i => s.nums[i].key === s.targetColor.key)) s.targetColor = pickColorTarget(s);
      } else mistake = true;
    } else if (s.type === "pairs") {
      if (s.sel === null) { s.sel = idx; s.revealed[idx] = true; }
      else if (s.sel === idx) { /* re-clic même case : ignoré */ }
      else {
        const first = s.sel; s.revealed[idx] = true;
        if (s.nums[first] === s.nums[idx]) {
          s.gone[first] = true; s.gone[idx] = true; s.remaining.delete(first); s.remaining.delete(idx); s.sel = null;
          if (s.remaining.size === 0) win = true;
        } else {
          mistake = true; s.lock = true;
          setTimeout(() => {
          if (s.done) return;
          s.revealed[first] = false; s.revealed[idx] = false; s.sel = null; s.lock = false;
          socket.emit('tower_state', towerStatePayload(s));
          }, 280);
        }
      }
    } else if (s.type === "parity") {
      const ok = s.targetParity === "even" ? v % 2 === 0 : v % 2 !== 0;
      if (ok) { s.gone[idx] = true; s.remaining.delete(v); if (s.remaining.size === 0) win = true; }
      else mistake = true;
        } else if (s.type === "forbidden") {
      if (v === s.forbidden) {
      mistake = true;
      } else {
      if (s.target === undefined || s.target === null) { s.target = 1; if (s.target === s.forbidden) s.target++; }
      if (v === s.target) {
      s.gone[idx] = true;
      s.remaining.delete(v);
      let nx = v + 1; if (nx === s.forbidden) nx++;
      s.target = nx;
      if (s.remaining.size === 1 && s.remaining.has(s.forbidden)) win = true;
      } else mistake = true;
      }
    } else {
      if (v === s.target) {
        s.gone[idx] = true; s.remaining.delete(v);
        if (s.remaining.size === 0) win = true;
        else {
          if (s.type === "reverse") s.target--;
          else if (s.type === "random") s.target = [...s.remaining][Math.floor(Math.random() * s.remaining.size)];
          else s.target++;
        }
      } else mistake = true;
    }

    if (mistake) {
      if (s.shield > 0) {
        s.shield--;
        socket.emit('tower_shield_used', { shield: s.shield });
      } else {
        s.mistakes++;
        if (s.type === "memory") { s.revealed[idx] = true; setTimeout(() => { if (!s.done) { s.revealed[idx] = false; socket.emit('tower_state', towerStatePayload(s)); } }, 450); }
        if (s.type === "nofail") { const r = await towerFail(player, s, 'nofail'); delete towerSessions[socket.id]; socket.emit('tower_fail', r); cbMaybeKickAfterMatch(socket); return; }
      }
    }
    if (win) {
  const r = await towerWin(player, s);
  delete towerSessions[socket.id];
  socket.emit('tower_result', r);
  socket.emit('player_registered', player);
  cbMaybeKickAfterMatch(socket);
  return;
}
    socket.emit('tower_state', towerStatePayload(s));
  });

  socket.on('tower_quit', () => {
  const s = towerSessions[socket.id];
  if (s && !s.done) { s.done = true; }
  delete towerSessions[socket.id];
  cbMaybeKickAfterMatch(socket);
});

  /* ---------- 🛒 BOUTIQUE AVENTURE (pièces = vies seulement) ---------- */
  socket.on('shop_buy', async (data) => {
    const player = activePlayers[socket.id];
    if (!player) return;
    const id = data && data.id;
    const item = TOWER_SHOP[id];
    if (!item) { socket.emit('shop_result', { ok: false }); return; }
    const cd = checkCooldown(player, 'shop_buy', 1000);
    if (!cd.ok) { socket.emit('shop_result', { ok: false, reason: 'cooldown' }); return; }
    towerRegenLives(player);
    if ((player.coins || 0) < item.price) { socket.emit('shop_result', { ok: false, reason: 'coins' }); return; }
    if (id === 'vies') {
      if (player.lives >= TOWER_MAX_LIVES) { socket.emit('shop_result', { ok: false, reason: 'full' }); return; }
      player.coins -= item.price;
      player.lives = Math.min(TOWER_MAX_LIVES, player.lives + 3);
      if (player.lives >= TOWER_MAX_LIVES) player.lives_ts = Date.now();
    }
    setLastAction(player, 'shop_buy');
    await savePlayerToSupabase(socket.id);
    await logPlayerAction(player, 'shop_buy', `${id} (${item.price}🪙)`, 'coins', -item.price, player.coins);
    socket.emit('shop_result', { ok: true, lives: player.lives, jokers: player.jokers, coins: player.coins });
    socket.emit('player_registered', player);
  });

  /* ---------- 🃏 JOKERS (⏱️ temps + 🛡️ bouclier) ---------- */
  socket.on('tower_use_joker', async (data) => {
    const player = activePlayers[socket.id];
    const s = towerSessions[socket.id];
    if (!player || !s || s.done) return;
    player.jokers = normalizeJokers(player.jokers);
    const kind = data && data.kind;
    if (kind === 'time') {
      if ((player.jokers.time || 0) <= 0) { socket.emit('joker_denied', { kind }); return; }
      player.jokers.time--;
      s.start += 10000;
    } else if (kind === 'shield') {
      if ((player.jokers.shield || 0) <= 0) { socket.emit('joker_denied', { kind }); return; }
      if (s.shield > 0) { socket.emit('tower_shield_already'); return; }
      player.jokers.shield--;
      s.shield = 1;
    } else { socket.emit('joker_denied', { kind }); return; }
    await savePlayerToSupabase(socket.id);
    socket.emit('tower_jokers_update', { jokers: player.jokers });
    socket.emit('player_registered', player);
    if (towerSessions[socket.id]) socket.emit('tower_state', towerStatePayload(towerSessions[socket.id]));
  });

  socket.on('disconnect', async () => {
  leaveAllRooms(socket);
    const qIdx = matchmakingQueue.indexOf(socket.id);
    if (qIdx !== -1) matchmakingQueue.splice(qIdx, 1);
    const rIdx = rankedQueue.indexOf(socket.id);
    if (rIdx !== -1) rankedQueue.splice(rIdx, 1);
    tugOfWarQueue = tugOfWarQueue.filter(id => id !== socket.id);
    halloweenQueue = halloweenQueue.filter(id => id !== socket.id);
    noelQueue = noelQueue.filter(id => id !== socket.id);
    delete activeMatches[socket.id];
    delete lastMatchEarnings[socket.id];
    delete towerSessions[socket.id];
    delete soloStarts[socket.id];
    delete catchSoloStarts[socket.id];
    await savePlayerToSupabase(socket.id);
    delete activePlayers[socket.id];
    broadcastOnlineCount();
  });
});

/* ============================================================
FONCTIONS ROOM / MATCH
============================================================ */
function leaveAllRooms(socket) {
  let changed = false;
  for (let code in rooms) {
    const room = rooms[code];
    room.players = room.players.filter(p => (p.socketId || p.id) !== socket.id);
    socket.leave(code);
    if (room.players.length === 0) { delete rooms[code]; changed = true; }
    else { io.to(code).emit('room_players_update', { players: room.players }); changed = true; }
  }
  if (changed) io.emit('rooms_list_changed');
}

function buildMatchCharges(playerObj) {
  const charges = {};
  if (!playerObj) return charges;
  const loadout = (playerObj.equippedPowers && playerObj.equippedPowers.length > 0) ? playerObj.equippedPowers : (playerObj.equippedPower ? [playerObj.equippedPower] : []);
  loadout.forEach(id => { const stock = playerObj.inventory ? (playerObj.inventory[id] || 0) : 0; if (stock > 0) charges[id] = Math.min((charges[id] || 0) + 1, stock); });
  return charges;
}

function startMatchBetween(id1, id2, isRanked = false, isOnline = true, isTugOfWar = false) {
  const p1 = activePlayers[id1] || { socketId: id1, username: "Joueur 1", avatar: 1, flag: "🇫🇷", points: 0 };
  const p2 = activePlayers[id2] || { socketId: id2, username: "Joueur 2", avatar: 2, flag: "🇫🇷", points: 0 };
  const isExpressoActive = globalEvents.expressoMatch && isOnline && !isRanked && !isTugOfWar;
  const match = {
    id1, id2, timeLeft: isExpressoActive ? 20 : 30,
    players: {
      [id1]: { target: 1, score: 0, pool: generatePool(1), charges: buildMatchCharges(activePlayers[id1]) },
      [id2]: { target: 1, score: 0, pool: generatePool(1), charges: buildMatchCharges(activePlayers[id2]) }
    },
    isRanked, isTugOfWar, ropePosition: 0, ended: false, rematchVotes: {}
  };
  activeMatches[id1] = match;
  activeMatches[id2] = match;
  io.to(id1).emit('start_countdown', { opponent: p2, timeLeft: match.timeLeft, myTarget: 1, myPool: match.players[id1].pool, isTugOfWar, isRanked });
  io.to(id2).emit('start_countdown', { opponent: p1, timeLeft: match.timeLeft, myTarget: 1, myPool: match.players[id2].pool, isTugOfWar, isRanked });
  let chaosTimer = 0;
  const gameInterval = setInterval(() => {
    match.timeLeft--;
    io.to(id1).emit('timer_update', match.timeLeft);
    io.to(id2).emit('timer_update', match.timeLeft);
    if (globalEvents.chaosMode && !isRanked && isOnline) {
      chaosTimer++;
      if (chaosTimer >= 8) {
        chaosTimer = 0;
        const maluses = ['quake', 'micro', 'eclipse'];
        const randomMalus = maluses[Math.floor(Math.random() * maluses.length)];
        io.to(id1).emit('receive_malus', { type: randomMalus });
        io.to(id2).emit('receive_malus', { type: randomMalus });
      }
    }
    if (match.timeLeft <= 0 || match.ended) {
      clearInterval(gameInterval);
      if (!match.ended) { match.ended = true; endMatch(id1, id2, match, isRanked); }
    }
  }, 1000);
}

function startCatchMatch(id1, id2, theme) {
  const p1 = activePlayers[id1] || { socketId: id1, username: "Joueur 1", avatar: 1, flag: "🇫🇷" };
  const p2 = activePlayers[id2] || { socketId: id2, username: "Joueur 2", avatar: 2, flag: "🇫" };
  const match = { id1, id2, timeLeft: 30, isCatch: true, catchTheme: theme, ended: false, rematchVotes: {}, players: { [id1]: { score: 0 }, [id2]: { score: 0 } } };
  activeMatches[id1] = match;
  activeMatches[id2] = match;
  io.to(id1).emit('start_catch', { theme, opponent: p2, timeLeft: 30 });
  io.to(id2).emit('start_catch', { theme, opponent: p1, timeLeft: 30 });
  const gameInterval = setInterval(() => {
    match.timeLeft--;
    io.to(id1).emit('catch_timer', match.timeLeft);
    io.to(id2).emit('catch_timer', match.timeLeft);
    if (match.timeLeft <= 0 || match.ended) {
      clearInterval(gameInterval);
      if (!match.ended) { match.ended = true; endMatch(id1, id2, match, false); }
    }
  }, 1000);
}

function generatePool(target) {
  let pool = [target];
  let candidates = [];
  for (let i = 1; i <= 50; i++) { if (i !== target) candidates.push(i); }
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  pool = pool.concat(candidates.slice(0, 11));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

/* ============================================================
PASS REWARDS
============================================================ */
function applyPassReward(p, tier, track, seasonId) {
  p.inventory = p.inventory || {};
  p.unlocked_items = p.unlocked_items || [];
  if (seasonId === "s2") { applyPassRewardS2(p, tier, track); return; }
  if (seasonId === "s3") { applyPassRewardS3(p, tier, track); return; }
  if (seasonId !== "s1") return;
  if (track === 'free') {
    if ([1, 3, 7, 11, 13, 16, 18, 21, 23, 26, 28].includes(tier)) {
      const coinMap = { 1: 50, 3: 50, 7: 50, 11: 60, 13: 70, 16: 80, 18: 90, 21: 110, 23: 120, 26: 130, 28: 140 };
      p.coins = (p.coins || 0) + (coinMap[tier] || 50);
    } else if ([5, 9, 20].includes(tier)) p.coins = (p.coins || 0) + 100;
    else if ([15, 25].includes(tier)) p.coins = (p.coins || 0) + 150;
    else if (tier === 29) p.coins = (p.coins || 0) + 300;
    else if (tier === 30) { p.coins = (p.coins || 0) + 500; if (!p.unlocked_items.includes('title_champion')) p.unlocked_items.push('title_champion'); }
    else if ([2, 8, 17].includes(tier)) p.inventory['spotlight'] = (p.inventory['spotlight'] || 0) + (tier === 17 ? 2 : 1);
    else if ([4, 12, 22].includes(tier)) p.inventory['freeze'] = (p.inventory['freeze'] || 0) + 1;
    else if ([6, 14, 19, 24].includes(tier)) p.inventory['joker'] = (p.inventory['joker'] || 0) + 1;
    else if (tier === 10 || tier === 27) p.inventory['nova'] = (p.inventory['nova'] || 0) + (tier === 27 ? 4 : 1);
  } else if (track === 'premium') {
    if (!p.blitzPassPremium) return;
    if (tier === 1) { if (!p.unlocked_items.includes('title_stalker')) p.unlocked_items.push('title_stalker'); }
    else if (tier === 2) p.coins = (p.coins || 0) + 100;
    else if (tier === 3) { if (!p.unlocked_items.includes('title_felin')) p.unlocked_items.push('title_felin'); }
    else if (tier === 4) { if (!p.unlocked_items.includes('frame_silver')) p.unlocked_items.push('frame_silver'); }
    else if (tier === 5) p.coins = (p.coins || 0) + 150;
    else if (tier === 6) { p.inventory['spotlight'] = (p.inventory['spotlight'] || 0) + 1; p.inventory['freeze'] = (p.inventory['freeze'] || 0) + 1; p.inventory['joker'] = (p.inventory['joker'] || 0) + 1; }
    else if (tier === 7) { if (!p.unlocked_items.includes('title_neon')) p.unlocked_items.push('title_neon'); }
    else if (tier === 8) p.inventory['nova'] = (p.inventory['nova'] || 0) + 2;
    else if (tier === 9) p.coins = (p.coins || 0) + 200;
    else if (tier === 10) { if (!p.unlocked_items.includes('theme_neon')) p.unlocked_items.push('theme_neon'); }
    else if (tier === 11) p.coins = (p.coins || 0) + 120;
    else if (tier === 12) p.inventory['spotlight'] = (p.inventory['spotlight'] || 0) + 1;
    else if (tier === 13) { if (!p.unlocked_items.includes('title_spectre')) p.unlocked_items.push('title_spectre'); }
    else if (tier === 14) p.inventory['freeze'] = (p.inventory['freeze'] || 0) + 2;
    else if (tier === 15) { if (!p.unlocked_items.includes('avatar_lottie_palier15')) p.unlocked_items.push('avatar_lottie_palier15'); }
    else if (tier === 16) p.coins = (p.coins || 0) + 160;
    else if (tier === 17) p.inventory['nova'] = (p.inventory['nova'] || 0) + 2;
    else if (tier === 18) p.coins = (p.coins || 0) + 250;
    else if (tier === 19) p.inventory['quake'] = (p.inventory['quake'] || 0) + 1;
    else if (tier === 20) { if (!p.unlocked_items.includes('frame_chroma')) p.unlocked_items.push('frame_chroma'); }
    else if (tier === 21) p.coins = (p.coins || 0) + 220;
    else if (tier === 22) p.inventory['spotlight'] = (p.inventory['spotlight'] || 0) + 3;
    else if (tier === 23) { if (!p.unlocked_items.includes('title_supreme')) p.unlocked_items.push('title_supreme'); }
    else if (tier === 24) p.coins = (p.coins || 0) + 300;
    else if (tier === 25) { if (!p.unlocked_items.includes('avatar_lottie_palier30')) p.unlocked_items.push('avatar_lottie_palier30'); }
    else if (tier === 26) p.coins = (p.coins || 0) + 260;
    else if (tier === 27) p.inventory['nova'] = (p.inventory['nova'] || 0) + 4;
    else if (tier === 28) p.coins = (p.coins || 0) + 400;
    else if (tier === 29) p.coins = (p.coins || 0) + 500;
    else if (tier === 30) { p.coins = (p.coins || 0) + 1000; if (!p.unlocked_items.includes('avatar_tigre')) p.unlocked_items.push('avatar_tigre'); }
  }
}

function applyPassRewardS2(p, tier, track) {
  if (track === 'free') {
    if ([1, 3, 7, 11, 13, 16, 18, 21, 23, 26, 28].includes(tier)) {
      const coinMap = { 1: 50, 3: 50, 7: 50, 11: 60, 13: 70, 16: 80, 18: 90, 21: 110, 23: 120, 26: 130, 28: 140 };
      p.coins = (p.coins || 0) + (coinMap[tier] || 50);
    } else if ([5, 9, 20].includes(tier)) p.coins = (p.coins || 0) + 100;
    else if ([15, 25].includes(tier)) p.coins = (p.coins || 0) + 150;
    else if (tier === 29) p.coins = (p.coins || 0) + 300;
    else if (tier === 30) { p.coins = (p.coins || 0) + 500; if (!p.unlocked_items.includes('title_esprit_halloween')) p.unlocked_items.push('title_esprit_halloween'); }
    else if ([2, 8, 17].includes(tier)) p.inventory['spotlight'] = (p.inventory['spotlight'] || 0) + (tier === 17 ? 2 : 1);
    else if ([4, 12, 22].includes(tier)) p.inventory['freeze'] = (p.inventory['freeze'] || 0) + 1;
    else if ([6, 14, 19, 24].includes(tier)) p.inventory['joker'] = (p.inventory['joker'] || 0) + 1;
    else if (tier === 10 || tier === 27) p.inventory['nova'] = (p.inventory['nova'] || 0) + (tier === 27 ? 4 : 1);
  } else if (track === 'premium') {
    if (tier === 1) { if (!p.unlocked_items.includes('title_fantome')) p.unlocked_items.push('title_fantome'); }
    else if (tier === 2) p.coins = (p.coins || 0) + 100;
    else if (tier === 3) { if (!p.unlocked_items.includes('title_danse_macabre')) p.unlocked_items.push('title_danse_macabre'); }
    else if (tier === 4) { if (!p.unlocked_items.includes('frame_osseux')) p.unlocked_items.push('frame_osseux'); }
    else if (tier === 5) p.coins = (p.coins || 0) + 150;
    else if (tier === 6) { p.inventory['spotlight'] = (p.inventory['spotlight'] || 0) + 1; p.inventory['freeze'] = (p.inventory['freeze'] || 0) + 1; p.inventory['joker'] = (p.inventory['joker'] || 0) + 1; }
    else if (tier === 7) { if (!p.unlocked_items.includes('title_citrouille')) p.unlocked_items.push('title_citrouille'); }
    else if (tier === 8) p.inventory['nova'] = (p.inventory['nova'] || 0) + 2;
    else if (tier === 9) p.coins = (p.coins || 0) + 200;
    else if (tier === 10) { if (!p.unlocked_items.includes('theme_citrouille')) p.unlocked_items.push('theme_citrouille'); }
    else if (tier === 11) p.coins = (p.coins || 0) + 120;
    else if (tier === 12) p.inventory['spotlight'] = (p.inventory['spotlight'] || 0) + 1;
    else if (tier === 13) { if (!p.unlocked_items.includes('title_spectre_automne')) p.unlocked_items.push('title_spectre_automne'); }
    else if (tier === 14) p.inventory['freeze'] = (p.inventory['freeze'] || 0) + 2;
    else if (tier === 15) { if (!p.unlocked_items.includes('avatar_s2_squelette')) p.unlocked_items.push('avatar_s2_squelette'); }
    else if (tier === 16) p.coins = (p.coins || 0) + 160;
    else if (tier === 17) p.inventory['nova'] = (p.inventory['nova'] || 0) + 2;
    else if (tier === 18) p.coins = (p.coins || 0) + 250;
    else if (tier === 19) p.inventory['quake'] = (p.inventory['quake'] || 0) + 1;
    else if (tier === 20) { if (!p.unlocked_items.includes('frame_fantome')) p.unlocked_items.push('frame_fantome'); }
    else if (tier === 21) p.coins = (p.coins || 0) + 220;
    else if (tier === 22) p.inventory['spotlight'] = (p.inventory['spotlight'] || 0) + 3;
    else if (tier === 23) p.coins = (p.coins || 0) + 350;
    else if (tier === 24) { if (!p.unlocked_items.includes('theme_fantome')) p.unlocked_items.push('theme_fantome'); }
    else if (tier === 25) { if (!p.unlocked_items.includes('avatar_s2_chauve')) p.unlocked_items.push('avatar_s2_chauve'); }
    else if (tier === 26) p.coins = (p.coins || 0) + 260;
    else if (tier === 27) p.inventory['nova'] = (p.inventory['nova'] || 0) + 4;
    else if (tier === 28) p.coins = (p.coins || 0) + 400;
    else if (tier === 29) p.coins = (p.coins || 0) + 500;
    else if (tier === 30) { p.coins = (p.coins || 0) + 1000; if (!p.unlocked_items.includes('avatar_s2_citrouille')) p.unlocked_items.push('avatar_s2_citrouille'); if (!p.unlocked_items.includes('title_roi_halloween')) p.unlocked_items.push('title_roi_halloween'); }
  }
}

function applyPassRewardS3(p, tier, track) {
  if (track === 'free') {
    if (tier === 15) { if (!p.unlocked_items.includes('avatar_s3_boule')) p.unlocked_items.push('avatar_s3_boule'); }
    else if ([1, 3, 7, 11, 13, 16, 18, 21, 23, 26, 28].includes(tier)) {
      const coinMap = { 1: 50, 3: 50, 7: 50, 11: 60, 13: 70, 16: 80, 18: 90, 21: 110, 23: 120, 26: 130, 28: 140 };
      p.coins = (p.coins || 0) + (coinMap[tier] || 50);
    } else if ([5, 9, 20].includes(tier)) p.coins = (p.coins || 0) + 100;
    else if (tier === 25) p.coins = (p.coins || 0) + 150;
    else if (tier === 29) p.coins = (p.coins || 0) + 300;
    else if (tier === 30) { p.coins = (p.coins || 0) + 500; if (!p.unlocked_items.includes('title_esprit_noel')) p.unlocked_items.push('title_esprit_noel'); }
    else if ([2, 8, 17].includes(tier)) p.inventory['spotlight'] = (p.inventory['spotlight'] || 0) + (tier === 17 ? 2 : 1);
    else if ([4, 12, 22].includes(tier)) p.inventory['freeze'] = (p.inventory['freeze'] || 0) + 1;
    else if ([6, 14, 19, 24].includes(tier)) p.inventory['joker'] = (p.inventory['joker'] || 0) + 1;
    else if (tier === 10 || tier === 27) p.inventory['nova'] = (p.inventory['nova'] || 0) + (tier === 27 ? 4 : 1);
  } else if (track === 'premium') {
    if (tier === 1) { if (!p.unlocked_items.includes('title_lutin')) p.unlocked_items.push('title_lutin'); }
    else if (tier === 2) p.coins = (p.coins || 0) + 100;
    else if (tier === 3) { if (!p.unlocked_items.includes('title_traineau')) p.unlocked_items.push('title_traineau'); }
    else if (tier === 4) { if (!p.unlocked_items.includes('frame_bonbon')) p.unlocked_items.push('frame_bonbon'); }
    else if (tier === 5) { if (!p.unlocked_items.includes('avatar_s3_bonhomme')) p.unlocked_items.push('avatar_s3_bonhomme'); }
    else if (tier === 6) { p.inventory['spotlight'] = (p.inventory['spotlight'] || 0) + 1; p.inventory['freeze'] = (p.inventory['freeze'] || 0) + 1; p.inventory['joker'] = (p.inventory['joker'] || 0) + 1; }
    else if (tier === 7) { if (!p.unlocked_items.includes('title_rennes')) p.unlocked_items.push('title_rennes'); }
    else if (tier === 8) p.inventory['nova'] = (p.inventory['nova'] || 0) + 2;
    else if (tier === 9) p.coins = (p.coins || 0) + 200;
    else if (tier === 10) { if (!p.unlocked_items.includes('theme_bonbon')) p.unlocked_items.push('theme_bonbon'); }
    else if (tier === 11) p.coins = (p.coins || 0) + 120;
    else if (tier === 12) p.inventory['spotlight'] = (p.inventory['spotlight'] || 0) + 1;
    else if (tier === 13) { if (!p.unlocked_items.includes('title_assistant_noel')) p.unlocked_items.push('title_assistant_noel'); }
    else if (tier === 14) p.inventory['freeze'] = (p.inventory['freeze'] || 0) + 2;
    else if (tier === 15) { if (!p.unlocked_items.includes('avatar_s3_boule')) p.unlocked_items.push('avatar_s3_boule'); }
    else if (tier === 16) p.coins = (p.coins || 0) + 160;
    else if (tier === 17) p.inventory['nova'] = (p.inventory['nova'] || 0) + 2;
    else if (tier === 18) p.coins = (p.coins || 0) + 250;
    else if (tier === 19) p.inventory['quake'] = (p.inventory['quake'] || 0) + 1;
    else if (tier === 20) { if (!p.unlocked_items.includes('frame_guirlande')) p.unlocked_items.push('frame_guirlande'); }
    else if (tier === 21) p.coins = (p.coins || 0) + 220;
    else if (tier === 22) p.inventory['spotlight'] = (p.inventory['spotlight'] || 0) + 3;
    else if (tier === 23) p.coins = (p.coins || 0) + 350;
    else if (tier === 24) { if (!p.unlocked_items.includes('theme_sapin')) p.unlocked_items.push('theme_sapin'); }
    else if (tier === 25) { if (!p.unlocked_items.includes('avatar_s3_perenoel')) p.unlocked_items.push('avatar_s3_perenoel'); }
    else if (tier === 26) p.coins = (p.coins || 0) + 260;
    else if (tier === 27) p.inventory['nova'] = (p.inventory['nova'] || 0) + 4;
    else if (tier === 28) { if (!p.unlocked_items.includes('title_magie_noel')) p.unlocked_items.push('title_magie_noel'); }
    else if (tier === 29) { if (!p.unlocked_items.includes('frame_lutin')) p.unlocked_items.push('frame_lutin'); }
    else if (tier === 30) { p.coins = (p.coins || 0) + 1000; if (!p.unlocked_items.includes('theme_lutin')) p.unlocked_items.push('theme_lutin'); }
  }
}

/* ============================================================
FIN DE MATCH
============================================================ */
async function endMatch(id1, id2, matchData, isRanked) {
  setTimeout(() => {
    if (activeMatches[id1] === matchData) delete activeMatches[id1];
    if (activeMatches[id2] === matchData) delete activeMatches[id2];
  }, 20000);
  let winnerId = null;
  let reason = "Temps ecoule !";
  if (matchData.isTugOfWar) {
    if (matchData.ropePosition > 0) winnerId = id1;
    else if (matchData.ropePosition < 0) winnerId = id2;
    reason = "Corde tiree entierement ! KO";
  } else {
    const s1 = matchData.players[id1] ? matchData.players[id1].score : 0;
    const s2 = matchData.players[id2] ? matchData.players[id2].score : 0;
    if (s1 > s2) winnerId = id1;
    else if (s2 > s1) winnerId = id2;
  }
  const matchRewards = {};
  for (let sId of [id1, id2]) {
    const p = activePlayers[sId];
    if (p) {
      const isWinner = (winnerId === sId);
      let baseCoins = isWinner ? 30 : 10;
      let rushBonus = globalEvents.coinRush ? baseCoins : 0;
      p.coins += baseCoins + rushBonus;
      lastMatchEarnings[sId] = baseCoins + rushBonus;
      matchRewards[sId] = { baseCoins, rushBonus, totalCoins: baseCoins + rushBonus };
      if (isWinner && globalEvents.jackpotEclair && Math.random() < 0.10) io.to(sId).emit('trigger_jackpot_wheel');
      const matchType = matchData.isRanked ? 'match_ranked' : (matchData.isTugOfWar ? 'match_tug' : (matchData.isCatch ? `match_catch_${matchData.catchTheme}` : 'match_1v1'));
      const oppId = (sId === id1) ? id2 : sId === id2 ? id1 : null;
      const oppPlayer = activePlayers[oppId];
      await logPlayerAction(p, matchType, `vs ${oppPlayer ? oppPlayer.username : 'unknown'} (${isWinner ? 'WIN' : 'LOSS'})`, 'coins', baseCoins + rushBonus, p.coins);
    }
  }
  if (isRanked && !matchData.isTugOfWar) {
    const p1 = activePlayers[id1];
    const p2 = activePlayers[id2];
    if (p1 && p2) {
      if (winnerId === id1) { p1.wins = (p1.wins || 0) + 1; p1.points = (p1.points || 0) + 25; p2.losses = (p2.losses || 0) + 1; if (!globalEvents.rankShield) p2.points = Math.max(0, (p2.points || 0) - 15); }
      else if (winnerId === id2) { p2.wins = (p2.wins || 0) + 1; p2.points = (p2.points || 0) + 25; p1.losses = (p1.losses || 0) + 1; if (!globalEvents.rankShield) p1.points = Math.max(0, (p1.points || 0) - 15); }
    }
  }
  if (matchData.isCatch && !matchData.isTugOfWar) {
    const p1 = activePlayers[id1];
    const p2 = activePlayers[id2];
    if (p1 && p2) {
      if (winnerId === id1) { p1.wins = (p1.wins || 0) + 1; p2.losses = (p2.losses || 0) + 1; }
      else if (winnerId === id2) { p2.wins = (p2.wins || 0) + 1; p1.losses = (p1.losses || 0) + 1; }
    }
  }
  for (let sId of [id1, id2]) {
    const p = activePlayers[sId];
    if (!p) continue;
    p.matches_played = (p.matches_played || 0) + 1;
    const isWinner = (winnerId === sId);
    if (isWinner) { p.win_streak = (p.win_streak || 0) + 1; } else { p.win_streak = 0; }
    const unlockedTrophies = evaluateTrophies(p);
    if (unlockedTrophies.length > 0) io.to(sId).emit('trophy_unlocked', unlockedTrophies.map(t => ({ id: Object.keys(TROPHY_CATALOG).find(k => TROPHY_CATALOG[k] === t), ...t })));
  }
  await savePlayerToSupabase(id1);
  await savePlayerToSupabase(id2);
  if (activePlayers[id1]) io.to(id1).emit('player_registered', activePlayers[id1]);
  if (activePlayers[id2]) io.to(id2).emit('player_registered', activePlayers[id2]);
    // Vérifier si maintenance active → kicker après envoi des résultats
  for (let sId of [id1, id2]) {
    const socket = io.sockets.sockets.get(sId);
    if (socket && socket._kickAfterMatch && maintBlocked(socket)) {
      setTimeout(() => {
        socket.emit('maintenance_kick', { 
          message: maintenanceState.message,
          afterMatch: true 
        });
        socket.disconnect(true);
      }, 10000); // ⬅️ 10 secondes pour voir les résultats
    }
  }
  io.to(id1).emit('game_over_1v1', { winnerId, reason, players: matchData.players, globalEvents, rewards: matchRewards, isRanked, isCatch: !!matchData.isCatch });
  io.to(id2).emit('game_over_1v1', { winnerId, reason, players: matchData.players, globalEvents, rewards: matchRewards, isRanked, isCatch: !!matchData.isCatch });
}

const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));

const IAP_PACKS = {
  blitz_pass_premium: { type: 'pass' },
  pack_vies_1:        { type: 'lives',  lives: 10 },
  pack_jokers_2:      { type: 'jokers', jTime: 2, jShield: 2 },
  pack_mixte_3:       { type: 'mixed',  lives: 5,  jTime: 2, jShield: 2 },
  pack_blitz_5:       { type: 'mixed',  lives: 10, jTime: 5, jShield: 5 }
};
const LIFE_RESERVE_MAX = 30;

app.post('/api/iap_grant', async (req, res) => {
  try {
    console.log('[iap_grant] reçu → body:', JSON.stringify(req.body || null), '| query:', JSON.stringify(req.query || null));
    const src = (req.body && (req.body.pseudo || req.body.sku || req.body.token)) ? req.body : (req.query || {});
    const pseudo = src.pseudo, sku = src.sku, token = src.token;
    if (!pseudo || !sku || !token) return res.json({ ok: false, reason: 'params' });
    const pack = IAP_PACKS[sku];
    if (!pack) return res.json({ ok: false, reason: 'unknown_sku' });
    const { data: existing } = await supabase.from('iap_receipts').select('id').eq('token', token).maybeSingle();
    if (existing) return res.json({ ok: true, already: true });
    let targetId = null;
    for (const sId in activePlayers) {
      if (activePlayers[sId].username && activePlayers[sId].username.toLowerCase() === String(pseudo).toLowerCase()) { targetId = sId; break; }
    }
    let player = targetId ? activePlayers[targetId] : null;
    let row = null;
    if (!player) {
      const { data, error } = await supabase.from('players').select('*').ilike('username', String(pseudo)).limit(1);
      if (error || !data || !data.length) return res.json({ ok: false, reason: 'not_found' });
      row = data[0];
    }
    const seasonId = getCurrentSeason().id;
    const apply = (p, isOnline) => {
      if (pack.type === 'pass') {
        p.claimedPassTiers = p.claimedPassTiers || {};
        p.claimedPassTiers[seasonId] = p.claimedPassTiers[seasonId] || {};
        p.claimedPassTiers[seasonId].premium = true;
        if (isOnline) p.blitzPassPremium = true;
        else if (row) row.blitz_pass_premium = true;
        } else if (pack.type === 'jokers') {
        if (isOnline) {
          p.jokers = normalizeJokers(p.jokers);
          p.jokers.time += pack.jTime;
          p.jokers.shield += pack.jShield;
        } else if (row) {
          let j = row.tower_jokers || { time: 0, shield: 0 };
          if (typeof j === 'string') { try { j = JSON.parse(j); } catch (e) { j = { time: 0, shield: 0 }; } }
          j = normalizeJokers(j);
          j.time += pack.jTime;
          j.shield += pack.jShield;
          row.tower_jokers = j;
        }
      } else {
        const cur = isOnline
          ? (p.lives === undefined ? TOWER_MAX_LIVES : p.lives)
          : (row.tower_lives !== undefined && row.tower_lives !== null ? row.tower_lives : TOWER_MAX_LIVES);
        const newLives = Math.min(LIFE_RESERVE_MAX, cur + (pack.lives || 0));
        if (isOnline) { p.lives = newLives; if (newLives >= TOWER_MAX_LIVES) p.lives_ts = Date.now(); }
        else if (row) { row.tower_lives = newLives; if (newLives >= TOWER_MAX_LIVES) row.tower_lives_ts = Date.now(); }
        if (pack.type === 'mixed') {
          if (isOnline) {
            p.jokers = normalizeJokers(p.jokers);
            p.jokers.time += pack.jTime;
            p.jokers.shield += pack.jShield;
          } else if (row) {
            let j = row.tower_jokers || { time: 0, shield: 0 };
            if (typeof j === 'string') { try { j = JSON.parse(j); } catch (e) { j = { time: 0, shield: 0 }; } }
            j = normalizeJokers(j);
            j.time += pack.jTime;
            j.shield += pack.jShield;
            row.tower_jokers = j;
          }
        }
      }
    };
    if (player) apply(player, true);
    else if (row) apply(row, false);
    if (targetId) {
      await savePlayerToSupabase(targetId);
      io.to(targetId).emit('player_registered', player);
    } else if (row) {
      await supabase.from('players').update({
        blitz_pass_premium: row.blitz_pass_premium,
        claimed_pass_tiers: row.claimed_pass_tiers,
        tower_lives: row.tower_lives,
        tower_lives_ts: row.tower_lives_ts,
        tower_jokers: row.tower_jokers
      }).eq('id', row.id);
    }
    await supabase.from('iap_receipts').insert([{ username: String(pseudo), sku, token }]);
    await logPlayerAction(player || { username: String(pseudo), socketId: null },
      'iap_grant', `SKU: ${sku} (token: ${String(token).substring(0, 16)}...)`, null, null, null);
    console.log('[iap_grant] ✅ OK pour', pseudo, sku);
    res.json({ ok: true });
  } catch (e) {
    console.error('[iap_grant] erreur:', e);
    res.json({ ok: false, reason: 'server_error' });
  }
});

server.listen(PORT, () => {
  loadMaintenance();
console.log('Serveur Chiffre Blitz demarre sur le port ' + PORT);
});
