/* ============================================================
PASSE.JS — BOUTIQUE & PASSE DE SAISON
============================================================ */
// 🔒 VERROU DU PASSE DE SAISON — 100% AUTOMATIQUE
// Se déverrouille seul dès que la date de début de saison (admin panel) est atteinte.
function seasonPassLiveLocal() {
  try {
    const now = new Date();
    const list = getSeasonsClient();
    for (const s of list) {
      const [d1, m1, y1] = s.start.split("/").map(Number);
      const [d2, m2, y2] = s.end.split("/").map(Number);
      if (now >= new Date(y1, m1 - 1, d1) && now <= new Date(y2, m2 - 1, d2, 23, 59)) return true;
    }
    return false;
  } catch (e) { return false; }
}
function isSeasonPassEnabled() {
  // Priorité au calcul SERVEUR (dates admin panel), fallback local si pas connecté
  if (typeof myProfile !== "undefined" && myProfile && myProfile.seasonPassLive !== undefined) return !!myProfile.seasonPassLive;
  return seasonPassLiveLocal();
}

let _passLockInterval = null;

function applyPassLockToMenu() {
  const titleEl = document.getElementById("pass-menu-title");
  if (!titleEl) return;
  const banner = titleEl.closest("button") || titleEl.closest("[onclick]") || titleEl.parentElement.parentElement;
  if (!banner) return;

  if (!isSeasonPassEnabled()) {
    if (!banner.querySelector(".pass-lock-overlay")) {
      banner.classList.add("pass-locked");
      banner.style.minHeight = "60px";
      const ov = document.createElement("div");
      ov.className = "pass-lock-overlay";
      ov.innerHTML = `
        <span class="pass-lock-icon">🔒</span>
        <span class="pass-lock-label">${currentLang === "fr" ? "VERROUILLÉ" : "LOCKED"}</span>
        <span class="pass-lock-soon">${currentLang === "fr" ? "Ouverture bientôt" : "Opening soon"}</span>`;
      banner.appendChild(ov);
    }
  } else {
    banner.classList.remove("pass-locked");
    const ov = banner.querySelector(".pass-lock-overlay");
    if (ov) ov.remove();
  }
}

function renderPassLockedScreen(container, fr) {
  if (_passLockInterval) { clearInterval(_passLockInterval); _passLockInterval = null; }
  container.innerHTML = `
    <div class="pass-locked-screen">
      <div class="pls-code" id="pls-code"></div>
      <div class="pls-center">
        <div class="pls-lock">🔒</div>
        <div class="pls-title">${fr ? "PASSE DE SAISON" : "SEASON PASS"}</div>
        <div class="pls-msg">${fr ? "CHARGEMENT EN COURS" : "LOADING"}<span class="pls-dots"><span>.</span><span>.</span><span>.</span></span></div>
        <div class="pls-bar"><div class="pls-bar-fill"></div></div>
        <div class="pls-sub">${fr ? "Données classifiées — disponibles après la prochaine MAJ." : "Classified data — available after the next update."}</div>
      </div>
    </div>`;

  const codeEl = container.querySelector("#pls-code");
  const rand = () => Math.random().toString(16).slice(2, 10).toUpperCase().padStart(8, "0");
  const genLine = () => {
    const ops = ["0x", ">>", "::", "##"];
    return `<div class="pls-line">${ops[Math.floor(Math.random() * ops.length)]} ${rand()} ${rand()} ${rand()}</div>`;
  };
  let lines = [];
  for (let i = 0; i < 12; i++) lines.push(genLine());
  codeEl.innerHTML = lines.join("");
  _passLockInterval = setInterval(() => {
    lines.shift(); lines.push(genLine());
    codeEl.innerHTML = lines.join("");
  }, 220);
}

/* ============================================================
1. CONSTANTES
============================================================ */
const SHOP_TABS = {
  BONUS: 'bonus',
  MALUS: 'malus',
  COSMETICS: 'cosmetics',
  PACKS: 'packs'
};

const PASS_CONFIG = {
  PREMIUM_PRICE: 1000,
  TIERS_PER_SEASON: 30,
  CLAIM_COOLDOWN_MS: 1200,
  REWARD_POPUP_DURATION: 3000,
  BURST_PARTICLE_COUNT: 8
};

/* ============================================================
2. ÉTAT GLOBAL
============================================================ */
let currentShopTab = SHOP_TABS.BONUS;
let rewardPopupTimeout = null;
let lastRewardSoundTime = 0;
let lastClaimTime = 0;

/* ============================================================
3. BOUTIQUE — NAVIGATION
============================================================ */
function openShop() {
  if (!isProfileValid()) { checkAndShowProfileModal(); return; }
  updateShopCoinsDisplay();
  document.getElementById("modal-shop").style.display = "flex";
  switchShopTab(currentShopTab);
}

function closeShop() {
  document.getElementById("modal-shop").style.display = "none";
}

function switchShopTab(type) {
  currentShopTab = type;
  updateShopCoinsDisplay();
  
  document.getElementById("shop-tab-bonus").classList.toggle("active", type === SHOP_TABS.BONUS);
  document.getElementById("shop-tab-malus").classList.toggle("active", type === SHOP_TABS.MALUS);
  const cosmeticsTabBtn = document.getElementById("shop-tab-cosmetics");
  if (cosmeticsTabBtn) cosmeticsTabBtn.classList.toggle("active", type === SHOP_TABS.COSMETICS);
  const packsTabBtn = document.getElementById("shop-tab-packs");
  if (packsTabBtn) packsTabBtn.classList.toggle("active", type === SHOP_TABS.PACKS);
  
  const container = document.getElementById("shop-container");
  container.innerHTML = "";
  
  const powersDict = i18n[currentLang].powers;
  const cosmeticsDict = getCosmeticsDict();
  const packsDict = getPacksDict();
  
  POWERS_CATALOG.filter(p => p.type === type).forEach(p => {
    const card = createShopCard(p, type, powersDict, cosmeticsDict, packsDict);
    if (card) container.appendChild(card);
  });
}

function createShopCard(item, type, powersDict, cosmeticsDict, packsDict) {
  const card = document.createElement("div");
  const fr = currentLang === "fr";
  
  if (type === SHOP_TABS.PACKS) {
    const info = packsDict[item.id];
    if (!info) return null;
    const ownedAll = info.items.every(i => (myProfile.unlocked_items || []).includes(i));
    const reduc = Math.round((1 - item.price / info.value) * 100);
    card.className = "power-card";
    card.innerHTML = `
      <h4>${info.name}</h4>
      <p>${info.desc}</p>
      <div style="font-size:9px; color:#aaa; margin-bottom:2px; text-decoration:line-through;">${info.value} 🪙</div>
      <div style="font-weight:bold; margin-bottom:4px; font-size:11px; color:#00ff88;">${item.price} 🪙 (-${reduc}%)</div>
      ${ownedAll 
        ? `<button class="power-btn equip" onclick="equipPack('${item.id}')">${fr ? "Équiper le pack ⚡" : "Equip pack ⚡"}</button>` 
        : `<button class="power-btn buy" onclick="buyItem('${item.id}')">${fr ? "Acheter" : "Buy"}</button>`
      }`;
  } else if (type === SHOP_TABS.COSMETICS) {
    const info = cosmeticsDict[item.id];
    if (!info) return null;
    const unlocked = myProfile.unlocked_items && myProfile.unlocked_items.includes(item.id);
    const equipped = myProfile.inventory && myProfile.inventory.__equipped && Object.values(myProfile.inventory.__equipped).includes(item.id);
    card.className = `power-card ${equipped ? "equipped" : ""}`;
    card.innerHTML = `
      <h4>${info.name}</h4>
      <p>${info.desc}</p>
      <div style="font-weight:bold; margin-bottom:4px; font-size:10px; color:#f8b500;">${item.price} 🪙</div>
      ${unlocked 
        ? `<button class="power-btn ${equipped ? "active" : "equip"}" onclick="equipCosmetic('${item.id}')">${equipped ? (fr ? "Équipé ✅" : "Equipped ✅") : (fr ? "Équiper" : "Equip")}</button>` 
        : `<button class="power-btn buy" onclick="buyItem('${item.id}')">${fr ? "Acheter" : "Buy"}</button>`
      }`;
  } else {
    const powerInfo = powersDict[item.id];
    const qty = myProfile.inventory[item.id] || 0;
    const isEquipped = myProfile.equippedPower === item.id;
    card.className = `power-card ${isEquipped ? "equipped" : ""}`;
    card.innerHTML = `
      <h4>${powerInfo.name}</h4>
      <p>${powerInfo.desc}</p>
      <div class="stock-badge">${fr ? "Stock" : "Stock"} : ${qty}</div>
      <div style="font-weight:bold; margin-bottom:4px; font-size:10px; color:#f8b500;">${item.price} 🪙</div>
      <button class="power-btn buy" onclick="buyItem('${item.id}')">${fr ? "Acheter (+1)" : "Buy (+1)"}</button>
      ${qty > 0 ? `<button class="power-btn ${isEquipped ? "active" : "equip"}" onclick="equipPower('${item.id}')">${isEquipped ? (fr ? "Équipé ✅" : "Equipped ✅") : (fr ? "Équiper" : "Equip")}</button>` : ""}`;
  }
  
  return card;
}

/* ============================================================
4. BOUTIQUE — ACHAT & ÉQUIPEMENT
============================================================ */
function buyItem(id) {
  const itemObj = POWERS_CATALOG.find(p => p.id === id);
  if (itemObj && myProfile.coins < itemObj.price) {
    SoundEngine.playError();
    showNotificationToast(i18n[currentLang].not_enough_coins, "announcement");
    return;
  }
  if (socket.connected) socket.emit("buy_item", id);
}

function equipCosmetic(id) {
  if (socket.connected) socket.emit("equip_cosmetic", id);
}

function equipPack(packId) {
  const packs = {
    pack_haute_tension: ["theme_eclair", "frame_voltage"],
    pack_cryo: ["theme_glacial", "frame_givre"],
    pack_solaire: ["theme_alt", "frame_prism"],
    pack_obsidienne: ["theme_obsidian", "frame_obsidian"]
  };
  const items = packs[packId];
  if (!items) return;
  equipCosmetic(items[0]);
  equipCosmetic(items[1]);
  showNotificationToast(currentLang === "fr" ? "✅ Pack équipé : grille + cadre !" : "✅ Pack equipped: grid + frame!", "gift");
}

function equipPower(id) {
  if (socket.connected) socket.emit("equip_power", id);
}

function sanitizeEquippedPowers() {
  if (!myProfile.inventory) myProfile.inventory = {};
  if (myProfile.equippedPower && (myProfile.inventory[myProfile.equippedPower] || 0) <= 0) myProfile.equippedPower = null;
  if (myProfile.equippedPowers && myProfile.equippedPowers.length > 0) {
    myProfile.equippedPowers = myProfile.equippedPowers.filter(p => (myProfile.inventory[p] || 0) > 0);
  }
  if (selectedRankedItems && selectedRankedItems.length > 0) {
    selectedRankedItems = selectedRankedItems.filter(p => (myProfile.inventory[p] || 0) > 0);
  }
}

/* ============================================================
5. BOUTIQUE — DICTIONNAIRES (cosmétiques & packs)
============================================================ */
function getCosmeticsDict() {
  const fr = currentLang === "fr";
  return {
    theme_glacial: { name: "🧊 " + (fr ? "Grille Cryo" : "Cryo Grid"), desc: fr ? "Grille aux reflets bleutés glacés" : "Icy blue tinted grid" },
    theme_alt: { name: "🎨 " + (fr ? "Grille Rétro/Dorée" : "Retro/Gold Grid"), desc: fr ? "Tuiles dorées look rétro, pluie de pièces au combo" : "Retro gold tiles, coin rain on combo" },
    theme_eclair: { name: "⚡ " + (fr ? "Grille Éclair" : "Lightning Grid"), desc: fr ? "Tuiles jaune électrique crépitantes" : "Crackling electric yellow tiles" },
    theme_obsidian: { name: "🖤 " + (fr ? "Grille Obsidienne" : "Obsidian Grid"), desc: fr ? "Tuiles sombres striées de lueurs pourpres" : "Dark tiles streaked with purple glows" },
    theme_neon: { name: "🌈 " + (fr ? "Grille Néon Synthwave" : "Neon Synthwave Grid"), desc: fr ? "Dégradé multi-néons animé (EXCLUSIF pass S1)" : "Animated multi-neon gradient (S1 pass EXCLUSIVE)" },
    theme_citrouille: { name: "🎃 " + (fr ? "Grille Lanterne" : "Lantern Grid"), desc: fr ? "Lanternes sculptées qui tombent (EXCLUSIF pass S2)" : "Falling carved lanterns (S2 pass EXCLUSIVE)" },
    theme_fantome: { name: "👻 " + (fr ? "Grille Fantôme" : "Ghost Grid"), desc: fr ? "Fantômes violets qui descendent (EXCLUSIF pass S2)" : "Purple ghosts floating down (S2 pass EXCLUSIVE)" },
    frame_voltage: { name: "⚡ " + (fr ? "Cadre Sous Tension" : "Voltage Frame"), desc: fr ? "Éclairs électriques crépitants" : "Crackling electric lightning" },
    frame_obsidian: { name: "🖤 " + (fr ? "Cadre Obsidienne" : "Obsidian Frame"), desc: fr ? "Cadre sombre strié de lueurs pourpres" : "Dark frame streaked with purple glows" },
    frame_givre: { name: "🧊 " + (fr ? "Cadre Givre" : "Frost Frame"), desc: fr ? "Halo glacé aux reflets givrés" : "Icy halo with frosty reflections" },
    frame_prism: { name: "✨ " + (fr ? "Cadre Doré" : "Gold Frame"), desc: fr ? "Scintillements dorés éblouissants" : "Dazzling golden sparkles" },
    frame_osseux: { name: "🦴 " + (fr ? "Cadre Osseux" : "Bone Frame"), desc: fr ? "Os blanchis sous la lune" : "Whitened bones under the moon" },
    frame_fantome: { name: "👻 " + (fr ? "Cadre Fantôme" : "Ghost Frame"), desc: fr ? "Lueur pâle spectrale" : "Pale spectral glow" }
  };
}

function getPacksDict() {
  const fr = currentLang === "fr";
  return {
    pack_haute_tension: { name: "⚡ PACK " + (fr ? "Haute Tension" : "High Voltage"), desc: fr ? "Cadre Sous Tension + Grille Éclair" : "Voltage Frame + Lightning Grid", items: ["frame_voltage", "theme_eclair"], value: 3700 },
    pack_cryo: { name: "🧊 PACK " + (fr ? "Cryo" : "Cryo"), desc: fr ? "Cadre Givre + Grille Cryo" : "Frost Frame + Cryo Grid", items: ["frame_givre", "theme_glacial"], value: 3400 },
    pack_solaire: { name: "✨ PACK " + (fr ? "Doré" : "Gold"), desc: fr ? "Cadre Doré + Grille Dorée" : "Gold Frame + Gold Grid", items: ["frame_prism", "theme_alt"], value: 4400 },
    pack_obsidienne: { name: "🖤 PACK " + (fr ? "Obsidienne" : "Obsidian"), desc: fr ? "Cadre Obsidienne + Grille Obsidienne" : "Obsidian Frame + Obsidian Grid", items: ["frame_obsidian", "theme_obsidian"], value: 6300 }
  };
}

/* ============================================================
6. PASSE DE SAISON — DONNÉES DES SAISONS
============================================================ */
function getSeasonsClient() {
  const fr = currentLang === "fr";
  const PC = fr ? " Pièces (🪙)" : " Coins (🪙)";
  const PROJ = fr ? "Projecteur" : "Spotlight";
  const FREEZE = fr ? "Blocage du Temps" : "Time Freeze";
  const JOKER = fr ? "Joker Éclair" : "Lightning Joker";
  const NOVA = fr ? "Nova Temporelle" : "Time Nova";
  const NOVAS = fr ? "Novas Temporelles" : "Time Novas";
  const QUAKE = fr ? "Séisme" : "Earthquake";
  
  return [
    {
      id: "s1",
      name: fr ? "FÉLIN & NÉON" : "FELINE & NEON",
      emoji: "🐱",
      start: "01/10/2026", 
      end: "31/10/2026",
      tiers: [
        { tier: 1, free: "50" + PC, premium: fr ? "Titre exclusif « [ Stalker Numérique ] »" : "Exclusive title « [ Digital Stalker ] »" },
        { tier: 2, free: "1 💡 " + PROJ, premium: "100" + PC },
        { tier: 3, free: "50" + PC, premium: fr ? "Titre rare « [ Réflexe Félin ] »" : "Rare title « [ Feline Reflex ] »" },
        { tier: 4, free: "1 ⏳ " + FREEZE, premium: fr ? "🛡️ Cadre de Profil Argenté" : "🛡️ Silver Profile Frame" },
        { tier: 5, free: "75" + PC, premium: "150" + PC },
        { tier: 6, free: "1 ⚡ " + JOKER, premium: fr ? "Pack de Consommables (Bonus)" : "Consumables Pack (Bonus)" },
        { tier: 7, free: "50" + PC, premium: fr ? "Titre « [ Pulsion Néon ] »" : "Title « [ Neon Pulse ] »" },
        { tier: 8, free: "1 💡 " + PROJ, premium: "2 🌟 " + NOVAS },
        { tier: 9, free: "100" + PC, premium: "200" + PC },
        { tier: 10, free: "1 🌟 " + NOVA, premium: "🎨 " + (fr ? "Grille Néon Synthwave (EXCLUSIF pass)" : "Neon Synthwave Grid (pass EXCLUSIVE)") },
        { tier: 11, free: "60" + PC, premium: "120" + PC },
        { tier: 12, free: "1 ⏳ " + FREEZE, premium: "1 💡 " + PROJ },
        { tier: 13, free: "70" + PC, premium: fr ? "Titre « [ Spectre Cosmique ] »" : "Title « [ Cosmic Specter ] »" },
        { tier: 14, free: "1 ⚡ " + JOKER, premium: "2 ⏳ " + FREEZE },
        { tier: 15, free: "150" + PC, premium: "🐱 " + (fr ? "Avatar Animé Lottie : Chat Assistant" : "Lottie Animated Avatar: Assistant Cat") },
        { tier: 16, free: "80" + PC, premium: "160" + PC },
        { tier: 17, free: "2 💡 " + PROJ, premium: "2 🌟 " + NOVAS },
        { tier: 18, free: "90" + PC, premium: "250" + PC },
        { tier: 19, free: "1 ⚡ " + JOKER, premium: "1 📳 " + QUAKE },
        { tier: 20, free: "100" + PC, premium: "🌈 " + (fr ? "Cadre Animé « Flux Chroma »" : "Animated Frame « Chroma Flow »") },
        { tier: 21, free: "110" + PC, premium: "220" + PC },
        { tier: 22, free: "1 ⏳ " + FREEZE, premium: "3 💡 " + PROJ },
        { tier: 23, free: "120" + PC, premium: "350" + PC },
        { tier: 24, free: "1 ⚡ " + JOKER, premium: "300" + PC },
        { tier: 25, free: "150" + PC, premium: "🌈 " + (fr ? "Avatar Animé Lottie : Chat Arc-en-ciel" : "Lottie Animated Avatar: Rainbow Cat") },
        { tier: 26, free: "130" + PC, premium: "260" + PC },
        { tier: 27, free: "2 💡 " + PROJ, premium: "4 🌟 " + NOVAS },
        { tier: 28, free: "140" + PC, premium: "400" + PC },
        { tier: 29, free: "300" + PC, premium: "500" + PC },
        { tier: 30, free: (fr ? "Titre suprême « [ ⚡ FÉLIN SUPRÊME ] » + 500 🪙" : "Supreme title « [ ⚡ SUPREME FELINE ] » + 500 🪙"), premium: "🏆 GRAAL: 🐯 " + (fr ? "Avatar Tigre de Sibérie (Vidéo) + 1000 🪙" : "Siberian Tiger Avatar (Video) + 1000 🪙") }
      ]
    },
    {
      id: "s2",
      name: "HALLOWEEN",
      emoji: "🎃",
      start: "01/11/2026",
      end: "30/11/2026",
      tiers: [
        { tier: 1, free: "50" + PC, premium: fr ? "Titre « [ Chuchoteur de Fantômes ] » 👻" : "Title « [ Ghost Whisperer ] » 👻" },
        { tier: 2, free: "1 💡 " + PROJ, premium: "100" + PC },
        { tier: 3, free: "50" + PC, premium: fr ? "Titre « [ Danse Macabre ] » 🦴" : "Title « [ Macabre Dance ] » 🦴" },
        { tier: 4, free: "1 ⏳ " + FREEZE, premium: "🎃 " + (fr ? "Cadre « Lanterne »" : "Frame « Lantern »") },
        { tier: 5, free: "75" + PC, premium: "150" + PC },
        { tier: 6, free: "1 ⚡ " + JOKER, premium: fr ? "Pack de Consommables (Bonus)" : "Consumables Pack (Bonus)" },
        { tier: 7, free: "50" + PC, premium: fr ? "Titre « [ Pulsion Citrouille ] » 🎃" : "Title « [ Pumpkin Pulse ] » 🎃" },
        { tier: 8, free: "1 💡 " + PROJ, premium: "2 🌟 " + NOVAS },
        { tier: 9, free: "100" + PC, premium: "200" + PC },
        { tier: 10, free: "1 🌟 " + NOVA, premium: "🎨 " + (fr ? "Grille Lanterne (EXCLUSIF pass)" : "Lantern Grid (pass EXCLUSIVE)") },
        { tier: 11, free: "60" + PC, premium: "120" + PC },
        { tier: 12, free: "1 ⏳ " + FREEZE, premium: "1 💡 " + PROJ },
        { tier: 13, free: "70" + PC, premium: fr ? "Titre « [ Spectre d'Automne ] » 🍂" : "Title « [ Autumn Specter ] » 🍂" },
        { tier: 14, free: "1 ⚡ " + JOKER, premium: "2 ⏳ " + FREEZE },
        { tier: 15, free: "150" + PC, premium: "💀 " + (fr ? "Avatar Animé : Squelette qui danse" : "Animated Avatar: Dancing Skeleton") },
        { tier: 16, free: "80" + PC, premium: "160" + PC },
        { tier: 17, free: "2 💡 " + PROJ, premium: "2 🌟 " + NOVAS },
        { tier: 18, free: "90" + PC, premium: "250" + PC },
        { tier: 19, free: "1 ⚡ " + JOKER, premium: "1 📳 " + QUAKE },
        { tier: 20, free: "100" + PC, premium: "👻 " + (fr ? "Cadre « Fantôme »" : "Frame « Ghost »") },
        { tier: 21, free: "110" + PC, premium: "220" + PC },
        { tier: 22, free: "1 ⏳ " + FREEZE, premium: "3 💡 " + PROJ },
        { tier: 23, free: "120" + PC, premium: "350" + PC },
        { tier: 24, free: "1 ⚡ " + JOKER, premium: "🎨 " + (fr ? "Grille Fantôme (EXCLUSIF pass)" : "Ghost Grid (pass EXCLUSIVE)") },
        { tier: 25, free: "150" + PC, premium: "🦇 " + (fr ? "Avatar Vidéo : Chauve-Souris" : "Video Avatar: Bat") },
        { tier: 26, free: "130" + PC, premium: "260" + PC },
        { tier: 27, free: "2 💡 " + PROJ, premium: "4 🌟 " + NOVAS },
        { tier: 28, free: "140" + PC, premium: "400" + PC },
        { tier: 29, free: "300" + PC, premium: "500" + PC },
        { tier: 30, free: (fr ? "Titre « [ 👻 Esprit d'Halloween ] » + 500 🪙" : "Title « [ 👻 Halloween Spirit ] » + 500 🪙"), premium: "🏆 GRAAL: 🎃 " + (fr ? "Avatar Citrouille du Château + 1000 🪙 + Titre « [ ROI D'HALLOWEEN ] »" : "Castle Pumpkin Avatar + 1000 🪙 + Title « [ KING OF HALLOWEEN ] »") }
      ]
    },
    {
      id: "s3",
      name: fr ? "NOËL" : "CHRISTMAS",
      emoji: "🎄",
      start: "01/12/2026",
      end: "10/01/2027",
      tiers: [
        { tier: 1, free: "50" + PC, premium: fr ? "Titre « [ Lutin espiègle ] » 🧝" : "Title « [ Mischievous Elf ] » 🧝" },
        { tier: 2, free: "1 💡 " + PROJ, premium: "100" + PC },
        { tier: 3, free: "50" + PC, premium: fr ? "Titre « [ Pilote de traîneau ] » 🛷" : "Title « [ Sleigh Pilot ] » 🛷" },
        { tier: 4, free: "1 ⏳ " + FREEZE, premium: "🍭 " + (fr ? "Cadre « Bonbon »" : "Frame « Candy »") },
        { tier: 5, free: "75" + PC, premium: "⛄ " + (fr ? "Avatar Animé Lottie : Bonhomme de Neige" : "Lottie Animated Avatar: Snowman") },
        { tier: 6, free: "1 ⚡ " + JOKER, premium: fr ? "Pack de Consommables (Bonus)" : "Consumables Pack (Bonus)" },
        { tier: 7, free: "50" + PC, premium: fr ? "Titre « [ Dompteur de rennes ] » 🦌" : "Title « [ Reindeer Tamer ] » 🦌" },
        { tier: 8, free: "1 💡 " + PROJ, premium: "2 🌟 " + NOVAS },
        { tier: 9, free: "100" + PC, premium: "200" + PC },
        { tier: 10, free: "1 🌟 " + NOVA, premium: "🍭 " + (fr ? "Grille Bonbon Canne (EXCLUSIF pass)" : "Candy Cane Grid (pass EXCLUSIVE)") },
        { tier: 11, free: "60" + PC, premium: "120" + PC },
        { tier: 12, free: "1 ⏳ " + FREEZE, premium: "1 💡 " + PROJ },
        { tier: 13, free: "70" + PC, premium: fr ? "Titre « [ Assistant du Père Noël ] » 🎅" : "Title « [ Santa's Assistant ] » 🎅" },
        { tier: 14, free: "1 ⚡ " + JOKER, premium: "2 ⏳ " + FREEZE },
        { tier: 15, free: "🔮 " + (fr ? "Avatar Boule de Neige (Cadeau 🎁)" : "Snowball Avatar (Gift 🎁)"), premium: "🔮 " + (fr ? "Avatar Animé Lottie : Boule de Neige" : "Lottie Animated Avatar: Snowball") },
        { tier: 16, free: "80" + PC, premium: "160" + PC },
        { tier: 17, free: "2 💡 " + PROJ, premium: "2 🌟 " + NOVAS },
        { tier: 18, free: "90" + PC, premium: "250" + PC },
        { tier: 19, free: "1 ⚡ " + JOKER, premium: "1 📳 " + QUAKE },
        { tier: 20, free: "100" + PC, premium: "🎄 " + (fr ? "Cadre « Guirlande »" : "Frame « Garland »") },
        { tier: 21, free: "110" + PC, premium: "220" + PC },
        { tier: 22, free: "1 ⏳ " + FREEZE, premium: "3 💡 " + PROJ },
        { tier: 23, free: "120" + PC, premium: "350" + PC },
        { tier: 24, free: "1 ⚡ " + JOKER, premium: "🎄 " + (fr ? "Grille Sapin de Noël (EXCLUSIF pass)" : "Christmas Tree Grid (pass EXCLUSIVE)") },
        { tier: 25, free: "150" + PC, premium: "🎅 " + (fr ? "Avatar Animé Lottie : Père Noël" : "Lottie Animated Avatar: Santa Claus") },
        { tier: 26, free: "130" + PC, premium: "260" + PC },
        { tier: 27, free: "2 💡 " + PROJ, premium: "4 🌟 " + NOVAS },
        { tier: 28, free: "140" + PC, premium: fr ? "Titre « [ Magie de Noël ] » ✨" : "Title « [ Christmas Magic ] » ✨" },
        { tier: 29, free: "300" + PC, premium: "🧝 " + (fr ? "Cadre « Lutin »" : "Frame « Elf »") },
        { tier: 30, free: (fr ? "Titre « [ 🎄 Esprit de Noël ] » + 500 🪙" : "Title « [ 🎄 Christmas Spirit ] » + 500 🪙"), premium: "🏆 GRAAL: 🧝 " + (fr ? "Grille Lutin + 1000 🪙" : "Elf Grid + 1000 🪙") }
      ]
    }
  ];
}

function getActiveSeason() {
  const list = getSeasonsClient();
  if (myProfile.currentSeasonId) {
    const s = list.find(x => x.id === myProfile.currentSeasonId);
    if (s) return s;
  }
  const now = new Date();
  for (const s of list) {
    const [d1, m1, y1] = s.start.split("/").map(Number);
    const [d2, m2, y2] = s.end.split("/").map(Number);
    if (now >= new Date(y1, m1 - 1, d1) && now <= new Date(y2, m2 - 1, d2, 23, 59)) return s;
  }
  const [fd, fm, fy] = list[0].start.split("/").map(Number);
  if (now < new Date(fy, fm - 1, fd)) return list[0];
  return list[list.length - 1];
}

/* ============================================================
7. PASSE DE SAISON — NAVIGATION
============================================================ */
function openBlitzPass() {
  if (!isProfileValid()) { checkAndShowProfileModal(); return; }
  document.getElementById("modal-blitz-pass").style.display = "flex";
  renderBlitzPass();
}

function closeBlitzPass() {
  if (_passLockInterval) { clearInterval(_passLockInterval); _passLockInterval = null; }
  document.getElementById("modal-blitz-pass").style.display = "none";
}

/* ============================================================
8. PASSE DE SAISON — RENDU
============================================================ */
function renderBlitzPass() {
  const fr = currentLang === "fr";
  const container = document.getElementById("blitz-pass-container");
  
  if (!isSeasonPassEnabled()) { renderPassLockedScreen(container, fr); return; }
  
  const season = getActiveSeason();
  const seasonData = (myProfile.claimedPassTiers || {})[season.id] || {};
  const isPremium = !!seasonData.premium || (season.id === "s1" && myProfile.blitzPassPremium);
  const claimed = seasonData;
  const unlockedTier = (myProfile.seasonProgress && myProfile.seasonProgress[season.id] && myProfile.seasonProgress[season.id].unlocked_tier) || 0;
  
  container.innerHTML = `
    <div class="bp-header-banner">
      <div style="font-size:13px; font-weight:900; color:#f8b500; margin-bottom:2px;">${season.emoji} ${fr ? "PASSE DE SAISON :" : "SEASON PASS:"} ${season.name}</div>
      <div style="font-size:9px; color:#aaa; margin-bottom:4px;">📅 ${season.start} → ${season.end}</div>
            <div style="font-size:10px; color:#ccc; margin-bottom:6px;">${isPremium ? (fr ? "✨ Passe Premium Actif !" : "✨ Premium Pass Active!") : (fr ? "Débloque le Passe Premium (3€)" : "Unlock the Premium Pass (€3)")}</div>
      <div style="font-size:10px; color:#00ff88; margin-bottom:6px;">${fr ? "🔓 Paliers débloqués : " : "🔓 Unlocked tiers: "} <b>${unlockedTier}/30</b></div>
      <div style="font-size:9px; color:#aaa; margin-bottom:6px; line-height:1.4;">ℹ️ ${fr ? "1 palier par jour de connexion. Pas besoin de jouer tous les jours consécutifs : ce sont 30 jours de connexion, pas 30 jours calendaires." : "1 tier per login day. You don't need to play every consecutive day: it's 30 login days, not 30 calendar days."}</div>
      ${!isPremium 
        ? `<button class="btn-main btn-gold" onclick="IAP.buyPassPremium()" style="padding:6px 10px; font-size:11px; margin:0 auto; width:auto;">${fr ? "💳 Acheter le Passe Premium (3€)" : "💳 Buy Premium Pass (€3)"}</button>` 
        : `<div style="color:#00ff88; font-weight:bold; font-size:10px;">${fr ? "Statut : VIP / Premium" : "Status: VIP / Premium"}</div>`
      }
    </div>`;
  
  if (!season.tiers || season.tiers.length === 0) {
    container.innerHTML += `<div style="text-align:center; color:#aaa; padding:20px; font-size:12px; font-weight:bold;">${season.emoji} ${fr ? "Le contenu de la saison arrive bientôt !" : "Season content coming soon!"}</div>`;
    return;
  }
  
  const scroll = document.createElement("div");
  scroll.className = "bp-track-scroll";
  
  season.tiers.forEach(t => {
    const freeKey = `${t.tier}_free`, premKey = `${t.tier}_premium`;
    const isFreeClaimed = claimed[freeKey], isPremClaimed = claimed[premKey];
    
    const isLockedFree = t.tier > unlockedTier;
    const isLockedPrem = (t.tier > unlockedTier) || !isPremium;
    
    const col = document.createElement("div");
    col.className = "bp-tier-col";
    col.id = "bp-card-" + t.tier;
    
    const lockOverlayFree = isLockedFree ? `<div style="position:absolute; inset:0; background:rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; font-size:24px; z-index:10; border-radius:8px;">🔒</div>` : '';
    const lockOverlayPrem = isLockedPrem ? `<div style="position:absolute; inset:0; background:rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; font-size:24px; z-index:10; border-radius:8px;">🔒</div>` : '';
    
    col.innerHTML = `
      <div class="bp-cell bp-prem ${isPremClaimed ? 'claimed' : ''}" onclick="claimPassReward(${t.tier},'premium')" style="position:relative;">
        ${lockOverlayPrem}
        <div class="bp-ribbon">⭐ PREMIUM</div>
        ${rewardVisualHTML(season.id, t.tier, 'premium', t.premium)}
      </div>
      <div class="bp-tier-num">${t.tier}</div>
      <div class="bp-cell bp-free ${isFreeClaimed ? 'claimed' : ''}" onclick="claimPassReward(${t.tier},'free')" style="position:relative;">
        ${lockOverlayFree}
        <div class="bp-ribbon free">${currentLang === "fr" ? "GRATUIT" : "FREE"}</div>
        ${rewardVisualHTML(season.id, t.tier, 'free', t.free)}
      </div>`;
    scroll.appendChild(col);
  });
  
  container.appendChild(scroll);
  
  scroll.addEventListener('wheel', (e) => {
    if (window.innerWidth > 700) {
      e.preventDefault();
      scroll.scrollLeft += (e.deltaY + e.deltaX);
    }
  }, { passive: false });

  updatePassSeasonLabels();
  setTimeout(() => {
    if (typeof initAllLottieBadges === "function") initAllLottieBadges();
  }, 60);
}

/* ============================================================
9. PASSE DE SAISON — ACHAT & RÉCLAMATION
============================================================ */
// Ancien achat en pièces remplacé par achat réel via RevenueCat.
// Gardé comme alias pour compatibilité (au cas où un ancien code l'appellerait).
function buyBlitzPassPremium() {
  if (window.IAP && typeof IAP.buyPassPremium === "function") IAP.buyPassPremium();
}

function claimPassReward(tier, track) {
  if (track === "premium" && !myProfile.blitzPassPremium) {
    showNotificationToast(currentLang === "fr" ? "❌ Tu dois acheter le Passe Premium pour récupérer cette récompense !" : "❌ You must buy the Premium Pass to claim this reward!", "announcement");
    return;
  }
  socket.emit("claim_pass_tier", { tier, track });
}

socket.on("pass_tier_claimed", (data) => {
  const tier = data.tier, track = data.track;
  const season = getActiveSeason();
  
  let icon = "🌟";
  if (season.id === "s2") icon = (tier === 30 && track === "premium") ? "🎃" : (tier === 25 && track === "premium") ? "🦇" : (tier === 15 && track === "premium") ? "💀" : "🎃";
  else if (season.id === "s3") icon = (tier === 30 && track === "premium") ? "🍪" : (tier === 25 && track === "premium") ? "🎅" : (tier === 15 && track === "premium") ? "🔮" : (tier === 5 && track === "premium") ? "⛄" : "🎄";
  else icon = (tier === 30 && track === "premium") ? "🐯" : (tier === 25 && track === "premium") ? "🌈" : (tier === 15 && track === "premium") ? "🐱" : "🌟";
  
  const col = document.getElementById("bp-card-" + tier);
  if (col) {
    const card = col.querySelector(track === 'premium' ? '.bp-card-prem' : '.bp-card-free') || col;
    card.classList.remove("bp-unlock");
    void card.offsetWidth;
    card.classList.add("bp-unlock");
    spawnUnlockBurst(col, icon);
  }
  
  const ns = Date.now();
  if (ns - lastRewardSoundTime > PASS_CONFIG.CLAIM_COOLDOWN_MS) {
    lastRewardSoundTime = ns;
    SoundEngine.playVictory();
  }
  
  setTimeout(() => { ; }, 450);
});

socket.on("pass_claim_denied", (data) => {
  if (data.reason === "premium_required") {
    showNotificationToast(currentLang === "fr" ? "❌ Tu dois acheter le Passe Premium pour récupérer cette récompense !" : "❌ You must buy the Premium Pass to claim this reward!", "announcement");
  } else if (data.reason === "already_claimed") {
    showNotificationToast(currentLang === "fr" ? "❌ Cette récompense a déjà été récupérée." : "❌ This reward has already been claimed.", "announcement");
  } else if (data.reason === "tier_locked") {
    showNotificationToast(currentLang === "fr" ? `🔒 Palier ${data.tier} verrouillé. Débloqué au palier ${data.unlocked + 1} demain.` : `🔒 Tier ${data.tier} locked. Unlocks at tier ${data.unlocked + 1} tomorrow.`, "announcement");
  }
});

/* ============================================================
10. PASSE DE SAISON — EFFETS VISUELS
============================================================ */
function showRewardPopUp(rewardName, rewardIcon) {
  let popup = document.getElementById("reward-popup-overlay");
  if (!popup) {
    popup = document.createElement("div");
    popup.id = "reward-popup-overlay";
    popup.className = "modal-overlay";
    popup.innerHTML = `
      <div class="modal-card" style="text-align:center; animation: victoryScalePop 0.5s cubic-bezier(0.175,0.885,0.32,1.275) forwards; border-color:#f8b500; box-shadow:0 0 40px rgba(248,181,0,0.8);">
        <div style="font-size:55px; margin-bottom:10px;" id="popup-reward-icon">🎁</div>
        <div style="font-size:10px; font-weight:900; color:#f8b500; letter-spacing:2px; margin-bottom:4px;">RÉCOMPENSE DÉBLOQUÉE</div>
        <div id="popup-reward-name" style="color:#fff; font-size:15px; font-weight:bold; margin-bottom:20px; line-height:1.4;">-</div>
        <button class="btn-main btn-gold" onclick="document.getElementById('reward-popup-overlay').style.display='none'" style="width:100%; margin-top:0;">Récupéré ! ⚡</button>
      </div>`;
    document.body.appendChild(popup);
  }
  
  document.getElementById("popup-reward-icon").innerText = rewardIcon || "🎁";
  document.getElementById("popup-reward-name").innerText = rewardName;
  popup.style.display = "flex";
  
  const now = Date.now();
  if (now - lastRewardSoundTime > PASS_CONFIG.CLAIM_COOLDOWN_MS) {
    lastRewardSoundTime = now;
    SoundEngine.playVictory();
  }
  
  if (rewardPopupTimeout) clearTimeout(rewardPopupTimeout);
  rewardPopupTimeout = setTimeout(() => { popup.style.display = "none"; }, PASS_CONFIG.REWARD_POPUP_DURATION);
}

function spawnUnlockBurst(card, icon) {
  const rect = card.getBoundingClientRect();
  for (let i = 0; i < PASS_CONFIG.BURST_PARTICLE_COUNT; i++) {
    const p = document.createElement('div');
    p.className = 'bp-burst';
    p.innerText = icon;
    p.style.left = (rect.left + rect.width / 2) + 'px';
    p.style.top = (rect.top + rect.height / 2) + 'px';
    const ang = (Math.PI * 2 / PASS_CONFIG.BURST_PARTICLE_COUNT) * i, dist = 60 + Math.random() * 40;
    p.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
    p.style.setProperty('--dy', Math.sin(ang) * dist + 'px');
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 900);
  }
}

/* ============================================================
11. PASSE DE SAISON — APERÇUS VISUELS
============================================================ */
const SPECIAL_REWARDS = {
  s1: {
    free: { 30: 'title_supreme' },
    premium: { 1: 'title_stalker', 3: 'title_felin', 4: 'frame_silver', 7: 'title_neon', 10: 'theme_neon', 13: 'title_spectre', 15: 'avatar_lottie_palier15', 20: 'frame_chroma', 23: 'title_supreme', 25: 'avatar_lottie_palier30', 30: 'avatar_tigre' }
  },
  s2: {
    free: { 30: 'title_esprit_halloween' },
    premium: { 1: 'title_fantome', 3: 'title_danse_macabre', 4: 'frame_osseux', 7: 'title_citrouille', 10: 'theme_citrouille', 13: 'title_spectre_automne', 15: 'avatar_s2_squelette', 20: 'frame_fantome', 24: 'theme_fantome', 25: 'avatar_s2_chauve', 30: 'avatar_s2_citrouille' }
  },
  s3: {
    free: { 15: 'avatar_s3_boule', 30: 'title_esprit_noel' },
    premium: { 1: 'title_lutin', 3: 'title_traineau', 4: 'frame_bonbon', 5: 'avatar_s3_bonhomme', 7: 'title_rennes', 10: 'theme_bonbon', 13: 'title_assistant_noel', 15: 'avatar_s3_boule', 20: 'frame_guirlande', 24: 'theme_sapin', 25: 'avatar_s3_perenoel', 28: 'title_magie_noel', 29: 'frame_lutin', 30: 'theme_lutin' }
  }
};

const THEME_GRAD = {
  theme_neon: 'linear-gradient(135deg,#ff007f,#00e5ff,#76ff03)',
  theme_glacial: 'linear-gradient(135deg,#0a2a4d,#0ea5c9)',
  theme_eclair: 'linear-gradient(135deg,#282805,#fff34d)',
  theme_obsidian: 'linear-gradient(135deg,#0a050a,#23050f)',
  theme_alt: 'linear-gradient(135deg,#f8b500,#ff8a00)',
  theme_citrouille: 'linear-gradient(135deg,#1a0d00,#ff8a00)',
  theme_fantome: 'linear-gradient(135deg,#1a0033,#7b2ff7)',
  theme_bonbon: 'linear-gradient(135deg,#ff4b4b,#fff)',
  theme_sapin: 'linear-gradient(135deg,#0a3d1f,#1a7a3c)',
  theme_lutin: 'linear-gradient(135deg,#c62828,#ffd23b)'
};

function firstEmoji(text) {
  const m = String(text).match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/);
  return m ? m[0] : '🎁';
}

function avatarPreviewHTML(id) {
  if (id === 'avatar_tigre') return `<video class="tft-avatar-video" src="tiger-siberien.mp4" autoplay loop muted playsinline style="width:44px;height:44px;border-radius:50%;"></video>`;
  if (id === 'avatar_s2_chauve') return `<video class="tft-avatar-video" src="bat-halloween.mp4" autoplay loop muted playsinline style="width:44px;height:44px;border-radius:50%;"></video>`;
  const lm = {
    avatar_lottie_palier15: 'cat-assistant.json',
    avatar_lottie_palier30: 'black-rainbow-cat.json',
    avatar_s2_squelette: 'squelette-danse.json',
    avatar_s2_citrouille: 'citrouille-chateau.json',
    avatar_s3_bonhomme: 'bonhomme-de-neige-avatar.json',
    avatar_s3_boule: 'boule-de-neige-avatar.json',
    avatar_s3_perenoel: 'pere-noel-avatar.json'
  };
  if (lm[id]) return `<div class="lottie-avatar-badge" data-lottie-url="${lm[id]}" style="width:44px;height:44px;"></div>`;
  return '🎁';
}

function rewardVisualHTML(seasonId, tier, track, text) {
  const fr = currentLang === "fr";
  try {
    const item = (SPECIAL_REWARDS[seasonId] && SPECIAL_REWARDS[seasonId][track] && SPECIAL_REWARDS[seasonId][track][tier]) || null;
    if (item) {
      if (item.indexOf('avatar_') === 0) return `<div class="bp-visual">${avatarPreviewHTML(item)}<div class="bp-type">${fr ? "Avatar" : "Avatar"}</div></div>`;
      if (item.indexOf('frame_') === 0) return `<div class="bp-visual"><div class="tft-avatar-container ${getFrameClass(item)}" style="width:40px;height:40px;">⭐</div><div class="bp-type">${fr ? "Cadre" : "Frame"}</div></div>`;
      if (item.indexOf('theme_') === 0) return `<div class="bp-visual"><div class="bp-swatch" style="background:${THEME_GRAD[item] || 'linear-gradient(135deg,#522d80,#2a1845)'}"></div><div class="bp-type">${fr ? "Grille" : "Grid"}</div></div>`;
      if (item.indexOf('title_') === 0) return `<div class="bp-visual bp-title">${(typeof getTitleDisplayNames !== 'undefined' && getTitleDisplayNames()[item]) || item}<div class="bp-type">${fr ? "Titre" : "Title"}</div></div>`;
    }
    const emoji = firstEmoji(text);
    const label = String(text).split(emoji).join('').trim();
    let type = fr ? 'Récompense' : 'Reward';
    if (/Pièces|Coins/i.test(text)) type = fr ? 'Pièces' : 'Coins';
    else if (/Projecteur|Blocage|Joker|Nova|Séisme|Pack|Spotlight|Freeze|Earthquake|Lightning|Time/i.test(text)) type = fr ? 'Pouvoir' : 'Power';
    return `<div class="bp-visual"><div class="bp-emoji">${emoji}</div><div class="bp-label">${label}</div><div class="bp-type">${type}</div></div>`;
  } catch (e) {
    return `<div class="bp-visual"><div class="bp-emoji">🎁</div><div class="bp-label">${text}</div></div>`;
  }
}

/* ============================================================
12. PASSE DE SAISON — LABELS DYNAMIQUES
============================================================ */
const SEASON_PASS_SUBTITLES = {
  s1: { fr: "Néon Félin & Récompenses 🐱", en: "Feline Neon & Rewards 🐱" },
  s2: { fr: "Frisson d'Halloween & Récompenses 🎃", en: "Halloween Thrill & Rewards 🎃" },
  s3: { fr: "Magie de Noël & Récompenses 🎄", en: "Christmas Magic & Rewards 🎄" }
};

function updatePassSeasonLabels() {
  const season = getActiveSeason();
  const num = season.id.replace("s", "");
  const lang = currentLang === "fr" ? "fr" : "en";
  
  const titleEl = document.getElementById("pass-menu-title");
  if (titleEl) titleEl.innerText = (lang === "fr" ? "PASSE DE SAISON • SAISON " : "SEASON PASS • SEASON ") + num + " " + season.emoji + " " + season.name;
  
  const subEl = document.getElementById("pass-menu-sub");
  if (subEl) subEl.innerText = (SEASON_PASS_SUBTITLES[season.id] && SEASON_PASS_SUBTITLES[season.id][lang]) || (lang === "fr" ? "Récompenses 🌟" : "Rewards 🌟");
  
  const badgeEl = document.getElementById("pass-modal-season");
  if (badgeEl) badgeEl.innerText = (lang === "fr" ? "Saison " : "Season ") + num + " • " + season.emoji + " " + season.name;
}

if (typeof socket !== "undefined") {
  socket.on("player_registered", () => setTimeout(() => {
    updatePassSeasonLabels();
    applyPassLockToMenu();
    if (document.getElementById("modal-blitz-pass").style.display === "flex") renderBlitzPass();
  }, 60));
  socket.on("season_updated", () => setTimeout(() => {
    updatePassSeasonLabels();
    applyPassLockToMenu();
    if (document.getElementById("modal-blitz-pass").style.display === "flex") renderBlitzPass();
  }, 60));
}

document.addEventListener("DOMContentLoaded", () => setTimeout(() => { updatePassSeasonLabels(); applyPassLockToMenu(); }, 150));
