/* ============================================================
PROFIL.JS — GESTION PROFIL, COMPTE & PERSONNALISATION
============================================================ */

/* ============================================================
1. CONSTANTES
============================================================ */
const CONFIG = {
SERVER_URL: (location.hostname.endsWith('.onrender.com') || location.hostname === 'localhost') ? location.origin : "https://chiffre-blitz-server.onrender.com",
  MIN_PSEUDO_LENGTH: 3,
  MIN_CODE_LENGTH: 8,
  MAX_AVATAR_NUM: 999,
  RECONNECTION_ATTEMPTS: 10,
  RECONNECTION_DELAY_MS: 1000,
  EMOTE_COOLDOWN_MS: 300,
  TWEEN_DURATION_MS: 900,
  DELTA_DISPLAY_MS: 1600,
  TOAST_DURATION_MS: 4500,
  LOGO_CLICK_TIMEOUT_MS: 5000,
  LOGO_CLICK_COUNT: 10
};

const RANKS = [
  { min: 1300, fr: "Calculateur ⚡", en: "Calculator ⚡" },
  { min: 700, fr: "Expert 🧠", en: "Expert 🧠" },
  { min: 300, fr: "Chiffre 🔢", en: "Cipher 🔢" },
  { min: 0, fr: "Novice 🌱", en: "Novice 🌱" }
];

const FRAME_CLASS_MAP = {
  frame_standard: "standard-frame",
  frame_silver: "silver-frame",
  frame_chroma: "chroma-frame",
  frame_prism: "prism-frame",
  frame_voltage: "voltage-frame",
  frame_obsidian: "obsidian-frame",
  frame_givre: "givre-frame",
  frame_osseux: "osseux-frame",
  frame_fantome: "fantome-frame",
  frame_bonbon: "bonbon-frame",
  frame_guirlande: "guirlande-frame",
  frame_lutin: "lutin-frame"
};

const EMOTES = ["\u{1F525}", "\u26A1", "\u{1F916}", "\u{1F480}", "\u{1F602}", "\u{1F451}"];

/* ============================================================
2. CONNEXION SERVEUR
============================================================ */
if (!CONFIG.SERVER_URL || CONFIG.SERVER_URL.indexOf("chiffre-blitz.fr") !== -1) {
  CONFIG.SERVER_URL = "https://chiffre-blitz-server.onrender.com";
}
const socket = io(CONFIG.SERVER_URL, {
  reconnection: true,
  reconnectionAttempts: CONFIG.RECONNECTION_ATTEMPTS,
  reconnectionDelay: CONFIG.RECONNECTION_DELAY_MS,
  query: { v: typeof VERSION_CLIENT !== 'undefined' ? VERSION_CLIENT.version : "1.3.0" },
  auth: { maintCode: localStorage.getItem('cb_maint_code') || "" }
});
socket.on("disconnect", () => { SoundEngine.stopMusic(true); });

socket.on("connect", () => {
  if (localStorage.getItem('cb_secret')) registerIfPossible();
  const urlParams = new URLSearchParams(window.location.search);
  const targetRoom = urlParams.get("room");
  if (targetRoom && isProfileValid()) {
    setTimeout(() => { joinRoomDirect(targetRoom.toUpperCase(), ""); }, 500);
  }
});

// 🛡️ Écoute force_disconnect : retour à la fenêtre de connexion
function attachForceDisconnect() {
  if (typeof socket !== 'undefined' && socket && socket.on) {
    socket.on('force_disconnect', (data) => {
      const toast = document.createElement('div');
      toast.style.cssText = `
        position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
        background: linear-gradient(135deg, #ff416c, #ff4b2b);
        color: white; padding: 12px 20px; border-radius: 12px;
        font-weight: bold; font-size: 14px; z-index: 9999; text-align: center;
        box-shadow: 0 4px 20px rgba(255,75,43,0.5);
        animation: slideDown 0.3s ease-out;
      `;
      toast.innerHTML = `⚠️ ${data.reason}<br><small style="opacity:0.8;">Retour à la connexion...</small>`;
      document.body.appendChild(toast);

      const name = (document.getElementById('user-name-display')?.innerText || '').trim();
      Object.keys(localStorage).forEach(k => {
        const v = localStorage.getItem(k) || '';
        const kl = k.toLowerCase();
        const isProfileKey = /profile|user|login|secret|code|pass|pseudo|player|account|session|blitz|cb_/.test(kl);
        if (isProfileKey || (name && name !== 'Définir pseudo' && v.includes(name))) {
          localStorage.removeItem(k);
        }
      });
      sessionStorage.clear();
      localStorage.setItem('cb_kicked', '1');
      setTimeout(() => location.reload(), 1500);
    });
    console.log('✅ Écouteur anti double-compte activé');
  } else {
    setTimeout(attachForceDisconnect, 100);
  }
}
attachForceDisconnect();

window.addEventListener('load', () => {
  window.__kicked = false;
  if (localStorage.getItem('cb_kicked')) {
    localStorage.removeItem('cb_kicked');
    setTimeout(() => {
      if (typeof openLaunchAdModal === 'function') openLaunchAdModal();
    }, 600);
  }
});

/* ============================================================
3. ÉTAT GLOBAL
============================================================ */
let myProfile = {
  username: localStorage.getItem("cb_username") || "",
  region: localStorage.getItem("cb_region") || "Hauts-de-France",
  avatar: parseInt(localStorage.getItem("cb_avatar")) || 1,
  flag: localStorage.getItem("cb_flag") || "🇫🇷",
  secretCode: localStorage.getItem('cb_secret') || '',
  points: 0, coins: 0, trophies: 0, wins: 0, losses: 0,
  inventory: {
    __equipped: {
      title: localStorage.getItem("cb_equipped_title") || "",
      frame: localStorage.getItem("cb_equipped_frame") || "",
      theme: localStorage.getItem("cb_equipped_theme") || ""
    }
  },
  unlocked_items: [],
  equippedPower: null,
  equippedPowers: [],
  blitzPassPremium: false,
  claimedPassTiers: {},
  currentSeasonId: "s1"
};

let cachedOpponent = null;
let pendingProfileValidation = false;
let pendingAccountLogin = false;
let pendingCustomization = false;
let adCallbackFunction = null;
let recapActive = false;
let launchAdWatched = false;
let selectedRankedItems = [];
let latestGlobalEvents = {};
let latest1v1StartData = null;
let pendingGameOverData = null;
let activeAvatarChoice = "standard";
let currentFriendFilter = "all";
let myGameInvites = [];
let lastEmoteTime = 0;
let lastDisplayed = { coins: null, trophies: null, points: null };
let profileMode = "create";

window.lastRequestsCount = 0;

const POWERS_CATALOG = [
  { id: "spotlight", price: 300, type: "bonus" },
  { id: "freeze", price: 700, type: "bonus" },
  { id: "joker", price: 1200, type: "bonus" },
  { id: "nova", price: 2500, type: "bonus" },
  { id: "quake", price: 400, type: "malus" },
  { id: "micro", price: 800, type: "malus" },
  { id: "eclipse", price: 1500, type: "malus" },
  { id: "chaos", price: 4000, type: "malus" },
  { id: "theme_glacial", price: 1200, type: "cosmetics" },
  { id: "frame_voltage", price: 2200, type: "cosmetics" },
  { id: "frame_obsidian", price: 4500, type: "cosmetics" },
  { id: "theme_eclair", price: 1500, type: "cosmetics" },
  { id: "frame_givre", price: 2200, type: "cosmetics" },
  { id: "theme_alt", price: 1800, type: "cosmetics" },
  { id: "frame_prism", price: 2600, type: "cosmetics" },
  { id: "theme_obsidian", price: 1800, type: "cosmetics" },
  { id: "pack_haute_tension", price: 2900, type: "packs" },
  { id: "pack_cryo", price: 2700, type: "packs" },
  { id: "pack_solaire", price: 3200, type: "packs" },
  { id: "pack_obsidienne", price: 5200, type: "packs" }
];

const PACKS_LIST = [
  { id: "pack_standard", name: "🔰 Standard", theme: "", frame: "frame_standard" },
  { id: "pack_haute_tension", name: "⚡ Haute Tension", theme: "theme_eclair", frame: "frame_voltage" },
  { id: "pack_cryo", name: "🧊 Cryo", theme: "theme_glacial", frame: "frame_givre" },
  { id: "pack_solaire", name: "✨ Doré", theme: "theme_alt", frame: "frame_prism" },
  { id: "pack_obsidienne", name: "🖤 Obsidienne", theme: "theme_obsidian", frame: "frame_obsidian" },
  { id: "pack_neon", name: "🌈 Néon", theme: "theme_neon", frame: "frame_chroma" },
  { id: "pack_halloween_citrouille", name: "🎃 Pack Lanterne", theme: "theme_citrouille", frame: "frame_osseux" },
  { id: "pack_halloween_fantome", name: "👻 Pack Fantôme", theme: "theme_fantome", frame: "frame_fantome" },
  { id: "pack_noel_bonbon", name: "🍭 Pack Bonbon", theme: "theme_bonbon", frame: "frame_bonbon" },
  { id: "pack_noel_sapin", name: "🎄 Pack Sapin", theme: "theme_sapin", frame: "frame_guirlande" },
  { id: "pack_noel_lutin", name: "🧝 Pack Lutin", theme: "theme_lutin", frame: "frame_lutin" }
];

/* ============================================================
4. HELPERS PROFIL
============================================================ */
function getPlayerTimezone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris'; }
  catch (e) { return 'Europe/Paris'; }
}
function getFlagEmoji(flag) {
  if (!flag) return "🇫🇷";
  let cleanFlag = flag.replace(/['"]/g, "").trim();
  if (cleanFlag.length === 2) {
    try {
      const codePoints = cleanFlag.toUpperCase().split("").map(char => 127397 + char.charCodeAt(0));
      return String.fromCodePoint(...codePoints);
    } catch (e) {
      return "🇫🇷";
    }
  }
  return cleanFlag;
}

function parsePlayer(p) {
  if (!p) return {};
  return {
    id: p.id || "",
    username: p.username || p.name || p.pseudo || "Joueur",
    region: p.region || "Hauts-de-France",
    points: Number(p.points !== undefined ? p.points : 0),
    coins: Number(p.coins !== undefined ? p.coins : 0),
    trophies: Number(p.trophies !== undefined ? p.trophies : 0),
    wins: Number(p.wins !== undefined ? p.wins : 0),
    losses: Number(p.losses !== undefined ? p.losses : 0),
    avatar: Number(p.avatar !== undefined ? p.avatar : 1),
    flag: getFlagEmoji(p.flag),
    inventory: p.inventory || {},
    unlocked_items: p.unlocked_items || [],
    equippedPower: p.equippedPower || p.equipped_power || null,
    blitzPassPremium: p.blitzPassPremium || false,
    claimedPassTiers: p.claimedPassTiers || {}
  };
}

function getRankName(points) {
  const lang = currentLang === "fr" ? "fr" : "en";
  for (const rank of RANKS) {
    if (points >= rank.min) return rank[lang];
  }
  return RANKS[RANKS.length - 1][lang];
}

function getFrameClass(equippedFrame) {
  return FRAME_CLASS_MAP[equippedFrame] || "";
}

function isStrongCode(code) {
  if (!code || code.length < CONFIG.MIN_CODE_LENGTH) return false;
  const hasLower = /[a-z]/.test(code);
  const hasUpper = /[A-Z]/.test(code);
  const hasDigit = /\d/.test(code);
  const hasSpecial = /[!@#$%&*+\-_=]/.test(code);
  return hasLower && hasUpper && hasDigit && hasSpecial;
}

/* ============================================================
5. NOMS D'AFFICHAGE TRADUITS
============================================================ */
function getAvatarDisplayNames() {
  const fr = currentLang === "fr";
  return {
    avatar_lottie_palier15: fr ? "🐱 Chat Assistant (Pass S1)" : "🐱 Assistant Cat (Pass S1)",
    avatar_lottie_palier30: fr ? "🌈 Chat Arc-en-ciel (Pass S1)" : "🌈 Rainbow Cat (Pass S1)",
    avatar_tigre: fr ? "🐯 Tigre de Sibérie (GRAAL S1)" : "🐯 Siberian Tiger (GRAAL S1)",
    avatar_s2_squelette: fr ? "💀 Squelette qui danse (Pass S2)" : "💀 Dancing Skeleton (Pass S2)",
    avatar_s2_chauve: fr ? "🦇 Chauve-Souris (Pass S2)" : "🦇 Bat (Pass S2)",
    avatar_s2_citrouille: fr ? "🎃 Citrouille du Château (GRAAL S2)" : "🎃 Castle Pumpkin (GRAAL S2)",
    avatar_s3_bonhomme: fr ? "⛄ Bonhomme de neige (Pass S3)" : "⛄ Snowman (Pass S3)",
    avatar_s3_boule: fr ? "🔮 Boule de neige (Pass S3)" : "🔮 Snowball (Pass S3)",
    avatar_s3_perenoel: fr ? "🎅 Père Noël (Pass S3)" : "🎅 Santa Claus (Pass S3)"
  };
}

function getTitleDisplayNames() {
  const fr = currentLang === "fr";
  const d = i18n[currentLang];
  return {
    title_stalker: "🕵️ " + (fr ? "Stalker Numérique" : "Digital Stalker"),
    title_felin: "🐱 " + (fr ? "Réflexe Félin" : "Feline Reflex"),
    title_neon: "🌈 " + (fr ? "Pulsion Néon" : "Neon Pulse"),
    title_spectre: "🌌 " + (fr ? "Spectre Cosmique" : "Cosmic Specter"),
    title_supreme: "⚡ " + (fr ? "FÉLIN SUPRÊME" : "SUPREME FELINE"),
    title_champion: "🏅 " + (fr ? "Champion Éclair" : "Lightning Champion"),
    title_combattant: "🎖️ " + d.trophy_name_combatant,
    title_elite: "🏵️ " + d.trophy_name_elite,
    title_eveille: "⚡ " + d.trophy_name_awakening,
    title_flamme: "🔥 " + d.trophy_name_furnace,
    title_parfait: "💎 " + d.trophy_name_perfection,
    title_vainqueur: "⚔️ " + (fr ? "Vainqueur" : "Victor"),
    title_inarrettable: "🔥 " + d.trophy_name_unstoppable,
    title_gladiateur: "🛡️ " + d.trophy_name_gladiator,
    title_champion_trophy: "👑 " + d.trophy_name_champion,
    title_maitre_avalanche: "🎯 " + d.trophy_name_avalanche_master,
    title_travailleur: "⛏️ " + d.trophy_name_worker,
    title_etoile: "⭐ " + d.trophy_name_rising_star,
    title_roi_local: "🏰 " + d.trophy_name_local_king,
    title_midas: "💰 " + d.trophy_name_midas,
    title_dynastie: "🏛️ " + d.trophy_name_dynasty,
    title_mondial: "🌍 " + d.trophy_name_world_n1,
    title_fantome: "👻 " + (fr ? "Chuchoteur de Fantômes" : "Ghost Whisperer"),
    title_danse_macabre: "🦴 " + (fr ? "Danse Macabre" : "Macabre Dance"),
    title_citrouille: "🎃 " + (fr ? "Pulsion Citrouille" : "Pumpkin Pulse"),
    title_spectre_automne: "🍂 " + (fr ? "Spectre d'Automne" : "Autumn Specter"),
    title_roi_halloween: "🎃 " + (fr ? "ROI D'HALLOWEEN" : "KING OF HALLOWEEN"),
    title_esprit_halloween: "👻 " + (fr ? "Esprit d'Halloween" : "Halloween Spirit"),
    title_lutin: "🧝 " + (fr ? "Lutin espiègle" : "Mischievous Elf"),
    title_traineau: "🛷 " + (fr ? "Pilote de traîneau" : "Sleigh Pilot"),
    title_rennes: "🦌 " + (fr ? "Dompteur de rennes" : "Reindeer Tamer"),
    title_assistant_noel: "🎅 " + (fr ? "Assistant du Père Noël" : "Santa's Assistant"),
    title_magie_noel: "✨ " + (fr ? "Magie de Noël" : "Christmas Magic"),
    title_esprit_noel: "🎄 " + (fr ? "Esprit de Noël" : "Christmas Spirit"),
    title_grimpeur_neon: "🧗 " + (fr ? "Grimpeur Néon" : "Neon Climber"),
    title_chasseur_hante: "👻 " + (fr ? "Chasseur Hanté" : "Haunted Hunter"),
    title_roi_citrouille_tour: "🎃 " + (fr ? "Roi Citrouille" : "Pumpkin King"),
    title_veilleur_cimes: "🗼 " + (fr ? "Veilleur des Cimes" : "Summit Watcher"),
    title_maitre_tour: "🏆 " + (fr ? "Maître de la Tour" : "Tower Master")
  };
}

function getFrameDisplayNames() {
  const fr = currentLang === "fr";
  return {
    frame_standard: "🔰 " + (fr ? "Cadre « Standard »" : "Frame « Standard »"),
    frame_silver: "🛡️ " + (fr ? "Cadre « Argenté »" : "Frame « Silver »"),
    frame_chroma: "🌈 " + (fr ? "Cadre « Flux Chroma »" : "Frame « Chroma Flow »"),
    frame_prism: "✨ " + (fr ? "Cadre « Doré »" : "Frame « Gold »"),
    frame_voltage: "⚡ " + (fr ? "Cadre « Sous Tension »" : "Frame « Voltage »"),
    frame_obsidian: "🖤 " + (fr ? "Cadre « Obsidienne »" : "Frame « Obsidian »"),
    frame_givre: "🧊 " + (fr ? "Cadre « Givre »" : "Frame « Frost »"),
    frame_osseux: "🎃 " + (fr ? "Cadre « Lanterne »" : "Frame « Lantern »"),
    frame_fantome: "👻 " + (fr ? "Cadre « Fantôme »" : "Frame « Ghost »"),
    frame_bonbon: "🍭 " + (fr ? "Cadre « Bonbon »" : "Frame « Candy »"),
    frame_guirlande: "🎄 " + (fr ? "Cadre « Guirlande »" : "Frame « Garland »"),
    frame_lutin: "🧝 " + (fr ? "Cadre « Lutin »" : "Frame « Elf »"),
    frame_cristal: "💎 " + (fr ? "Cadre Cristal" : "Crystal Frame"),
    frame_circuit: "🔌 " + (fr ? "Cadre Circuit" : "Circuit Frame"),
    frame_toile: "🕸️ " + (fr ? "Cadre Toile" : "Web Frame"),
    frame_aurore: "🌅 " + (fr ? "Cadre Aurore" : "Aurora Frame")
  };
}

function getThemeDisplayNames() {
  const fr = currentLang === "fr";
  return {
    theme_alt: "🎨 " + (fr ? "Thème de Grille Rétro / Doré" : "Retro / Gold Grid Theme"),
    theme_glacial: "🧊 " + (fr ? "Thème de Grille Cryo" : "Cryo Grid Theme"),
    theme_eclair: "⚡ " + (fr ? "Thème de Grille Éclair" : "Lightning Grid Theme"),
    theme_neon: "🌈 " + (fr ? "Thème de Grille Néon Synthwave" : "Neon Synthwave Grid Theme"),
    theme_obsidian: "🖤 " + (fr ? "Thème de Grille Obsidienne" : "Obsidian Grid Theme"),
    theme_citrouille: "🎃 " + (fr ? "Thème de Grille Lanterne" : "Lantern Grid Theme"),
    theme_fantome: "👻 " + (fr ? "Thème de Grille Fantôme" : "Ghost Grid Theme"),
    theme_bonbon: "🍭 " + (fr ? "Thème de Grille Bonbon Canne" : "Candy Cane Grid Theme"),
    theme_sapin: "🎄 " + (fr ? "Thème de Grille Sapin de Noël" : "Christmas Tree Grid Theme"),
    theme_lutin: "🧝 " + (fr ? "Thème de Grille Lutin" : "Elf Grid Theme")
  };
}

function getPackDisplayNames() {
  const fr = currentLang === "fr";
  return {
    pack_standard: "🔰 " + (fr ? "Standard" : "Standard"),
    pack_haute_tension: "⚡ " + (fr ? "Haute Tension" : "High Voltage"),
    pack_cryo: "🧊 " + (fr ? "Cryo" : "Cryo"),
    pack_solaire: "✨ " + (fr ? "Doré" : "Gold"),
    pack_obsidienne: "🖤 " + (fr ? "Obsidienne" : "Obsidian"),
    pack_neon: "🌈 " + (fr ? "Néon" : "Neon"),
    pack_halloween_citrouille: "🎃 " + (fr ? "Pack Lanterne" : "Lantern Pack"),
    pack_halloween_fantome: "👻 " + (fr ? "Pack Fantôme" : "Ghost Pack"),
    pack_noel_bonbon: "🍭 " + (fr ? "Pack Bonbon" : "Candy Pack"),
    pack_noel_sapin: "🎄 " + (fr ? "Pack Sapin" : "Tree Pack"),
    pack_noel_lutin: "🧝 " + (fr ? "Pack Lutin" : "Elf Pack")
  };
}

/* ============================================================
6. AVATARS (badge HTML, zoom, preview, Lottie)
============================================================ */
function getAvatarBadgeHTML(flag, avatarNum, overrideAvatarType, playerObj) {
  const profile = playerObj || myProfile;
  const equippedAvatar = overrideAvatarType || (profile.inventory && profile.inventory.__equipped && profile.inventory.__equipped.avatar);
  const equippedFrame = profile.inventory && profile.inventory.__equipped && profile.inventory.__equipped.frame;
  
  if (!playerObj) {
    const pill = document.getElementById("user-pill");
    if (pill) {
      pill.classList.remove("silver-frame", "chroma-frame", "prism-frame", "voltage-frame", "obsidian-frame", "givre-frame", "osseux-frame", "fantome-frame");
      const frameClass = getFrameClass(equippedFrame);
      if (frameClass) pill.classList.add(frameClass);
    }
  }
  
  const ADN = getAvatarDisplayNames();
  let avatarContent = avatarNum || 1;
  let avatarTitle = `Avatar #${avatarNum || 1}`;
  
  const avatarMap = {
    avatar_lottie_palier30: { title: ADN.avatar_lottie_palier30, html: `<div class="lottie-avatar-badge" data-lottie-url="black-rainbow-cat.json" style="width:32px; height:32px;"></div>` },
    avatar_lottie_palier15: { title: ADN.avatar_lottie_palier15, html: `<div class="lottie-avatar-badge" data-lottie-url="cat-assistant.json" style="width:32px; height:32px;"></div>` },
    avatar_tigre: { title: ADN.avatar_tigre, html: `<video class="tft-avatar-video" src="tiger-siberien.mp4" autoplay loop muted playsinline></video>` },
    avatar_s2_squelette: { title: ADN.avatar_s2_squelette, html: `<div class="lottie-avatar-badge" data-lottie-url="squelette-danse.json" style="width:32px; height:32px;"></div>` },
    avatar_s2_chauve: { title: ADN.avatar_s2_chauve, html: `<video class="tft-avatar-video" src="bat-halloween.mp4" autoplay loop muted playsinline></video>` },
    avatar_s2_citrouille: { title: ADN.avatar_s2_citrouille, html: `<div class="lottie-avatar-badge" data-lottie-url="citrouille-chateau.json" style="width:32px; height:32px;"></div>` },
    avatar_s3_bonhomme: { html: `<div class="lottie-avatar-badge" data-lottie-url="bonhomme-de-neige-avatar.json" style="width:40px; height:40px;"></div>` },
    avatar_s3_boule: { html: `<div class="lottie-avatar-badge" data-lottie-url="boule-de-neige-avatar.json" style="width:40px; height:40px;"></div>` },
    avatar_s3_perenoel: { html: `<div class="lottie-avatar-badge" data-lottie-url="pere-noel-avatar.json" style="width:40px; height:40px;"></div>` }
  };
  
  if (avatarMap[equippedAvatar]) {
    avatarTitle = avatarMap[equippedAvatar].title || avatarTitle;
    avatarContent = avatarMap[equippedAvatar].html;
  }
  
  const frameClass = getFrameClass(equippedFrame);
  const html = `
    <div class="tft-avatar-container ${frameClass}" title="${avatarTitle}">
      <span class="tft-avatar-icon" style="display:flex; align-items:center; justify-content:center; width:100%; height:100%; ${typeof avatarContent === "number" ? "font-size:14px;" : ""}">${avatarContent}</span>
      <span class="tft-flag-overlay">${flag || "🇫🇷"}</span>
    </div>`;
  
  setTimeout(() => initAllLottieBadges(), 50);
  return html;
}

function getLargeAvatarBadgeHTML(flag, avatarNum, overrideAvatarType) {
  const avatarType = overrideAvatarType || activeAvatarChoice || (myProfile.inventory && myProfile.inventory.__equipped && myProfile.inventory.__equipped.avatar);
  const equippedFrame = myProfile.inventory && myProfile.inventory.__equipped && myProfile.inventory.__equipped.frame;
  const frameClass = getFrameClass(equippedFrame);
  
  let avatarContent = avatarNum || 1;
  
  const avatarMap = {
    avatar_lottie_palier30: `<div class="lottie-avatar-large" data-lottie-url="black-rainbow-cat.json" style="width:60px; height:60px;"></div>`,
    avatar_lottie_palier15: `<div class="lottie-avatar-large" data-lottie-url="cat-assistant.json" style="width:60px; height:60px;"></div>`,
    avatar_tigre: `<video class="tft-avatar-video" src="tiger-siberien.mp4" autoplay loop muted playsinline style="width:60px; height:60px;"></video>`,
    avatar_s2_squelette: `<div class="lottie-avatar-large" data-lottie-url="squelette-danse.json" style="width:60px; height:60px;"></div>`,
    avatar_s2_chauve: `<video class="tft-avatar-video" src="bat-halloween.mp4" autoplay loop muted playsinline style="width:60px; height:60px;"></video>`,
    avatar_s2_citrouille: `<div class="lottie-avatar-large" data-lottie-url="citrouille-chateau.json" style="width:60px; height:60px;"></div>`,
    avatar_s3_bonhomme: `<div class="lottie-avatar-large" data-lottie-url="bonhomme-de-neige-avatar.json" style="width:74px; height:74px;"></div>`,
    avatar_s3_boule: `<div class="lottie-avatar-large" data-lottie-url="boule-de-neige-avatar.json" style="width:74px; height:74px;"></div>`,
    avatar_s3_perenoel: `<div class="lottie-avatar-large" data-lottie-url="pere-noel-avatar.json" style="width:74px; height:74px;"></div>`
  };
  
  if (avatarMap[avatarType]) avatarContent = avatarMap[avatarType];
  
  const html = `
    <div class="tft-avatar-large ${frameClass}">
      <span class="tft-avatar-large-icon" style="display:flex; align-items:center; justify-content:center; width:100%; height:100%; ${typeof avatarContent === "number" ? "font-size:24px;" : ""}">${avatarContent}</span>
      <span class="tft-flag-large-overlay">${flag || "🇫"}</span>
    </div>`;
  
  setTimeout(() => initAllLottieBadges(), 50);
  return html;
}

function initAllLottieBadges() {
  if (typeof lottie === "undefined") return;
  document.querySelectorAll(".lottie-avatar-badge, .lottie-avatar-large").forEach(el => {
    if (el.getAttribute("data-lottie-loaded")) return;
    const url = el.getAttribute("data-lottie-url");
    if (url) {
      el.setAttribute("data-lottie-loaded", "true");
      el.innerHTML = "";
      try {
        lottie.loadAnimation({
          container: el,
          renderer: "svg",
          loop: true,
          autoplay: true,
          path: url,
          rendererSettings: { preserveAspectRatio: "xMidYMid slice" }
        });
      } catch (e) {}
    }
  });
}

function updateProfilePreview() {
  const avatarNum = parseInt(document.getElementById("avatar-input").value) || 1;
  const rawFlag = document.getElementById("flag-input").value;
  const flag = getFlagEmoji(rawFlag);
  const previewContainer = document.getElementById("modal-avatar-preview");
  if (previewContainer) {
    previewContainer.innerHTML = getLargeAvatarBadgeHTML(flag, avatarNum, activeAvatarChoice);
    previewContainer.style.cursor = "zoom-in";
    previewContainer.onclick = showAvatarZoom;
  }
}

function showAvatarZoom() {
  let overlay = document.getElementById("avatar-zoom-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "avatar-zoom-overlay";
    overlay.className = "modal-overlay";
    overlay.style.background = "rgba(0,0,0,0.88)";
    overlay.onclick = () => { overlay.style.display = "none"; };
    overlay.innerHTML = `
      <div style="text-align:center;">
        <div id="avatar-zoom-content" style="transform:scale(2.1); pointer-events:none;"></div>
        <div style="margin-top:90px; font-size:11px; color:#aaa; font-weight:bold;">🔍 Touche pour fermer</div>
      </div>`;
    document.body.appendChild(overlay);
  }
  const preview = document.getElementById("modal-avatar-preview");
  const content = document.getElementById("avatar-zoom-content");
  content.innerHTML = preview ? preview.innerHTML : "";
  content.querySelectorAll("[data-lottie-loaded]").forEach(el => el.removeAttribute("data-lottie-loaded"));
  overlay.style.display = "flex";
  setTimeout(() => initAllLottieBadges(), 50);
}

function renderProfileAvatarSelector() {
  const container = document.getElementById("profile-avatar-selector");
  if (!container) return;
  const unlocked = myProfile.unlocked_items || [];
  const ADN = getAvatarDisplayNames();
  const refSelect = document.getElementById("title-input");
  const sel = document.createElement("select");
  sel.id = "avatar-select-input";
  if (refSelect) {
    sel.className = refSelect.className;
    sel.style.cssText = refSelect.style.cssText;
  }
  sel.onchange = () => {
    activeAvatarChoice = sel.value;
    updateProfilePreview();
  };
  
  const optStd = document.createElement("option");
  optStd.value = "standard";
  optStd.innerText = "🔢 Avatar Standard";
  sel.appendChild(optStd);
  
  for (const id in ADN) {
    if (unlocked.includes(id)) {
      const opt = document.createElement("option");
      opt.value = id;
      opt.innerText = ADN[id];
      sel.appendChild(opt);
    }
  }
  
  sel.value = activeAvatarChoice || "standard";
  container.innerHTML = "";
  container.style.cssText = "margin-bottom:8px;";
  container.appendChild(sel);
}

/* ============================================================
7. PACKS (sélecteurs, équipement)
============================================================ */
function equipFromSelect(cat, val) {
  if (!myProfile.inventory) myProfile.inventory = {};
  if (!myProfile.inventory.__equipped) myProfile.inventory.__equipped = {};
  if (val) {
    myProfile.inventory.__equipped[cat] = val;
    localStorage.setItem('cb_equipped_' + cat, val);
    if (socket.connected) socket.emit('equip_cosmetic', val);
  } else {
    delete myProfile.inventory.__equipped[cat];
    localStorage.removeItem('cb_equipped_' + cat);
    if (socket.connected) socket.emit('equip_cosmetic', 'none_' + cat);
  }
}

function ensurePackSelector() {
  if (document.getElementById("pack-input")) return;
  const themeSelect = document.getElementById("theme-input");
  if (!themeSelect || !themeSelect.parentElement) return;
  
  const packSelect = document.createElement("select");
  packSelect.id = "pack-input";
  packSelect.className = themeSelect.className;
  packSelect.style.cssText = themeSelect.style.cssText;
  packSelect.onchange = () => {
    const pack = PACKS_LIST.find(p => p.id === packSelect.value);
    if (!pack) return;
    const unlocked = myProfile.unlocked_items || [];
    const required = [pack.theme, pack.frame].filter(x => x !== "");
    const owned = pack.id === "pack_standard" ? true : required.every(i => unlocked.includes(i));
    
    if (!owned) {
      showNotificationToast(currentLang === "fr" ? "🔒 Pack non possédé ! Direction la boutique 🛍️" : "🔒 Pack not owned! Go to the shop 🛍️", "announcement");
      packSelect.value = "";
      return;
    }
    
    const themeSel = document.getElementById("theme-input");
    const frameSel = document.getElementById("frame-input");
    if (themeSel) themeSel.value = pack.theme;
    if (frameSel) frameSel.value = pack.frame;
    equipFromSelect('theme', pack.theme);
    equipFromSelect('frame', pack.frame);
    updateProfilePreview();
  };
  
  themeSelect.parentElement.insertBefore(packSelect, themeSelect.nextSibling);
}

function renderProfilePackSelector() {
  const packSelect = document.getElementById("pack-input");
  if (!packSelect) return;
  const unlocked = myProfile.unlocked_items || [];
  const PDN = getPackDisplayNames();
  
  packSelect.innerHTML = `<option value="">🎁 ${currentLang === "fr" ? "Packs (grille + cadre)" : "Packs (grid + frame)"}</option>`;
  
  PACKS_LIST.forEach(pack => {
    const required = [pack.theme, pack.frame].filter(x => x !== "");
    const owned = pack.id === "pack_standard" ? true : required.every(i => unlocked.includes(i));
    const opt = document.createElement("option");
    opt.value = pack.id;
    opt.innerText = (owned ? "🎁 " : "🔒 ") + (PDN[pack.id] || pack.name);
    packSelect.appendChild(opt);
  });
}

function renderProfileCustomizationMenus() {
  const TDN = getTitleDisplayNames();
  const FDN = getFrameDisplayNames();
  const THDN = getThemeDisplayNames();
  
  const titleSelect = document.getElementById("title-input");
  const equippedTitle = myProfile.inventory && myProfile.inventory.__equipped && myProfile.inventory.__equipped.title;
  if (titleSelect) {
    titleSelect.innerHTML = `<option value="">Aucun titre actif</option>`;
    (myProfile.unlocked_items || []).filter(id => id.startsWith("title_")).forEach(tId => {
      const displayName = TDN[tId] || tId;
      const opt = document.createElement("option");
      opt.value = tId;
      opt.innerText = displayName;
      if (equippedTitle === tId || equippedTitle === displayName) opt.selected = true;
      titleSelect.appendChild(opt);
    });
    titleSelect.onchange = () => { equipFromSelect('title', titleSelect.value); };
  }
  
  const frameSelect = document.getElementById("frame-input");
  const equippedFrame = myProfile.inventory && myProfile.inventory.__equipped && myProfile.inventory.__equipped.frame;
  if (frameSelect) {
    frameSelect.innerHTML = `<option value="">Aucun cadre (Défaut)</option>`;
    const frames = (myProfile.unlocked_items || []).filter(id => id.startsWith("frame_"));
    if (!frames.includes("frame_standard")) frames.unshift("frame_standard");
    frames.forEach(fId => {
      const displayName = FDN[fId] || fId;
      const opt = document.createElement("option");
      opt.value = fId;
      opt.innerText = displayName;
      if (equippedFrame === fId) opt.selected = true;
      frameSelect.appendChild(opt);
    });
    frameSelect.onchange = () => {
      equipFromSelect('frame', frameSelect.value);
      updateProfilePreview();
    };
  }
  
  const themeSelect = document.getElementById("theme-input");
  const equippedTheme = myProfile.inventory && myProfile.inventory.__equipped && myProfile.inventory.__equipped.theme;
  if (themeSelect) {
    themeSelect.innerHTML = `<option value="">Thème de grille standard</option>`;
    (myProfile.unlocked_items || []).filter(id => id.startsWith("theme_")).forEach(thId => {
      const displayName = THDN[thId] || thId;
      const opt = document.createElement("option");
      opt.value = thId;
      opt.innerText = displayName;
      if (equippedTheme === thId) opt.selected = true;
      themeSelect.appendChild(opt);
    });
    themeSelect.onchange = () => { equipFromSelect('theme', themeSelect.value); };
  }
  
  renderProfileAvatarSelector();
  ensurePackSelector();
  renderProfilePackSelector();
}

/* ============================================================
8. ÉMOTICÔNES
============================================================ */
function sendEmote(emoji) {
  const now = Date.now();
  if (now - lastEmoteTime < CONFIG.EMOTE_COOLDOWN_MS) return;
  lastEmoteTime = now;
  if (!socket.connected) return;
  socket.emit("send_emote", { emote: emoji });
  showFloatingEmote(emoji, true);
}

socket.on("receive_emote", (data) => { showFloatingEmote(data.emote, false); });

function showFloatingEmote(emoji, isMe) {
  const bubble = document.createElement("div");
  bubble.className = "emote-bubble";
  bubble.innerText = emoji;
  const side = Math.random() > 0.5 ? "left" : "right";
  bubble.style[side] = `${Math.random() * 60 + 15}px`;
  bubble.style.bottom = isMe ? "130px" : "65%";
  document.body.appendChild(bubble);
  setTimeout(() => { bubble.remove(); }, CONFIG.DELTA_DISPLAY_MS);
}

/* ============================================================
9. ÉCONOMIE + VALIDATION
============================================================ */
function saveLocalPreferences() {
  localStorage.setItem("cb_username", myProfile.username);
  localStorage.setItem("cb_region", myProfile.region);
  localStorage.setItem("cb_avatar", myProfile.avatar);
  localStorage.setItem("cb_flag", myProfile.flag);
  if (myProfile.secretCode) localStorage.setItem('cb_secret', myProfile.secretCode);
}

function tweenNumber(el, from, to, duration = CONFIG.TWEEN_DURATION_MS) {
  if (!el) return;
  if (from === null || from === to) {
    el.innerText = to;
    return;
  }
  const start = performance.now();
  const diff = to - from;
  function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.innerText = Math.round(from + diff * eased);
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function showDelta(value, icon) {
  if (!value) return;
  const bar = document.querySelector(".user-stats");
  if (!bar) return;
  const delta = document.createElement("span");
  delta.className = "stat-delta " + (value > 0 ? "up" : "down");
  delta.innerText = (value > 0 ? "+" : "") + value + " " + icon;
  bar.appendChild(delta);
  setTimeout(() => delta.remove(), CONFIG.DELTA_DISPLAY_MS);
}

function updateEconomyUI() {
  const coinsEl = document.getElementById("user-coins-display");
  const trophiesEl = document.getElementById("user-trophies-display");
  const pointsEl = document.getElementById("user-points-display");
  const rankEl = document.getElementById("user-rank-display");

  if (!recapActive) {
    if (rankEl) rankEl.innerText = getRankName(myProfile.points);
    if (lastDisplayed.coins !== null && myProfile.coins !== lastDisplayed.coins) showDelta(myProfile.coins - lastDisplayed.coins, "🪙");
    if (lastDisplayed.trophies !== null && myProfile.trophies !== lastDisplayed.trophies) showDelta(myProfile.trophies - lastDisplayed.trophies, "👑");
    if (lastDisplayed.points !== null && myProfile.points !== lastDisplayed.points) showDelta(myProfile.points - lastDisplayed.points, "pts");
    tweenNumber(coinsEl, lastDisplayed.coins, myProfile.coins);
    tweenNumber(trophiesEl, lastDisplayed.trophies, myProfile.trophies);
    tweenNumber(pointsEl, lastDisplayed.points, myProfile.points);
    lastDisplayed = { coins: myProfile.coins, trophies: myProfile.trophies, points: myProfile.points };
  }

  const equippedTitle = myProfile.inventory && myProfile.inventory.__equipped && myProfile.inventory.__equipped.title;
  const titleEl = document.getElementById("user-title-display");
  if (titleEl) titleEl.innerText = equippedTitle ? `[ ${getTitleDisplayNames()[equippedTitle] || equippedTitle} ]` : "";

  document.getElementById("user-name-display").innerText = myProfile.username || "Définir";
  document.getElementById("user-avatar-badge").innerHTML = getAvatarBadgeHTML(myProfile.flag, myProfile.avatar);
  updateShopCoinsDisplay();
}

function updateShopCoinsDisplay() {
  const valEl = document.getElementById("shop-coins-val");
  if (valEl) valEl.innerText = myProfile.coins;
}

function isProfileValid() {
  const savedName = localStorage.getItem("cb_username");
  const savedRegion = localStorage.getItem("cb_region");
  return savedName && savedName.trim().length >= CONFIG.MIN_PSEUDO_LENGTH && savedName !== "Profil" && savedName !== "Définir un pseudo" && savedRegion;
}

/* ============================================================
10. COMPTE + CENTRE DE CONTRÔLE
============================================================ */
function switchAccount() {
  localStorage.removeItem('cb_username');
  localStorage.removeItem('cb_secret');
  localStorage.removeItem('cb_region');
  localStorage.removeItem('cb_avatar');
  localStorage.removeItem('cb_flag');
  localStorage.removeItem('cb_equipped_title');
  localStorage.removeItem('cb_equipped_frame');
  localStorage.removeItem('cb_equipped_theme');
  myProfile.username = '';
  myProfile.secretCode = '';
  myProfile.region = 'Hauts-de-France';
  myProfile.avatar = 1;
  myProfile.flag = '🇫🇷';
  myProfile.inventory = { __equipped: {} };
  myProfile.unlocked_items = [];
  renderAccountContent();
}

function injectAccountGear() {
  const headerBtns = document.querySelector('.header-btns');
  if (headerBtns && !document.getElementById('account-gear-btn')) {
    const gear = document.createElement('button');
    gear.id = 'account-gear-btn';
    gear.className = 'icon-btn';
    gear.innerText = '⚙️';
    gear.onclick = openAccountModal;
    headerBtns.appendChild(gear);
  }
}

function openAccountModal() {
  const d = i18n[currentLang];
  let modal = document.getElementById('modal-account');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-account';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card" style="max-width:340px;">
        <h3 id="account-title" style="color:#00d2ff; margin:0 0 10px 0; text-align:center;">${d.account_title}</h3>
        <div id="account-content"></div>
        <button id="account-close-btn" class="btn-secondary" onclick="closeAccountModal()">${d.close}</button>
      </div>`;
    document.body.appendChild(modal);
  } else {
    const t = modal.querySelector('#account-title');
    if (t) t.innerText = d.account_title;
    const cb = modal.querySelector('#account-close-btn');
    if (cb) cb.innerText = d.close;
  }
  renderAccountContent();
  modal.style.display = 'flex';
}

function closeAccountModal() {
  const modal = document.getElementById('modal-account');
  if (modal) modal.style.display = 'none';
}

function renderAccountContent() {
  const d = i18n[currentLang];
  const content = document.getElementById("account-content");
  if (!content) return;
  const closeBtn = document.getElementById("account-close-btn");
  const connected = isProfileValid();
  if (closeBtn) closeBtn.style.display = connected ? "block" : "none";

  if (connected) {
    content.innerHTML = `
      <p style="font-size:12px; text-align:center;">${d.account_connected} <b style="color:#00ff88;">${myProfile.username}</b></p>
      <button class="btn-main btn-gold" onclick="showChangeCodeModal()" style="margin-bottom:6px;">${d.account_change_code}</button>
      <button class="btn-main" onclick="showRecoveryKeyModal()" style="background:linear-gradient(45deg,#f8b500,#ff8a00); margin-bottom:6px;">${d.account_recovery_key}</button>
      <button class="btn-main btn-blue" onclick="switchAccount()" style="margin-bottom:6px;">${d.account_change}</button>
      <button class="btn-main btn-gold" onclick="startCreateAccount()" style="margin-bottom:6px;">${d.account_create}</button>
      <button class="btn-main" onclick="askDeleteAccount()" style="background:linear-gradient(45deg,#ff4b6b,#8b0000);">${d.account_delete}</button>`;
  } else {
    content.innerHTML = `
      <p style="font-size:11px; text-align:center; color:#aaa; margin-bottom:8px;">${d.account_desc}</p>
      <div class="tabs" style="margin-bottom:10px;">
        <button id="account-tab-login" class="tab-btn" onclick="switchAccountTab('login')"> ${d.account_tab_login || "Se connecter"}</button>
        <button id="account-tab-create" class="tab-btn" onclick="switchAccountTab('create')"> ${d.account_tab_create || "Créer un compte"}</button>
      </div>
      <div id="account-form-container"></div>`;
    switchAccountTab(currentAccountTab);
  }
}
let currentAccountTab = "login";

function switchAccountTab(tab) {
  currentAccountTab = tab;
  const tl = document.getElementById('account-tab-login');
  const tc = document.getElementById('account-tab-create');
  if (tl) tl.classList.toggle('active', tab === 'login');
  if (tc) tc.classList.toggle('active', tab === 'create');
  renderAccountForm(tab);
}

function renderAccountForm(tab) {
const d = i18n[currentLang];
const container = document.getElementById('account-form-container');
if (!container) return;
if (tab === 'login') {
container.innerHTML = `<input id="account-username" placeholder="${d.account_username_ph}" maxlength="16" style="width:100%; margin-bottom:6px; padding:10px; border-radius:8px; background:#0f1a2e; border:1px solid #00d2ff; color:#fff; text-align:center;">
<div style="position:relative; margin-bottom:10px;">
  <input id="account-secret" type="password" placeholder="${d.account_secret_ph}" maxlength="32" style="width:100%; padding:10px; padding-right:42px; border-radius:8px; background:#0f1a2e; border:1px solid #00d2ff; color:#fff; text-align:center;">
  <button type="button" id="account-secret-eye" onclick="cbToggleAccountSecret()" style="position:absolute; right:6px; top:50%; transform:translateY(-50%); background:none; border:none; font-size:16px; cursor:pointer; padding:4px; line-height:1;">👁️</button>
</div>
<button class="btn-main btn-blue" onclick="submitAccountForm('login')" style="width:100%;"> ${d.account_login_btn || "Accéder à mon compte"}</button>`;
} else {
container.innerHTML = `<input id="account-username" placeholder="${d.account_username_ph}" maxlength="16" oninput="onUsernameTyping()" style="width:100%; margin-bottom:2px; padding:10px; border-radius:8px; background:#0f1a2e; border:1px solid #00d2ff; color:#fff; text-align:center;">
<div id="username-availability" style="font-size:10px; font-weight:bold; min-height:14px; margin-bottom:6px; text-align:center;"></div>
<div style="position:relative; margin-bottom:4px;">
  <input id="account-secret" type="password" placeholder="${d.account_secret_ph}" maxlength="32" style="width:100%; padding:10px; padding-right:42px; border-radius:8px; background:#0f1a2e; border:1px solid #00d2ff; color:#fff; text-align:center;">
  <button type="button" id="account-secret-eye" onclick="cbToggleAccountSecret()" style="position:absolute; right:6px; top:50%; transform:translateY(-50%); background:none; border:none; font-size:16px; cursor:pointer; padding:4px; line-height:1;">👁️</button>
</div>
<div style="font-size:9px; color:#aaa; text-align:center; margin-bottom:8px; line-height:1.4;">${d.account_secret_help}</div>
<div style="background:rgba(248,181,0,0.12); border:1px solid #f8b500; border-radius:8px; padding:8px; margin-bottom:8px; font-size:10px; color:#f8b500; text-align:center; line-height:1.4;">⚠️ ${d.account_key_warning}</div>
<div style="font-size:10px; color:#aaa; margin-bottom:4px; text-align:left;">🌍 ${currentLang === "fr" ? "Ta région (pour le classement régional)" : "Your region (for regional ranking)"}</div>
<select id="account-region" style="width:100%; margin-bottom:10px; padding:10px; border-radius:8px; background:#0f1a2e; border:1px solid #00d2ff; color:#fff;"></select>
<button class="btn-main btn-gold" onclick="submitAccountForm('create')" style="width:100%;"> ${d.account_create_btn || "Créer mon compte"}</button>`;
const srcRegion = document.getElementById("region-input");
const dstRegion = document.getElementById("account-region");
if (srcRegion && dstRegion) dstRegion.innerHTML = srcRegion.innerHTML;
}
}

// 👁️ Afficher / masquer le code secret (Connexion & Création)
function cbToggleAccountSecret() {
const input = document.getElementById('account-secret');
const eye = document.getElementById('account-secret-eye');
if (!input) return;
const nowVisible = (input.type === 'text');
input.type = nowVisible ? 'password' : 'text';
if (eye) eye.textContent = nowVisible ? '👁️' : '🙈';
input.focus();
}

let usernameCheckTimer = null;

function onUsernameTyping() {
  const el = document.getElementById('username-availability');
  const input = document.getElementById('account-username');
  if (!el || !input) return;
  const val = input.value.trim();
  clearTimeout(usernameCheckTimer);

  if (val.length < 3) { el.innerText = ''; return; }

  el.innerText = currentLang === "fr" ? "⏳ Vérification..." : "⏳ Checking...";
  el.style.color = "#aaa";

  usernameCheckTimer = setTimeout(() => {
    if (typeof socket !== "undefined" && socket.connected) {
      socket.emit('check_username', val);
    }
  }, 400);
}

socket.on('username_check_result', (res) => {
  const el = document.getElementById('username-availability');
  if (!el) return;
  if (res.taken) {
    el.innerText = currentLang === "fr" ? "❌ Ce pseudo existe déjà" : "❌ Username already taken";
    el.style.color = "#ff4b2b";
  } else {
    el.innerText = currentLang === "fr" ? "✅ Pseudo disponible" : "✅ Username available";
    el.style.color = "#00ff88";
  }
});

function showChangeCodeModal() {
const d = i18n[currentLang];
let modal = document.getElementById('modal-change-code');
if (!modal) {
modal = document.createElement('div');
modal.id = 'modal-change-code';
modal.className = 'modal-overlay';
modal.innerHTML = `<div class="modal-card" style="max-width:360px;">
<h3 style="color:#00d2ff; margin:0 0 10px 0; text-align:center;">🔑 CHANGER MON CODE SECRET</h3>
<div class="card-desc" style="font-size:11px; color:#aaa; text-align:center; margin-bottom:10px;"> 8+ caractères avec <b>lettres</b>, <b>chiffres</b> et <b>caractère spécial</b> (!@#$%&*+-_) </div>

<div style="position:relative; margin-bottom:6px;">
<input type="password" id="change-old-code" placeholder="${d.change_old_code_ph}" style="width:100%; background:#0f051d; color:#fff; border:2px solid #00d2ff; border-radius:8px; padding:8px; padding-right:42px; font-size:13px;">
<button type="button" class="eye-toggle" data-target="change-old-code" aria-label="Afficher le code" style="position:absolute; right:6px; top:50%; transform:translateY(-50%); background:none; border:none; font-size:16px; cursor:pointer; padding:4px; line-height:1;">👁️</button>
</div>

<div style="position:relative; margin-bottom:6px;">
<input type="password" id="change-new-code" placeholder="${d.change_new_code_ph}" style="width:100%; background:#0f051d; color:#fff; border:2px solid #00d2ff; border-radius:8px; padding:8px; padding-right:42px; font-size:13px;">
<button type="button" class="eye-toggle" data-target="change-new-code" aria-label="Afficher le code" style="position:absolute; right:6px; top:50%; transform:translateY(-50%); background:none; border:none; font-size:16px; cursor:pointer; padding:4px; line-height:1;">👁️</button>
</div>

<div style="position:relative; margin-bottom:10px;">
<input type="password" id="change-confirm-code" placeholder="${d.change_confirm_code_ph}" style="width:100%; background:#0f051d; color:#fff; border:2px solid #00d2ff; border-radius:8px; padding:8px; padding-right:42px; font-size:13px;">
<button type="button" class="eye-toggle" data-target="change-confirm-code" aria-label="Afficher le code" style="position:absolute; right:6px; top:50%; transform:translateY(-50%); background:none; border:none; font-size:16px; cursor:pointer; padding:4px; line-height:1;">👁️</button>
</div>

<div id="change-code-result" style="min-height:16px; font-size:11px; text-align:center; font-weight:bold; margin-bottom:8px;"></div>
<div style="display:flex; gap:6px;">
<button class="btn-secondary" onclick="closeChangeCodeModal()" style="margin-top:0;">${d.cancel}</button>
<button class="btn-main btn-gold" onclick="submitChangeCode()" style="margin-top:0;">${d.change_code_validate}</button>
</div>
</div>`;
document.body.appendChild(modal);

// 👁️ Clic sur l'œil = afficher / masquer le code saisi
modal.querySelectorAll('.eye-toggle').forEach((btn) => {
btn.addEventListener('click', () => {
const input = document.getElementById(btn.dataset.target);
if (!input) return;
const nowVisible = (input.type === 'text');
input.type = nowVisible ? 'password' : 'text';
btn.textContent = nowVisible ? '👁️' : '🙈';
input.focus();
});
});
}

// À chaque ouverture : champs vidés + yeux réinitialisés en "masqué"
['change-old-code', 'change-new-code', 'change-confirm-code'].forEach((id) => {
const input = document.getElementById(id);
if (input) { input.value = ''; input.type = 'password'; }
});
modal.querySelectorAll('.eye-toggle').forEach((btn) => { btn.textContent = '👁️'; });
const resultBox = document.getElementById('change-code-result');
if (resultBox) { resultBox.innerText = ''; resultBox.style.color = ''; }

modal.style.display = 'flex';
}

function closeChangeCodeModal() {
  const m = document.getElementById('modal-change-code');
  if (m) m.style.display = 'none';
}

function submitChangeCode() {
  const oldCode = document.getElementById('change-old-code').value.trim();
  const newCode = document.getElementById('change-new-code').value;
  const confirmCode = document.getElementById('change-confirm-code').value;
  const result = document.getElementById('change-code-result');
  
  if (newCode !== confirmCode) {
    result.style.color = '#ff4b2b';
    result.innerText = i18n[currentLang].change_code_mismatch;
    return;
  }
  
  socket.emit('change_secret_code', { oldCode, newCode });
}

socket.on('change_code_result', (d) => {
  const result = document.getElementById('change-code-result');
  if (!result) return;
  result.style.color = d.ok ? '#00ff88' : '#ff4b2b';
  result.innerText = d.message || '';
  if (d.ok) {
    myProfile.secretCode = document.getElementById('change-new-code').value;
    localStorage.setItem('cb_secret', myProfile.secretCode);
    setTimeout(() => {
      closeChangeCodeModal();
      alert(i18n[currentLang].change_code_reminder);
    }, 1200);
  }
});

function showRecoveryKeyModal() {
  const d = i18n[currentLang];
  const code = prompt(d.recovery_key_prompt);
  if (!code) return;
  socket.emit('get_recovery_key', { secretCode: code });
}

socket.on('recovery_key_result', (d) => {
  if (!d.ok) {
    alert('❌ ' + d.message);
    return;
  }
  
  if (justCreatedAccount) {
    justCreatedAccount = false;
    const content = document.getElementById("account-content");
    const closeBtn = document.getElementById("account-close-btn");
    if (content) {
      content.innerHTML = `
        <div style="text-align:center;">
          <h3 style="color:#00ff88; margin:0 0 12px 0;">✅ Compte créé avec succès !</h3>
          <div style="background:rgba(248,181,0,0.15); border:2px solid #f8b500; border-radius:10px; padding:14px; margin:10px 0;">
            <div style="font-size:11px; color:#f8b500; font-weight:bold; margin-bottom:8px;">🔑 TA CLÉ DE RÉCUPÉRATION</div>
            <div style="font-size:20px; font-weight:900; color:#f8b500; letter-spacing:2px; font-family:monospace; user-select:all; margin-bottom:8px;">${d.key}</div>
            <button class="btn-main btn-gold" onclick="navigator.clipboard.writeText('${d.key}').then(()=>alert('📋 Clé copiée !'))" style="padding:6px 12px; font-size:11px;">📋 Copier la clé</button>
          </div>
          <div style="background:rgba(255,75,43,0.15); border:1px solid #ff4b2b; border-radius:8px; padding:10px; margin:10px 0; font-size:10px; color:#ff4b2b; line-height:1.5;">
            ⚠️ <b>CONSERVE CETTE CLÉ PRÉCIEUSEMENT !</b><br>
            Elle est INDISPENSABLE pour changer ton code secret si tu l'oublies.<br>
            Sans elle, ton compte sera perdu à jamais.
          </div>
          <button class="btn-main btn-blue" onclick="finishAccountCreation()" style="width:100%; margin-top:10px;">⚡ Continuer vers le jeu</button>
        </div>`;
    }
    if (closeBtn) closeBtn.style.display = "none";
  } else {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="modal-card" style="max-width:400px; text-align:center;">
        <h3 style="color:#f8b500; margin:0 0 10px 0;">${i18n[currentLang].recovery_key_title}</h3>
        <div style="font-size:11px; color:#aaa; margin-bottom:12px; line-height:1.4;">
          <b style="color:#ff8a00;">${i18n[currentLang].recovery_key_warning}</b><br>
          ${i18n[currentLang].recovery_key_desc}
        </div>
        <div style="background:#0f051d; border:2px solid #f8b500; border-radius:10px; padding:16px; font-size:22px; font-weight:900; color:#f8b500; letter-spacing:3px; font-family:monospace; margin-bottom:12px; user-select:all;">${d.key}</div>
        <button class="btn-main btn-gold" onclick="navigator.clipboard.writeText('${d.key}').then(()=>alert('${i18n[currentLang].recovery_key_copied}'));" style="margin-bottom:6px;">${i18n[currentLang].recovery_key_copy}</button>
        <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">${i18n[currentLang].close}</button>
      </div>`;
    document.body.appendChild(modal);
  }
});

function finishAccountCreation() {
  closeAccountModal();
  showTitleScreen();
}

socket.on('force_logout', (data) => {
  localStorage.removeItem('cb_secret');
  localStorage.removeItem('cb_username');
  myProfile.secretCode = '';
  myProfile.username = '';
  alert('🔒 Ton code secret a été réinitialisé par un administrateur.\n\nTu vas être redirigé vers l\'écran de connexion.');
  closeAccountModal();
  switchAccount();
  checkAndShowProfileModal();
});

function submitAccountForm(mode) {
  const pseudo = (document.getElementById('account-username').value || '').trim();
  const code = (document.getElementById('account-secret').value || '').trim();
  
  if (pseudo.length < CONFIG.MIN_PSEUDO_LENGTH) {
    alert('Pseudo : 3 caractères minimum.');
    return;
  }
  
  if (mode === 'create') {
    if (code.length < CONFIG.MIN_CODE_LENGTH) {
      alert('Code secret : 8 caractères minimum (avec majuscule, minuscule, chiffre et caractère spécial).');
      return;
    }
    if (!isStrongCode(code)) {
      alert('⚠️ Code trop faible !\n\nUn code fort doit contenir :\n• 8+ caractères\n• 1 MAJUSCULE\n• 1 minuscule\n• 1 chiffre\n• 1 caractère spécial (!@#$%&*+-_)\n\nExemple : Blitz2026!');
      return;
    }
  } else {
    if (code.length < 4) {
      alert('🔒 Entre ton code secret (4 caractères minimum).');
      return;
    }
  }
  
  myProfile.username = pseudo;
  myProfile.secretCode = code;
  const regionSel = document.getElementById('account-region');
  if (regionSel && regionSel.value) myProfile.region = regionSel.value;
  if (!myProfile.region) myProfile.region = 'Hauts-de-France';
  if (!myProfile.avatar) myProfile.avatar = 1;
  if (!myProfile.flag) myProfile.flag = '🇫🇷';
  pendingAccountLogin = true;
  
  if (window.__kicked) return;
  if (socket.connected) {
    socket.emit("register_player", {
      username: myProfile.username,
      region: myProfile.region,
      avatar: myProfile.avatar,
      flag: myProfile.flag,
      inventory: myProfile.inventory || {},
      secretCode: myProfile.secretCode,
      mode: mode,
      timezone: getPlayerTimezone()
    });
  } else {
    alert('❌ Connexion au serveur perdue. Réessaie dans quelques secondes.');
    pendingAccountLogin = false;
  }
}

function startCreateAccount() {
  if (confirm('⚠️ Un nouveau compte repart de zéro.\n(Ton compte actuel reste sauvegardé.)\nContinuer ?')) switchAccount();
}

function askDeleteAccount() {
  const code = prompt('⚠️ SUPPRESSION DÉFINITIVE DU COMPTE.\nEntre ton code secret pour confirmer :');
  if (!code) return;
  socket.emit('delete_account', { secretCode: code });
}

socket.on('delete_account_result', (res) => {
  if (res.ok) {
    localStorage.removeItem('cb_username');
    localStorage.removeItem('cb_secret');
    myProfile.secretCode = '';
    myProfile.username = '';
    alert('✅ Compte supprimé.');
    renderAccountContent();
  } else {
    alert('❌ Code secret incorrect : compte NON supprimé.');
  }
});

function openControlCenter() {
  renderControlCenter();
  document.getElementById('modal-control-center').style.display = 'flex';
}

function closeControlCenter() {
  const m = document.getElementById('modal-control-center');
  if (m) m.style.display = 'none';
}

function renderControlCenter() {
  const isEN = (typeof currentLang !== 'undefined' && currentLang === 'en');
  const titleEl = document.getElementById('cc-title');
  if (titleEl) titleEl.innerText = isEN ? "⚙️ SETTINGS MANAGEMENT" : "⚙️ GESTION DES PARAMÈTRES";
  const langEl = document.getElementById('cc-lang-text');
  if (langEl) langEl.innerText = (isEN ? "Language : " : "Langue : ") + (isEN ? "EN" : "FR");
  const soundEl = document.getElementById('cc-sound-text');
  const muteBtn = document.getElementById('mute-btn');
  if (soundEl && muteBtn) soundEl.innerText = (isEN ? "Sound : " : "Son : ") + (muteBtn.innerText.includes('🔇') ? (isEN ? "Muted" : "Coupé") : (isEN ? "On" : "Activé"));
  const customEl = document.getElementById('cc-custom-btn');
  if (customEl) customEl.innerText = isEN ? "🎨 Customization" : "🎨 Personnalisation";
  const accountEl = document.getElementById('cc-account-btn');
  if (accountEl) accountEl.innerText = isEN ? "👤 Account management" : "👤 Gestion du compte";
  const musEl = document.getElementById('cc-music-text');
  if (musEl) {
    const p = localStorage.getItem('cb_music_season');
    musEl.innerText = (isEN ? 'Soundtrack: ' : 'Bande son : ') + (p ? (isEN ? 'Season ' : 'Saison ') + p.replace('s', '') : (isEN ? 'Auto' : 'Auto'));
  }
  const btnLabel = document.getElementById('cc-btn-label');
  if (btnLabel) btnLabel.innerText = isEN ? "Settings" : "Paramètres";
}

/* ============================================================
11. FENÊTRE PROFIL / PERSONNALISATION
============================================================ */
function checkAndShowProfileModal() {
  if (isProfileValid() && localStorage.getItem('cb_secret')) {
    myProfile.username = localStorage.getItem("cb_username");
    myProfile.region = localStorage.getItem("cb_region");
    myProfile.avatar = parseInt(localStorage.getItem("cb_avatar")) || 1;
    myProfile.flag = getFlagEmoji(localStorage.getItem("cb_flag") || "🇫🇷");
    
    const savedTitle = localStorage.getItem("cb_equipped_title");
    const savedFrame = localStorage.getItem("cb_equipped_frame");
    const savedTheme = localStorage.getItem("cb_equipped_theme");
    
    if (savedTitle || savedFrame || savedTheme) {
      if (!myProfile.inventory) myProfile.inventory = {};
      if (!myProfile.inventory.__equipped) myProfile.inventory.__equipped = {};
      if (savedTitle) myProfile.inventory.__equipped.title = savedTitle;
      if (savedFrame) myProfile.inventory.__equipped.frame = savedFrame;
      if (savedTheme) myProfile.inventory.__equipped.theme = savedTheme;
    }
    
    updateEconomyUI();
    const modal = document.getElementById("modal-username");
    if (modal) modal.style.display = "none";
    registerIfPossible();
    const lastScreen = sessionStorage.getItem("cb_last_screen");
    const pendingRoom = sessionStorage.getItem("cb_pending_room");
    
    if (lastScreen === "room" && pendingRoom) {
      // Reprise d'un salon privé (même si l'app a été tuée)
      setTimeout(() => joinRoomDirect(pendingRoom, ""), 600);
    } else if (lastScreen === "rooms") {
      setTimeout(() => { if (typeof openRoomsScreen === "function") openRoomsScreen(); }, 400);
    } else if (lastScreen === "tower") {
      setTimeout(() => { if (typeof openTower === "function") openTower(); }, 400);
    } else if (lastScreen === "solo") {
      setTimeout(() => { if (typeof openSoloMenu === "function") openSoloMenu(); }, 400);
    } else if (lastScreen === "1v1") {
      setTimeout(() => { if (typeof open1v1Hub === "function") open1v1Hub(); }, 400);
    } else if (lastScreen === "shop") {
      setTimeout(() => { if (typeof openShop === "function") openShop(); }, 400);
    } else if (lastScreen === "leaderboard") {
      setTimeout(() => { if (typeof openLeaderboard === "function") openLeaderboard(); }, 400);
    } else if (lastScreen === "pass") {
      setTimeout(() => { if (typeof openBlitzPass === "function") openBlitzPass(); }, 400);
      } else {
      showTitleScreen();   // lancement frais (app tuée) → page explications
    }
  } else {
    openAccountModal();
  }
}

function setProfileMode(mode) {
  profileMode = mode;
  const tc = document.getElementById('profile-tab-create');
  const tl = document.getElementById('profile-tab-login');
  if (tc) tc.classList.toggle('active', mode === 'create');
  if (tl) tl.classList.toggle('active', mode === 'login');
  const validateButton = document.getElementById('btn-validate-profile');
  if (validateButton) validateButton.innerText = (mode === 'create') ? 'CRÉER MON PROFIL ⚡' : 'SE CONNECTER ⚡';
  const secretInput = document.getElementById('secret-input');
  if (secretInput) secretInput.placeholder = (mode === 'create') ? '🔒 Choisis un code secret (4 min)' : '🔒 Entre ton code secret';
}

function promptProfileChange() {
  if (!isProfileValid() || !localStorage.getItem('cb_secret')) {
    openAccountModal();
    return;
  }
  
  document.getElementById("username-input").value = myProfile.username;
  document.getElementById("username-input").disabled = true;
  if (myProfile.region) document.getElementById("region-input").value = myProfile.region;
  const regionInput = document.getElementById("region-input");
  if (regionInput) {
    regionInput.disabled = true;
    regionInput.title = currentLang === "fr"
      ? "Région définie à la création du compte (équité des classements régionaux)."
      : "Region set at account creation (regional ranking fairness).";
  }
  document.getElementById("avatar-input").value = myProfile.avatar || 1;
  document.getElementById("flag-input").value = myProfile.flag || "🇫🇷";
  
  const equippedAvatar = myProfile.inventory && myProfile.inventory.__equipped && myProfile.inventory.__equipped.avatar;
  activeAvatarChoice = equippedAvatar || "standard";
  renderProfileCustomizationMenus();
  updateProfilePreview();
  
  const oldSecret = document.getElementById('secret-input');
  if (oldSecret) oldSecret.style.display = 'none';
  const oldTabs = document.getElementById('profile-tabs');
  if (oldTabs) oldTabs.style.display = 'none';
  const oldSwitch = document.getElementById('switch-account-btn');
  if (oldSwitch) oldSwitch.style.display = 'none';
  
  const validateButton = document.querySelector('[onclick="saveProfileFromModal()"]');
  if (validateButton) validateButton.innerText = currentLang === "fr" ? '💾 Enregistrer ma personnalisation' : '💾 Save my customization';
  
  document.getElementById("modal-username").style.display = "flex";
}

function saveProfileFromModal() {
  const nameInput = document.getElementById("username-input").value.trim();
  const regionInput = document.getElementById("region-input").value;
  const selectedTitleId = document.getElementById("title-input").value;
  const selectedFrameId = document.getElementById("frame-input").value;
  const selectedThemeId = document.getElementById("theme-input").value;
  let avatarVal = parseInt(document.getElementById("avatar-input").value);
  const flagVal = document.getElementById("flag-input").value;
  
  if (nameInput.length < CONFIG.MIN_PSEUDO_LENGTH) {
    alert(currentLang === "fr" ? "Ton pseudo doit contenir au moins 3 caractères !" : "Your pseudo must contain at least 3 characters!");
    return;
  }
  
  const savedSecret = localStorage.getItem('cb_secret') || '';
  const savedName = localStorage.getItem('cb_username') || '';
  const isCustomizationOnly = savedSecret !== '' && isProfileValid() && (nameInput === savedName);
  
  if (isCustomizationOnly) {
    myProfile.secretCode = savedSecret;
    pendingCustomization = true;
  } else {
    myProfile.secretCode = myProfile.secretCode || savedSecret;
    pendingCustomization = false;
  }
  
  if (isNaN(avatarVal) || avatarVal < 1) avatarVal = 1;
  if (avatarVal > CONFIG.MAX_AVATAR_NUM) avatarVal = CONFIG.MAX_AVATAR_NUM;
  
  if (myProfile.secretCode && !isStrongCode(myProfile.secretCode)) {
    if (confirm('⚠️ Ton code secret est faible !\n\nUn code fort doit contenir :\n• 8+ caractères\n• Des lettres\n• Des chiffres\n• Un caractère spécial (!@#$%&*+-_)\n\nTu pourras le changer plus tard dans "Mon Compte".\n\nContinuer quand même ?') === false) return;
  }
  
  myProfile.username = nameInput;
  myProfile.region = regionInput;
  myProfile.avatar = avatarVal;
  myProfile.flag = getFlagEmoji(flagVal);
  
  if (!myProfile.inventory) myProfile.inventory = {};
  if (!myProfile.inventory.__equipped) myProfile.inventory.__equipped = {};
  
  if (selectedTitleId) {
    myProfile.inventory.__equipped.title = selectedTitleId;
    localStorage.setItem("cb_equipped_title", selectedTitleId);
    socket.emit("equip_cosmetic", selectedTitleId);
  } else {
    delete myProfile.inventory.__equipped.title;
    localStorage.removeItem("cb_equipped_title");
    socket.emit("equip_cosmetic", "none_title");
  }
  
  if (selectedFrameId) {
    myProfile.inventory.__equipped.frame = selectedFrameId;
    localStorage.setItem("cb_equipped_frame", selectedFrameId);
    socket.emit("equip_cosmetic", selectedFrameId);
  }
  
  if (selectedThemeId) {
    myProfile.inventory.__equipped.theme = selectedThemeId;
    localStorage.setItem("cb_equipped_theme", selectedThemeId);
    socket.emit("equip_cosmetic", selectedThemeId);
  } else {
    delete myProfile.inventory.__equipped.theme;
    localStorage.removeItem("cb_equipped_theme");
    socket.emit("equip_cosmetic", "none_theme");
  }
  
  if (activeAvatarChoice && activeAvatarChoice !== "standard") {
    myProfile.inventory.__equipped.avatar = activeAvatarChoice;
    socket.emit("equip_cosmetic", activeAvatarChoice);
  } else {
    delete myProfile.inventory.__equipped.avatar;
    socket.emit("equip_cosmetic", "none");
  }
  
  saveLocalPreferences();
  updateEconomyUI();
  SoundEngine.init();

  if (isCustomizationOnly) {
    pendingCustomization = false;
    pendingProfileValidation = false;

    const modal = document.getElementById('modal-username');
    if (modal) modal.style.display = 'none';

    if (typeof showNotificationToast === 'function') {
      showNotificationToast(
        currentLang === "fr" ? "✅ Personnalisation enregistrée !" : "✅ Customization saved!",
        "gift"
      );
    }

    if (typeof socket !== "undefined" && socket && socket.connected) {
      socket.emit("update_profile_visuals", {
        avatar: myProfile.avatar,
        flag: myProfile.flag
      });
    }

    return;
  }

  pendingProfileValidation = true;
  registerIfPossible();
}

function registerIfPossible() {
  if (isProfileValid() && socket.connected) {
    const isReturning = localStorage.getItem('cb_secret') && localStorage.getItem('cb_username');
    socket.emit("register_player", {
      username: myProfile.username, region: myProfile.region, avatar: myProfile.avatar, flag: myProfile.flag,
      inventory: myProfile.inventory,
      secretCode: myProfile.secretCode || localStorage.getItem('cb_secret') || '',
      mode: isReturning ? 'login' : (profileMode || 'create'),
      timezone: getPlayerTimezone()
    });
  }
}

socket.on("player_registered", (rawData) => {
  if (!rawData) return;
  const player = parsePlayer(rawData);
  myProfile.username = player.username;
  myProfile.region = player.region;
  myProfile.avatar = player.avatar;
  myProfile.flag = player.flag;
  myProfile.points = player.points;
  myProfile.coins = player.coins;
  myProfile.trophies = player.trophies;
  myProfile.wins = player.wins;
  myProfile.losses = player.losses;
  myProfile.inventory = player.inventory || {};
  if (!myProfile.inventory.__equipped) myProfile.inventory.__equipped = {};
  myProfile.unlocked_items = player.unlocked_items || [];
  myProfile.equippedPower = player.equippedPower;
  myProfile.blitzPassPremium = player.blitzPassPremium;
  myProfile.claimedPassTiers = player.claimedPassTiers;
  myProfile.currentSeasonId = rawData.current_season || rawData.currentSeasonId || "s1";
  myProfile.seasonProgress = rawData.seasonProgress || {};
  myProfile.unlockedTier = rawData.unlockedTier || 0;
  sanitizeEquippedPowers();
  updateEconomyUI();
  
  if (document.getElementById("modal-shop").style.display === "flex") switchShopTab(currentShopTab);
  if (document.getElementById("modal-blitz-pass").style.display === "flex") renderBlitzPass();
  if (document.getElementById("screen-game").style.display === "block") preparePowerHUD();
});

socket.on("online_count", (data) => {
  const el = document.getElementById("online-count-display");
  if (el) el.innerText = data.online;
});

let justCreatedAccount = false;

socket.on('register_result', (res) => {
  if (!res.ok) {
    // ✅ 1. GESTION PROPRE DE LA MAINTENANCE (On ne wipe pas le localStorage !)
     if (res.reason === 'maintenance') {
    pendingProfileValidation = false;
    pendingAccountLogin = false;
    cbShowMaintenanceLocked(res.message);   // affiche l'écran verrouillé ici
    return;
    }
    
    // ❌ 2. ERREURS CLASSIQUES (On wipe la session locale)
    pendingProfileValidation = false;
    localStorage.removeItem('cb_username'); localStorage.removeItem('cb_secret'); localStorage.removeItem('cb_region');
    localStorage.removeItem('cb_avatar'); localStorage.removeItem('cb_flag');
    localStorage.removeItem('cb_equipped_title'); localStorage.removeItem('cb_equipped_frame'); localStorage.removeItem('cb_equipped_theme');
    
    myProfile.username = ''; 
    myProfile.secretCode = ''; 
    myProfile.inventory = { __equipped: {} };
    
    if (res.reason === 'taken') alert('❌ Code secret incorrect pour ce pseudo.');
    else if (res.reason === 'nocode') alert('🔒 Choisis un code secret (4 caractères minimum).');
    else if (res.reason === 'short') alert('Ton pseudo doit contenir au moins 3 caractères !');
    else if (res.reason === 'not_found') {
      alert('❌ Compte introuvable. Veuillez créer un nouveau compte.');
      checkAndShowProfileModal();
    }
    else alert('❌ Erreur de connexion au serveur. Réessaie.');
    
    if (pendingAccountLogin) { 
      pendingAccountLogin = false; 
      renderAccountContent(); 
    }
    return;
  }
  
  // ✅ 3. SUCCÈS : Création de compte
  if (pendingAccountLogin) {
    pendingAccountLogin = false;
    saveLocalPreferences();
    updateEconomyUI();
    
    if (res.created) {
      justCreatedAccount = true;
      socket.emit('get_recovery_key', { secretCode: myProfile.secretCode });
    } else {
      closeAccountModal();
      showTitleScreen();
    }
    return;
  }
  
  // ✅ 4. SUCCÈS : Validation du profil (retour au jeu)
  if (pendingProfileValidation) {
    pendingProfileValidation = false;
    saveLocalPreferences();
    const modal = document.getElementById('modal-username');
    if (modal) modal.style.display = 'none';
    
    if (launchAdWatched) showMainMenu();
    else openLaunchAdModal();
  }
});

socket.on("blitz_pass_updated", (data) => {
  if (data.coins !== undefined) myProfile.coins = data.coins;
  if (data.blitzPassPremium !== undefined) myProfile.blitzPassPremium = data.blitzPassPremium;
  if (data.claimedPassTiers) myProfile.claimedPassTiers = data.claimedPassTiers;
  updateEconomyUI();
  if (document.getElementById("modal-blitz-pass").style.display === "flex") renderBlitzPass();
  showNotificationToast(currentLang === "fr" ? "✨ Passe de Saison mis à jour avec succès !" : "✨ Season Pass updated successfully!", "gift");
});

/* ============================================================
12. NOTIFICATIONS + ANNONCES + ÉVÉNEMENTS
============================================================ */
function showNotificationToast(message, type = "info") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.style.cssText = `position:fixed; top:15px; left:50%; transform:translateX(-50%); z-index:10000; display:flex; flex-direction:column; gap:6px; pointer-events:none; width:90%; max-width:400px;`;
    document.body.appendChild(container);
  }
  
  const toast = document.createElement("div");
  let bg = "rgba(0, 210, 255, 0.95)";
  let border = "#00d2ff";
  let color = "#000";
  
  if (type === "gift") {
    bg = "rgba(248, 181, 0, 0.95)";
    border = "#f8b500";
    color = "#000";
  } else if (type === "announcement") {
    bg = "rgba(255, 75, 43, 0.95)";
    border = "#ff4b2b";
    color = "#fff";
  }
  
  toast.style.cssText = `background:${bg}; border:2px solid ${border}; color:${color}; padding:10px 14px; border-radius:12px; font-weight:bold; font-size:12px; text-align:center; box-shadow:0 4px 20px rgba(0,0,0,0.5); pointer-events:auto; animation:toastFade ${CONFIG.TOAST_DURATION_MS}ms ease forwards;`;
  toast.innerHTML = message;
  container.appendChild(toast);
  setTimeout(() => { toast.remove(); }, CONFIG.TOAST_DURATION_MS);
}

socket.on("admin_gift_received", (data) => {
  const msg = data.message || (currentLang === "fr" ? "🎁 Cadeau reçu de l'Administrateur !" : "🎁 Gift received from the Admin!");
  showNotificationToast(`🎁 <b>${currentLang === "fr" ? "CADEAU ADMIN REÇU !" : "ADMIN GIFT RECEIVED!"}</b><br>` + msg, "gift");
  registerIfPossible();
});

socket.on('pass_reward_received', (data) => {
  const msg = data.message || (currentLang === "fr" ? "🎫 Récompense du Passe de Combat !" : "🎫 Battle Pass reward!");
  showNotificationToast(`🎫 <b>${currentLang === "fr" ? "PASSE DE COMBAT !" : "BATTLE PASS!"}</b><br>` + msg, 'gift');
});

socket.on("global_announcement", (msg) => {
  showNotificationToast(`📢 <b>${currentLang === "fr" ? "ANNONCE GLOBALE :" : "GLOBAL ANNOUNCEMENT:"}</b><br>` + msg, "announcement");
});

socket.on("events_state_update", (events) => {
  latestGlobalEvents = events;
  const banner = document.getElementById("player-event-banner");
  const towBtn = document.getElementById("btn-tow-menu");
  
  if (towBtn) towBtn.style.display = events.tugOfWarMode ? "flex" : "none";
  if (!banner) return;
  
  let activeList = [];
  if (events.coinRush) activeList.push("🪙 <b>Coin Rush</b> (Pièces x2)");
  if (events.rankShield) activeList.push("🛡️ <b>Rank Shield</b> (Zéro perte de points en classé)");
  if (events.expressoMatch) activeList.push("⚡ <b>Expresso Match</b> (Parties rapides en 20s)");
  if (events.chaosMode) activeList.push("🌪️ <b>Chaos Mode</b> (Modificateurs aléatoires)");
  if (events.jackpotEclair) activeList.push("🎁 <b>Jackpot Éclair</b> (Coffres mystères)");
  if (events.tugOfWarMode) activeList.push("🪢 <b>Mode Exclusif : Corde Raide</b>");
  if (events.halloweenMode) activeList.push("🎃 <b>Mode Exclusif : Chasse Hantée</b>");
  if (events.noelMode) activeList.push("🎄 <b>Mode Exclusif : Course aux Cadeaux</b>");
  
  if (activeList.length > 0) {
    banner.innerHTML = `⚡ <b>${currentLang === "fr" ? "ADMIN ABUSE EN COURS :" : "ADMIN ABUSE ACTIVE:"}</b><br>` + activeList.join("<br>");
    banner.style.display = "block";
  } else {
    banner.style.display = "none";
  }
});

/* ============================================================
13. RECONSTRUCTION DES BARRES D'ÉMOTICÔNES
============================================================ */
function fixEmoteBars() {
  document.querySelectorAll(".emote-bar").forEach(bar => {
    bar.innerHTML = "";
    EMOTES.forEach(em => {
      const b = document.createElement("button");
      b.className = "emote-btn";
      b.type = "button";
      b.innerText = em;
      b.onclick = () => sendEmote(em);
      bar.appendChild(b);
    });
  });
}

/* ============================================================
14. DÉMARRAGE
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  applyTranslations();
  fixEmoteBars();
  updateEconomyUI();
  initMenuBackgroundFX();
  injectAccountGear();
  checkAndShowProfileModal();
  
  const mainLogo = document.querySelector("h1");
  if (mainLogo) {
    let logoClickCount = 0;
    let logoClickTimer = null;
    mainLogo.addEventListener("click", () => {
      logoClickCount++;
      clearTimeout(logoClickTimer);
      logoClickTimer = setTimeout(() => { logoClickCount = 0; }, CONFIG.LOGO_CLICK_TIMEOUT_MS);
      if (logoClickCount >= CONFIG.LOGO_CLICK_COUNT) {
        logoClickCount = 0;
        openAdminPanel();
      }
    });
  }
  
  const urlParams = new URLSearchParams(window.location.search);
  const targetRoom = urlParams.get("room");
  if (targetRoom) {
    setTimeout(() => {
      if (isProfileValid()) openJoinCustomScreen(targetRoom.toUpperCase());
    }, 1000);
  }
});

window.addEventListener('load', () => {
  setTimeout(() => {
    if (!isProfileValid()) checkAndShowProfileModal();
  }, 1000);
});

function updateLastActiveTime() {
  localStorage.setItem("cb_last_active", Date.now().toString());
}

["click", "touchstart", "keydown", "scroll"].forEach(event => {
  document.addEventListener(event, updateLastActiveTime, { passive: true });
});

updateLastActiveTime();

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    const lastActive = parseInt(localStorage.getItem("cb_last_active") || "0");
    const timeAway = Date.now() - lastActive;
    
    if (timeAway > 30000) {
      document.body.style.opacity = "0.99";
      requestAnimationFrame(() => {
        document.body.style.opacity = "1";
      }); 
    }
    updateLastActiveTime();
  }
});

if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
  navigator.serviceWorker.addEventListener("message", (e) => {
    if (e.data && e.data.action === "RELOAD_PAGE") {
      // 🔄 Reload DIFFÉRÉ : jamais en pleine partie
      if (cbInGame()) {
        window.__pendingUpdateReload = true;
        cbUpdateToast();
      } else {
        location.reload();
      }
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage("CHECK_BACKGROUND_TIME");
    }
  });
}

// 🎮 Le joueur est-il en pleine partie ?
function cbInGame() {
  const vis = (id) => { const el = document.getElementById(id); return el && (el.style.display === "block" || el.style.display === "flex"); };
  return vis("screen-game") || vis("tower-game") || vis("tw-brief") || vis("screen-catch") || (typeof recapActive !== "undefined" && recapActive);
}

// 💬 Toast discret « mise à jour en attente »
function cbUpdateToast() {
  if (document.getElementById("cb-update-toast")) return;
  const t = document.createElement("div");
  t.id = "cb-update-toast";
  t.style.cssText = "position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#0f051d,#1a1030);border:2px solid #00d2ff;color:#fff;padding:10px 18px;border-radius:12px;font-size:12px;font-weight:800;z-index:99998;box-shadow:0 0 18px #00d2ff66;text-align:center;";
  t.innerHTML = "🔄 Mise à jour prête !<br><small style='opacity:.8;font-weight:600;'>Elle s'appliquera à la fin de ta partie.</small>";
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 6000);
}

// ⏱️ Dès que le joueur quitte sa partie → applique le reload en attente (≤3s)
setInterval(() => {
  if (window.__pendingUpdateReload && !cbInGame()) location.reload();
}, 3000);

(function () {
  let hiddenAt = 0;

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      hiddenAt = Date.now();
    } else {
      const away = Date.now() - (hiddenAt || Date.now());
      hiddenAt = 0;

      if (away > 800) {
        document.body.style.display = "none";
        void document.body.offsetHeight;
        document.body.style.display = "";
        window.dispatchEvent(new Event("resize"));
      }
    }
  });

    document.addEventListener("resume", () => {
    document.body.style.display = "none";
    void document.body.offsetHeight;
    document.body.style.display = "";
    window.dispatchEvent(new Event("resize"));
    updateLastActiveTime();
  });
})();
/* ============================================================
🛠️ MODE MAINTENANCE — côté joueur (version finale)
============================================================ */
function cbMaintRemoveBanner(){
  const b = document.getElementById('cb-maint-bar');
  if (b) b.remove();
}

function cbShowMaintenanceCountdown(message, seconds){
  cbMaintRemoveBanner();
  const bar = document.createElement('div');
  bar.id = 'cb-maint-bar';
  bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:2147483646;background:linear-gradient(90deg,#ff8a00,#ff4b2b);color:#fff;font-family:system-ui,sans-serif;font-weight:800;font-size:13px;padding:10px 12px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,.5);pointer-events:none;';
  document.body.appendChild(bar);
  let remaining = Math.max(0, parseInt(seconds, 10) || 0);
const render = () => {
  const m = Math.floor(remaining / 60), s = remaining % 60;
  bar.innerHTML = '🛠️ MAINTENANCE DANS ' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0') + ' — termine ta partie (maintenance en cours) !';
};
  render();
  bar._cbInterval = setInterval(() => {
    remaining--;
    if (remaining <= 0){
      clearInterval(bar._cbInterval);
      bar.innerHTML = '🛠️ Maintenance imminente (maintenance en cours) — fin de partie = déconnexion';
      return;
    }
    render();
  }, 1000);
}

function cbShowMaintenanceLocked(message){
  cbMaintRemoveBanner();
  let ov = document.getElementById('cb-maint-overlay');
  if (!ov){
    ov = document.createElement('div');
    ov.id = 'cb-maint-overlay';
    document.body.appendChild(ov);
  }
  ov.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#0a0514;display:flex;align-items:center;justify-content:center;padding:20px;';
  ov.innerHTML =
    '<div style="max-width:420px;width:100%;text-align:center;color:#fff;font-family:system-ui,sans-serif;">' +
    '<div style="font-size:52px;">🛠️</div>' +
    '<h2 style="color:#00d2ff;margin:12px 0 6px;font-size:22px;letter-spacing:1px;">MAINTENANCE EN COURS</h2>' +
    '<p id="cb-maint-msg" style="font-size:14px;line-height:1.5;color:#ddd;margin-bottom:18px;"></p>' +
    '<div style="height:8px;border-radius:4px;background:rgba(255,255,255,0.12);overflow:hidden;">' +
    '<div style="height:100%;width:40%;border-radius:4px;background:linear-gradient(90deg,#00c6ff,#0072ff);animation:cbMaintSlide 1.6s ease-in-out infinite;"></div>' +
    '</div>' +
    '<input id="cb-maint-code" placeholder="Tu as un code ? 🔑" style="margin-top:18px;width:80%;padding:10px;border-radius:10px;border:1px solid #444;background:#111;color:#fff;text-align:center;">' +
    '<div style="margin-top:10px;"><button id="cb-maint-enter" style="padding:10px 22px;border:none;border-radius:10px;background:#00d2ff;color:#001;font-weight:800;cursor:pointer;">Entrer</button></div>' +
    '<p style="font-size:12px;color:#888;margin-top:14px;">Retour automatique dès la fin de la maintenance.</p>' +
    '<style>@keyframes cbMaintSlide{0%{margin-left:-40%}100%{margin-left:100%}}</style>' +
    '</div>';
  const msgEl = ov.querySelector('#cb-maint-msg');
  if (msgEl && message) msgEl.textContent = message;
  ov.querySelector('#cb-maint-enter').onclick = () => {
    const c = (ov.querySelector('#cb-maint-code').value || '').trim();
    if (!c) return;
    localStorage.setItem('cb_maint_code', c);
    location.reload();
  };
  if (!ov._cbProbe){
    ov._cbProbe = setInterval(() => {
      fetch(CONFIG.SERVER_URL + '/api/maintenance?cb=' + Date.now(), { cache: 'no-store' })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(d => { if (d && d.enabled === false){ localStorage.removeItem('cb_maint_code'); location.reload(); } })
        .catch(() => {});
    }, 10000);
  }
}

socket.on('maintenance_announce', (d) => {
  if (d && d.delay > 0) {
    cbShowMaintenanceCountdown(d.message, d.delay);
  } else if (d && (d.inMatch || d.inTower)) {
    if (typeof showNotificationToast === 'function') {
      showNotificationToast('🛠️ Maintenance programmée. Tu seras déconnecté à la fin de ta partie.', 'announcement');
    }
  }
});
socket.on('maintenance_kick', (d) => { cbShowMaintenanceLocked(d && d.message); });
socket.on('maintenance_end', () => { localStorage.removeItem('cb_maint_code'); location.reload(); });
socket.on('register_result', (res) => {
  if (res && !res.ok && res.reason === 'maintenance') cbShowMaintenanceLocked(res.message);
});
