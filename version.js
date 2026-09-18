/* ============================================================
VERSION.JS — Bannière update + version gating (DA néon)
--------------------------------------------------------------
WORKFLOW À CHAQUE RELEASE :
 1. Monte VERSION_CLIENT.version (ex: "1.4.0") + versionCode Capacitor
 2. Déploie le client
 3. Mets à jour VERSION_GATE côté serveur (latest / minWeb)
============================================================ */
const VERSION_CLIENT = {
  version: "1.3.0",                                  // version WEB actuelle (semver)
  shell: 4,                                          // versionCode Capacitor (Android)
  serverUrl: "https://chiffre-blitz-server.onrender.com"  // ← ton URL Render
};

let VG_state = null;

/* ----- CSS (DA néon Chiffre Blitz) ----- */
(function(){
  const s = document.createElement("style");
  s.textContent = `
    /* === BANNIÈRE DOUCE (nouvelle version) === */
    #vg-banner{position:fixed;top:0;left:0;right:0;z-index:99990;display:none;align-items:center;gap:12px;padding:10px 16px;
      background:linear-gradient(90deg,#0f051d 0%,#1a1030 30%,#241040 50%,#1a1030 70%,#0f051d 100%);
      border-bottom:2px solid transparent;
      border-image:linear-gradient(90deg,#00d2ff,#ff2bd6,#f8b500,#00d2ff) 1;
      box-shadow:0 4px 24px #000c,0 2px 12px #00d2ff33;
      animation:vgSlide .5s cubic-bezier(.2,.9,.3,1.2);}
    @keyframes vgSlide{from{transform:translateY(-100%)}to{transform:translateY(0)}}
    #vg-banner .vg-ico{width:34px;height:34px;flex:none;display:flex;align-items:center;justify-content:center;border-radius:10px;
      background:radial-gradient(circle at 35% 30%,#2a2145,#12081f);border:1px solid #00d2ff66;
      box-shadow:0 0 12px #00d2ff44,inset 0 0 8px #00d2ff22;font-size:17px;animation:vgPulse 2s ease-in-out infinite;}
    @keyframes vgPulse{50%{box-shadow:0 0 20px #00d2ff88,inset 0 0 12px #00d2ff44;transform:scale(1.06)}}
    #vg-banner .vg-txt{flex:1;color:#fff;font-size:13px;font-weight:800;letter-spacing:.3px;text-shadow:0 0 10px #00d2ff66;}
    #vg-banner .vg-txt small{display:block;color:#9aa5bd;font-size:10px;font-weight:600;text-shadow:none;margin-top:1px;}
    #vg-banner .vg-up{border:none;border-radius:10px;padding:8px 18px;font-weight:900;font-size:12px;letter-spacing:.5px;cursor:pointer;color:#3a2a05;
      background:linear-gradient(180deg,#ffd75e,#f8b500 45%,#c9a227);
      box-shadow:0 3px 0 #8a6a1a,0 0 14px #f8b50066;transition:transform .12s,box-shadow .12s;}
    #vg-banner .vg-up:active{transform:translateY(2px);box-shadow:0 1px 0 #8a6a1a;}
    #vg-banner .vg-x{width:28px;height:28px;flex:none;border:none;border-radius:50%;background:#ffffff14;color:#8892a8;font-size:13px;cursor:pointer;transition:background .15s,color .15s;}
    #vg-banner .vg-x:hover{background:#ffffff26;color:#fff;}
    #vg-banner .vg-bar{position:absolute;left:0;right:0;bottom:-2px;height:2px;
      background:linear-gradient(90deg,#00d2ff,#ff2bd6,#f8b500,#00d2ff);background-size:300% 100%;animation:vgFlow 3s linear infinite;}
    @keyframes vgFlow{to{background-position:300% 0}}

    /* === ÉCRAN BLOQUANT (maj obligatoire) === */
    #vg-block{position:fixed;inset:0;z-index:99999;background:radial-gradient(ellipse at 50% 30%,#12081f 0%,#05050f 70%);
      display:none;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center;padding:20px;}
    #vg-block .vg-big{font-size:46px;filter:drop-shadow(0 0 18px #00d2ff88);animation:vgPulse 2s ease-in-out infinite;}
    #vg-block h2{color:#00d2ff;margin:0;font-size:22px;font-weight:900;text-shadow:0 0 16px #00d2ff88;}
    #vg-block p{color:#9aa5bd;font-size:13px;max-width:340px;line-height:1.5;margin:0;}
    #vg-block .vg-btn{border:none;border-radius:14px;padding:14px 40px;font-size:18px;font-weight:900;color:#fff;cursor:pointer;
      background:linear-gradient(180deg,#3ae05a,#1a9a3a);box-shadow:0 6px 0 #0a5a1a,0 0 20px #3ae05a66;transition:transform .12s,box-shadow .12s;}
    #vg-block .vg-btn:active{transform:translateY(3px);box-shadow:0 3px 0 #0a5a1a;}
  `;
  document.head.appendChild(s);
})();

/* ----- Utils ----- */
function vgCompare(a, b) {
  const pa = String(a).split(".").map(Number), pb = String(b).split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const x = pa[i] || 0, y = pb[i] || 0;
    if (x < y) return -1;
    if (x > y) return 1;
  }
  return 0;
}
function vgIsNative() { return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); }
function vgFr() { return (typeof currentLang !== "undefined" ? currentLang === "fr" : true); }

/* ----- UI : bannière douce (nouvelle version) ----- */
function vgShowBanner() {
  if (document.getElementById("vg-banner")) return;
  const fr = vgFr();
  const b = document.createElement("div");
  b.id = "vg-banner";
  b.innerHTML = `
    <span class="vg-ico">⚡</span>
    <span class="vg-txt">${fr ? "Nouvelle version disponible !" : "New version available!"}
      <small>${fr ? "Mets à jour pour profiter des dernières nouveautés." : "Update to enjoy the latest features."}</small></span>
    <button class="vg-up" onclick="vgGoUpdate()">${fr ? "MAJ ⚡" : "UPDATE ⚡"}</button>
    <button class="vg-x" onclick="this.parentNode.style.display='none'">✕</button>
    <span class="vg-bar"></span>`;
  document.body.appendChild(b);
  b.style.display = "flex";
}

/* ----- UI : écran bloquant (maj obligatoire) ----- */
function vgShowBlock() {
  if (document.getElementById("vg-block")) return;
  const fr = vgFr();
  const b = document.createElement("div");
  b.id = "vg-block";
  b.innerHTML = `
    <div class="vg-big">🔄</div>
    <h2>${fr ? "Mise à jour obligatoire" : "Update required"}</h2>
    <p>${fr ? "Ta version de Chiffre Blitz est trop ancienne pour continuer. Mets-la à jour pour retrouver ton aventure !" : "Your Chiffre Blitz version is too old to continue. Update to get back to your adventure!"}</p>
    <button class="vg-btn" onclick="vgGoUpdate()">${fr ? "METTRE À JOUR" : "UPDATE NOW"}</button>`;
  document.body.appendChild(b);
  b.style.display = "flex";
}

function vgGoUpdate() {
  if (!VG_state) return;
  window.open(vgIsNative() ? VG_state.urlAndroid : VG_state.urlWeb, "_blank");
}

/* ----- Vérification au chargement ----- */
async function vgCheck() {
  try {
    const r = await fetch(VERSION_CLIENT.serverUrl + "/version", { cache: "no-store" });
    if (!r.ok) return;
    VG_state = await r.json();
    // 1) App native trop vieille → In-App Updates si plugin installé, sinon blocage
    if (vgIsNative() && VERSION_CLIENT.shell < (VG_state.minShell || 0)) {
      try {
        const mod = await import("@capacitor/in-app-update");
        if (mod && mod.InAppUpdate) { await mod.InAppUpdate.startUpdate({ updatePriority: 5 }); return; }
      } catch (e) { /* plugin absent → fallback blocage */ }
      vgShowBlock(); return;
    }
    // 2) Version web sous le minimum → blocage dur
    if (vgCompare(VERSION_CLIENT.version, VG_state.minWeb || VERSION_CLIENT.version) < 0) { vgShowBlock(); return; }
    // 3) Version sous la dernière → bannière douce
    if (vgCompare(VERSION_CLIENT.version, VG_state.latest || VERSION_CLIENT.version) < 0) vgShowBanner();
  } catch (e) { /* serveur injoignable : on ne bloque pas le jeu */ }
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", vgCheck);
else vgCheck();
