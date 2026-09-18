/* ============================================================
MODES-CATCH.JS — MODES SAISONNIERS (Halloween 🎃 / Noël 🎄)
Mécanique : attraper les bons items, éviter les mauvais
Base : 100🪙 + Bonus : 100🪙 (non doublé x2)
============================================================ */

/* ============================================================
1. CONSTANTES
============================================================ */
const CATCH_CONFIG = {
  GAME_DURATION: 30,
  MAX_BONUS: 300,
  SCORE_GOOD: 10,
  SCORE_BAD: -15,
  SCORE_HAPPY: 20,
  SCORE_MEAN: -20,
  MISS_PENALTY: -5,
  MAX_ITEMS_HALLOWEEN: 14,
  MAX_ITEMS_NOEL: 12,
  SPAWN_BASE_HALLOWEEN: 800,
  SPAWN_BASE_NOEL: 850,
  SPEED_BASE_HALLOWEEN: 2.1,
  SPEED_BASE_NOEL: 3.2,
  HARD_MULTIPLIER: 1.3,
  HITBOX_MOBILE_BASE: 65,
  HITBOX_PC_BASE: 65,
  HITBOX_BAD_BASE: 45
};

/* ============================================================
2. CONFIGURATION & HELPERS
============================================================ */
function getCatchConfig() {
  const d = i18n[currentLang];
  return {
    halloween: {
      good: "🦇", bad: "👻", happy: "🎃", mean: "🎃",
      label: d.catch_halloween_label,
      rules: d.catch_halloween_rules
    },
    noel: {
      good: "🎁", bad: "🎄", happy: "🧝", mean: "🧝",
      label: d.catch_noel_label,
      rules: d.catch_noel_rules
    }
  };
}

function isCatchMobile() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || 
         (navigator.maxTouchPoints > 2 && Math.min(screen.width, screen.height) < 900);
}

/* ============================================================
3. ÉTAT DU JEU
============================================================ */
let catchState = null;

/* ============================================================
4. NAVIGATION & CHOIX DU MODE
============================================================ */
function startHalloweenQueue() { openCatchChoice("halloween"); }
function startNoelQueue() { openCatchChoice("noel"); }

function openCatchChoice(theme) {
  const d = i18n[currentLang];
  closeCatchChoice();
  const cfg = getCatchConfig()[theme];
  const ov = document.createElement('div');
  ov.id = 'catch-choice-overlay';
  ov.className = 'modal-overlay';
  ov.innerHTML = `
    <div class="modal-card" style="max-width:340px;text-align:center;">
      <h2 style="color:#f8b500;margin:0 0 8px 0;">${cfg.label}</h2>
      <div style="background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.15);border-radius:10px;padding:12px;font-size:14px;color:#eee;line-height:1.6;margin-bottom:10px;text-align:left;">
        <b style="color:#00d2ff;">${d.catch_how_to_play}</b><br>${cfg.rules}
      </div>
      <button class="btn-main btn-blue" onclick="launchCatch('${theme}',false)">${d.catch_solo_btn}</button>
      <button class="btn-main btn-gold" onclick="launchCatch('${theme}',true)">${d.catch_1v1_btn}</button>
      <button class="btn-secondary" onclick="closeCatchChoice()">⬅️ ${d.back}</button>
    </div>`;
  document.body.appendChild(ov);
}

function closeCatchChoice() {
  const o = document.getElementById('catch-choice-overlay');
  if (o) o.remove();
}

function launchCatch(theme, is1v1) {
  closeCatchChoice();
  if (is1v1) {
    hideAllScreens();
    document.getElementById('screen-1v1-lobby').style.display = 'flex';
    socket.emit(theme === 'halloween' ? 'find_halloween_match' : 'find_noel_match');
  } else {
    beginCatch(theme, false, null);
  }
}

/* ============================================================
5. HANDLERS SOCKET.IO
============================================================ */
socket.on('start_catch', (data) => {
  hideAllScreens();
  document.getElementById('countdown-overlay').style.display = 'flex';
  let c = 3;
  document.getElementById('countdown-number').innerText = c;
  const t = setInterval(() => {
    c--;
    if (c > 0) document.getElementById('countdown-number').innerText = c;
    else {
      clearInterval(t);
      document.getElementById('countdown-overlay').style.display = 'none';
      beginCatch(data.theme, true, data.opponent);
    }
  }, 1000);
});

socket.on('catch_timer', (time) => {
  if (catchState && catchState.is1v1) {
    catchState.timeLeft = time;
    updateCatchHUD();
    if (time <= 0) stopCatchSpawning();
  }
});

socket.on('catch_opp_score', (d) => {
  if (catchState) {
    catchState.oppScore = d.score;
    updateCatchHUD();
  }
});

socket.on('game_over_1v1', (data) => {
  if (data.isCatch) catchState = null;
});

/* ============================================================
6. LANCEMENT DU MODE
============================================================ */
function beginCatch(theme, is1v1, opponent) {
  if (!is1v1 && (typeof socket === 'undefined' || !socket.connected)) {
  if (typeof showNotificationToast === 'function') showNotificationToast(currentLang === 'fr' ? '❌ Connexion serveur perdue. Attends 2-3 s puis réessaie.' : '❌ Server connection lost. Wait 2-3 s and retry.', 'announcement');
  return;
}
  clearCatchArena();
  // ✅ ANTI-TRICHE : annonce le début de la partie catch SOLO au serveur (timestamp de référence)
  if (!is1v1 && typeof socket !== "undefined" && socket.connected) socket.emit("catch_solo_start");
  catchState = {
    theme,
    is1v1,
    opponent,
    score: 0,
    bonus: 0,
    oppScore: 0,
    timeLeft: CATCH_CONFIG.GAME_DURATION,
    active: true,
    items: [],
    hutX: innerWidth / 2,
    spawnDelay: CATCH_CONFIG.SPAWN_BASE_HALLOWEEN,
    speed: theme === 'halloween' ? CATCH_CONFIG.SPEED_BASE_HALLOWEEN : CATCH_CONFIG.SPEED_BASE_NOEL,
    lastHappy: Date.now(),
    hard: CATCH_CONFIG.HARD_MULTIPLIER
  };
  
  const cfg = getCatchConfig()[theme];
  const arena = document.createElement('div');
  arena.id = 'catch-arena';
  arena.className = theme;
  const extra = theme === 'noel' ? '<div id="catch-santa"></div>' : '<div id="catch-backdrop">🏰</div>';
  arena.innerHTML = `
    ${extra}
    <div id="catch-hud">
      <div>⭐ <span id="catch-score">0</span></div>
      <div id="catch-timer" style="color:#ff007f;">${CATCH_CONFIG.GAME_DURATION}</div>
      <div>${is1v1 ? '🆚 <span id="catch-opp">0</span>' : '🎁 <span id="catch-bonus">0</span>'}</div>
    </div>
    <div style="text-align:center;font-weight:900;color:#fff;">${cfg.label}</div>
    <div id="catch-field"></div>`;
  document.body.appendChild(arena);
  document.body.style.overflow = 'hidden';
  
  // Sauvegarde saison actuelle
  catchState.prevSeason = window.CURRENT_SEASON;
  window.CURRENT_SEASON = (theme === 'halloween' ? 's2' : 's3');
  
  // Musique saisonnière
  if (typeof SoundEngine !== "undefined" && typeof SoundEngine.startMusicSeasonal === "function") {
    SoundEngine.startMusicSeasonal(theme === 'halloween' ? 's2game' : 's3game');
  }

  // Mode Noël : déplacement de la hotte
  if (theme === 'noel') {
    const hut = document.getElementById('catch-santa');
    const move = (x) => {
      catchState.hutX = Math.max(50, Math.min(innerWidth - 50, x));
      hut.style.left = catchState.hutX + 'px';
    };
    arena.addEventListener('pointermove', (e) => move(e.clientX));
    arena.addEventListener('touchmove', (e) => {
      if (e.touches[0]) move(e.touches[0].clientX);
      e.preventDefault();
    }, { passive: false });
    move(innerWidth / 2);
    catchState.raf = requestAnimationFrame(noelLoop);
  }
  
  // Timer solo
  if (!is1v1) {
    catchState.timerInterval = setInterval(() => {
      catchState.timeLeft--;
      updateCatchHUD();
      if (catchState.timeLeft <= 0) endCatchSolo();
    }, 1000);
  }
  
  scheduleSpawn();
}

/* ============================================================
7. SPAWNING & BOUCLE DE JEU
============================================================ */
function scheduleSpawn() {
  if (!catchState || !catchState.active) return;
  spawnCatchItem();
  
  const elapsed = CATCH_CONFIG.GAME_DURATION - catchState.timeLeft;
  const H = catchState.hard || 1;
  
  if (catchState.theme === 'noel') {
    catchState.spawnDelay = Math.max(500 / H, (CATCH_CONFIG.SPAWN_BASE_NOEL - elapsed * 12) / H);
  } else {
    catchState.spawnDelay = Math.max(400 / H, (CATCH_CONFIG.SPAWN_BASE_HALLOWEEN - elapsed * 13) / H);
    catchState.speed = Math.max(1.4 / H, (2.6 - elapsed * 0.04) / H);
  }
  
  catchState.spawnTimeout = setTimeout(scheduleSpawn, catchState.spawnDelay);
}

function spawnCatchItem() {
  const field = document.getElementById('catch-field');
  if (!field || !catchState) return;
  
  const cfg = getCatchConfig()[catchState.theme];
  const r = Math.random();
  let type;
  
  if (r < 0.62) type = 'good';
  else if (r < 0.84) type = 'bad';
  else if (r < 0.92) type = 'happy';
  else type = 'mean';
  
  const el = document.createElement('div');
  el.className = 'catch-item';
  
  if (type === 'happy' || type === 'mean') {
    el.classList.add((catchState.theme === 'halloween' ? 'ci-pump-' : 'ci-elf-') + (type === 'happy' ? 'happy' : 'mean'));
  } else {
    el.innerText = cfg[type];
  }
  
  if (catchState.theme === 'halloween') {
    if (field.childElementCount > CATCH_CONFIG.MAX_ITEMS_HALLOWEEN) return;
    el.classList.add('fall');
    el.style.fontSize = (52 + Math.random() * 26) + 'px';
    el.style.left = (10 + Math.random() * Math.max(60, innerWidth - 100)) + 'px';
    el.style.top = '-80px';
    el.style.animationDuration = catchState.speed + 's';
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      applyCatch(type, e.clientX, e.clientY);
      el.remove();
    }, { once: true });
    el.addEventListener('animationend', () => {
      if (type === 'good') penaltyMiss(el);
      el.remove();
    });
    field.appendChild(el);
  } else {
    if (catchState.items.length > CATCH_CONFIG.MAX_ITEMS_NOEL) return;
    el.style.fontSize = (40 + Math.random() * 16) + 'px';
    el.style.left = '0px';
    el.style.top = '0px';
    field.appendChild(el);
    const bx = 30 + Math.random() * Math.max(60, innerWidth - 70);
    catchState.items.push({
      el,
      type,
      bx,
      x: bx,
      y: -60,
      ph: Math.random() * 6.28,
      vy: (2.4 + Math.random() * 1.4 + (CATCH_CONFIG.GAME_DURATION - catchState.timeLeft) * 0.05) * (catchState.hard || 1)
    });
  }
}

function noelLoop() {
  if (!catchState || !catchState.active || catchState.theme !== 'noel') return;
  
  const hutTop = innerHeight - 110;
  
  for (let i = catchState.items.length - 1; i >= 0; i--) {
    const it = catchState.items[i];
    it.y += it.vy;
    it.x = Math.max(20, Math.min(innerWidth - 20, it.bx + Math.sin(it.y * 0.02 + it.ph) * 28 * (catchState.hard || 1)));
    it.el.style.transform = 'translate3d(' + it.x + 'px,' + it.y + 'px,0)';
    
    const base = (it.type === 'good' || it.type === 'happy') ? CATCH_CONFIG.HITBOX_MOBILE_BASE : CATCH_CONFIG.HITBOX_BAD_BASE;
    const w = isCatchMobile() ? base / (catchState.hard || 1) : base;
    
    if (it.y >= hutTop - 45 && it.y <= hutTop + 50 && Math.abs(it.x - catchState.hutX) < w) {
      applyCatch(it.type, it.x, it.y);
      it.el.remove();
      catchState.items.splice(i, 1);
    } else if (it.y > innerHeight + 60) {
      if (it.type === 'good') penaltyMiss(it.el);
      it.el.remove();
      catchState.items.splice(i, 1);
    }
  }
  
  catchState.raf = requestAnimationFrame(noelLoop);
}

/* ============================================================
8. SCORING & COLLISION
============================================================ */
function applyCatch(type, fx, fy) {
  if (!catchState || !catchState.active) return;
  
  let delta = 0, isBonus = false;
  
  if (type === 'good') delta = CATCH_CONFIG.SCORE_GOOD;
  else if (type === 'bad') delta = CATCH_CONFIG.SCORE_BAD;
  else if (type === 'happy') { delta = CATCH_CONFIG.SCORE_HAPPY; isBonus = true; }
  else if (type === 'mean') { delta = CATCH_CONFIG.SCORE_MEAN; isBonus = true; }
  
  if (isBonus && !catchState.is1v1) {
    catchState.bonus = Math.max(0, Math.min(CATCH_CONFIG.MAX_BONUS, catchState.bonus + delta));
  } else {
    catchState.score = Math.max(0, catchState.score + delta);
  }
  
  updateCatchHUD();
  if (fx !== undefined) floatCatch(delta, fx, fy);
  if (delta >= 0) SoundEngine.playClick();
  else SoundEngine.playError();
  
  if (catchState.is1v1) socket.emit('catch_click', { delta });
}

function penaltyMiss(el) {
  if (!catchState || !catchState.active) return;
  catchState.score = Math.max(0, catchState.score + CATCH_CONFIG.MISS_PENALTY);
  updateCatchHUD();
  const r = el.getBoundingClientRect();
  floatCatch(CATCH_CONFIG.MISS_PENALTY, r.left, r.top);
  if (catchState.is1v1) socket.emit('catch_click', { delta: CATCH_CONFIG.MISS_PENALTY });
}

function floatCatch(delta, x, y) {
  const f = document.createElement('div');
  f.className = 'catch-float';
  f.style.color = delta >= 0 ? '#00ff88' : '#ff4b2b';
  f.innerText = (delta > 0 ? '+' : '') + delta;
  f.style.left = x + 'px';
  f.style.top = y + 'px';
  document.getElementById('catch-arena').appendChild(f);
  setTimeout(() => f.remove(), 900);
}

/* ============================================================
9. HUD
============================================================ */
function updateCatchHUD() {
  const s = document.getElementById('catch-score');
  if (s) s.innerText = catchState.score;
  const b = document.getElementById('catch-bonus');
  if (b) b.innerText = catchState.bonus;
  const t = document.getElementById('catch-timer');
  if (t) t.innerText = Math.max(0, catchState.timeLeft);
  const o = document.getElementById('catch-opp');
  if (o) o.innerText = catchState.oppScore;
}

function stopCatchSpawning() {
  if (catchState) clearTimeout(catchState.spawnTimeout);
}

function clearCatchArena() {
  if (catchState) {
    clearTimeout(catchState.spawnTimeout);
    clearInterval(catchState.timerInterval);
    if (catchState.raf) cancelAnimationFrame(catchState.raf);
    catchState.items = [];
  }
  const a = document.getElementById('catch-arena');
  if (a) a.remove();
  document.body.style.overflow = '';
  if (catchState && catchState.prevSeason) window.CURRENT_SEASON = catchState.prevSeason;
  if (typeof restartSeasonMusic === "function") restartSeasonMusic();
}

/* ============================================================
10. FIN DE PARTIE
============================================================ */
function endCatchSolo() {
  if (!catchState) return;
  catchState.active = false;
  stopCatchSpawning();
  clearInterval(catchState.timerInterval);
  if (catchState.raf) cancelAnimationFrame(catchState.raf);
  socket.emit('claim_catch_solo', { score: catchState.score, bonus: catchState.bonus });
}

socket.on('catch_solo_result', (data) => {
  const d = i18n[currentLang];
  // 🛡️ Si le serveur refuse (partie non enregistrée / cooldown), message clair au lieu d'un récap à 0
  if (data && data.error) {
    clearCatchArena();
    catchState = null;
    hideAllScreens();
    if (typeof showMainMenu === "function") showMainMenu();
    showNotificationToast(currentLang === 'fr'
      ? '⚠️ Récompense refusée par le serveur (partie non enregistrée). Relance une partie normalement.'
      : '⚠️ Reward denied by server (unregistered game). Start a new game normally.', 'announcement');
    return;
  }
  
  // ✅ CORRECTION : Récupérer le score ET le bonus avant de détruire catchState
  const score = catchState ? catchState.score : 0;
  const bonus = catchState ? catchState.bonus : 0; 
  
  clearCatchArena();
  catchState = null;
  hideAllScreens();
  
  document.getElementById('recap-1v1-rows').style.display = 'none';
  document.getElementById('recap-banner').innerText = d.catch_season_done;
  document.getElementById('recap-banner').style.color = '#00d2ff';
  
  // ✅ La variable 'bonus' est maintenant définie
  document.getElementById('recap-reason').innerText = `${d.catch_score_label} ${score} • ${d.catch_bonus_label} ${bonus}`;
  document.getElementById('recap-my-score').innerText = score;
  
  let coinsHTML = `+${data.baseCoins}`;
  if (data.bonusCoins > 0) coinsHTML += ` + <span style="color:#f8b500;">${data.bonusCoins} ${d.catch_bonus_label}</span>`;
  if (data.rushBonus > 0) coinsHTML += ` <span style="color:#ff8a00;">+${data.rushBonus}${d.catch_rush_x2}</span>`;
  document.getElementById('recap-coins-gained').innerHTML = coinsHTML;
  
  document.getElementById('winner-cinematic-container').innerHTML = '';
  document.getElementById('recap-modal').style.display = 'flex';
  if (typeof SoundEngine !== "undefined" && SoundEngine.playVictory) SoundEngine.playVictory();
});

/* ============================================================
11. RAFRAÎCHISSEMENT UI (boutons saisonniers)
============================================================ */
function refreshCatchButtons() {
  const season = (typeof getCurrentSeasonId === "function") ? getCurrentSeasonId() : (window.CURRENT_SEASON || "s1");
  const hb = document.getElementById('btn-halloween-menu');
  const nb = document.getElementById('btn-noel-menu');
  if (hb) hb.style.display = (latestGlobalEvents.halloweenMode || season === 's2') ? 'flex' : 'none';
  if (nb) nb.style.display = (latestGlobalEvents.noelMode || season === 's3') ? 'flex' : 'none';
}

socket.on('events_state_update', refreshCatchButtons);
socket.on('player_registered', () => setTimeout(refreshCatchButtons, 60));
socket.on('season_updated', () => setTimeout(refreshCatchButtons, 60));
