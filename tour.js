/* ============================================================
TOUR.JS — AVENTURE « MATCH FACTORY » (écran fixe par monde)
============================================================ */
/* ----- 1. CONFIGURATION ----- */
const TOWER_CHAPTERS = [
{ id:1, season:1, name:"Quartier Néon", icon:"🌆", boss:"🤖", objects:[] },
{ id:2, season:1, name:"Grottes de Cristal", icon:"🧊", boss:"🗿", objects:[] },
{ id:3, season:1, name:"Banque Dorée", icon:"🏦", boss:"👾", objects:[] },
{ id:4, season:2, name:"Tour Hantée", icon:"🎃", boss:"🧛", objects:[] },
{ id:5, season:2, name:"Cimetière Brumeux", icon:"🌫️", boss:"💀", objects:[] },
{ id:6, season:2, name:"Antre Chauves-Souris", icon:"🦇", boss:"🧛", objects:[] },
{ id:7, season:3, name:"Cime Bonbon", icon:"🍭", boss:"🧝", objects:[] },
{ id:8, season:3, name:"Forêt de Sapins", icon:"🎄", boss:"⛄", objects:[] },
{ id:9, season:3, name:"Atelier du Père Noël", icon:"🎅", boss:"🎅", objects:[] }
];
const FPC = 200;
const TOTAL_FLOORS = 9 * FPC;
const WORLD_QUOTA = 240;
const MAX_LIVES = 10;
const TOWER_CURVE = [
[12,16,32,28], [13,18,30,26], [14,20,28,24], [16,22,27,23],
[18,24,26,22], [20,26,25,21], [22,28,24,20], [24,30,23,19], [26,32,22,18]
];
const TOWER_DIFF_PATTERN = [0,1,0,2,0,3,1,2,0,3];
const TOWER_TIER_MULT = [1.30, 1.00, 0.88, 0.78];
const TOWER_TIER_GRID = [-6, 0, 2, 4];
const TOWER_MODE_PACE = { classic:1.25, reverse:1.30, forbidden:1.25, color:1.00, sprint:1.0, nofail:1.35, pairs:2.30, parity:1.10, memory:1.15 };
const TOWER_CAPS = { sprint:30, pairs:26, memory:16, parity:40 };
function towerDiffTier(floor){
const inChap = ((floor - 1) % FPC) + 1;
if (inChap % 50 === 0) return 1;
return TOWER_DIFF_PATTERN[(inChap - 1) % 10];
}
function diffLabel(tier){
const fr = (typeof currentLang !== "undefined" && currentLang === "fr");
return ["🟢 " + (fr?"FACILE":"EASY"), "🟡 " + (fr?"MOYEN":"MEDIUM"), "🟠 " + (fr?"DIFFICILE":"HARD"), "🔴 " + (fr?"TRÈS DIFFICILE":"VERY HARD")][tier] || "";
}
const IS_MOBILE = /Android|iPhone|iPad|iPod|Tablet|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 2 && Math.min(screen.width, screen.height) < 900);
const TOWER_COLORS = {1:{acc:"#00d2ff"},2:{acc:"#74ebf5"},3:{acc:"#f8b500"},4:{acc:"#ff8a00"},5:{acc:"#8a9bb0"},6:{acc:"#ff4b2b"},7:{acc:"#ff6fa5"},8:{acc:"#2ecc71"},9:{acc:"#ff416c"}};
const TOWER_WORLDS = {
1:{bg:"linear-gradient(180deg,#050514,#0a0a2a 55%,#1a1030)",scene:"city",part:"neon"},
2:{bg:"linear-gradient(180deg,#062028,#0a2a3a 50%,#123a4a)",scene:"glacier",part:"snow"},
3:{bg:"linear-gradient(180deg,#160d00,#2b1a00 60%,#3a2a05)",scene:"vault",part:"spark"},
4:{bg:"linear-gradient(180deg,#0b0618,#1a0b2e 50%,#120820)",scene:"haunt",part:"fog"},
5:{bg:"linear-gradient(180deg,#0a0f0d,#12211c 55%,#0a1410)",scene:"grave",part:"fog"},
6:{bg:"radial-gradient(ellipse at 50% 60%,#241c16,#120d0a 60%,#080605 100%)",scene:"lair",part:"spark"},
7:{bg:"linear-gradient(180deg,#2a1440 0%,#5a2a68 28%,#a04a88 52%,#e87ba8 74%,#ffd6e8 100%)",scene:"candy",part:"spark"},
8:{bg:"linear-gradient(180deg,#04101e,#0a2036 55%,#061422)",scene:"pine",part:"snow"},
9:{bg:"linear-gradient(180deg,#0a0f1e,#142036 60%,#0a1424)",scene:"shop",part:"snow"}
};
const SHOP_ITEMS = [
{ id:"vies", icon:"❤️", name:"+3 Vies", price:150 },
{ id:"pack_vies_1", icon:"💖", name:"Pack Vies (10 vies)", price:0, iap:true, eur:"1,00 €" },
{ id:"pack_jokers_2", icon:"🃏", name:"Pack Jokers (2⏱️ + 2🛡️)", price:0, iap:true, eur:"2,00 €" },
{ id:"pack_mixte_3", icon:"🎁", name:"Pack Mixte (5 vies + 2⏱️ + 2🛡️)", price:0, iap:true, eur:"3,00 €" },
{ id:"pack_blitz_5", icon:"💎", name:"Pack Blitz (10 vies + 5⏱️ + 5🛡️)", price:0, iap:true, eur:"5,00 €" }
];
/* ----- 2. ÉTAT GLOBAL ----- */
let towerProgress = { floor: 0, stars: {} };
let twViewFloor = 1;
let twLives = MAX_LIVES;
let twJokers = { time: 0, shield: 0 };
let twNextLife = 0;
let TW = null, TW_dom = null, TW_buttons = [], TW_lastFloor = 0;
let TW_hudCache = "", TW_localTimer = null, TW_lastClick = 0, TW_pairsLock = false;
let TW_lastState = 0;
const SCENE_CACHE = {};
let TW_musicWorld = 0;
let TW_firstSync = true;
/* ----- 3. UTILITAIRES ----- */
const TowerUtils = {
starsInWorld(w) {
let s = 0;
const start = (w - 1) * FPC + 1, end = w * FPC;
for (let f = start; f <= end; f++) s += towerProgress.stars[String(f)] || 0;
return s;
},
worldUnlockedByStars(w) {
if (w <= 1) return true;
for (let x = 2; x <= w; x++) if (this.starsInWorld(x - 1) < WORLD_QUOTA) return false;
return true;
},
getTowerChapter(f) { return TOWER_CHAPTERS[Math.ceil(f / FPC) - 1]; },
currentSeasonNum() { return parseInt((myProfile.currentSeasonId || "s1").replace("s", "")) || 1; },
worldUnlocked(w) {
const season = TOWER_CHAPTERS[w-1].season;
if (season === 1) return this.worldUnlockedByStars(w);
const flag = "season_s" + season + "_unlocked";
const hasFlag = (myProfile.unlocked_items || []).includes(flag);
const seasonLive = this.currentSeasonNum() >= season;
if (!hasFlag && !seasonLive) return false;
return this.worldUnlockedByStars(w);
},
getFloorDef(floor) {
const chap = Math.ceil(floor / FPC), inChap = ((floor - 1) % FPC) + 1;
const c = TOWER_CURVE[Math.min(chap,9)-1];
const t01 = (inChap - 1) / (FPC - 1);
let gridSize = Math.round(c[0] + (c[1]-c[0]) * t01);
if (inChap <= 10) gridSize = Math.max(10, gridSize - 2);
if (inChap === FPC || inChap % 50 === 0) return { floor, gridSize, time: Math.max(20, Math.round(gridSize * 0.85)), type: "boss", diff: 1 };
const tier = TOWER_DIFF_PATTERN[(inChap - 1) % 10];
gridSize = Math.max(8, gridSize + TOWER_TIER_GRID[tier]);
const PACE = [1.45, 1.30, 1.20, 1.15][tier];
const seq = ["classic","reverse","color","pairs","sprint","parity","forbidden","memory","nofail"];
const t = seq[(inChap - 1) % 9];
let g = gridSize, time;
if (t === "sprint") { g = Math.min(gridSize, 24); time = Math.max(10, Math.round(g * 1.0)); }
else if (t === "pairs") { g = (tier <= 1) ? 10 : 12; time = [22,19,17,15][tier]; }
else if (t === "memory") { g = (tier <= 1) ? 10 : 12; const reveal = (2500 + g * 600) / 1000; time = Math.max(18, Math.round(reveal + g * [1.6,1.4,1.25,1.1][tier])); }
else if (t === "parity") { g = Math.min(gridSize + 6, 28); time = Math.max(15, Math.round(Math.ceil(g/2) * PACE * 1.15)); }
else if (t === "nofail") { time = Math.max(14, Math.round(gridSize * PACE * 1.2)); }
else if (t === "reverse") { time = Math.max(12, Math.round(gridSize * PACE * 1.10)); }
else if (t === "color") { time = Math.max(12, Math.round(gridSize * PACE * 0.85)); }
else if (t === "forbidden") { time = Math.max(12, Math.round((gridSize - 1) * PACE * 1.05)); }
else { time = Math.max(12, Math.round(gridSize * PACE)); }
return { floor, gridSize: g, time, type: t, diff: tier };
},
typeLabel(t) {
const fr = currentLang === "fr";
return ({classic:fr?"⚡ Croissant":" Ascending",reverse:fr?"🔽 Décroissant":"🔽 Descending",color:fr?"🎨 Couleurs":"🎨 Colors",pairs:fr?"🧩 Paires":"🧩 Pairs",parity:fr?"🔢 Pair/Impair":"🔢 Even/Odd",forbidden:fr?"🚫 Interdit":"🚫 Forbidden",sprint:fr?"⏱️ Sprint":"⏱️ Sprint",memory:fr?"🧠 Mémoire":"🧠 Memory",nofail:fr?"💎 Sans faute":"💎 No mistake",boss:fr?"⚔️ GARDIEN":"⚔️ GUARDIAN"})[t] || t;
}
};
/* ----- 3a. ANTI-SPOIL : visibilité des mondes ----- */
function seasonReleased(num){
if(num===1) return true;
try{
const list=(typeof getSeasonsClient==='function')?getSeasonsClient():((typeof SEASONS_CLIENT!=='undefined')?SEASONS_CLIENT:[]);
const s=list.find(x=>x.id==='s'+num);
if(!s||!s.start) return false;
const p=s.start.split('/').map(Number);
return new Date()>=new Date(p[2],p[1]-1,p[0]);
}catch(e){ return false; }
}
function worldVisible(w){
const ch=TOWER_CHAPTERS[w-1];
if(!ch) return false;
return TowerUtils.worldUnlocked(w);
}
function maxVisibleWorld(){
let m=1; for(let w=1;w<=9;w++){ if(worldVisible(w)) m=w; } return m;
}
/* ----- 3bis. MUSIQUE PAR MONDE (override + retour onglet) ----- */
(function(){
if (typeof SoundEngine === "undefined" || !SoundEngine.startMusic) return;
const prev = SoundEngine.startMusic.bind(SoundEngine);
SoundEngine.startMusic = function(mode) {
const scr = document.getElementById("screen-tower");
if (scr && scr.style.display !== "none") {
towerPlayWorldMusic(TowerUtils.getTowerChapter(twViewFloor).id);
return;
}
return prev(mode);
};
})();
document.addEventListener("visibilitychange", () => {
if (typeof SoundEngine === "undefined") return;
if (document.hidden) {
wmStop();
if (typeof SoundEngine.stopMusic === "function") SoundEngine.stopMusic(false);
} else {
const scr = document.getElementById("screen-tower");
if (scr && scr.style.display !== "none") {
WM_lastKey = null;
setTimeout(() => towerPlayWorldMusic(TowerUtils.getTowerChapter(twViewFloor).id), 200);
} else {
WM_lastKey = null;
if (typeof SoundEngine.startMusic === "function") SoundEngine.startMusic("menu");
}
}
});
/* ----- 4. CSS CONSOLIDÉ ----- */
(function() {
const style = document.createElement('style');
style.textContent = `
#screen-tower{position:fixed;inset:0;background:#000;z-index:9990;display:none;flex-direction:column;}
#tw-bg{position:absolute;inset:0;overflow:hidden;z-index:0;}
.tw-hud{position:relative;z-index:5;display:flex;align-items:center;gap:8px;padding:10px 12px;}
.tw-hud .tw-back{background:#1a1a2e;border:1px solid #00d2ff;color:#00d2ff;border-radius:8px;padding:6px 10px;font-size:14px;}
.tw-lives{display:flex;align-items:center;gap:5px;background:#1a1a2ecc;border:2px solid #ff4b2b;border-radius:10px;padding:4px 10px;color:#fff;font-weight:900;font-size:14px;}
.tw-coins{display:flex;align-items:center;gap:5px;background:#1a1a2ecc;border:2px solid #f8b500;border-radius:10px;padding:4px 10px;color:#ffd75e;font-weight:900;font-size:14px;}
.tw-shopbtn{margin-left:auto;width:44px;height:44px;border-radius:10px;background:#1a1a2ecc;border:2px solid #f8b500;font-size:22px;cursor:pointer;}
.tw-qwrap{position:relative;z-index:5;margin:0 12px 4px;display:flex;align-items:center;gap:8px;}
.tw-qwrap .lbl{font-size:11px;font-weight:900;color:#f8b500;white-space:nowrap;}
.tw-qbar{flex:1;height:14px;background:#200010;border-radius:7px;overflow:hidden;border:2px solid #00d2ff66;}
.tw-qbar div{height:100%;background:linear-gradient(90deg,#f8b500,#ffd700);box-shadow:0 0 8px #f8b50088;}
.tw-center{position:relative;z-index:5;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:10px;}
.tw-worldtag{font-size:15px;font-weight:900;color:#fff;text-shadow:0 2px 6px #000;background:#0f051dcc;border:2px solid #00d2ff;border-radius:12px;padding:6px 16px;}
.tw-panel{background:linear-gradient(180deg,#8a5a2a,#5a3a1a);border:4px solid #c9a227;border-radius:16px;padding:16px 34px;text-align:center;box-shadow:0 8px 0 #3a2a05,0 0 30px #000a;}
.tw-panel .num{font-size:46px;font-weight:900;color:#fff;text-shadow:0 3px 0 #0008;line-height:1;}
.tw-panel .typ{font-size:13px;color:#ffe9a8;font-weight:700;margin-top:4px;}
.tw-panel-stars{font-size:16px;letter-spacing:4px;margin-top:5px;}
.tw-panel-stars span{filter:grayscale(1);opacity:.3;}
.tw-panel-stars span.on{filter:none;opacity:1;}
.tw-panel.boss{border-color:#ff4b2b;background:linear-gradient(180deg,#5a1a1a,#3a0a0a);box-shadow:0 8px 0 #2a0505,0 0 30px #ff4b2b66;}
.tw-panel.boss .typ{color:#ff8a8a;}
.tw-playrow{display:flex;align-items:center;gap:16px;}
.tw-arrow{width:46px;height:46px;border-radius:50%;background:#1a1a2e;border:2px solid #00d2ff;color:#00d2ff;font-size:20px;cursor:pointer;}
.tw-arrow:disabled{opacity:.3;cursor:default;}
.tw-playbtn{background:linear-gradient(180deg,#3ae05a,#1a9a3a);border:3px solid #0a5a1a;border-radius:14px;padding:14px 62px;font-size:26px;font-weight:900;color:#fff;text-shadow:0 2px 0 #0008;box-shadow:0 6px 0 #0a5a1a,0 0 20px #3ae05a66;cursor:pointer;}
.tw-playbtn:disabled{filter:grayscale(1);opacity:.5;cursor:default;}
.tw-lockmsg{font-size:11px;color:#f8b500;background:#0f051dcc;border:1px solid #f8b50066;border-radius:8px;padding:5px 12px;}
.tw-worldfade{position:fixed;inset:0;background:#000;z-index:9998;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;opacity:0;transition:opacity .6s;pointer-events:none;}
.tw-worldfade.on{opacity:1;}
.tw-worldfade .big{font-size:34px;font-weight:900;color:#00d2ff;text-shadow:0 0 20px #00d2ff;}
.tw-worldfade .sub{font-size:14px;color:#aaa;}
.tw-shop{position:fixed;inset:0;background:#000c;z-index:9997;display:flex;align-items:center;justify-content:center;}
.tw-shop-card{background:#0f051d;border:2px solid #f8b500;border-radius:14px;padding:16px;width:min(92%,360px);}
.tw-shop-card h3{margin:0 0 10px;color:#f8b500;text-align:center;}
.tw-shop-item{display:flex;align-items:center;gap:10px;background:#1a1a2e;border:1px solid #333;border-radius:10px;padding:10px;margin-bottom:8px;}
.tw-shop-item .ic{font-size:24px;}
.tw-shop-item .nm{flex:1;color:#fff;font-weight:700;font-size:13px;}
.tw-shop-item .buy{background:linear-gradient(180deg,#f8b500,#c9a227);border:none;border-radius:8px;padding:7px 12px;font-weight:900;color:#3a2a05;cursor:pointer;}
.tw-shop-item .buy.iap{background:linear-gradient(180deg,#3ae05a,#1a9a3a);color:#fff;}
.tw-shop-item .buy.iap:disabled{filter:grayscale(1);opacity:.6;}
.twj-bar{display:flex;justify-content:center;gap:14px;padding:10px 12px 14px;}
.twj-btn{display:flex;align-items:center;gap:8px;background:linear-gradient(180deg,#1a2142,#0d1226);border:2px solid #00d2ff;color:#fff;border-radius:14px;padding:10px 18px;font-size:14px;font-weight:900;cursor:pointer;box-shadow:0 4px 0 #061024,0 0 12px #00d2ff33;}
.twj-btn b{background:#00d2ff;color:#061024;border-radius:8px;padding:2px 8px;font-size:13px;}
.twj-btn:disabled{opacity:.55;filter:grayscale(.6);cursor:default;}
.tg-grid.shielded{outline:3px solid #f8b500;outline-offset:8px;border-radius:18px;box-shadow:0 0 30px #f8b50066,inset 0 0 20px #f8b50022;animation:twShieldGrid 1.6s ease-in-out infinite;}
@keyframes twShieldGrid{50%{box-shadow:0 0 45px #f8b500aa,inset 0 0 26px #f8b50033;}}
.tw-moon{position:absolute;top:2%;right:10%;width:40px;height:40px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fff8e8,#d8c9a8 60%,#a89878);box-shadow:0 0 30px #fff8e866;}
.tw-star2{position:absolute;width:2px;height:2px;border-radius:50%;background:#fff;animation:twFlickP 3s steps(2) infinite;}
.tw-cloud{position:absolute;height:10px;border-radius:6px;background:linear-gradient(90deg,transparent,#8888aa22 30%,#8888aa22 70%,transparent);filter:blur(3px);animation:twCloud linear infinite;}
.tw-horizon{position:absolute;bottom:180px;left:0;right:0;height:200px;background:radial-gradient(ellipse at 50% 100%,#ff00ff33,transparent 70%),radial-gradient(ellipse at 30% 100%,#00ffff2b,transparent 60%);}
.tw-cityback{position:absolute;bottom:180px;left:0;right:0;height:44%;display:flex;align-items:flex-end;gap:2%;padding:0 1%;opacity:.45;filter:brightness(.5);}
.tw-cityback .tw-bldg{border-top:none;}
.tw-city{position:absolute;bottom:180px;left:0;right:0;height:36%;display:flex;align-items:flex-end;gap:3%;padding:0 2%;}
.tw-bldg{flex:1;position:relative;background:linear-gradient(180deg,#0d0d1e,#05050c);border-radius:3px 3px 0 0;box-shadow:0 0 12px #000;border-top:2px solid #00d2ff44;}
.tw-ant{position:absolute;top:-14px;left:50%;width:2px;height:14px;background:#333;box-shadow:0 -3px 6px #ff4b2b;}
.tw-wl{position:absolute;width:7px;height:9px;background:currentColor;box-shadow:0 0 8px currentColor;animation:twWin linear infinite;}
.tw-road{position:absolute;bottom:0;left:0;right:0;height:180px;background:linear-gradient(180deg,#23232e,#101016 30%,#0a0a0e);}
.tw-lane{position:absolute;left:0;right:0;top:50%;height:3px;background:repeating-linear-gradient(90deg,#f8b50088 0 34px,transparent 34px 70px);opacity:.7;}
.tw-reflect{position:absolute;left:0;right:0;bottom:0;height:180px;background:linear-gradient(90deg,#ff00ff22,#00ffff22,#f8b50022,#ff00ff22);background-size:300% 100%;filter:blur(7px);animation:twSlide 6s linear infinite;opacity:.45;}
.tw-car{position:absolute;width:54px;height:16px;z-index:3;animation:twDrive linear infinite;}
.tw-car i{position:absolute;display:block;}
.tw-car .cb{bottom:3px;left:0;right:0;height:9px;border-radius:8px 14px 6px 6px;background:linear-gradient(180deg,#3d3d52,#12121c 70%);}
.tw-car .cc{bottom:10px;left:12px;width:26px;height:8px;border-radius:8px 10px 0 0;background:linear-gradient(180deg,#2a2a3a,#151520);}
.tw-car .ug{position:absolute;bottom:-3px;left:6%;right:6%;height:4px;border-radius:2px;background:currentColor;box-shadow:0 0 10px currentColor;opacity:.9;}
.tw-car .hl{right:-32px;bottom:5px;width:34px;height:5px;background:linear-gradient(90deg,#bffcffcc,transparent);filter:blur(2px);}
.tw-car .tl{left:-4px;bottom:6px;width:7px;height:5px;background:radial-gradient(closest-side,#ff2bd6,transparent);}
.tw-car.r{animation-name:twDriveR;transform:scaleX(-1);}
.tw-car.s{transform:scale(.8);transform-origin:bottom left;}
.tw-car.s.r{transform:scale(.8) scaleX(-1);}
.tw-bldg-solo{position:absolute;background:linear-gradient(180deg,#0d0d1e,#05050c);border-radius:3px 3px 0 0;border-top:2px solid #00d2ff44;}
.tw-blimp{position:absolute;width:120px;height:44px;border-radius:50%;background:linear-gradient(180deg,#3a3a52,#14141f);box-shadow:0 0 20px #00d2ff44;animation:twBlimp linear infinite;}
.tw-blimp .neo{position:absolute;left:12%;right:12%;top:38%;height:6px;border-radius:3px;background:currentColor;box-shadow:0 0 10px currentColor;animation:twFlickP 2s steps(2) infinite;}
.tw-plane{position:absolute;width:34px;height:8px;background:linear-gradient(90deg,transparent,#bffcffcc 60%,#fff);border-radius:4px;filter:blur(1px);animation:twPlaneX linear infinite;}
.tw-shoot{position:absolute;width:90px;height:2px;background:linear-gradient(90deg,#fff,transparent);transform:rotate(-30deg);opacity:0;animation:twShoot 7s linear infinite;}
.tw-batsignal{position:absolute;top:5%;left:50%;transform:translateX(-50%);font-size:clamp(26px,6vw,64px);font-weight:900;letter-spacing:8px;color:#fff;white-space:nowrap;text-shadow:0 0 20px #ffffffdd,0 0 50px #ffffff99,0 0 90px #ffffff55;opacity:.92;filter:blur(.6px);animation:twSignalPulse 4s ease-in-out infinite;z-index:1;}
.tw-signalbeam{position:absolute;bottom:26%;width:110px;height:62%;background:linear-gradient(0deg,#ffffff55,#ffffff2b 45%,#ffffff0d 100%);clip-path:polygon(35% 100%,65% 100%,100% 0,0 0);filter:blur(7px);transform-origin:bottom center;z-index:0;animation:twGlowC 4s infinite;}
.tw-signalbeam.l{left:34%;transform:rotate(14deg);}
.tw-signalbeam.r{left:66%;transform:rotate(-14deg);}
.tw-cavewall{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 55%,#74ebf518 0%,#0a2a3a66 35%,#000000ee 78%);}
.tw-gceil{position:absolute;top:0;left:0;right:0;height:160px;background:linear-gradient(0deg,#0a2a3a,#04141d);}
.tw-cavedark{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 45%,#00000055 0%,#000000aa 55%,#000000e6 100%);z-index:3;pointer-events:none;}
.tw-stalac{position:absolute;top:0;width:44px;background:linear-gradient(180deg,#04141d,#74ebf5 60%,#e8fbff);clip-path:polygon(48% 100%,52% 100%,62% 60%,72% 30%,100% 0,0 0,28% 30%,38% 60%);filter:drop-shadow(0 0 10px #74ebf5cc);}
.tw-stalag{position:absolute;bottom:0;width:44px;background:linear-gradient(0deg,#5a8ea0aa,#bfefffcc 55%,#ffffff);clip-path:polygon(48% 0,52% 0,62% 30%,72% 60%,100% 100%,0 100%,28% 60%,38% 30%);filter:drop-shadow(0 0 10px #74ebf5cc);}
.tw-gwall{position:absolute;top:0;bottom:0;width:12%;background:linear-gradient(90deg,#04141d,#0a2a3a);clip-path:polygon(0 0,100% 3%,70% 8%,100% 14%,75% 22%,100% 30%,70% 38%,100% 46%,75% 55%,100% 63%,70% 72%,100% 80%,75% 88%,100% 95%,70% 100%,0 100%);}
.tw-gwall.r{left:auto;right:0;background:linear-gradient(270deg,#04141d,#0a2a3a);clip-path:polygon(100% 0,0 3%,30% 8%,0 14%,25% 22%,0 30%,30% 38%,0 46%,25% 55%,0 63%,30% 72%,0 80%,25% 88%,0 95%,30% 100%,100% 100%);}
.tw-gem{position:absolute;width:9px;height:9px;background:#74ebf5;clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);box-shadow:0 0 10px #74ebf5;animation:twGlowC 2s infinite;}
.tw-icelake{position:absolute;bottom:0;left:0;right:0;height:14%;background:linear-gradient(180deg,#74ebf533,#04141d);box-shadow:inset 0 6px 20px #74ebf544;}
.tw-shelf{position:absolute;width:24%;height:130px;}
.tw-shelf .rock{position:absolute;bottom:0;left:0;right:0;height:26px;background:linear-gradient(180deg,#123a4a,#04141d);clip-path:polygon(0 0,100% 25%,88% 100%,0 100%);}
.tw-shelf.r{transform:scaleX(-1);}
.tw-shelf .tw-cryscl{position:absolute;bottom:18px;left:22%;width:80px;height:100px;}
.tw-cryscl{position:absolute;width:90px;height:120px;filter:drop-shadow(0 0 22px #74ebf5cc);animation:twGlowC 2.6s infinite;}
.tw-cryscl .c{position:absolute;bottom:0;background:linear-gradient(115deg,transparent 38%,#ffffffaa 38% 44%,transparent 44% 62%,#ffffff66 62% 66%,transparent 66%),linear-gradient(180deg,#f4feff,#8ff2ff 45%,#2a8ba8 80%,#14506a);clip-path:polygon(50% 0,76% 12%,90% 62%,70% 100%,30% 100%,10% 62%,24% 12%);}
.tw-cryscl .c1{left:30%;width:40%;height:100%;}
.tw-cryscl .c2{left:0;width:30%;height:62%;transform:rotate(-14deg);}
.tw-cryscl .c3{right:0;width:30%;height:70%;transform:rotate(12deg);}
.tw-cryscl.pink .c{background:linear-gradient(115deg,transparent 38%,#ffffffaa 38% 44%,transparent 44% 62%,#ffffff66 62% 66%,transparent 66%),linear-gradient(180deg,#fff0f8,#ff8ac2 45%,#a82a6a 80%,#50143a);}
.tw-cryscl.gold .c{background:linear-gradient(115deg,transparent 38%,#ffffffaa 38% 44%,transparent 44% 62%,#ffffff66 62% 66%,transparent 66%),linear-gradient(180deg,#fff8e0,#ffd75e 45%,#a8781a 80%,#503a0a);}
.tw-cryscl.green .c{background:linear-gradient(115deg,transparent 38%,#ffffffaa 38% 44%,transparent 44% 62%,#ffffff66 62% 66%,transparent 66%),linear-gradient(180deg,#f0fff0,#7dff8a 45%,#2a8b3a 80%,#145020);}
.tw-cryscl.violet .c{background:linear-gradient(115deg,transparent 38%,#ffffffaa 38% 44%,transparent 44% 62%,#ffffff66 62% 66%,transparent 66%),linear-gradient(180deg,#f8f0ff,#c28aff 45%,#6a2aa8 80%,#3a1450);}
.tw-cryscl.tall{width:60px;height:150px;}
.tw-cryscl.wide{width:110px;height:90px;}
.tw-firefly{position:absolute;width:5px;height:5px;border-radius:50%;background:#bffcff;box-shadow:0 0 10px #74ebf5;animation:twFly ease-in-out infinite;}
.tw-vaultroom{position:absolute;inset:0;background:linear-gradient(180deg,#08080f,#101018 45%,#08080f);}
.tw-marble{position:absolute;inset:0;background:linear-gradient(115deg,transparent 40%,#ffffff08 40% 42%,transparent 42%),linear-gradient(65deg,transparent 55%,#ffffff06 55% 57%,transparent 57%),linear-gradient(150deg,transparent 70%,#ffffff05 70% 71%,transparent 71%);}
.tw-vfloor{position:absolute;bottom:0;left:0;right:0;height:22%;background:linear-gradient(180deg,#0a0804 0%,#1a1206 40%,#241a08 100%);box-shadow:inset 0 8px 24px #000c;}
.tw-vfloor::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 120px,#f8b50011 120px 122px);opacity:.6;}
.tw-vfloor::after{content:"";position:absolute;left:50%;top:0;transform:translateX(-50%);width:60%;height:100%;background:radial-gradient(ellipse at 50% 0%,#f8b50055,transparent 75%);filter:blur(5px);}
.tw-vreflect{position:absolute;bottom:0;left:9%;right:9%;height:20%;background:linear-gradient(180deg,transparent,#ff202022 25%,#ff202044 55%,transparent);filter:blur(3px);opacity:.9;}
.tw-vfloorglow{position:absolute;bottom:4%;left:50%;transform:translateX(-50%);width:46%;height:14%;background:radial-gradient(ellipse at 50% 50%,#f8b50044,transparent 70%);filter:blur(8px);}
.tw-pillar{position:absolute;top:0;bottom:0;width:8%;background:linear-gradient(90deg,#1a0f02,#5a4410 50%,#1a0f02);border-left:2px solid #8a6a1a44;border-right:2px solid #8a6a1a44;box-shadow:0 0 12px #000c;}
.tw-goldpile{position:absolute;bottom:10%;width:180px;height:90px;transform:scale(1.3);transform-origin:bottom center;}
.tw-goldpile .g{position:absolute;border-radius:3px;background:linear-gradient(180deg,#ffe9a8,#c9a227 50%,#8a6a1a);box-shadow:inset 0 1px 0 #fff8,0 2px 4px #000c;}
.tw-goldpile .c{position:absolute;width:16px;height:16px;border-radius:50%;background:radial-gradient(#ffe9a8,#c9a227);box-shadow:0 0 8px #f8b50088;}
.tw-spotv{position:absolute;top:0;width:16%;height:52%;background:linear-gradient(180deg,#ffd75e88,#ffe9a844 45%,transparent 85%);clip-path:polygon(44% 0,56% 0,100% 100%,0 100%);filter:blur(5px);transform-origin:top center;animation:twGlowC 4s infinite;}
.tw-spotv.l{left:12%;transform:rotate(20deg);}
.tw-spotv.r{right:12%;transform:rotate(-20deg);}
.tw-spotv.c{left:42%;}
.tw-spotimpact{position:absolute;width:90px;height:26px;border-radius:50%;background:radial-gradient(ellipse,#f8b50099,#f8b50033 55%,transparent 75%);filter:blur(5px);animation:twGlowC 3s infinite;z-index:1;}
.tw-spotimpact.l{left:41%;top:30%;}
.tw-spotimpact.c{left:48%;top:27%;}
.tw-spotimpact.r{right:41%;top:30%;}
.tw-goldpart{position:absolute;width:3px;height:3px;border-radius:50%;background:#ffd75e;box-shadow:0 0 6px #f8b500;opacity:.7;animation:twGoldFloat linear infinite;}
@keyframes twGoldFloat{0%{transform:translateY(0);opacity:0}10%{opacity:.8}90%{opacity:.6}100%{transform:translateY(-40vh);opacity:0}}
.tw-vvignette{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 46%,transparent 40%,#000000aa 78%,#000000dd 100%);pointer-events:none;z-index:3;}
.tw-vaultglow{position:absolute;left:50%;top:46%;transform:translate(-50%,-50%);width:min(92%,440px);aspect-ratio:1;border-radius:50%;background:radial-gradient(#f8b50044,transparent 70%);}
.tw-vaultglow.pulse{animation:twVaultPulse 2s ease-in-out infinite;}
@keyframes twVaultPulse{0%,100%{opacity:.7;transform:translate(-50%,-50%) scale(1)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.06)}}
.tw-vaultframe{position:absolute;left:50%;top:46%;transform:translate(-50%,-50%);width:min(86%,430px);aspect-ratio:1.15;background:linear-gradient(180deg,#5a4410,#2b1a00);border-radius:14px;box-shadow:0 0 40px #f8b50033,inset 0 0 30px #000;z-index:2;}
.tw-vaultdoor{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:82%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 35% 30%,#c9a227,#8a6a1a 40%,#3a2a05 75%,#160d00);border:6px solid #f8b50088;box-shadow:0 0 60px #f8b50066,inset 0 0 40px #000000aa;}
.tw-vaultwheel{position:absolute;left:50%;top:50%;width:44%;height:44%;transform:translate(-50%,-50%);border:6px solid #ffe9a8;border-radius:50%;animation:twSpin 16s linear infinite;box-shadow:0 0 20px #f8b50088,inset 0 0 10px #0006;}
.tw-vaultwheel::before{content:"";position:absolute;inset:-6px;background:linear-gradient(#ffe9a8,#ffe9a8) 50% 0/6px 100% no-repeat,linear-gradient(#ffe9a8,#ffe9a8) 0 50%/100% 6px no-repeat,linear-gradient(45deg,transparent 47%,#ffe9a8 47% 53%,transparent 53%),linear-gradient(-45deg,transparent 47%,#ffe9a8 47% 53%,transparent 53%);}
.tw-vaultwheel::after{content:"";position:absolute;left:50%;top:50%;width:20%;height:20%;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(#fff8dc,#8a6a1a);box-shadow:0 0 12px #ffe9a8;}
.tw-fbolt{position:absolute;width:10px;height:10px;border-radius:50%;background:radial-gradient(#ffe9a8,#8a6a1a);box-shadow:0 1px 3px #000;}
.tw-hinge{position:absolute;left:-4%;width:10%;height:12%;background:linear-gradient(180deg,#c9a227,#8a6a1a);border-radius:4px;box-shadow:0 2px 4px #000c;}
.tw-hinge.h1{top:22%;}.tw-hinge.h2{bottom:22%;}
.tw-knob{position:absolute;width:9%;height:9%;border-radius:50%;background:radial-gradient(#fff8dc,#c9a227);transform:translate(-50%,-50%);box-shadow:0 0 6px #ffe9a8aa;}
.tw-dial{position:absolute;right:16%;top:44%;width:14%;height:14%;border-radius:50%;background:radial-gradient(#c9a227,#8a6a1a);box-shadow:inset 0 0 6px #0008,0 0 4px #0008;}
.tw-dial::before{content:"";position:absolute;inset:30%;background:linear-gradient(#160d00,#160d00) 50% 0/3px 100% no-repeat,linear-gradient(#160d00,#160d00) 0 50%/100% 3px no-repeat,linear-gradient(45deg,transparent 40%,#160d00 40% 60%,transparent 60%);}
.tw-handle{position:absolute;right:8%;top:30%;width:4%;height:40%;border-radius:4px;background:linear-gradient(90deg,#c9a227,#ffe9a8 50%,#c9a227);box-shadow:0 0 6px #0008;}
.tw-vbolt{position:absolute;width:5%;height:5%;border-radius:50%;background:radial-gradient(#ffe9a8,#8a6a1a);transform:translate(-50%,-50%);box-shadow:0 1px 3px #000;}
.tw-laser{position:absolute;left:9%;right:9%;height:2px;background:linear-gradient(90deg,transparent,#ff2020 8%,#ff7070 50%,#ff2020 92%,transparent);box-shadow:0 0 8px #ff2020cc,0 0 20px #ff202066;opacity:.85;animation:twLaserV ease-in-out infinite alternate;z-index:1;}
.tw-laser::before,.tw-laser::after{content:"";position:absolute;top:-3px;width:9px;height:9px;border-radius:2px;background:#1a0505;box-shadow:0 0 7px #ff2020,inset 0 0 3px #ff7070;animation:twFlickP 1.6s steps(2) infinite;}
.tw-laser::before{left:-3px;}.tw-laser::after{right:-3px;}
.tw-laser.d{animation-name:twLaserD;}
@keyframes twLaserV{from{transform:translateY(-26px)}to{transform:translateY(26px)}}
@keyframes twLaserD{from{transform:rotate(-5deg) translateY(-18px)}to{transform:rotate(5deg) translateY(18px)}}
#tw-bg .tw-safebox{position:absolute;width:46px;height:36px;border-radius:4px;border:1px solid #5a4410;animation:none;
background:radial-gradient(circle at 10% 14%,#fff8dc 0 2px,transparent 2px),radial-gradient(circle at 90% 14%,#fff8dc 0 2px,transparent 2px),radial-gradient(circle at 10% 86%,#fff8dc 0 2px,transparent 2px),radial-gradient(circle at 90% 86%,#fff8dc 0 2px,transparent 2px),linear-gradient(135deg,#e8c86a 0%,#b8942a 25%,#8a6a1a 50%,#c9a227 75%,#e8c86a 100%);
box-shadow:inset 0 2px 3px #ffffff55,inset 0 -2px 3px #00000088,0 2px 5px #000000bb,0 0 10px #f8b50022;}
#tw-bg .tw-safebox.bz{background:radial-gradient(circle at 10% 14%,#e8d8b8 0 2px,transparent 2px),radial-gradient(circle at 90% 14%,#e8d8b8 0 2px,transparent 2px),radial-gradient(circle at 10% 86%,#e8d8b8 0 2px,transparent 2px),radial-gradient(circle at 90% 86%,#e8d8b8 0 2px,transparent 2px),linear-gradient(135deg,#c8a86a 0%,#98742a 25%,#6a4a1a 50%,#a88227 75%,#c8a86a 100%);}
#tw-bg .tw-safebox::before{content:"";position:absolute;left:50%;top:50%;width:13px;height:13px;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff8dc,#8a6a1a 60%,#3a2a05);box-shadow:0 1px 3px #0009,inset 0 1px 2px #ffffff66;}
#tw-bg .tw-safebox::after{content:"";position:absolute;inset:3px;border:1px solid #ffffff22;border-radius:3px;background:linear-gradient(115deg,transparent 42%,#ffffff33 42% 47%,transparent 47%);}
.tw-ncam{position:absolute;width:36px;height:26px;background:linear-gradient(180deg,#2a2a38,#14141c);border-radius:6px 6px 4px 4px;border:2px solid currentColor;box-shadow:0 0 12px currentColor;}
.tw-ncam::after{content:"";position:absolute;left:50%;top:58%;width:10px;height:10px;transform:translateX(-50%);border-radius:50%;background:currentColor;box-shadow:0 0 12px currentColor;animation:twFlickP 1.4s steps(2) infinite;}
.tw-ncam .beam{position:absolute;left:50%;top:100%;width:70px;height:100px;transform-origin:top center;background:linear-gradient(180deg,currentColor,transparent);opacity:.18;clip-path:polygon(45% 0,55% 0,100% 100%,0 100%);animation:twCamSweep 4s ease-in-out infinite alternate;}
.tw-gloss{position:absolute;bottom:0;left:0;right:0;height:12%;background:linear-gradient(180deg,#0000,#f8b50018 40%,#00000088);}
.tw-part{position:absolute;width:4px;height:4px;border-radius:50%;}
.tw-part.snow{background:#ffffffcc;animation:twFall linear infinite;}
.tw-part.spark{background:#f8b500;box-shadow:0 0 6px #f8b500;animation:twRise linear infinite;}
.tw-part.neon{box-shadow:0 0 8px currentColor;background:currentColor;animation:twFlickP 2.2s steps(2) infinite;}
/* === M4 TOUR HANTÉE === */
.tw-ha-lightning{position:absolute;inset:0;background:radial-gradient(ellipse at 70% 8%,#cfa8ff66,transparent 55%);opacity:0;animation:twLightning 7s infinite;}
@keyframes twLightning{0%,91%,95%,100%{opacity:0}92%,94%{opacity:1}}
.tw-ha-moon{position:absolute;top:6%;left:12%;width:70px;height:70px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fdf6e3,#d8cfae 60%,#b0a888);box-shadow:0 0 40px #fdf6e366,0 0 90px #fdf6e333;}
.tw-ha-cloud{position:absolute;height:26px;border-radius:20px;background:linear-gradient(90deg,transparent,#0a0514cc 30%,#0a0514cc 70%,transparent);filter:blur(4px);animation:twCloud linear infinite;}
.tw-ha-hill{position:absolute;bottom:0;left:-30%;right:-30%;height:22%;background:linear-gradient(180deg,#150a26,#0a0514);border-radius:50% 50% 0 0;}
.tw-ha-fence{position:absolute;bottom:5%;left:0;right:0;height:56px;background:repeating-linear-gradient(90deg,transparent 0 26px,#0a0514 26px 32px);}
.tw-ha-fence::before{content:"";position:absolute;left:0;right:0;top:14px;height:6px;background:#0a0514;}
.tw-ha-tower{position:absolute;bottom:14%;left:50%;transform:translateX(-50%);width:150px;height:62%;background:linear-gradient(90deg,#0d0718,#1c1030 45%,#0d0718);clip-path:polygon(0 100%,0 18%,8% 18%,8% 12%,18% 12%,18% 6%,30% 6%,30% 0,70% 0,70% 6%,82% 6%,82% 12%,92% 12%,92% 18%,100% 18%,100% 100%);box-shadow:0 0 60px #00000099;}
.tw-ha-win{position:absolute;width:14px;height:22px;background:#ff8a00;border-radius:50% 50% 0 0;box-shadow:0 0 14px #ff8a00cc,0 0 30px #ff8a0066;animation:twWindowFlick 3.4s infinite;}
@keyframes twWindowFlick{0%,100%{opacity:1}45%{opacity:.25}55%{opacity:.9}}
.tw-ha-gate{position:absolute;bottom:14%;left:50%;transform:translateX(-50%);width:56px;height:66px;background:#05030c;border-radius:28px 28px 0 0;}
.tw-bat{position:absolute;width:30px;height:15px;background:#05030c;clip-path:polygon(50% 0,40% 30%,0 40%,20% 60%,30% 50%,50% 70%,70% 50%,80% 60%,100% 40%,60% 30%);animation:twBatFly 8s linear infinite;}
@keyframes twBatFly{0%{transform:translate(0,0)}25%{transform:translate(90px,-26px)}50%{transform:translate(180px,0)}75%{transform:translate(90px,26px)}100%{transform:translate(0,0)}}
.tw-web{position:absolute;width:80px;height:80px;opacity:.5;background:linear-gradient(45deg,transparent 48%,#ffffff33 48% 52%,transparent 52%),linear-gradient(-45deg,transparent 48%,#ffffff33 48% 52%,transparent 52%),linear-gradient(90deg,transparent 48%,#ffffff33 48% 52%,transparent 52%),linear-gradient(0deg,transparent 48%,#ffffff33 48% 52%,transparent 52%),radial-gradient(circle,transparent 30%,#ffffff22 30% 32%,transparent 32%),radial-gradient(circle,transparent 55%,#ffffff22 55% 57%,transparent 57%);}
.tw-gr-fog{position:absolute;left:-50%;width:200%;height:70px;background:linear-gradient(0deg,#cfe8d826,transparent);filter:blur(8px);animation:twFogDrift linear infinite;}
@keyframes twFogDrift{0%{transform:translateX(-12%)}100%{transform:translateX(12%)}}
.tw-part.fog{background:#ffffffaa;width:6px;height:6px;filter:blur(2px);animation:twFogFloat 6s ease-in-out infinite;}
@keyframes twFogFloat{0%,100%{transform:translate(0,0);opacity:.3}50%{transform:translate(10px,-22px);opacity:.6}}
/* === M5 CIMETIÈRE BRUMEUX === */
.tw-gr-moon{position:absolute;top:8%;right:16%;width:60px;height:60px;border-radius:50%;background:radial-gradient(circle at 40% 40%,#e8f2e8,#b8c8b8 65%,#8a9a8a);box-shadow:0 0 30px #e8f2e844;opacity:.7;filter:blur(1px);}
.tw-gr-veil{position:absolute;top:5%;right:6%;width:130px;height:42px;border-radius:22px;background:#0a141099;filter:blur(6px);animation:twCloud 44s linear infinite;}
.tw-gr-tree{position:absolute;bottom:16%;width:90px;height:150px;background:#070c08;clip-path:polygon(45% 100%,48% 60%,20% 45%,45% 50%,46% 30%,15% 15%,46% 22%,50% 0,54% 22%,85% 12%,54% 30%,55% 50%,80% 42%,52% 60%,55% 100%);}
.tw-gr-ground{position:absolute;bottom:0;left:0;right:0;height:14%;background:linear-gradient(180deg,#101a14,#070c09);}
.tw-gr-grass{position:absolute;bottom:12%;left:0;right:0;height:24px;background:repeating-linear-gradient(90deg,transparent 0 8px,#0d150f 8px 11px);opacity:.8;}
.tw-gr-stone{position:absolute;width:44px;height:56px;background:linear-gradient(180deg,#3a443c,#232b26 70%,#161c18);border-radius:20px 20px 4px 4px;box-shadow:inset 0 2px 6px #ffffff11,0 4px 10px #00000088;}
.tw-gr-stone.cross{width:14px;height:64px;border-radius:3px;background:linear-gradient(180deg,#444c44,#2a322c);}
.tw-gr-stone.cross::before{content:"";position:absolute;top:14px;left:-16px;width:46px;height:12px;background:inherit;border-radius:3px;}
.tw-gr-crow{position:absolute;width:22px;height:16px;background:#050805;clip-path:polygon(0 60%,25% 30%,45% 45%,60% 10%,70% 40%,100% 55%,70% 75%,30% 80%);}
.tw-gr-wisp{position:absolute;width:8px;height:8px;border-radius:50%;background:#7dff8a;box-shadow:0 0 12px #7dff8a,0 0 26px #7dff8a66;animation:twWisp 6s ease-in-out infinite;}
@keyframes twWisp{0%,100%{transform:translate(0,0);opacity:.3}30%{transform:translate(14px,-22px);opacity:.9}60%{transform:translate(-10px,-36px);opacity:.5}}
/* === M6 GROTTE ROCAILLEUSE HORRIFIQUE === */
.tw-cv-bg{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 42%,#2a211c 0%,#1a1411 45%,#0d0a08 80%,#050403 100%);}
.tw-cv-rocktex{position:absolute;inset:0;opacity:.55;background:
radial-gradient(ellipse at 15% 25%,#3a2f28 0 60px,transparent 61px),
radial-gradient(ellipse at 75% 15%,#332a24 0 80px,transparent 81px),
radial-gradient(ellipse at 40% 60%,#2e2620 0 70px,transparent 71px),
radial-gradient(ellipse at 85% 70%,#362c25 0 65px,transparent 66px),
radial-gradient(ellipse at 25% 85%,#302822 0 75px,transparent 76px),
radial-gradient(ellipse at 60% 35%,#2a221c 0 55px,transparent 56px);}
.tw-cv-wall{position:absolute;top:0;bottom:0;width:20%;background:linear-gradient(90deg,#4a3d34,#332a24 45%,#1d1713);clip-path:polygon(0 0,100% 0,78% 6%,95% 12%,70% 20%,92% 28%,65% 36%,88% 45%,62% 54%,85% 63%,60% 72%,82% 81%,58% 90%,75% 100%,0 100%);box-shadow:inset -8px 0 20px #000;}
.tw-cv-wall.r{left:auto;right:0;background:linear-gradient(270deg,#4a3d34,#332a24 45%,#1d1713);clip-path:polygon(100% 0,0 0,22% 6%,5% 12%,30% 20%,8% 28%,35% 36%,12% 45%,38% 54%,15% 63%,40% 72%,18% 81%,42% 90%,25% 100%,100% 100%);box-shadow:inset 8px 0 20px #000;}
.tw-cv-ceil{position:absolute;top:0;left:0;right:0;height:16%;background:linear-gradient(180deg,#4a3d34,#2a221c 60%,#171210);clip-path:polygon(0 0,100% 0,100% 55%,94% 72%,88% 45%,82% 78%,76% 50%,70% 82%,64% 48%,58% 74%,52% 45%,46% 80%,40% 50%,34% 72%,28% 45%,22% 78%,16% 50%,10% 70%,4% 45%,0 62%);}
.tw-cv-stalac{position:absolute;top:0;width:40px;background:linear-gradient(90deg,#5a4c42,#3a2f28 45%,#241d18);clip-path:polygon(30% 0,70% 0,88% 18%,62% 30%,80% 45%,55% 60%,68% 75%,50% 100%,42% 72%,52% 55%,35% 40%,48% 25%,25% 12%);filter:drop-shadow(0 4px 6px #000c);}
.tw-cv-stalag{position:absolute;bottom:0;width:44px;background:linear-gradient(90deg,#5a4c42,#3a2f28 45%,#241d18);clip-path:polygon(50% 0,62% 25%,48% 40%,68% 55%,42% 68%,72% 82%,100% 100%,0 100%,28% 80%,55% 65%,35% 50%,58% 35%,40% 20%);filter:drop-shadow(0 -4px 6px #000c);}
.tw-cv-floor{position:absolute;bottom:0;left:0;right:0;height:15%;background:linear-gradient(180deg,#3a2f28,#241d18 50%,#120e0b);clip-path:polygon(0 30%,6% 18%,12% 32%,20% 15%,28% 30%,36% 12%,44% 28%,52% 16%,60% 30%,68% 14%,76% 28%,84% 16%,92% 30%,100% 18%,100% 100%,0 100%);}
.tw-cv-rock{position:absolute;bottom:2%;background:radial-gradient(ellipse at 35% 30%,#5a4c42,#332a24 60%,#1d1713);border-radius:45% 55% 40% 60%/55% 45% 60% 40%;box-shadow:inset -4px -6px 10px #000a,0 4px 8px #000;}
/* Chauves-souris ACCROCHÉES tête en bas (silhouette lisible, SANS yeux lumineux) */
.tw-cv-hangbat{position:absolute;top:0;width:30px;height:56px;transform-origin:top center;animation:twHangSway 4.5s ease-in-out infinite;}
.tw-cv-hangbat .feet{position:absolute;top:0;left:50%;transform:translateX(-50%);width:2px;background:#0b0806;}
.tw-cv-hangbat .wing{position:absolute;top:16px;width:9px;height:26px;background:#191009;border-radius:50% 50% 40% 40%;box-shadow:inset 1px 1px 2px #2e2118;}
.tw-cv-hangbat .wing.l{left:1px;transform:rotate(9deg);}
.tw-cv-hangbat .wing.r{right:1px;transform:rotate(-9deg);}
.tw-cv-hangbat .bd{position:absolute;top:12px;left:50%;transform:translateX(-50%);width:20px;height:34px;background:linear-gradient(90deg,#241a14,#150e0a 55%,#1d1410);border-radius:45% 45% 50% 50%;box-shadow:inset 2px 2px 3px #3a2a20,0 0 6px #000;}
.tw-cv-hangbat .ear{position:absolute;top:44px;width:7px;height:9px;background:#1d1410;clip-path:polygon(50% 100%,100% 0,0 0);}
.tw-cv-hangbat .ear.l{left:7px;}
.tw-cv-hangbat .ear.r{right:7px;}
.tw-cv-hangbat .eye{display:none;}
@keyframes twHangSway{0%,100%{transform:rotate(-5deg)}50%{transform:rotate(5deg)}}
@keyframes twHangSway{0%,100%{transform:rotate(-5deg)}50%{transform:rotate(5deg)}}
.tw-cv-bat{position:absolute;width:46px;height:20px;animation:twCvFly linear infinite;}
.tw-cv-bat .body{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:10px;height:14px;background:#0b0806;border-radius:50%;}
.tw-cv-bat .w{position:absolute;top:3px;width:20px;height:14px;background:#0b0806;clip-path:polygon(100% 40%,60% 0,20% 15%,0 50%,25% 55%,10% 85%,45% 70%,70% 95%,100% 60%);}
.tw-cv-bat .w.l{left:1px;transform-origin:right center;animation:twFlapL .32s ease-in-out infinite alternate;}
.tw-cv-bat .w.r{right:1px;transform-origin:left center;animation:twFlapR .32s ease-in-out infinite alternate;}
@keyframes twFlapL{from{transform:rotate(24deg)}to{transform:rotate(-26deg)}}
@keyframes twFlapR{from{transform:rotate(-24deg)}to{transform:rotate(26deg)}}
@keyframes twCvFly{0%{transform:translate(0,0)}25%{transform:translate(70px,-32px)}50%{transform:translate(140px,0)}75%{transform:translate(70px,32px)}100%{transform:translate(0,0)}}
.tw-cv-eyes{position:absolute;width:26px;height:10px;}
.tw-cv-eyes i{position:absolute;top:0;width:9px;height:9px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#ffd75e,#ff8c00 55%,#c33 90%);box-shadow:0 0 10px #ff8c00,0 0 22px #ff450088;animation:twEyeBlink2 4s infinite;}
.tw-cv-eyes i:last-child{left:14px;}
.tw-cv-eyes.red i{background:radial-gradient(circle at 40% 35%,#ff8080,#e00 55%,#600 90%);box-shadow:0 0 10px #f00,0 0 22px #f0088;}
@keyframes twEyeBlink2{0%,90%,100%{transform:scaleY(1)}94%{transform:scaleY(.1)}}
.tw-cv-skull{position:absolute;bottom:4%;width:30px;height:26px;background:linear-gradient(180deg,#cfc8b8,#8a8478 70%,#5a554c);border-radius:50% 50% 42% 42%;box-shadow:inset -3px -4px 6px #00000066;}
.tw-cv-skull::before{content:"";position:absolute;top:8px;left:6px;width:6px;height:7px;background:#0d0a08;border-radius:50%;box-shadow:12px 0 0 #0d0a08;}
.tw-cv-skull::after{content:"";position:absolute;bottom:-3px;left:50%;transform:translateX(-50%);width:14px;height:5px;background:#b8b2a4;border-radius:2px;}
.tw-cv-bone{position:absolute;bottom:3%;width:34px;height:6px;background:#b8b2a4;border-radius:3px;box-shadow:0 2px 3px #000;}
.tw-cv-bone::before,.tw-cv-bone::after{content:"";position:absolute;top:-3px;width:8px;height:12px;background:#b8b2a4;border-radius:50%;}
.tw-cv-bone::before{left:-4px;}.tw-cv-bone::after{right:-4px;}
.tw-cv-shaft{position:absolute;top:0;width:60px;height:70%;background:linear-gradient(180deg,#8a7a5a22,transparent 80%);clip-path:polygon(40% 0,60% 0,100% 100%,0 100%);filter:blur(6px);animation:twGlowC 5s infinite;}
.tw-cv-mist{position:absolute;bottom:0;left:-20%;width:140%;height:34%;background:linear-gradient(0deg,#1a1410cc,transparent);filter:blur(10px);animation:twMistDrift 18s linear infinite;}
@keyframes twMistDrift{0%{transform:translateX(-10%)}100%{transform:translateX(10%)}}
.tw-cv-drip{position:absolute;width:2px;background:linear-gradient(180deg,transparent,#7ab4dd);border-radius:0 0 2px 2px;animation:twDrip 5s ease-in infinite;opacity:.7;}
@keyframes twDrip{0%{height:0;opacity:0}20%{height:20px;opacity:1}80%{height:20px;opacity:1}100%{height:0;opacity:0}}
.tw-cv-vignette{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 45%,transparent 25%,#000000aa 65%,#000 100%);pointer-events:none;}
.tw-bat-lair-skull{position:absolute;bottom:6%;width:34px;height:30px;background:linear-gradient(180deg,#d8d8d0,#9a9a92);border-radius:50% 50% 40% 40%;box-shadow:inset -3px -4px 6px #00000055;}
.tw-bat-lair-skull::before{content:"";position:absolute;top:8px;left:7px;width:6px;height:7px;background:#1a1a1a;border-radius:50%;box-shadow:13px 0 0 #1a1a1a;}
.tw-bat-lair-skull::after{content:"";position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);width:16px;height:6px;background:#c8c8c0;border-radius:2px;}
.tw-bat-lair-shroom{position:absolute;bottom:5%;width:22px;height:20px;}
.tw-bat-lair-shroom::before{content:"";position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:8px;height:12px;background:#d8c8a8;border-radius:3px;}
.tw-bat-lair-shroom::after{content:"";position:absolute;top:0;left:0;right:0;height:10px;background:radial-gradient(ellipse at 50% 100%,#7dff8a,#2a8b3a);border-radius:50% 50% 20% 20%;box-shadow:0 0 10px #7dff8a88;}
.tw-bat-lair-root{position:absolute;top:0;width:3px;background:linear-gradient(180deg,#1a1a1a,transparent);border-radius:2px;}
.tw-bat-lair-gem{position:absolute;width:10px;height:10px;background:#9b5cff;clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);box-shadow:0 0 10px #9b5cff;animation:twGlowC 2s infinite;}
/* === FÉERIQUE COMMUN === */
.tw-aurora{position:absolute;top:0;left:0;right:0;height:46%;background:linear-gradient(100deg,transparent 18%,#7dff8a26 34%,#74ebf526 50%,#ff6fa526 66%,transparent 82%);filter:blur(18px);animation:twAurora 12s ease-in-out infinite alternate;}
@keyframes twAurora{0%{transform:translateX(-6%) skewY(-2deg);opacity:.45}100%{transform:translateX(6%) skewY(2deg);opacity:.9}}
.tw-bokeh{position:absolute;border-radius:50%;filter:blur(6px);animation:twBokeh 9s ease-in-out infinite;}
@keyframes twBokeh{0%,100%{transform:translateY(0) scale(1);opacity:.22}50%{transform:translateY(-26px) scale(1.25);opacity:.65}}
.tw-sparkle{position:absolute;width:12px;height:12px;background:linear-gradient(0deg,transparent 42%,#fff 42% 58%,transparent 58%),linear-gradient(90deg,transparent 42%,#fff 42% 58%,transparent 58%);animation:twSparkle 3.4s ease-in-out infinite;}
@keyframes twSparkle{0%,100%{opacity:0;transform:scale(.4) rotate(0deg)}50%{opacity:1;transform:scale(1.1) rotate(45deg)}}
.tw-snowsoft{position:absolute;width:5px;height:5px;border-radius:50%;background:#fff;filter:blur(1px);opacity:.85;animation:twFall linear infinite;}
@keyframes twStarGlow{0%,100%{opacity:1}50%{opacity:.55}}
/* === M7 CIME BONBON V3 — BARBE À PAPA === */
.tw-cd-sky{position:absolute;inset:0;background:linear-gradient(180deg,#ffb6d9 0%,#ffcce0 35%,#ffe6f0 65%,#fff0f6 100%);}
.tw-cd-cloud-cotton{position:absolute;border-radius:50%;background:linear-gradient(180deg,#fff 0%,#ffe6f0 50%,#ffd6e8 100%);filter:blur(2px);box-shadow:0 0 20px #fff0f6aa,0 0 40px #ffd6e866;}
.tw-cd-cloud-cotton.c1{width:180px;height:60px;top:12%;left:8%;}
.tw-cd-cloud-cotton.c2{width:240px;height:80px;top:22%;right:12%;}
.tw-cd-cloud-cotton.c3{width:160px;height:50px;top:35%;left:25%;}
.tw-cd-cloud-cotton.c4{width:200px;height:70px;top:8%;right:35%;}
.tw-cd-candy-mtn{position:absolute;left:-40%;right:-40%;bottom:0;border-radius:50% 50% 0 0;}
.tw-cd-candy-mtn.m1{height:38%;background:linear-gradient(180deg,#ffe3ef,#ff9ec4 55%,#d86a9a);opacity:.92;box-shadow:0 0 40px #ff6fa544;}
.tw-cd-candy-mtn.m2{height:28%;background:linear-gradient(180deg,#e3fbf0,#8fe0c0 55%,#5aa88a);}
.tw-cd-candy-mtn.m3{height:18%;background:linear-gradient(180deg,#fff8e3,#ffd79e 55%,#d8a86a);}
.tw-cd-candy-castle{position:absolute;bottom:26%;left:50%;transform:translateX(-50%);width:170px;height:190px;background:linear-gradient(180deg,#ffe3ef,#ff9ec4 60%,#e87ba8);border-radius:14px 14px 0 0;box-shadow:0 0 70px #ff6fa577,inset 0 0 30px #ffffff66;}
.tw-cd-candy-castle::before{content:"";position:absolute;top:-42px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:52px solid transparent;border-right:52px solid transparent;border-bottom:46px solid #fff0f6;filter:drop-shadow(0 0 16px #ff6fa5bb);}
.tw-cd-candy-icing{position:absolute;top:-4px;left:-4px;right:-4px;height:20px;background:#fff;border-radius:10px 10px 0 0;box-shadow:0 6px 16px #ffffffaa;}
.tw-cd-candy-icing::after{content:"";position:absolute;top:100%;left:0;right:0;height:14px;background:radial-gradient(circle at 8% 0,#fff 0 7px,transparent 8px),radial-gradient(circle at 26% 0,#fff 0 9px,transparent 10px),radial-gradient(circle at 46% 0,#fff 0 8px,transparent 9px),radial-gradient(circle at 66% 0,#fff 0 10px,transparent 11px),radial-gradient(circle at 86% 0,#fff 0 7px,transparent 8px);}
.tw-cd-candy-tower{position:absolute;bottom:26%;width:54px;height:140px;background:linear-gradient(180deg,#ffe3ef,#ff9ec4);border-radius:27px 27px 0 0;box-shadow:0 0 44px #ff6fa566;}
.tw-cd-candy-tower::before{content:"";position:absolute;top:-26px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:29px solid transparent;border-right:29px solid transparent;border-bottom:30px solid #fff0f6;filter:drop-shadow(0 0 10px #ff6fa5aa);}
.tw-cd-candy-tower::after{content:"";position:absolute;top:-40px;left:50%;width:2px;height:16px;background:#fff;transform:translateX(-50%);box-shadow:0 0 8px #fff;}
.tw-cd-candy-river{position:absolute;bottom:0;left:0;right:0;height:11%;background:linear-gradient(180deg,#7a3f22,#4a2410);box-shadow:inset 0 8px 20px #00000077;}
.tw-cd-candy-river::after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 46px,#ffd79e33 46px 52px);animation:twSlide 9s linear infinite;}
.tw-cd-candy-pop{position:absolute;width:52px;height:52px;border-radius:50%;background:conic-gradient(#ff4b6b 0 25%,#fff 25% 50%,#ff4b6b 50% 75%,#fff 75%);box-shadow:0 0 22px #ff4b6b88,inset 0 0 10px #ffffffaa;animation:twGlowC 3s infinite;}
.tw-cd-candy-pop::after{content:"";position:absolute;top:100%;left:50%;transform:translateX(-50%);width:6px;height:60px;background:#fff;border-radius:3px;box-shadow:0 0 8px #ffffffaa;}
.tw-cd-candy-cane{position:absolute;width:16px;height:120px;border-radius:9px;background:repeating-linear-gradient(45deg,#ff4b6b 0 10px,#fff 10px 20px);box-shadow:0 0 16px #ff4b6b66;}
.tw-cd-candy-gum{position:absolute;width:22px;height:16px;border-radius:8px;background:currentColor;box-shadow:0 0 12px currentColor;opacity:.95;}
.tw-cd-fairy-light{position:absolute;width:8px;height:8px;border-radius:50%;background:#ffd75e;box-shadow:0 0 12px #ffd75e,0 0 24px #ffd75e88;animation:twFairyBlink 2s ease-in-out infinite;}
@keyframes twFairyBlink{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(0.8)}}
.tw-cd-snowflake{position:absolute;width:6px;height:6px;background:#fff;border-radius:50%;opacity:.8;animation:twGentleFall linear infinite;}
@keyframes twGentleFall{0%{transform:translateY(-10px) rotate(0deg)}100%{transform:translateY(calc(100vh + 10px)) rotate(360deg)}}
/* === M8 FORÊT DE SAPINS (volumineux) === */
.tw-pf-row{position:absolute;left:0;right:0;display:flex;align-items:flex-end;justify-content:space-around;}
.tw-pf-row.far{bottom:26%;opacity:.45;filter:blur(2px);}
.tw-pf-row.mid{bottom:14%;opacity:.85;}
.tw-pf-row.near{bottom:4%;}
.tw-pf2{position:relative;width:150px;height:236px;filter:drop-shadow(0 0 18px #2ecc7144);}
.tw-pf2 .trunk{position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:24px;height:36px;background:linear-gradient(90deg,#3a2010,#5a3418,#3a2010);border-radius:4px;}
.tw-pf2 .lyr{position:absolute;left:50%;transform:translateX(-50%);width:0;height:0;border-left:40px solid transparent;border-right:40px solid transparent;border-bottom:60px solid #12482a;}
.tw-pf2 .cap{position:absolute;left:50%;transform:translateX(-50%);height:13px;background:linear-gradient(180deg,#ffffff,#dceefb);border-radius:9px 9px 5px 5px;box-shadow:0 3px 8px #bfe3ff77;}
.tw-pf2 .cap.top{border-radius:50%;height:18px;}
.tw-pf2 .star{position:absolute;top:-16px;left:50%;transform:translateX(-50%);width:20px;height:20px;background:#ffd75e;clip-path:polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%);box-shadow:0 0 16px #ffd75e,0 0 34px #ffd75e99;animation:twStarGlow 2.4s infinite;}
.tw-pf-snow{position:absolute;bottom:0;left:0;right:0;height:11%;background:linear-gradient(180deg,#f4fbff,#cfe6f5 55%,#9cc4dd);box-shadow:inset 0 8px 22px #ffffffcc,0 -4px 20px #bfe3ff44;}
.tw-pf-mist{position:absolute;bottom:9%;left:-20%;width:140%;height:64px;background:linear-gradient(0deg,#bfe3ff38,transparent);filter:blur(10px);animation:twFogDrift 26s linear infinite;}
.tw-pf-garland{position:absolute;height:34px;border-bottom:2px solid #ffffff55;border-radius:0 0 50% 50%;}
.tw-pf-bulb{position:absolute;width:7px;height:9px;border-radius:50%;background:currentColor;box-shadow:0 0 10px currentColor,0 0 22px currentColor;animation:twLightBlink 1.5s infinite;}
@keyframes twLightBlink{0%,100%{opacity:1}50%{opacity:.35}}
/* === M9 ATELIER PÈRE NOËL V3 — CHALEUREUX === */
.tw-sh-room{position:absolute;inset:0;background:linear-gradient(180deg,#f5e6d3 0%,#f9eedd 55%,#f2d8bf 100%);}
.tw-sh-wallpaper{position:absolute;inset:0;background:radial-gradient(circle at 10% 20%,#ffe8cc44 0 18px,transparent 19px),radial-gradient(circle at 30% 45%,#ffd9b844 0 14px,transparent 15px),radial-gradient(circle at 70% 25%,#ffe8cc44 0 18px,transparent 19px),radial-gradient(circle at 90% 60%,#ffd9b844 0 14px,transparent 15px),repeating-linear-gradient(90deg,transparent 0 120px,#d4a87822 120px 122px);}
.tw-sh-halo{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 40%,#fff5d899 0%,#ffebc066 25%,transparent 60%);animation:twGlowC 4s infinite;}
.tw-sh-beam{position:absolute;top:0;left:0;right:0;height:40px;background:linear-gradient(180deg,#c49366,#a67850);box-shadow:0 4px 10px #00000044,inset 0 -4px 8px #00000022;}
.tw-sh-beam::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 46px,#8a5a3433 46px 48px);}
.tw-sh-garland{position:absolute;top:44px;left:2%;right:2%;height:32px;border-bottom:2px solid #8a5a34;border-radius:0 0 50% 50%;}
.tw-sh-bulb{position:absolute;width:9px;height:11px;border-radius:50%;background:currentColor;box-shadow:0 0 12px currentColor,0 0 24px currentColor;animation:twLightBlink 1.4s infinite;}
@keyframes twLightBlink{0%,100%{opacity:1}50%{opacity:.4}}
.tw-sh-wreath{position:absolute;width:56px;height:56px;border-radius:50%;border:8px solid #2d6b3e;box-shadow:0 0 16px #2ecc7166,inset 0 0 8px #00000022;background:radial-gradient(circle,#2d6b3e 0 6px,#1a4a26 6px 14px,transparent 14px);}
.tw-sh-wreath::before{content:"";position:absolute;top:12%;left:12%;width:6px;height:6px;border-radius:50%;background:#d42a4a;box-shadow:28px 0 0 #d42a4a,14px 28px 0 #d42a4a,0 14px 0 #d42a4a;}
.tw-sh-wreath::after{content:"";position:absolute;bottom:-14px;left:50%;transform:translateX(-50%);width:18px;height:14px;background:#d42a4a;clip-path:polygon(0 0,100% 0,50% 100%);filter:drop-shadow(0 0 6px #d42a4a);}
.tw-sh-ribbon{position:absolute;top:40px;width:2px;height:36px;background:#8a5a34;}
.tw-sh-floor{position:absolute;bottom:0;left:0;right:0;height:17%;background:linear-gradient(180deg,#f4c2c2 0%,#e8a9a9 60%,#d48a8a 100%);box-shadow:inset 0 6px 18px #00000044;}
.tw-sh-floor::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 78px,#c77f7f22 78px 80px),repeating-linear-gradient(0deg,transparent 0 40px,#c77f7f18 40px 42px);}
.tw-sh-rug{position:absolute;bottom:2%;left:50%;transform:translateX(-50%);width:54%;height:6%;background:radial-gradient(ellipse,#d42a4a 0%,#a81430 70%,#7a0e22 100%);border-radius:50%;box-shadow:0 0 24px #d42a4a55,inset 0 0 18px #00000044;}
.tw-sh-rug::before{content:"";position:absolute;inset:8%;border:2px solid #ffd75e66;border-radius:50%;}
.tw-sh-rug::after{content:"";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:40%;height:50%;border:2px solid #ffd75e66;border-radius:50%;}
.tw-sh-win{position:absolute;width:140px;height:180px;background:radial-gradient(ellipse at 50% 30%,#cfe9ff 0%,#a8d5f0 40%,#7ab4dd 80%);border:10px solid #a67850;border-radius:70px 70px 8px 8px;box-shadow:0 0 30px #ffffffaa,inset 0 0 24px #ffffff66;overflow:hidden;}
.tw-sh-win::before{content:"";position:absolute;left:50%;top:0;bottom:0;width:5px;transform:translateX(-50%);background:#a67850;}
.tw-sh-win::after{content:"";position:absolute;left:0;right:0;top:50%;height:5px;background:#a67850;}
.tw-sh-win-snow{position:absolute;left:-10%;right:-10%;top:0;height:100%;background:radial-gradient(circle at 10% 10%,#fff 0 3px,transparent 4px),radial-gradient(circle at 30% 25%,#fff 0 2px,transparent 3px),radial-gradient(circle at 50% 15%,#fff 0 3px,transparent 4px),radial-gradient(circle at 70% 30%,#fff 0 2px,transparent 3px),radial-gradient(circle at 90% 20%,#fff 0 3px,transparent 4px),radial-gradient(circle at 20% 50%,#fff 0 2px,transparent 3px),radial-gradient(circle at 60% 60%,#fff 0 3px,transparent 4px),radial-gradient(circle at 85% 70%,#fff 0 2px,transparent 3px);animation:twShWinSnow 8s linear infinite;opacity:.9;}
@keyframes twShWinSnow{0%{transform:translateY(-40px)}100%{transform:translateY(40px)}}
.tw-sh-win-sill{position:absolute;top:178px;left:-12px;right:-12px;height:14px;background:linear-gradient(180deg,#ffffff,#e8f4ff);border-radius:4px;box-shadow:0 4px 8px #00000044;}
.tw-sh-fire{position:absolute;bottom:17%;width:140px;height:140px;background:linear-gradient(180deg,#e8d4b8,#c9b090 60%,#a67850);border-radius:8px;box-shadow:0 0 20px #00000044;}
.tw-sh-fire::before{content:"";position:absolute;top:12px;left:12px;right:12px;height:78px;background:#1a0f08;border-radius:4px;box-shadow:inset 0 0 20px #000;}
.tw-sh-flame{position:absolute;bottom:28px;left:50%;transform:translateX(-50%);width:60px;height:60px;background:radial-gradient(ellipse at bottom,#ffdd55,#ff8c00 55%,#d43a00 85%);border-radius:50% 50% 20% 20%;animation:twFireFlick .7s infinite;box-shadow:0 0 40px #ff8c00aa,0 0 80px #ff8c0055;}
@keyframes twFireFlick{0%,100%{transform:translateX(-50%) scaleY(1)}50%{transform:translateX(-50%) scaleY(1.14) scaleX(.92)}}
.tw-sh-mantel{position:absolute;bottom:144px;left:-10px;right:-10px;height:14px;background:linear-gradient(180deg,#c49366,#8a5a34);border-radius:4px;box-shadow:0 4px 8px #00000066;}
.tw-sh-sock{position:absolute;top:14px;width:22px;height:40px;background:#d42a4a;border-radius:0 0 12px 12px;box-shadow:inset -2px -2px 6px #00000044;}
.tw-sh-sock::before{content:"";position:absolute;top:-8px;left:50%;transform:translateX(-50%);width:26px;height:10px;background:#fff;border-radius:4px;}
.tw-sh-sock::after{content:"";position:absolute;top:18px;left:6px;right:6px;height:3px;background:#2ecc71;}
.tw-sh-tree{position:absolute;bottom:17%;width:150px;height:220px;filter:drop-shadow(0 0 20px #2ecc7155);}
.tw-sh-tree .trunk{position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:22px;height:28px;background:linear-gradient(90deg,#5a3418,#7a4a28,#5a3418);border-radius:3px;}
.tw-sh-tree .pot{position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:50px;height:26px;background:linear-gradient(180deg,#d42a4a,#a81430);border-radius:4px 4px 6px 6px;box-shadow:0 4px 8px #00000066;}
.tw-sh-tree .pot::before{content:"";position:absolute;top:-4px;left:-4px;right:-4px;height:6px;background:#a81430;border-radius:3px;}
.tw-sh-tree .lyr{position:absolute;left:50%;transform:translateX(-50%);width:0;height:0;border-left:44px solid transparent;border-right:44px solid transparent;border-bottom:54px solid #2d6b3e;}
.tw-sh-tree .lyr.l1{bottom:26px;border-left-width:54px;border-right-width:54px;border-bottom-width:62px;border-bottom-color:#2d6b3e;}
.tw-sh-tree .lyr.l2{bottom:70px;border-left-width:44px;border-right-width:44px;border-bottom-width:54px;border-bottom-color:#358048;}
.tw-sh-tree .lyr.l3{bottom:110px;border-left-width:34px;border-right-width:34px;border-bottom-width:48px;border-bottom-color:#3e9656;}
.tw-sh-tree .lyr.l4{bottom:146px;border-left-width:22px;border-right-width:22px;border-bottom-width:38px;border-bottom-color:#4aad62;}
.tw-sh-tree .star{position:absolute;top:-14px;left:50%;transform:translateX(-50%);width:24px;height:24px;background:#ffd75e;clip-path:polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%);box-shadow:0 0 18px #ffd75e,0 0 36px #ffd75ecc;animation:twStarGlow 2s infinite;}
@keyframes twStarGlow{0%,100%{opacity:1}50%{opacity:.6}}
.tw-sh-ornament{position:absolute;width:12px;height:12px;border-radius:50%;background:currentColor;box-shadow:0 0 10px currentColor,inset -2px -2px 3px #00000044;}
.tw-sh-shelf{position:absolute;width:110px;height:14px;background:linear-gradient(180deg,#c49366,#a67850);border-radius:3px;box-shadow:0 4px 6px #00000044,inset 0 -2px 3px #00000033;}
.tw-sh-shelf::before{content:"";position:absolute;top:-4px;left:4px;right:4px;height:4px;background:#8a5a34;}
.tw-sh-bracket{position:absolute;top:14px;width:10px;height:18px;background:#8a5a34;clip-path:polygon(0 0,100% 0,50% 100%);}
.tw-sh-bear{position:absolute;width:30px;height:34px;background:radial-gradient(ellipse at 50% 60%,#c9a078,#8a6840);border-radius:50% 50% 45% 45%;box-shadow:inset -3px -4px 6px #00000044;}
.tw-sh-bear::before{content:"";position:absolute;top:2px;left:3px;width:8px;height:8px;border-radius:50%;background:#c9a078;box-shadow:16px 0 0 #c9a078;}
.tw-sh-bear::after{content:"";position:absolute;top:14px;left:50%;transform:translateX(-50%);width:10px;height:6px;background:#4a2a10;border-radius:50%;}
.tw-sh-ball{position:absolute;width:22px;height:22px;border-radius:50%;background:radial-gradient(circle at 30% 30%,currentColor,#00000044);box-shadow:0 0 10px currentColor;}
.tw-sh-block{position:absolute;width:22px;height:22px;background:currentColor;border-radius:3px;box-shadow:inset -2px -2px 4px #00000044,0 2px 4px #00000044;}
.tw-sh-block::after{content:"";position:absolute;inset:4px;border:2px solid #ffffff88;border-radius:2px;}
.tw-sh-doll{position:absolute;width:22px;height:32px;background:linear-gradient(180deg,#ff9ec4,#d42a7a);border-radius:11px 11px 4px 4px;box-shadow:inset -2px -2px 5px #00000033;}
.tw-sh-doll::before{content:"";position:absolute;top:-8px;left:50%;transform:translateX(-50%);width:14px;height:14px;background:#ffd9b8;border-radius:50%;}
.tw-sh-doll::after{content:"";position:absolute;top:-10px;left:50%;transform:translateX(-50%);width:16px;height:8px;background:#ffd75e;border-radius:8px 8px 0 0;}
.tw-sh-train{position:absolute;width:40px;height:22px;background:linear-gradient(180deg,#d42a4a,#a81430);border-radius:4px 10px 2px 2px;box-shadow:0 2px 4px #00000066;}
.tw-sh-train::before{content:"";position:absolute;top:4px;left:4px;width:10px;height:10px;border-radius:50%;background:#ffd75e;box-shadow:0 0 6px #ffd75e;}
.tw-sh-train::after{content:"";position:absolute;top:-8px;right:4px;width:6px;height:10px;background:#2a1208;border-radius:2px 2px 0 0;}
.tw-sh-santa{position:absolute;bottom:17%;left:50%;transform:translateX(-50%);width:110px;height:170px;animation:twSantaBob 2.8s ease-in-out infinite;}
@keyframes twSantaBob{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-8px)}}
.tw-sh-santa .body{position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:96px;height:88px;background:linear-gradient(180deg,#d42a4a,#a81430);border-radius:48px 48px 16px 16px;box-shadow:0 0 28px #d42a4a66,inset -6px -8px 14px #00000033;}
.tw-sh-santa .body::before{content:"";position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:96px;height:18px;background:#fff;border-radius:0 0 16px 16px;}
.tw-sh-santa .belt{position:absolute;bottom:30px;left:50%;transform:translateX(-50%);width:96px;height:14px;background:#2a1208;}
.tw-sh-santa .buckle{position:absolute;bottom:31px;left:50%;transform:translateX(-50%);width:18px;height:12px;background:#ffd75e;border-radius:3px;box-shadow:0 0 10px #ffd75e,inset 0 -2px 2px #8a6a1a;}
.tw-sh-santa .head{position:absolute;bottom:96px;left:50%;transform:translateX(-50%);width:54px;height:50px;background:linear-gradient(180deg,#ffe3c4,#ffd9b8 60%,#f5c9a0);border-radius:48% 48% 44% 44% / 56% 56% 46% 46%;box-shadow:inset -3px -3px 6px #00000018;z-index:1;}
.tw-sh-santa .head::before,.tw-sh-santa .head::after{content:"";position:absolute;bottom:22px;width:10px;height:7px;border-radius:50%;background:#ff9d9d55;}
.tw-sh-santa .head::before{left:7px;}
.tw-sh-santa .head::after{right:7px;}
.tw-sh-santa .beard{position:absolute;bottom:62px;left:50%;transform:translateX(-50%);width:84px;height:56px;background:linear-gradient(180deg,#ffffff,#f2f2f2 70%,#e4e4e4);border-radius:18px 18px 44px 44px;box-shadow:0 0 16px #ffffff88,inset -4px -6px 8px #00000018;z-index:2;}
.tw-sh-santa .beard::before,.tw-sh-santa .beard::after{content:"";position:absolute;top:-5px;width:24px;height:12px;background:#fff;border-radius:50%;box-shadow:0 2px 3px #00000014;}
.tw-sh-santa .beard::before{left:8px;transform:rotate(10deg);}
.tw-sh-santa .beard::after{right:8px;transform:rotate(-10deg);}
.tw-sh-santa .eye{position:absolute;bottom:122px;width:5px;height:6px;border-radius:50%;background:#2a1208;z-index:3;}
.tw-sh-santa .eye::before{content:"";position:absolute;top:-4px;left:-2px;width:9px;height:4px;background:#fff;border-radius:3px;}
.tw-sh-santa .eye.l{left:40px;}.tw-sh-santa .eye.r{left:65px;}
.tw-sh-santa .nose{position:absolute;bottom:112px;left:50%;transform:translateX(-50%);width:13px;height:12px;background:linear-gradient(180deg,#f5a88e,#e08a6e);border-radius:50%;z-index:3;}
.tw-sh-santa .mouth{position:absolute;bottom:98px;left:50%;transform:translateX(-50%);width:16px;height:9px;background:#7a2020;border-radius:4px 4px 9px 9px;z-index:3;}
.tw-sh-santa .hat{position:absolute;bottom:138px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:27px solid transparent;border-right:27px solid transparent;border-bottom:42px solid #d42a4a;z-index:4;}
.tw-sh-santa .hat::before{content:"";position:absolute;top:36px;bottom:auto;left:50%;transform:translateX(-50%);width:64px;height:12px;background:#fff;border-radius:6px;box-shadow:0 2px 4px #00000022;}
.tw-sh-santa .pom{position:absolute;bottom:172px;left:50%;transform:translateX(-50%);width:20px;height:20px;background:#fff;border-radius:50%;box-shadow:0 0 14px #ffffffaa;z-index:4;}
.tw-sh-santa .arm{position:absolute;bottom:48px;width:38px;height:18px;background:#d42a4a;border-radius:9px;box-shadow:inset -2px -2px 4px #00000033;}
.tw-sh-santa .arm::before{content:"";position:absolute;right:-2px;top:2px;width:14px;height:14px;background:#fff;border-radius:50%;}
.tw-sh-santa .arm.l{left:-16px;transform:rotate(20deg);}
.tw-sh-santa .arm.r{right:-16px;transform:rotate(-40deg);}
.tw-sh-santa .gift{position:absolute;bottom:70px;right:-42px;width:32px;height:32px;background:#2ecc71;border-radius:4px;box-shadow:0 0 16px #2ecc7166,0 4px 8px #00000044;animation:twGiftWave 2.8s ease-in-out infinite;}
.tw-sh-santa .gift::before{content:"";position:absolute;top:0;left:50%;transform:translateX(-50%);width:6px;height:100%;background:#ffd75e;}
.tw-sh-santa .gift::after{content:"";position:absolute;top:50%;left:0;transform:translateY(-50%);width:100%;height:6px;background:#ffd75e;}
@keyframes twGiftWave{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(14deg) translateY(-5px)}}
.tw-sh-elf{position:absolute;bottom:17%;width:48px;height:78px;animation:twElfWalk 13s linear infinite;}
@keyframes twElfWalk{0%{left:-12%}46%{left:84%}50%{left:84%}96%{left:-12%}100%{left:-12%}}
.tw-sh-elf.flip{animation-name:twElfWalkFlip;}
@keyframes twElfWalkFlip{0%{left:84%}46%{left:-12%}50%{left:-12%}96%{left:84%}100%{left:84%}}
.tw-sh-elf .body{position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:38px;height:40px;background:linear-gradient(180deg,#2ecc71,#1a9a4a);border-radius:18px 18px 6px 6px;box-shadow:inset -3px -4px 6px #00000033;}
.tw-sh-elf .body::before{content:"";position:absolute;top:0;left:50%;transform:translateX(-50%);width:38px;height:10px;background:#d42a4a;border-radius:18px 18px 0 0;}
.tw-sh-elf .head{position:absolute;bottom:36px;left:50%;transform:translateX(-50%);width:26px;height:26px;background:#ffd9b8;border-radius:50%;}
.tw-sh-elf .hat{position:absolute;bottom:58px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:14px solid transparent;border-right:14px solid transparent;border-bottom:26px solid #d42a4a;}
.tw-sh-elf .pom{position:absolute;bottom:80px;left:50%;transform:translateX(-50%);width:10px;height:10px;background:#fff;border-radius:50%;box-shadow:0 0 8px #ffffff88;}
.tw-sh-elf .carry{position:absolute;bottom:30px;left:50%;transform:translateX(-50%);width:22px;height:22px;background:currentColor;border-radius:3px;box-shadow:0 0 12px currentColor,0 2px 4px #00000044;}
.tw-sh-elf .carry::before{content:"";position:absolute;top:0;left:50%;transform:translateX(-50%);width:4px;height:100%;background:#ffffff88;}
.tw-sh-table{position:absolute;bottom:17%;left:50%;transform:translateX(-50%);width:240px;height:50px;}
.tw-sh-table .top{position:absolute;top:0;left:0;right:0;height:10px;background:linear-gradient(180deg,#d42a4a,#a81430);border-radius:4px 4px 0 0;}
.tw-sh-table .cloth{position:absolute;top:10px;left:-10px;right:-10px;height:30px;background:radial-gradient(ellipse,#d42a4a,#a81430);border-radius:0 0 40% 40% / 0 0 60% 60%;box-shadow:0 6px 12px #00000044;}
.tw-sh-table .cloth::before{content:"";position:absolute;inset:4px 8px;border:2px dotted #ffd75e88;border-radius:0 0 40% 40% / 0 0 60% 60%;}
.tw-sh-gift-pile{position:absolute;bottom:40px;left:50%;transform:translateX(-50%);width:200px;height:50px;}
.tw-sh-gift-pile .g{position:absolute;border-radius:4px;box-shadow:0 0 14px #00000044;}
.tw-sh-gift-pile .g::before{content:"";position:absolute;top:0;left:50%;transform:translateX(-50%);width:4px;height:100%;background:#ffffffaa;}
.tw-sh-gift-pile .g::after{content:"";position:absolute;top:50%;left:0;transform:translateY(-50%);width:100%;height:4px;background:#ffffffaa;}
.tw-sh-pet{position:absolute;bottom:17%;right:12%;width:60px;height:46px;background:radial-gradient(ellipse at 50% 60%,#c9a078,#8a6840);border-radius:50% 50% 40% 40%;box-shadow:inset -4px -6px 10px #00000044;animation:twPetSleep 4s ease-in-out infinite;}
@keyframes twPetSleep{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
.tw-sh-pet::before{content:"";position:absolute;top:2px;left:8px;width:12px;height:14px;background:#c9a078;border-radius:50% 50% 40% 40%;box-shadow:30px 0 0 #c9a078;}
.tw-sh-pet::after{content:"";position:absolute;top:18px;left:50%;transform:translateX(-50%);width:12px;height:8px;background:#4a2a10;border-radius:50%;}
.tw-sh-plate{position:absolute;bottom:17%;left:14%;width:54px;height:14px;background:radial-gradient(ellipse,#fff,#e8d8c8);border-radius:50%;box-shadow:0 2px 6px #00000044,inset 0 -2px 4px #00000022;}
.tw-sh-cookie{position:absolute;bottom:21%;left:16%;width:20px;height:20px;background:radial-gradient(circle at 40% 40%,#c9a078,#7a5a30);border-radius:50%;box-shadow:inset -2px -2px 4px #00000044;}
.tw-sh-cookie::before{content:"";position:absolute;top:4px;left:6px;width:3px;height:3px;border-radius:50%;background:#4a2a10;box-shadow:6px 4px 0 #4a2a10,2px 8px 0 #4a2a10;}
.tw-sh-glass{position:absolute;bottom:21%;left:24%;width:16px;height:24px;background:linear-gradient(180deg,#fff9e8 0%,#fff9e8 40%,#f8e8c8 40%,#d4a878 100%);border-radius:3px 3px 0 0;border:2px solid #ffffffaa;box-shadow:0 2px 6px #00000044;}
.tw-sh-sparkle{position:absolute;width:14px;height:14px;background:linear-gradient(0deg,transparent 42%,#ffd75e 42% 58%,transparent 58%),linear-gradient(90deg,transparent 42%,#ffd75e 42% 58%,transparent 58%);animation:twSparkle 3.4s ease-in-out infinite;filter:drop-shadow(0 0 6px #ffd75e);}
@keyframes twSparkle{0%,100%{opacity:0;transform:scale(.4) rotate(0deg)}50%{opacity:1;transform:scale(1.2) rotate(45deg)}}
.tw-sh-snow-out{position:absolute;width:5px;height:5px;border-radius:50%;background:#fff;opacity:.9;animation:twFall linear infinite;}
.tw-brief{position:fixed;inset:0;background:#000a;display:flex;align-items:center;justify-content:center;z-index:9995;}
.tw-brief-card{background:#0f051d;border:2px solid #00d2ff;border-radius:12px;padding:16px;max-width:82%;text-align:center;}
.tw-stars{font-size:26px;letter-spacing:6px;text-align:center;margin:10px 0;}
.tw-stars span{display:inline-block;animation:twPop .6s ease backwards;}
.twg-screen{position:fixed;inset:0;background:radial-gradient(ellipse at 50% 0%,#1a2142,#05050f 70%);z-index:9996;display:none;flex-direction:column;}
.twg-header{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#0f051d;border-bottom:2px solid #00d2ff;}
.twg-header b{color:#00d2ff;font-size:13px;flex:1;text-align:center;}
#twg-timer{color:#fff;font-weight:900;font-size:15px;min-width:56px;text-align:right;}
.twg-hud{text-align:center;padding:10px 6px 4px;font-size:clamp(20px,6vw,28px);font-weight:900;color:#00d2ff;text-shadow:0 0 14px #00d2ff88;}
.twg-bar{height:10px;margin:4px 16px;background:#200010;border-radius:5px;overflow:hidden;display:none;}
.twg-gridwrap{flex:1;display:flex;align-items:center;justify-content:center;padding:10px;overflow:hidden;}
#tower-game .tg-grid{display:grid;gap:8px;width:100%;max-width:520px;}
.tg-tile{background:linear-gradient(180deg,#1a2142,#0d1226);border:2px solid #00d2ff55;border-radius:12px;color:#fff;font-weight:900;font-size:clamp(18px,5vw,26px);padding:0;aspect-ratio:1;display:flex;align-items:center;justify-content:center;cursor:pointer;}
.tg-tile.sel{border-color:#f8b500;box-shadow:0 0 10px #f8b500;}
.tg-tile.gone{opacity:0;pointer-events:none;transform:scale(.4);transition:all .3s;}
.tg-tile.foggy{animation:twFog 2s infinite;}
.tg-tile.err{border-color:#ff4b2b !important;box-shadow:0 0 14px #ff4b2b;background:linear-gradient(180deg,#3a0a0a,#200505) !important;animation:twShake .3s;}
@keyframes twShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
.twg-msg{text-align:center;font-size:11px;color:#aaa;padding:6px 10px 12px;}
@keyframes twFlickP{50%{opacity:.15}}
@keyframes twCloud{from{left:-30%}to{left:110%}}
@keyframes twWin{0%,38%{opacity:1}45%,88%{opacity:.08}95%,100%{opacity:1}}
@keyframes twDrive{from{left:-20%}to{left:115%}}
@keyframes twDriveR{from{left:115%}to{left:-20%}}
@keyframes twSlide{to{background-position:300% 0}}
@keyframes twBlimp{from{left:-15%}to{left:110%}}
@keyframes twPlaneX{from{left:110%}to{left:-10%}}
@keyframes twShoot{0%{opacity:0;transform:rotate(-30deg) translateX(0)}5%{opacity:.9}12%{opacity:0;transform:rotate(-30deg) translateX(-240px)}100%{opacity:0}}
@keyframes twSignalPulse{50%{opacity:.55;filter:blur(1.6px)}}
@keyframes twGlowC{50%{filter:brightness(1.6)}}
@keyframes twFly{0%,100%{transform:translate(0,0);opacity:.9}25%{transform:translate(14px,-18px);opacity:.5}50%{transform:translate(-10px,-30px);opacity:.9}75%{transform:translate(8px,-12px);opacity:.6}}
@keyframes twSpin{to{transform:translate(-50%,-50%) rotate(360deg)}}
@keyframes twCamSweep{from{transform:translateX(-50%) rotate(-25deg)}to{transform:translateX(-50%) rotate(25deg)}}
@keyframes twFall{0%{top:-4%}100%{top:104%}}
@keyframes twRise{0%{top:104%}100%{top:-4%}}
@keyframes twPop{0%{transform:scale(0)}70%{transform:scale(1.4)}100%{transform:scale(1)}}
@keyframes twFog{50%{opacity:.25}}
.tw-lvlpop{position:fixed;inset:0;background:#000c;z-index:9997;display:flex;align-items:center;justify-content:center;}
.tw-lvlpop-card{background:#0f051d;border:2px solid #00d2ff;border-radius:14px;padding:14px;width:min(94%,420px);max-height:80%;display:flex;flex-direction:column;box-shadow:0 0 20px #00d2ff66;}
.tw-lvlpop-card h3{color:#00d2ff;text-align:center;margin:0 0 10px;font-size:15px;}
.tw-lvl-grid{overflow-y:auto;display:grid;grid-template-columns:repeat(6,1fr);gap:8px;padding:4px;}
.tw-lvl-cell{aspect-ratio:1;border-radius:10px;background:#1a1a2e;border:2px solid #333;color:#fff;font-weight:900;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:13px;cursor:pointer;}
.tw-lvl-cell .st{font-size:8px;color:#f8b500;line-height:1;}
.tw-lvl-cell.cur{border-color:#00d2ff;box-shadow:0 0 12px #00d2ff66;}
.tw-lvl-cell.lock{opacity:.35;cursor:default;}
.tw-lvl-cell.boss{border-color:#ff4b2b;}
@media (max-width:760px), (pointer:coarse){
.tw-road{height:140px;}
.tw-horizon{bottom:140px;}
.tw-cityback{bottom:140px;height:38%;}
.tw-city{bottom:140px;height:30%;}
.tw-wl{animation:none;box-shadow:none;}
.tw-star2{animation:none;}
.tw-part{display:none;}
.tw-cloud{display:none;}
.tw-reflect{display:none;}
.tw-car .hl,.tw-car .tl{display:none;}
.tw-cryscl{filter:none;animation:none;}
.tw-signalbeam{display:none;}
.tw-batsignal{font-size:20px;letter-spacing:4px;}
.tw-goldpart{display:none;}
.tw-panel .num{font-size:36px;}
.tw-panel { padding:10px 20px !important; margin-bottom:6px !important; }
.tw-panel .num { font-size:32px !important; }
.tw-panel .typ { font-size:10px !important; }
.tw-playbtn { padding:8px 40px !important; font-size:18px !important; }
.tw-arrow { width:36px !important; height:36px !important; font-size:14px !important; }
.tw-worldtag { font-size:13px !important; padding:4px 12px !important; }
.tw-center{justify-content:flex-start !important;padding-top:6px !important;padding-bottom:12px !important;}
.tw-playrow{margin-top:auto !important;}
.tw-worldtag{font-size:12px !important;padding:3px 10px !important;background:rgba(15,5,29,.5) !important;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);}
.tw-panel{padding:8px 18px !important;background:rgba(90,58,26,.55) !important;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);box-shadow:0 4px 0 #3a2a05,0 0 18px #0008 !important;}
.tw-panel .num{font-size:26px !important;}
.tw-panel .typ{font-size:9px !important;}
.tw-panel-stars{font-size:12px !important;}
.tw-playbtn{padding:8px 40px !important;font-size:17px !important;background:rgba(26,154,58,.7) !important;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);}
.tw-arrow{width:34px !important;height:34px !important;font-size:14px !important;background:rgba(26,26,46,.6) !important;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);}
}
`;
document.head.appendChild(style);
})();
/* ----- 5. GÉNÉRATION DES FONDS ----- */
function goldPileHTML(leftPos) {
let g = "";
[[0,0],[34,0],[68,0],[102,0],[17,14],[51,14],[85,14],[34,28],[68,28]].forEach(p => {
g += `<span class="g" style="left:${p[0]}px;bottom:${p[1]}px;width:30px;height:11px;"></span>`;
});
for (let i = 0; i < 5; i++) g += `<span class="c" style="left:${-8+i*30}px;bottom:${-2+(i%2)*4}px;"></span>`;
return `<div class="tw-goldpile" style="left:${leftPos};">${g}</div>`;
}
function generateSceneHTML(c, W, C) {
if (SCENE_CACHE[c]) return SCENE_CACHE[c];
let html = "";
if (W.scene === "city") {
html += `<span class="tw-moon"></span>`;
const starsN = IS_MOBILE ? 45 : 120;
for (let i = 0; i < starsN; i++) html += `<span class="tw-star2" style="left:${(i*37)%98}%;top:${(i*13)%55}%;animation-delay:${(i*.23)%3}s;"></span>`;
const cloudsN = IS_MOBILE ? 2 : 4;
for (let i = 0; i < cloudsN; i++) html += `<span class="tw-cloud" style="top:${3+i*7}%;width:${22+(i*9)%16}%;animation-duration:${70+i*25}s;animation-delay:${i*11}s;"></span>`;
html += `<div class="tw-horizon"></div><div class="tw-signalbeam l"></div><div class="tw-signalbeam r"></div><div class="tw-batsignal">⚡ CHIFFRE BLITZ</div>`;
const cols = ["#00ffff","#ff00ff","#f8b500","#7dff8a"];
let back = "";
const hb = [72,92,80,96,86,90,78];
for (let i = 0; i < (IS_MOBILE?6:7); i++) back += `<div class="tw-bldg" style="height:${hb[i]}%;flex:${i%2?1.25:1};"></div>`;
html += `<div class="tw-cityback">${back}</div>`;
let b = "";
const hs = [48,72,56,86,62,76], hf = [1,1.2,.95,1.15,1,.9];
for (let i = 0; i < (IS_MOBILE?5:6); i++) {
let wins = "";
const n = IS_MOBILE ? (6+(i%3)*3) : (14+(i%3)*6);
for (let w = 0; w < n; w++) wins += `<span class="tw-wl" style="color:${cols[(w+i)%4]};left:${6+((w*23)%82)}%;top:${4+((w*29)%88)}%;animation-duration:${2.5+((w*13)%4)}s;animation-delay:${(w*0.37)%3}s;"></span>`;
b += `<div class="tw-bldg" style="height:${hs[i]}%;flex:${hf[i]};">${wins}${(!IS_MOBILE&&i%3===0)?'<span class="tw-ant"></span>':""}</div>`;
}
html += `<div class="tw-city">${b}</div>`;
const roadH = IS_MOBILE ? 140 : 180;
const tpos = IS_MOBILE ? [{o:8,l:true},{o:10,l:false}] : [{o:5,l:true},{o:9,l:false},{o:22,l:true}];
for (let i = 0; i < tpos.length; i++) {
const p = tpos[i], h = 300 + i*120, w = 90 + (i*23)%40;
let wins2 = "";
const nw = IS_MOBILE ? 10 : 22;
for (let wI = 0; wI < nw; wI++) wins2 += `<span class="tw-wl" style="color:${cols[(wI+i)%4]};left:${8+((wI*23)%78)}%;top:${2+((wI*17)%94)}%;animation-duration:${2.5+((wI*13)%4)}s;"></span>`;
html += `<div class="tw-bldg-solo" style="bottom:${roadH}px;${p.l?("left:"+p.o+"%"):("right:"+p.o+"%")};height:${h}px;width:${w}px;opacity:.85;">${wins2}</div>`;
}
html += `<div class="tw-blimp" style="top:24%;animation-duration:55s;animation-delay:-20s;color:#00d2ff;"><span class="neo"></span></div>`;
if (!IS_MOBILE) {
html += `<div class="tw-blimp" style="top:48%;animation-duration:70s;animation-delay:-45s;color:#ff2bd6;"><span class="neo"></span></div>`;
html += `<div class="tw-plane" style="top:18%;animation-duration:16s;animation-delay:-6s;"></div>`;
}
html += `<span class="tw-shoot" style="left:70%;top:14%;animation-delay:2s;"></span><div class="tw-road"><span class="tw-lane"></span></div>`;
if (!IS_MOBILE) html += `<div class="tw-reflect"></div>`;
const car = (cls, bottom, dur, delay, col) => `<span class="tw-car ${cls}" style="bottom:${bottom};animation-duration:${dur};animation-delay:${delay};color:${col};"><i class="cb"></i><i class="cc"></i><i class="ug"></i><i class="hl"></i><i class="tl"></i></span>`;
if (IS_MOBILE) html += car("","14px","9s","0s","#00d2ff")+car("s","28px","7s","3s","#f8b500")+car("r","78px","10s","1.5s","#ff2bd6");
else html += car("","16px","9s","0s","#00d2ff")+car("","34px","11s","2.5s","#f8b500")+car("s","24px","7s","5s","#7dff8a")+car("r","96px","10s","1.5s","#ff2bd6")+car("r s","104px","8s","6.5s","#ff8a00");
}
if (W.scene === "glacier") {
html += `<div class="tw-cavewall"></div><div class="tw-gwall"></div><div class="tw-gwall r"></div>`;
const gemN = IS_MOBILE ? 6 : 12;
for (let i = 0; i < gemN; i++) {
const L = (i % 2 === 0);
html += `<span class="tw-gem" style="${L?("left:"+(2+(i*7)%8)+"%"):("right:"+(2+(i*7)%8)+"%")};top:${12+(i*11)%76}%;animation-delay:${(i*.4)%2}s;"></span>`;
}
html += `<div class="tw-gceil"></div>`;
[[6,180],[16,130],[26,210],[38,110],[50,180],[62,130],[74,200],[86,120],[94,160]].forEach(p => { html += `<span class="tw-stalac" style="left:${p[0]}%;height:${p[1]}px;"></span>`; });
const shelfN = IS_MOBILE ? 5 : 8;
for (let i = 0; i < shelfN; i++) {
const top = 20 + i * (58 / shelfN), L = (i % 2 === 0), s = .7 + ((i*13)%4)/10;
html += `<div class="tw-shelf ${L?"":"r"}" style="top:${top}%;${L?"left:0;":"right:0;"}"><span class="rock"></span><span class="tw-cryscl ${["","pink","gold","green","violet"][i%5]} ${["","tall","wide"][i%3]}" style="bottom:18px;left:22%;transform:scale(${s});animation-delay:${i*.5}s;"><i class="c c1"></i><i class="c c2"></i><i class="c c3"></i></span></div>`;
}
const flyN = IS_MOBILE ? 4 : 10;
for (let i = 0; i < flyN; i++) html += `<span class="tw-firefly" style="left:${10+(i*29)%80}%;top:${12+(i*17)%70}%;animation-duration:${5+(i%4)*2}s;animation-delay:${i*.6}s;"></span>`;
html += `<div class="tw-icelake"></div>`;
[[10,130],[26,100],[42,120],[58,90],[74,110],[90,100]].forEach(p => { html += `<span class="tw-stalag" style="left:${p[0]}%;height:${p[1]}px;"></span>`; });
html += `<div class="tw-cavedark"></div>`;
}
if (W.scene === "vault") {
html += `<div class="tw-marble"></div><div class="tw-vfloor"></div><div class="tw-vreflect"></div><div class="tw-pillar" style="left:4%;"></div><div class="tw-pillar" style="right:4%;"></div>`;
const colsPos = IS_MOBILE ? [16] : [14, 20, 26];
const rows = IS_MOBILE ? 7 : 10;
colsPos.forEach((cx, ci) => {
for (let i = 0; i < rows; i++) {
const top = 8 + i * (84 / rows) + (ci % 2) * 2;
html += `<span class="tw-safebox" style="left:${cx}%;top:${top}%;"></span><span class="tw-safebox bz" style="right:${cx}%;top:${top + 2}%;"></span>`;
}
});
html += `<div class="tw-spotv l"></div><div class="tw-spotv c"></div><div class="tw-spotv r"></div>`;
html += goldPileHTML("24%") + goldPileHTML("66%");
html += `<div class="tw-spotimpact l"></div><div class="tw-spotimpact c"></div><div class="tw-spotimpact r"></div><div class="tw-vfloorglow"></div>`;
let bolts = ""; for (let i = 0; i < 12; i++) { const a = i*Math.PI/6; bolts += `<span class="tw-vbolt" style="left:${50+44*Math.cos(a)}%;top:${50+44*Math.sin(a)}%;"></span>`; }
let knobs = ""; for (let i = 0; i < 6; i++) { const a = i*Math.PI/3; knobs += `<span class="tw-knob" style="left:${50+38*Math.cos(a)}%;top:${50+38*Math.sin(a)}%;"></span>`; }
html += `<div class="tw-vaultglow pulse"></div><div class="tw-vaultframe"><span class="tw-fbolt" style="left:5%;top:7%;"></span><span class="tw-fbolt" style="right:5%;top:7%;"></span><span class="tw-fbolt" style="left:5%;bottom:7%;"></span><span class="tw-fbolt" style="right:5%;bottom:7%;"></span><span class="tw-hinge h1"></span><span class="tw-hinge h2"></span><div class="tw-vaultdoor"><div class="tw-vaultwheel">${knobs}</div><span class="tw-dial"></span><span class="tw-handle"></span>${bolts}</div></div>`;
html += `<div class="tw-laser" style="top:30%;animation-duration:5s;"></div><div class="tw-laser d" style="top:48%;animation-duration:7s;animation-delay:1s;"></div><div class="tw-laser" style="top:66%;animation-duration:6s;animation-delay:2s;"></div>`;
html += `<div class="tw-ncam" style="left:14%;top:24%;color:#ff2020;"><span class="beam"></span></div><div class="tw-ncam" style="right:14%;top:40%;color:#ff2020;"><span class="beam"></span></div>`;
const gpN = IS_MOBILE ? 6 : 12;
for (let i = 0; i < gpN; i++) html += `<span class="tw-goldpart" style="left:${8+(i*17)%84}%;top:${30+(i*13)%60}%;animation-duration:${6+(i%4)*2}s;animation-delay:${i*.8}s;"></span>`;
html += `<div class="tw-vvignette"></div>`;
}
if (W.scene === "haunt") {
html += `<div class="tw-ha-lightning"></div><div class="tw-ha-moon"></div>`;
for (let i=0;i<(IS_MOBILE?2:4);i++) html += `<div class="tw-ha-cloud" style="top:${6+i*9}%;width:${30+(i*11)%25}%;animation-duration:${60+i*20}s;animation-delay:${-i*15}s;"></div>`;
const stN = IS_MOBILE?30:80;
for (let i=0;i<stN;i++) html += `<span class="tw-star2" style="left:${(i*37)%98}%;top:${(i*13)%50}%;animation-delay:${(i*.23)%3}s;"></span>`;
html += `<div class="tw-ha-hill"></div><div class="tw-ha-fence"></div><div class="tw-ha-tower">`;
[[18,26],[42,20],[66,26],[30,44],[58,44],[44,62],[20,62],[70,62]].forEach((p,i)=>{ html += `<div class="tw-ha-win" style="left:${p[0]}%;top:${p[1]}%;animation-delay:${(i*.47)%3}s;"></div>`; });
html += `</div><div class="tw-ha-gate"></div>`;
for (let i=0;i<(IS_MOBILE?2:4);i++) html += `<div class="tw-bat" style="top:${12+i*14}%;left:${8+i*18}%;animation-duration:${7+i*2}s;animation-delay:${-i*2}s;"></div>`;
html += `<div class="tw-gr-fog" style="bottom:6%;animation-duration:26s;"></div>`;
}
if (W.scene === "grave") {
html += `<div class="tw-gr-moon"></div><div class="tw-gr-veil"></div>`;
const stN = IS_MOBILE?20:50;
for (let i=0;i<stN;i++) html += `<span class="tw-star2" style="left:${(i*37)%98}%;top:${(i*13)%45}%;animation-delay:${(i*.23)%3}s;opacity:.6;"></span>`;
for (let i=0;i<(IS_MOBILE?2:4);i++) html += `<div class="tw-gr-tree" style="left:${6+i*26}%;transform:scale(${0.8+(i%2)*0.3}) scaleX(${i%2?-1:1});"></div>`;
html += `<div class="tw-gr-ground"></div><div class="tw-gr-grass"></div>`;
for (let i=0;i<(IS_MOBILE?4:7);i++) html += `<div class="tw-gr-stone${i%3===1?" cross":""}" style="left:${8+i*13}%;bottom:${12+(i%2)*4}%;transform:rotate(${i%2?-6:5}deg);"></div>`;
html += `<div class="tw-gr-crow" style="left:24%;bottom:27%;"></div>`;
for (let i=0;i<(IS_MOBILE?3:6);i++) html += `<div class="tw-gr-wisp" style="left:${12+i*15}%;bottom:${20+(i%3)*10}%;animation-delay:${i*1.1}s;"></div>`;
html += `<div class="tw-gr-fog" style="bottom:4%;animation-duration:30s;"></div><div class="tw-gr-fog" style="bottom:14%;animation-duration:22s;animation-delay:-8s;opacity:.7;"></div><div class="tw-gr-fog" style="bottom:24%;animation-duration:38s;animation-delay:-16s;opacity:.5;"></div>`;
}
if (W.scene === "lair") {
html += `<div class="tw-cv-bg"></div><div class="tw-cv-rocktex"></div>`;
html += `<div class="tw-cv-shaft" style="left:22%;transform:rotate(8deg);"></div><div class="tw-cv-shaft" style="left:64%;transform:rotate(-7deg);animation-delay:-2s;"></div>`;
html += `<div class="tw-cv-wall"></div><div class="tw-cv-wall r"></div>`;
html += `<div class="tw-cv-ceil"></div>`;
const stN = IS_MOBILE?7:11;
for(let i=0;i<stN;i++){ const left=6+i*8.5+(i%2)*2; const h=60+(i*29)%90; html += `<div class="tw-cv-stalac" style="left:${left}%;height:${h}px;"></div>`; }
const hbN = IS_MOBILE?7:12;
for(let i=0;i<hbN;i++){ const left=6+i*8+(i%3)*2; const len=18+(i*11)%26; html += `<div class="tw-cv-hangbat" style="left:${left}%;animation-delay:${-i*.6}s;"><i class="feet" style="height:${len}px;"></i><i class="wing l"></i><i class="wing r"></i><i class="bd"></i><i class="ear l"></i><i class="ear r"></i></div>`; }
const fbN = IS_MOBILE?8:14;
for(let i=0;i<fbN;i++){ const top=14+(i*11)%55; const left=(i*13)%80; const dur=5+(i*3)%7; html += `<div class="tw-cv-bat" style="top:${top}%;left:${left}%;animation-duration:${dur}s;animation-delay:${-i*1.1}s;"><i class="w l"></i><i class="w r"></i><i class="body"></i></div>`; }
html += `<div class="tw-cv-floor"></div>`;
const sgN = IS_MOBILE?6:9;
for(let i=0;i<sgN;i++){ const left=4+i*10+(i%2)*3; const h=40+(i*23)%70; html += `<div class="tw-cv-stalag" style="left:${left}%;height:${h}px;"></div>`; }
for(let i=0;i<(IS_MOBILE?4:6);i++) html += `<div class="tw-cv-rock" style="left:${8+i*16}%;width:${30+(i*11)%30}px;height:${18+(i*7)%14}px;"></div>`;
for(let i=0;i<(IS_MOBILE?2:4);i++) html += `<div class="tw-cv-skull" style="left:${14+i*22}%;transform:rotate(${i%2?-8:6}deg);"></div>`;
for(let i=0;i<(IS_MOBILE?2:3);i++) html += `<div class="tw-cv-bone" style="left:${22+i*26}%;transform:rotate(${i%2?14:-10}deg);"></div>`;
html += `<div class="tw-web" style="top:2%;left:1%;"></div><div class="tw-web" style="top:3%;right:1%;transform:scaleX(-1);"></div>`;
for(let i=0;i<(IS_MOBILE?3:5);i++){ const left=10+(i*17)%80; html += `<div class="tw-cv-drip" style="left:${left}%;top:${6+(i*5)%10}%;animation-delay:${i*1.3}s;"></div>`; }
html += `<div class="tw-cv-mist"></div><div class="tw-cv-mist" style="animation-delay:-9s;opacity:.7;"></div>`;
html += `<div class="tw-cv-vignette"></div>`;
}
if (W.scene === "candy") {
html += `<div class="tw-cd-sky"></div><div class="tw-cd-cloud-cotton c1"></div><div class="tw-cd-cloud-cotton c2"></div><div class="tw-cd-cloud-cotton c3"></div><div class="tw-cd-cloud-cotton c4"></div>`;
const stN = IS_MOBILE?30:70;
for (let i=0;i<stN;i++) html += `<span class="tw-star2" style="left:${(i*37)%98}%;top:${(i*13)%50}%;animation-delay:${(i*.23)%3}s;"></span>`;
for (let i=0;i<(IS_MOBILE?4:8);i++) html += `<span class="tw-bokeh" style="left:${8+i*12}%;top:${18+(i*9)%40}%;width:${10+(i%3)*8}px;height:${10+(i%3)*8}px;background:${["#ff6fa5","#ffd75e","#74ebf5"][i%3]};animation-delay:${i*1.1}s;"></span>`;
html += `<div class="tw-cd-candy-mtn m1"></div><div class="tw-cd-candy-mtn m2"></div><div class="tw-cd-candy-mtn m3"></div><div class="tw-cd-candy-tower" style="left:16%;"></div><div class="tw-cd-candy-tower" style="right:16%;height:120px;"></div>`;
html += `<div class="tw-cd-candy-castle"><div class="tw-cd-candy-icing"></div></div>`;
for (let i=0;i<(IS_MOBILE?3:5);i++) html += `<div class="tw-cd-candy-pop" style="left:${8+i*19}%;bottom:${20+(i%2)*8}%;transform:scale(${0.8+(i%3)*0.18});animation-delay:${i*.5}s;"></div>`;
for (let i=0;i<(IS_MOBILE?2:4);i++) html += `<div class="tw-cd-candy-cane" style="left:${14+i*23}%;bottom:${12+(i%2)*6}%;transform:rotate(${i%2?12:-10}deg);"></div>`;
html += `<div class="tw-cd-candy-river"></div>`;
const gcols = ["#ff6fa5","#7dff8a","#ffd75e","#74ebf5","#c28aff"];
for (let i=0;i<(IS_MOBILE?6:10);i++) html += `<div class="tw-cd-candy-gum" style="left:${5+i*9}%;bottom:${2+(i%2)*3}%;color:${gcols[i%5]};"></div>`;
for (let i=0;i<(IS_MOBILE?4:9);i++) html += `<span class="tw-sparkle" style="left:${6+i*11}%;top:${12+(i*13)%46}%;animation-delay:${i*.7}s;"></span>`;
for (let i=0;i<(IS_MOBILE?6:12);i++) html += `<div class="tw-cd-fairy-light" style="left:${5+i*8}%;top:${15+(i*7)%30}%;animation-delay:${i*.3}s;"></div>`;
for (let i=0;i<(IS_MOBILE?8:15);i++) html += `<span class="tw-cd-snowflake" style="left:${(i*13)%100}%;animation-duration:${8+(i%4)*3}s;animation-delay:${-i*2}s;"></span>`;
}
if (W.scene === "pine") {
html += `<div class="tw-aurora"></div><span class="tw-moon" style="top:7%;right:14%;width:54px;height:54px;"></span>`;
const stN = IS_MOBILE?35:90;
for (let i=0;i<stN;i++) html += `<span class="tw-star2" style="left:${(i*37)%98}%;top:${(i*13)%50}%;animation-delay:${(i*.23)%3}s;"></span>`;
const tree = (scale, withStar) => {
const L = [ {w:70,h:60,b:60,c:'#0e3a20'}, {w:60,h:56,b:100,c:'#12482a'}, {w:48,h:50,b:138,c:'#165532'}, {w:34,h:44,b:172,c:'#1a623a'} ];
let s = `<div class="tw-pf2" style="transform:scale(${scale});"><span class="trunk"></span>`;
L.forEach((lay)=>{ s += `<span class="lyr" style="bottom:${lay.b}px;border-left-width:${lay.w}px;border-right-width:${lay.w}px;border-bottom-width:${lay.h}px;border-bottom-color:${lay.c};"></span><span class="cap" style="bottom:${lay.b+lay.h-9}px;width:${lay.w*1.45}px;"></span>`; });
s += `<span class="cap top" style="bottom:210px;width:36px;"></span>`;
if (withStar) s += `<span class="star"></span>`;
return s + `</div>`;
};
const row = (cls, count, withStar) => { let r = `<div class="tw-pf-row ${cls}">`; for (let i=0;i<count;i++) r += tree(0.9+((i*7)%3)*0.12, withStar); return r + `</div>`; };
html += row("far", IS_MOBILE?5:8, false) + row("mid", IS_MOBILE?4:6, false) + row("near", IS_MOBILE?3:4, true);
html += `<div class="tw-pf-snow"></div><div class="tw-pf-mist"></div><div class="tw-pf-garland" style="bottom:34%;left:6%;width:38%;"></div><div class="tw-pf-garland" style="bottom:36%;right:6%;width:38%;"></div>`;
const bcols = ["#ff4b6b","#ffd75e","#7dff8a","#74ebf5"];
for (let i=0;i<(IS_MOBILE?8:14);i++) html += `<div class="tw-pf-bulb" style="${i%2?"left":"right"}:${8+(i*6)%38}%;bottom:${32+(i%3)*2}%;color:${bcols[i%4]};animation-delay:${i*.2}s;"></div>`;
for (let i=0;i<(IS_MOBILE?12:26);i++) html += `<span class="tw-snowsoft" style="left:${(i*13)%100}%;animation-duration:${7+(i%5)*2}s;animation-delay:${-i*.6}s;"></span>`;
for (let i=0;i<(IS_MOBILE?3:7);i++) html += `<span class="tw-sparkle" style="left:${8+i*13}%;top:${10+(i*11)%40}%;animation-delay:${i*.6}s;"></span>`;
}
if (W.scene === "shop") {
html += `<div class="tw-sh-room"></div><div class="tw-sh-wallpaper"></div><div class="tw-sh-halo"></div><div class="tw-sh-beam"></div><div class="tw-sh-garland"></div>`;
const bcols = ["#ff4b6b","#ffd75e","#2ecc71","#74ebf5","#ff6fa5"];
for (let i=0;i<(IS_MOBILE?10:18);i++) html += `<div class="tw-sh-bulb" style="left:${2+i*5.4}%;top:42px;color:${bcols[i%5]};animation-delay:${i*.15}s;"></div>`;
html += `<div class="tw-sh-ribbon" style="left:22%;"></div><div class="tw-sh-ribbon" style="left:78%;"></div><div class="tw-sh-wreath" style="top:80px;left:18%;"></div><div class="tw-sh-wreath" style="top:80px;right:18%;"></div>`;
html += `<div class="tw-sh-win" style="left:8%;top:14%;"><div class="tw-sh-win-snow"></div><div class="tw-sh-win-sill"></div></div><div class="tw-sh-win" style="right:8%;top:14%;"><div class="tw-sh-win-snow" style="animation-delay:-2s;"></div><div class="tw-sh-win-sill"></div></div>`;
for (let i=0;i<(IS_MOBILE?6:14);i++) html += `<span class="tw-sh-snow-out" style="left:${10+i*6}%;top:${14+(i%4)*4}%;animation-duration:${4+(i%3)*2}s;animation-delay:${-i*.5}s;"></span>`;
html += `<div class="tw-sh-fire"><div class="tw-sh-flame"></div></div><div class="tw-sh-mantel"></div><div class="tw-sh-sock" style="left:8%;top:14px;"></div><div class="tw-sh-sock" style="left:50%;transform:translateX(-50%);top:14px;background:#2ecc71;"></div><div class="tw-sh-sock" style="right:8%;top:14px;"></div>`;
html += `<div class="tw-sh-shelf" style="top:28%;left:2%;"></div><div class="tw-sh-bracket" style="top:calc(28% + 14px);left:6%;"></div><div class="tw-sh-bracket" style="top:calc(28% + 14px);left:16%;"></div>`;
html += `<div class="tw-sh-shelf" style="top:50%;left:2%;"></div><div class="tw-sh-bracket" style="top:calc(50% + 14px);left:6%;"></div><div class="tw-sh-bracket" style="top:calc(50% + 14px);left:16%;"></div>`;
html += `<div class="tw-sh-bear" style="top:calc(28% - 32px);left:4%;"></div><div class="tw-sh-ball" style="top:calc(28% - 20px);left:14%;color:#ff4b6b;"></div><div class="tw-sh-block" style="top:calc(28% - 20px);left:22%;color:#ffd75e;"></div>`;
html += `<div class="tw-sh-doll" style="top:calc(50% - 30px);left:3%;"></div><div class="tw-sh-ball" style="top:calc(50% - 20px);left:15%;color:#2ecc71;"></div><div class="tw-sh-block" style="top:calc(50% - 20px);left:22%;color:#74ebf5;"></div>`;
html += `<div class="tw-sh-shelf" style="top:28%;right:2%;"></div><div class="tw-sh-bracket" style="top:calc(28% + 14px);right:6%;"></div><div class="tw-sh-bracket" style="top:calc(28% + 14px);right:16%;"></div>`;
html += `<div class="tw-sh-shelf" style="top:50%;right:2%;"></div><div class="tw-sh-bracket" style="top:calc(50% + 14px);right:6%;"></div><div class="tw-sh-bracket" style="top:calc(50% + 14px);right:16%;"></div>`;
html += `<div class="tw-sh-train" style="top:calc(28% - 20px);right:3%;"></div><div class="tw-sh-ball" style="top:calc(28% - 20px);right:18%;color:#ff6fa5;"></div><div class="tw-sh-bear" style="top:calc(50% - 32px);right:4%;background:radial-gradient(ellipse at 50% 60%,#ff9ec4,#d42a7a);"></div><div class="tw-sh-block" style="top:calc(50% - 20px);right:15%;color:#d42a4a;"></div>`;
html += `<div class="tw-sh-tree"><div class="pot"></div><div class="trunk"></div><div class="lyr l1"></div><div class="lyr l2"></div><div class="lyr l3"></div><div class="lyr l4"></div><div class="star"></div></div>`;
const ornColors = ["#d42a4a","#ffd75e","#74ebf5","#ff6fa5","#2ecc71","#c28aff"];
const ornPositions = [[25,22],[70,30],[45,50],[20,65],[65,70],[50,85],[35,100],[60,110],[45,125],[30,140],[65,145],[50,160]];
ornPositions.forEach((p,i) => html += `<div class="tw-sh-ornament" style="left:${p[0]}px;top:${p[1]}px;color:${ornColors[i%6]};"></div>`);
html += `<div class="tw-sh-tree" style="right:6%;"><div class="pot"></div><div class="trunk"></div><div class="lyr l1"></div><div class="lyr l2"></div><div class="lyr l3"></div><div class="lyr l4"></div><div class="star"></div></div>`;
ornPositions.forEach((p,i) => html += `<div class="tw-sh-ornament" style="right:${p[0]+76}px;top:${p[1]}px;color:${ornColors[(i+2)%6]};"></div>`);
html += `<div class="tw-sh-table"><div class="cloth"></div><div class="top"></div></div><div class="tw-sh-gift-pile">`;
html += `<span class="g" style="left:0;bottom:0;width:44px;height:36px;background:#d42a4a;"></span><span class="g" style="left:48px;bottom:0;width:38px;height:32px;background:#2ecc71;"></span><span class="g" style="left:90px;bottom:0;width:42px;height:38px;background:#ffd75e;"></span><span class="g" style="left:136px;bottom:0;width:40px;height:34px;background:#74ebf5;"></span>`;
html += `<span class="g" style="left:20px;bottom:34px;width:34px;height:28px;background:#ff6fa5;"></span><span class="g" style="left:60px;bottom:32px;width:40px;height:30px;background:#c28aff;"></span><span class="g" style="left:106px;bottom:36px;width:38px;height:28px;background:#d42a4a;"></span></div>`;
html += `<div class="tw-sh-plate"></div><div class="tw-sh-cookie"></div><div class="tw-sh-glass"></div>`;
html += `<div class="tw-sh-santa"><span class="arm l"></span><span class="arm r"></span><span class="body"></span><span class="belt"></span><span class="buckle"></span><span class="beard"></span><span class="head"></span><span class="eye l"></span><span class="eye r"></span><span class="nose"></span><span class="mouth"></span><span class="hat"></span><span class="pom"></span><span class="gift"></span></div>`;
html += `<div class="tw-sh-elf"><span class="body"></span><span class="head"></span><span class="hat"></span><span class="pom"></span><span class="carry" style="color:#ffd75e;"></span></div>`;
html += `<div class="tw-sh-elf flip" style="animation-delay:-5s;"><span class="body"></span><span class="head"></span><span class="hat"></span><span class="pom"></span><span class="carry" style="color:#ff6fa5;"></span></div><div class="tw-sh-pet"></div><div class="tw-sh-rug"></div><div class="tw-sh-floor"></div>`;
for (let i=0;i<(IS_MOBILE?5:10);i++) html += `<span class="tw-sh-sparkle" style="left:${8+i*9}%;top:${12+(i*11)%40}%;animation-delay:${i*.7}s;"></span>`;
}
let parts = "";
const partCount = (W.part === "fog") ? (IS_MOBILE ? 15 : 30) : (IS_MOBILE ? 0 : 7);
for (let i = 0; i < partCount; i++) {
const partStyle = W.part === "fog"
? `left:${(i*13+c*7)%96}%;top:${(i*17)%80}%;animation-duration:${4+(i%4)*1.5}s;animation-delay:${i*.7}s;`
: `color:${C.acc};left:${(i*13+c*7)%96}%;animation-duration:${4+(i%4)*1.5}s;animation-delay:${i*.7}s;`;
parts += `<span class="tw-part ${W.part}" style="${partStyle}"></span>`;
}
const result = html + parts;
SCENE_CACHE[c] = result;
return result;
}
/* ----- 6. ÉCRAN AVENTURE ----- */
function openTower() {
let m = document.getElementById("screen-tower");
if (!m) {
m = document.createElement("div");
m.id = "screen-tower";
m.innerHTML = `
<div id="tw-bg"></div>
<div class="tw-hud">
<button class="tw-back" onclick="closeTower()">⬅️</button>
<div class="tw-lives">❤️ <span id="tw-lives-n">${twLives}</span><span id="tw-lives-regen" style="font-size:9px;opacity:.75;margin-left:5px;"></span></div>
<div class="tw-coins">🪙 <span id="tw-coins-n">0</span></div>
<button class="tw-shopbtn" onclick="openLevelSelect()">🎯</button>
<button class="tw-shopbtn" style="margin-left:0;" onclick="openTowerShop()">🛒</button>
</div>
<div class="tw-qwrap"><span class="lbl" id="tw-q-lbl">⭐ 0/240</span><div class="tw-qbar"><div id="tw-q-fill" style="width:0%"></div></div></div>
<div class="tw-center">
<div class="tw-worldtag" id="tw-worldtag" style="margin-bottom:8px;"></div>
<div class="tw-panel" id="tw-panel" style="padding:12px 24px;margin-bottom:8px;">
<div class="num" id="tw-panel-num" style="font-size:36px;">1</div>
<div class="typ" id="tw-panel-typ" style="font-size:11px;"></div>
<div class="tw-panel-stars" id="tw-panel-stars" style="font-size:14px;"></div>
</div>
<div class="tw-playrow" style="gap:12px;">
<button class="tw-arrow" id="tw-prev" onclick="advPrev()" style="width:38px;height:38px;font-size:16px;">‹</button>
<button class="tw-playbtn" id="tw-play" onclick="advPlay()" style="padding:10px 48px;font-size:20px;">PLAY</button>
<button class="tw-arrow" id="tw-next" onclick="advNext()" style="width:38px;height:38px;font-size:16px;">›</button>
</div>
<div class="tw-lockmsg" id="tw-lockmsg" style="display:none;"></div>
</div>`;
document.body.appendChild(m);
}
m.style.display = "flex";
twViewFloor = Math.min(towerProgress.floor + 1, TOTAL_FLOORS);
const savedW = parseInt(localStorage.getItem('cb_tw_world') || '0', 10);
if (savedW >= 1 && savedW <= 9 && TowerUtils.worldUnlocked(savedW)) {
twViewFloor = Math.min((savedW - 1) * FPC + 1, Math.min(towerProgress.floor + 1, TOTAL_FLOORS));
}
twViewFloor = Math.min(twViewFloor, maxVisibleWorld() * FPC);
sessionStorage.setItem("cb_last_screen", "tower");
socket.emit("get_tower");
setTimeout(() => { const s = document.getElementById("screen-tower"); if (s && s.style.display !== "none") socket.emit("get_tower"); }, 600);
setTimeout(() => { const s = document.getElementById("screen-tower"); if (s && s.style.display !== "none") socket.emit("get_tower"); }, 1600);
renderAdventure();
towerDing();
// Force l'arrêt de toute musique saisonnière au démarrage
if(typeof SoundEngine!=='undefined' && typeof SoundEngine.stopMusic==='function'){
SoundEngine.stopMusic(false);
}
}
function closeTower() {
sessionStorage.removeItem("cb_last_screen");
document.getElementById("screen-tower").style.display = "none";
wmStop(); WM_lastKey = null;
if (typeof SoundEngine !== 'undefined' && typeof SoundEngine.startMusic === 'function') SoundEngine.startMusic('menu');
}
function fmtRegen(ms) {
const s = Math.max(0, Math.ceil(ms / 1000));
return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}
function updateRegenLabel() {
const lr = document.getElementById("tw-lives-regen");
if (!lr) return;
lr.innerText = (twLives < MAX_LIVES && twNextLife > 0) ? `(+1 ${fmtRegen(twNextLife)})` : "";
}
setInterval(() => {
if (twNextLife > 0) {
twNextLife -= 1000;
if (twNextLife <= 0) { twNextLife = 0; socket.emit("get_tower"); }
updateRegenLabel();
}
}, 1000);
function renderAdventure() {
const scr = document.getElementById("screen-tower");
if (!scr || scr.style.display === "none") return;
const world = TowerUtils.getTowerChapter(twViewFloor).id;
if (TW_musicWorld !== world) { TW_musicWorld = world; towerPlayWorldMusic(world); }
const chap = TOWER_CHAPTERS[world - 1];
const W = TOWER_WORLDS[world], C = TOWER_COLORS[world];
document.getElementById("tw-bg").innerHTML = generateSceneHTML(world, W, C);
const unlocked = TowerUtils.worldUnlocked(world);
const stars = TowerUtils.starsInWorld(world);
const pct = Math.min(100, Math.round(stars / WORLD_QUOTA * 100));
document.getElementById("tw-q-lbl").innerText = `⭐ ${stars}/${WORLD_QUOTA}`;
document.getElementById("tw-q-fill").style.width = pct + "%";
document.getElementById("tw-worldtag").innerText = `${chap.icon} ${chap.name}`;
document.getElementById("tw-coins-n").innerText = (myProfile.coins || 0);
document.getElementById("tw-lives-n").innerText = twLives;
updateRegenLabel();
const def = TowerUtils.getFloorDef(twViewFloor);
const inChap = ((twViewFloor - 1) % FPC) + 1;
const isBoss = (inChap === FPC || inChap % 50 === 0);
document.getElementById("tw-panel").classList.toggle("boss", isBoss);
document.getElementById("tw-panel-num").innerText = twViewFloor;
document.getElementById("tw-panel-typ").innerText = isBoss ? `⚔️ ${chap.boss} GARDIEN` : diffLabel(Number.isFinite(def.diff) ? def.diff : 1) + " · " + TowerUtils.typeLabel(def.type);
const stGot = towerProgress.stars[String(twViewFloor)] || 0;
document.getElementById("tw-panel-stars").innerHTML = [1,2,3].map(i => `<span class="${i <= stGot ? "on" : ""}">⭐</span>`).join("");
const lock = document.getElementById("tw-lockmsg");
if (!unlocked) {
lock.style.display = "block";
const season = TOWER_CHAPTERS[world - 1].season;
const seasonName = ["", "Saison 1", "Halloween", "Noël"][season] || "Saison " + season;
const flag = "season_s" + season + "_unlocked";
const hasFlag = (myProfile.unlocked_items || []).includes(flag);
if (season === 1) {
lock.innerText = `🔒 Quota  ${WORLD_QUOTA} requis dans le monde précédent`;
} else if (!hasFlag) {
lock.innerText = `🔒 Atteins le Tier 1 du Pass ${seasonName} pour débloquer`;
} else {
lock.innerText = `🔒 Quota ⭐ ${WORLD_QUOTA} requis dans le monde précédent`;
}
} else {
lock.style.display = "none";
}
document.getElementById("tw-play").disabled = !unlocked || twLives <= 0;
document.getElementById("tw-prev").disabled = twViewFloor <= 1;
document.getElementById("tw-next").disabled = twViewFloor >= Math.min(towerProgress.floor + 1, maxVisibleWorld() * FPC);
}
function advPrev() { if (twViewFloor > 1) { twViewFloor--; localStorage.setItem('cb_tw_world', String(TowerUtils.getTowerChapter(twViewFloor).id)); renderAdventure(); } }
function advNext() { const cap=Math.min(towerProgress.floor + 1, maxVisibleWorld() * FPC); if (twViewFloor < cap) { twViewFloor++; localStorage.setItem('cb_tw_world', String(TowerUtils.getTowerChapter(twViewFloor).id)); renderAdventure(); } }
function advPlay() {
const def = TowerUtils.getFloorDef(twViewFloor);
def.replay = twViewFloor <= towerProgress.floor;
showBriefing(def);
}
/* ----- 7. SÉLECTION DE NIVEAU ----- */
function openLevelSelect() {
closeLevelSelect();
const currentWorld = TowerUtils.getTowerChapter(twViewFloor).id;
let worldOptions = '';
let selWorld = currentWorld;
if (!worldVisible(selWorld)) selWorld = maxVisibleWorld();
for (let w = 1; w <= 9; w++) {
if (!worldVisible(w)) continue;
const chap = TOWER_CHAPTERS[w - 1];
const stars = TowerUtils.starsInWorld(w);
const selected = w === selWorld ? 'selected' : '';
worldOptions += `<option value="${w}" ${selected}>${chap.icon} ${chap.name} ⭐${stars}</option>`;
}
const d = document.createElement("div");
d.className = "tw-lvlpop"; d.id = "tw-lvlpop";
d.innerHTML = `
<div class="tw-lvlpop-card" style="max-width:95%;max-height:90%;display:flex;flex-direction:column;">
<h3 style="margin-bottom:12px;text-align:center;">${currentLang==="fr"?"Choisis ton niveau":"Pick your level"}</h3>
<div style="margin-bottom:12px;">
<label style="display:block;font-size:11px;color:#aaa;margin-bottom:6px;">${currentLang==="fr"?"Monde":"World"}</label>
<select id="world-selector" style="width:100%;padding:10px;border-radius:8px;border:2px solid #00d2ff;background:#0f051d;color:#fff;font-size:14px;font-weight:bold;">
${worldOptions}
</select>
</div>
<div class="tw-lvl-grid" id="tw-lvl-grid" style="flex:1;overflow-y:auto;"></div>
<button class="btn-secondary" style="width:100%;margin-top:10px;padding:12px;" onclick="closeLevelSelect()">❌ ${currentLang==="fr"?"Fermer":"Close"}</button>
</div>`;
document.body.appendChild(d);
document.getElementById('world-selector').addEventListener('change', (e) => {
switchWorldLevels(parseInt(e.target.value));
});
switchWorldLevels(selWorld);
}
function switchWorldLevels(world) {
if (!worldVisible(world)) world = maxVisibleWorld();
const start = (world - 1) * FPC + 1;
const end = world * FPC;
const maxPlayable = Math.min(towerProgress.floor + 1, end);
const unlocked = TowerUtils.worldUnlocked(world);
let cells = '';
for (let f = start; f <= end; f++) {
const st = towerProgress.stars[String(f)] || 0;
const inChap = ((f - 1) % FPC) + 1;
const isBoss = (inChap === FPC || inChap % 50 === 0);
const lock = !unlocked || f > maxPlayable;
const cur = f === twViewFloor;
cells += `<button class="tw-lvl-cell ${lock?"lock":""} ${cur?"cur":""} ${isBoss?"boss":""}" ${lock?"disabled":""} onclick="pickLevel(${f})" style="aspect-ratio:1;border-radius:10px;background:#1a1a2e;border:2px solid #333;color:#fff;font-weight:900;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:13px;cursor:pointer;min-width:44px;min-height:44px;">${f}<span class="st" style="font-size:8px;color:#f8b500;line-height:1;">${st?"⭐".repeat(st):""}</span></button>`;
}
const grid = document.getElementById('tw-lvl-grid');
if (grid) {
grid.innerHTML = cells;
grid.scrollTop = 0;
const target = grid.querySelector('.tw-lvl-cell.cur') || grid.children[Math.max(0, maxPlayable - start)];
if (target) {
setTimeout(() => { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
}
}
const select = document.getElementById('world-selector');
if (select) select.value = world;
}
function closeLevelSelect() { const s = document.getElementById("tw-lvlpop"); if (s) s.remove(); }
function pickLevel(f) { twViewFloor = f; localStorage.setItem('cb_tw_world', String(TowerUtils.getTowerChapter(twViewFloor).id)); closeLevelSelect(); renderAdventure(); }
function showWorldTransition(w) {
const chap = TOWER_CHAPTERS[w - 1];
let f = document.createElement("div");
f.className = "tw-worldfade";
f.innerHTML = `<div class="big">${chap.icon} ${chap.name}</div><div class="sub">${currentLang==="fr"?"Nouveau monde débloqué !":"New world unlocked!"}</div>`;
document.body.appendChild(f);
requestAnimationFrame(() => f.classList.add("on"));
setTimeout(() => {
twViewFloor = (w - 1) * FPC + 1;
renderAdventure();
f.classList.remove("on");
setTimeout(() => f.remove(), 700);
}, 1400);
}
/* ----- 8. BOUTIQUE AVENTURE ----- */
function openTowerShop() {
closeTowerShop();
const fr = currentLang === "fr";
const d = document.createElement("div");
d.className = "tw-shop"; d.id = "tw-shop";
let items = "";
SHOP_ITEMS.forEach(it => {
  const btn = it.iap ? `<button class="buy iap" onclick="tryBuyPack('${it.id}')">${it.eur} 💳</button>` : `<button class="buy" onclick="towerShopBuy('${it.id}')">${it.price} 🪙</button>`;
  items += `<div class="tw-shop-item"><span class="ic">${it.icon}</span><span class="nm">${it.name}</span>${btn}</div>`;
});
d.innerHTML = `<div class="tw-shop-card"><h3>🛒 BOUTIQUE AVENTURE</h3>${items}<button class="btn-secondary" style="width:100%;" onclick="closeTowerShop()">❌ ${fr?"Fermer":"Close"}</button></div>`;
document.body.appendChild(d);
}
function closeTowerShop() { const s = document.getElementById("tw-shop"); if (s) s.remove(); }
function tryBuyPack(id) {
  const givesLives = ['pack_vies_1', 'pack_mixte_3', 'pack_blitz_5'].includes(id);
  if (givesLives) {
    const LIFE_RESERVE_MAX = 30;
    if (twLives >= LIFE_RESERVE_MAX) {
      const fr = currentLang === "fr";
      if (typeof showNotificationToast === 'function') {
        showNotificationToast(
          fr ? '❤️ Réserve de vies pleine (30 max). Utilise-les avant d\'en acheter !'
             : '❤️ Life reserve full (max 30). Use some before buying!',
          'announcement'
        );
      }
      return;
    }
    if (twLives >= 10) {
      const fr = currentLang === "fr";
      const ok = confirm(fr
        ? 'Tu as déjà ' + twLives + ' vies (max 10). Les vies achetées seront stockées en RÉSERVE au-dessus de 10. Continuer l\'achat ?'
        : 'You already have ' + twLives + ' lives (max 10). Purchased lives will be BANKED above 10. Continue purchase?');
      if (!ok) return;
    }
  }
  if (typeof IAP !== 'undefined' && typeof IAP.buyPack === 'function') {
    IAP.buyPack(id);
  }
}
function towerShopBuy(id) {
const it = SHOP_ITEMS.find(x => x.id === id);
if (!it || it.iap) return;
socket.emit("shop_buy", { id: id, price: it.price });
}
socket.on("shop_result", (r) => {
if (!r) return;
if (r.ok) {
if (r.lives !== undefined) twLives = r.lives;
if (r.jokers) twJokers = r.jokers;
if (r.coins !== undefined && myProfile) myProfile.coins = r.coins;
renderAdventure();
if (typeof showNotificationToast === "function") showNotificationToast(currentLang === "fr" ? "✅ Achat effectué !" : "✅ Purchase complete!", "gift");
} else {
const fr = currentLang === "fr";
const msg = r.reason === "coins" ? (fr ? "❌ Pas assez de pièces !" : "❌ Not enough coins!")
: r.reason === "full" ? (fr ? "❤️ Vies déjà au maximum !" : "❤️ Lives already full!")
: (fr ? "❌ Achat impossible." : "❌ Purchase failed.");
if (typeof showNotificationToast === "function") showNotificationToast(msg, "announcement");
}
});
/* ----- 9. BRIEFING ----- */
function showBriefing(def) {
closeBriefing();
const fr = currentLang === "fr";
const curStars = towerProgress.stars[String(def.floor)] || 0;
const starTime = Math.floor(def.time * 0.6);
const ST = "\u{2B50}";
let starRule = fr ? `💡 ${ST} terminer · ${ST}${ST} ≤2 erreurs · ${ST}${ST}${ST} 0 erreur + < ${starTime}s` : `💡 ${ST} finish · ${ST}${ST} ≤2 mistakes · ${ST}${ST}${ST} 0 mistake + < ${starTime}s`;
if (def.type === "pairs" || def.type === "sprint") starRule = fr ? `💡 ${ST} finir · ${ST} rapide · ${ST}${ST}${ST} très rapide` : `💡 ${ST} finish · ${ST} fast · ${ST}${ST}${ST} very fast`;
if (def.type === "memory") starRule = fr ? `💡 ${ST} terminer · ${ST}${ST} ≤2 erreurs · ${ST}${ST}${ST} 0 erreur (tout à la mémoire !)` : `💡 ${ST} finish · ${ST}${ST} ≤2 mistakes · ${ST}${ST}${ST} 0 mistakes (pure memory!)`;
const replayLine = def.replay ? `<div style="font-size:10px;color:#f8b500;margin-bottom:6px;">${fr?"Actuel : ":"Current: "}${ST.repeat(curStars)}</div>` : "";
const b = document.createElement("div");
b.id = "tw-brief"; b.className = "tw-brief";
b.innerHTML = `<div class="tw-brief-card">
<div style="font-size:13px;font-weight:900;color:#f8b500;margin-bottom:6px;">🏰 ${fr?"ÉTAGE":"FLOOR"} ${def.floor} — ${TowerUtils.typeLabel(def.type)}</div>
<div style="font-size:10px;font-weight:700;color:#aaa;margin-bottom:6px;">${diffLabel(Number.isFinite(def.diff) ? def.diff : 1)}${(def.diff||0) >= 2 ? " · bonus 🪙" : ""}</div>
<div style="font-size:9px;color:#aaa;margin-bottom:8px;">${starRule}</div>
${replayLine}
<button class="btn-main btn-blue" style="width:100%;margin-bottom:6px;" onclick="closeBriefing();startTowerFloor(TowerUtils.getFloorDef(${def.floor}))">${def.replay?"🔄 REJOUER":"⚡ LANCER !"}</button>
<button class="btn-secondary" style="width:100%;" onclick="closeBriefing()">❌ ${fr?"Annuler":"Cancel"}</button>
</div>`;
document.body.appendChild(b);
}
function closeBriefing() { const b = document.getElementById("tw-brief"); if (b) b.remove(); }
/* ----- 10. MOTEUR DE JEU ----- */
function ensureTowerOverlay() {
let ov = document.getElementById("tower-game");
if (!ov) {
ov = document.createElement("div");
ov.id = "tower-game"; ov.className = "twg-screen";
ov.innerHTML = `<div class="twg-header"><button class="tw-back" onclick="quitFloor()">⬅️</button><b id="twg-title"></b><span id="tg-shield" style="color:#f8b500;font-weight:900;font-size:15px;display:none;">🛡️</span><span id="tg-err" style="color:#ff4b2b;font-weight:900;font-size:13px;min-width:40px;text-align:right;">❌ 0</span><span id="twg-timer">⏱️</span></div><div id="tg-bar" class="twg-bar"></div><div id="tg-hud" class="twg-hud"></div><div class="twg-gridwrap"><div id="tg-grid" class="tg-grid"></div></div><div class="twj-bar"><button class="twj-btn" id="twg-jt" onclick="useJoker('time')">⏱️ +10s <b id="twg-jt-n">0</b></button><button class="twj-btn" id="twg-js" onclick="useJoker('shield')">🛡️ Bouclier <b id="twg-js-n">0</b></button></div><div id="tg-msg" class="twg-msg"></div>`;
document.body.appendChild(ov);
}
return ov;
}
function useJoker(kind) {
if (!TW) return;
if ((twJokers[kind] || 0) <= 0) {
if (typeof showNotificationToast === "function") showNotificationToast(currentLang === "fr" ? "❌ Aucun joker de ce type !" : "❌ No joker of this type!", "announcement");
return;
}
socket.emit("tower_use_joker", { kind: kind });
}
function updateJokerButtons() {
const jt = document.getElementById("twg-jt-n"), js = document.getElementById("twg-js-n");
const bt = document.getElementById("twg-jt"), bs = document.getElementById("twg-js");
if (jt) jt.innerText = twJokers.time || 0;
if (js) js.innerText = twJokers.shield || 0;
if (bt) { bt.style.display = (twJokers.time || 0) > 0 ? "flex" : "none"; bt.disabled = !TW; }
if (bs) { bs.style.display = (twJokers.shield || 0) > 0 ? "flex" : "none"; bs.disabled = !TW; }
}
socket.on("joker_denied", () => {
if (typeof showNotificationToast === "function") showNotificationToast(currentLang === "fr" ? "❌ Joker indisponible." : "❌ Joker unavailable.", "announcement");
});
socket.on("tower_jokers_update", (d) => {
if (d && d.jokers) { twJokers = d.jokers; updateJokerButtons(); }
});
socket.on("tower_shield_already", () => {
if (typeof showNotificationToast === "function") showNotificationToast(currentLang === "fr" ? "🛡️ Bouclier déjà actif !" : "🛡️ Shield already active!", "announcement");
});
socket.on("tower_shield_used", () => {
if (typeof showNotificationToast === "function") showNotificationToast(currentLang === "fr" ? "🛡️ Bouclier absorbé !" : "🛡️ Shield absorbed!", "gift");
const s = document.getElementById("tw-shield-active"); if (s) s.remove();
});
socket.on("tower_no_lives", () => {
if (typeof showNotificationToast === "function") showNotificationToast(currentLang === "fr" ? "❤️ Plus de vies ! Reviens plus tard ou achète-en." : "❤️ No lives left! Come back later or buy some.", "announcement");
quitFloor();
renderAdventure();
});
function cloneState(s) {
return { type:s.type, total:s.total, gridSize:s.gridSize, floor:s.floor, target:s.target, targetColor:s.targetColor, targetParity:s.targetParity, forbidden:s.forbidden, timeLeft:s.timeLeft, ai:s.ai, gone:Object.assign({},s.gone||{}), revealed:Object.assign({},s.revealed||{}), display:(s.display||[]).slice(), sel:(s.sel===undefined?null:s.sel), shield:s.shield||0, revealLeft:s.revealLeft||0 };
}
function startTowerFloor(def) {
if (TW) return;
const ov = ensureTowerOverlay();
ov.style.display = "flex";
TW_lastFloor = def.floor;
TW = null; TW_dom = null; TW_buttons = []; TW_hudCache = "";
stopLocalTimer();
document.getElementById("tg-grid").innerHTML = "";
document.getElementById("twg-title").innerText = "🏰 ÉTAGE " + def.floor;
updateJokerButtons();
socket.emit("tower_floor_start", { floor: def.floor });
}
function buildGridFromState(st) {
const g = document.getElementById("tg-grid");
const cols = st.gridSize <= 16 ? 4 : (st.gridSize <= 20 ? 5 : 6);
g.style.gridTemplateColumns = `repeat(${cols},1fr)`;
g.innerHTML = ""; TW_buttons = [];
st.display.forEach((v, i) => {
const b = document.createElement("button");
b.className = "tg-tile";
if (st.gone[i]) b.classList.add("gone");
if (st.type === "color" && v) { b.style.background = `linear-gradient(180deg,${v.hex},#111827 85%)`; b.textContent = ""; }
else if (st.type === "pairs" || st.type === "memory") { b.textContent = st.gone[i] ? "" : (v === null ? "?" : v); if ((st.revealed && st.revealed[i]) || st.sel === i) b.classList.add("sel"); }
else b.textContent = v;
b.onclick = () => handleTowerClick(i, b);
g.appendChild(b); TW_buttons[i] = b;
});
}
function syncDomToState(st) {
for (let i = 0; i < st.display.length; i++) {
const b = TW_buttons[i]; if (!b) continue;
const wasGone = !!TW_dom.gone[i], isGone = !!st.gone[i];
if (isGone !== wasGone) b.classList.toggle("gone", isGone);
if (st.type === "pairs" || st.type === "memory") {
const dv = st.display[i], ov = TW_dom.display[i];
if (dv !== ov) b.textContent = isGone ? "" : (dv === null ? "?" : dv);
const rev = !!(st.revealed && st.revealed[i]) || st.sel === i;
const orev = !!(TW_dom.revealed && TW_dom.revealed[i]) || TW_dom.sel === i;
if (rev !== orev) b.classList.toggle("sel", rev);
}
}
}
function handleTowerClick(i, b) {
const now = Date.now();
if (now - TW_lastClick < 100) return;
TW_lastClick = now;
if (!TW_dom || TW_dom.gone[i] || TW_pairsLock) return;
b.style.transform = "scale(0.9)";
setTimeout(() => { if (b) b.style.transform = ""; }, 120);
const t = TW_dom.type;
if (t === "pairs" || t === "memory") { socket.emit("tower_click", { index: i }); return; }
const v = TW_dom.display[i];
let success = null;
if (t === "color" && TW_dom.targetColor) success = (v && v.key === TW_dom.targetColor.key);
else if (t === "parity") success = (TW_dom.targetParity === "even" ? (v % 2 === 0) : (v % 2 !== 0));
else if (t === "forbidden") success = (TW_dom.target !== null && TW_dom.target !== undefined) ? (v === TW_dom.target) : (v !== TW_dom.forbidden);
else if (TW_dom.target !== null && TW_dom.target !== undefined) success = (v === TW_dom.target);
if (success === true) {
TW_dom.gone[i] = true; b.classList.add("gone");
if (t === "reverse") TW_dom.target--;
else if (t === "forbidden") { let nx = (TW_dom.target || 0) + 1; if (nx === TW_dom.forbidden) nx++; TW_dom.target = nx; }
else if (["classic","sprint","fog","nofail"].includes(t)) TW_dom.target++;
if (typeof SoundEngine !== "undefined" && SoundEngine.playClick) SoundEngine.playClick();
} else if (success === false) {
b.classList.add("err");
setTimeout(() => { if (b) b.classList.remove("err"); }, 350);
if (typeof SoundEngine !== "undefined" && SoundEngine.playError) SoundEngine.playError();
}
socket.emit("tower_click", { index: i });
}
function stopLocalTimer() { if (TW_localTimer) { clearInterval(TW_localTimer); TW_localTimer = null; } }
function startLocalTimer(tl) {
stopLocalTimer();
let left = (typeof tl === "number" ? tl : 0);
const el = document.getElementById("twg-timer");
const paint = () => { if (el) { el.innerText = "⏱️ " + Math.max(0, Math.ceil(left)) + "s"; el.style.color = left <= 5 ? "#ff4b2b" : "#fff"; } };
paint();
TW_localTimer = setInterval(() => { left -= 0.25; paint(); }, 250);
}
function renderHUDFromState() {
const h = document.getElementById("tg-hud"); if (!h || !TW) return;
let main = "";
if (TW.type === "color" && TW.targetColor) main = `COULEUR : <span style="color:${TW.targetColor.hex};">${TW.targetColor.name}</span>`;
else if (TW.type === "pairs") main = (TW.revealLeft > 0) ? `👀 MÉMORISE ! ${TW.revealLeft}s` : "🧩 RETROUVE LES PAIRES";
else if (TW.type === "parity") main = TW.targetParity === "even" ? "CLIQUE : PAIRS" : "CLIQUE : IMPAIRS";
else if (TW.type === "forbidden") main = `INTERDIT : <span style="color:#ff4b2b;">${TW.forbidden}</span> · CIBLE : ${TW.target}`;
else if (TW.type === "memory") main = (TW.revealLeft > 0) ? `👀 MÉMORISE ! ${TW.revealLeft}s` : "🧠 CLIQUE DANS L'ORDRE (1→N)";
else if (TW.target !== null && TW.target !== undefined) main = `CIBLE : ${TW.target}`;
if (main !== TW_hudCache) { h.innerHTML = main; TW_hudCache = main; }
const bar = document.getElementById("tg-bar");
if (bar) { if (TW.type === "boss") { bar.style.display = "block"; bar.innerHTML = `<div style="width:${Math.min(100,TW.ai/TW.total*100)}%;height:100%;background:linear-gradient(90deg,#ff4b2b,#f8b500);"></div>`; } else bar.style.display = "none"; }
document.getElementById("twg-title").innerText = "🏰 ÉTAGE " + TW.floor + " — " + TowerUtils.typeLabel(TW.type);
const errEl = document.getElementById("tg-err");
if (errEl) errEl.innerText = "❌ " + (TW.mistakes || 0);
const shEl = document.getElementById("tg-shield");
if (shEl) shEl.style.display = (TW.shield > 0) ? "inline" : "none";
updateJokerButtons();
const grid = document.getElementById("tg-grid");
if (grid) grid.classList.toggle("shielded", (TW.shield > 0));
}
function showFailUI(reason) {
const ov = ensureTowerOverlay();
ov.style.display = "flex";
document.getElementById("tg-bar").style.display = "none";
document.getElementById("tg-hud").innerHTML = "";
const g = document.getElementById("tg-grid");
g.style.gridTemplateColumns = "1fr";
const fr = currentLang === "fr";
const nolives = reason === "nolives";
g.innerHTML = `<div style="text-align:center;"><div style="font-size:30px;">${nolives?"❤️":"💥"}</div><div style="color:#ff4b2b;font-weight:900;margin:6px 0;">${nolives?(fr?"PLUS DE VIES !":"NO LIVES LEFT!"):(fr?"ÉTAGE RATÉ !":"FLOOR FAILED!")}</div><button class="btn-main btn-blue" onclick="retryFloor()">🔄 ${fr?"Réessayer":"Retry"}</button><button class="btn-secondary" onclick="quitFloor()">${fr?"Quitter":"Quit"}</button></div>`;
}
function retryFloor() { TW = null; TW_dom = null; stopLocalTimer(); startTowerFloor({ floor: TW_lastFloor }); }
function quitFloor() {
TW = null; TW_dom = null; stopLocalTimer();
socket.emit("tower_quit");
const ov = document.getElementById("tower-game"); if (ov) ov.style.display = "none";
const shield = document.getElementById("tw-shield-active"); if (shield) shield.remove();
updateJokerButtons();
}
function showTowerWinPopup(res) {
const fr = currentLang === "fr";
const d = document.createElement("div");
d.className = "modal-overlay"; d.style.display = "flex";
d.innerHTML = `<div class="modal-card" style="max-width:300px;text-align:center;">
<h3 style="color:#00ff88;margin:0 0 6px 0;">✅ ${fr?"ÉTAGE":"FLOOR"} ${res.floor} ${fr?"VAINCU":"CLEARED"} !</h3>
<div class="tw-stars">${[1,2,3].map(i=>`<span style="animation-delay:${i*0.2}s;${i<=res.stars?"":"filter:grayscale(1);opacity:.3;"}">⭐</span>`).join("")}</div>
<div style="font-size:13px;color:#f8b500;font-weight:bold;margin-bottom:10px;">+${res.coins} 🪙</div>
<button class="btn-main btn-blue" onclick="this.closest('.modal-overlay').remove();renderAdventure()">${fr?"Continuer":"Continue"} ⚡</button>
</div>`;
document.body.appendChild(d);
towerDing();
}
/* ----- 11. SOCKET EVENTS ----- */
socket.on("tower_data", (d) => {
const oldWorld = TowerUtils.getTowerChapter(Math.min(towerProgress.floor + 1, TOTAL_FLOORS)).id;
towerProgress = { floor: d.floor || 0, stars: d.stars || {} };
twViewFloor = Math.min(towerProgress.floor + 1, TOTAL_FLOORS);
twViewFloor = Math.min(twViewFloor, maxVisibleWorld() * FPC);;
if (d.lives !== undefined) twLives = d.lives;
if (d.nextLifeIn !== undefined) twNextLife = d.nextLifeIn || 0;
if (d.jokers) twJokers = d.jokers;
const newWorld = TowerUtils.getTowerChapter(Math.min(towerProgress.floor + 1, TOTAL_FLOORS)).id;
if (!TW_firstSync && newWorld !== oldWorld && TowerUtils.worldUnlocked(newWorld)) showWorldTransition(newWorld);
else renderAdventure();
TW_firstSync = false;
});
socket.on("player_registered", () => {
const scr = document.getElementById("screen-tower");
const open = scr && scr.style.display !== "none";
if (open) socket.emit("get_tower");
else if (sessionStorage.getItem("cb_last_screen") === "tower") openTower();
});
socket.on("tower_state", (st) => {
if (!st || !st.display) return;
TW_lastState = Date.now();
const first = TW_buttons.length === 0;
TW = st; TW_lastFloor = st.floor;
if (first) { buildGridFromState(st); TW_dom = cloneState(st); }
else { syncDomToState(st); TW_dom = cloneState(st); }
renderHUDFromState();
startLocalTimer(st.timeLeft);
});
socket.on("tower_fail", (r) => {
TW = null; TW_dom = null; stopLocalTimer();
if (r && r.lives !== undefined) twLives = r.lives;
else twLives = Math.max(0, twLives - 1);
if (r && r.nextLifeIn !== undefined) twNextLife = r.nextLifeIn || 0;
renderAdventure();
showFailUI(r && r.reason);
});
socket.on("tower_result", (res) => {
TW = null;
const ov = document.getElementById("tower-game"); if (ov) ov.style.display = "none";
const shield = document.getElementById("tw-shield-active"); if (shield) shield.remove();
if (!res.ok) return;
const oldWorld = TowerUtils.getTowerChapter(Math.min(towerProgress.floor + 1, TOTAL_FLOORS)).id;
towerProgress.floor = Math.max(towerProgress.floor, res.floor);
towerProgress.stars[String(res.floor)] = Math.max(towerProgress.stars[String(res.floor)] || 0, res.stars);
showTowerWinPopup(res);
const newWorld = TowerUtils.getTowerChapter(Math.min(towerProgress.floor + 1, TOTAL_FLOORS)).id;
if (newWorld !== oldWorld && TowerUtils.worldUnlocked(newWorld)) setTimeout(() => showWorldTransition(newWorld), 600);
else renderAdventure();
});
/* ----- 12. WATCHDOG ----- */
setInterval(() => {
if (TW && TW_lastState && Date.now() - TW_lastState > 6000) {
TW = null; TW_dom = null; stopLocalTimer();
const ov = document.getElementById("tower-game"); if (ov) ov.style.display = "none";
const shield = document.getElementById("tw-shield-active"); if (shield) shield.remove();
if (typeof showNotificationToast === "function") showNotificationToast(currentLang === "fr" ? "🔌 Serveur injoignable — partie annulée." : "🔌 Server unreachable — match cancelled.", "announcement");
}
}, 2000);
socket.on("disconnect", () => {
if (TW) {
TW = null; TW_dom = null; stopLocalTimer();
const ov = document.getElementById("tower-game"); if (ov) ov.style.display = "none";
const shield = document.getElementById("tw-shield-active"); if (shield) shield.remove();
if (typeof showNotificationToast === "function") showNotificationToast(currentLang === "fr" ? "🔌 Connexion perdue — partie annulée." : "🔌 Connection lost — match cancelled.", "announcement");
}
});
/* ----- 13. HELPERS ----- */
function towerDing() {
try {
SoundEngine.init();
const t = SoundEngine.ctx.currentTime;
[880, 1320].forEach((f, i) => {
const o = SoundEngine.ctx.createOscillator(), g = SoundEngine.ctx.createGain();
o.type = "sine"; o.frequency.value = f;
g.gain.setValueAtTime(.08, t + i * .12);
g.gain.exponentialRampToValueAtTime(.0001, t + i * .12 + .25);
o.connect(g); g.connect(SoundEngine.ctx.destination);
o.start(t + i * .12); o.stop(t + i * .12 + .25);
});
} catch (e) {}
}
function renderTower() { renderAdventure(); }
function showElevator() { renderAdventure(); }
function afterWinTravel() { renderAdventure(); }

/* ============================================================
MUSIQUES DES MONDES 1-3
M1 = mp3 Pixabay (sound/neon-city.mp3) · M2 = mélodie cristal · M3 = score braquage
============================================================ */
let WM = null, WM_audio = null, WM_lastKey = null;
function wmStopAudio(){ if(WM_audio){ const a=WM_audio; WM_audio=null; try{a.pause();}catch(e){} try{a.src='';}catch(e){} } }
function wmStop(){
wmStopAudio();
if(!WM) return;
(WM.timers||[]).forEach(t=>clearInterval(t));
(WM.nodes||[]).forEach(n=>{ try{ if(n.stop) n.stop(); }catch(e){} try{ n.disconnect(); }catch(e){} });
WM=null;
}
function wmCtx(){ SoundEngine.init(); return SoundEngine.ctx; }
function wmNoise(ctx,dur){ const len=Math.max(1,Math.floor(ctx.sampleRate*dur)); const b=ctx.createBuffer(1,len,ctx.sampleRate); const d=b.getChannelData(0); for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*(1-i/len); return b; }
function wmMaster(vol){ const ctx=wmCtx(); const g=ctx.createGain(); g.gain.value=0; g.gain.linearRampToValueAtTime(vol, ctx.currentTime+1); g.connect(ctx.destination); return g; }
function wmNoise(ctx,dur){ const len=Math.max(1,Math.floor(ctx.sampleRate*dur)); const b=ctx.createBuffer(1,len,ctx.sampleRate); const d=b.getChannelData(0); for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*(1-i/len); return b; }
function wmVoice(ctx,dest,ev){
const kind=ev[1], f=ev[2], dur=ev[3], vol=ev[4];
const t=ctx.currentTime;
if(kind==='k'){ const o=ctx.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(120,t); o.frequency.exponentialRampToValueAtTime(45,t+0.12); const g=ctx.createGain(); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.25); o.connect(g); g.connect(dest); o.start(t); o.stop(t+0.3); return; }
if(kind==='s'||kind==='h'){ const len=Math.floor(ctx.sampleRate*(kind==='s'?0.18:0.05)); const b=ctx.createBuffer(1,len,ctx.sampleRate); const d=b.getChannelData(0); for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*(1-i/len); const src=ctx.createBufferSource(); src.buffer=b; const fl=ctx.createBiquadFilter(); if(kind==='s'){fl.type='bandpass';fl.frequency.value=1800;} else {fl.type='highpass';fl.frequency.value=7000;} const g=ctx.createGain(); g.gain.value=vol; src.connect(fl); fl.connect(g); g.connect(dest); src.start(t); return; }
if(kind==='c'){ const o=ctx.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(3200,t); o.frequency.exponentialRampToValueAtTime(1200,t+0.08); const g=ctx.createGain(); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.12); const hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=1500; o.connect(hp); hp.connect(g); g.connect(dest); o.start(t); o.stop(t+0.15);
const src=ctx.createBufferSource(); src.buffer=wmNoise(ctx,0.4); const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.setValueAtTime(800,t+0.15); lp.frequency.exponentialRampToValueAtTime(150,t+0.5); const g2=ctx.createGain(); g2.gain.setValueAtTime(0.0001,t+0.15); g2.gain.linearRampToValueAtTime(vol*0.6,t+0.2); g2.gain.exponentialRampToValueAtTime(0.0001,t+0.55); src.connect(lp); lp.connect(g2); g2.connect(dest); src.start(t+0.15);
const o2=ctx.createOscillator(); o2.type='sine'; o2.frequency.value=880; const g3=ctx.createGain(); g3.gain.setValueAtTime(0.0001,t+0.55); g3.gain.linearRampToValueAtTime(vol*0.4,t+0.6); g3.gain.exponentialRampToValueAtTime(0.0001,t+0.9); o2.connect(g3); g3.connect(dest); o2.start(t+0.55); o2.stop(t+0.95); return; }
if(kind==='r'){ for(let i=0;i<5;i++){ const tt=t+i*0.04; const f=2400+Math.random()*1800; const o=ctx.createOscillator(); o.type='sine'; o.frequency.value=f; const g=ctx.createGain(); g.gain.setValueAtTime(vol*0.8,tt); g.gain.exponentialRampToValueAtTime(0.0001,tt+0.12); o.connect(g); g.connect(dest); o.start(tt); o.stop(tt+0.15);
const o3=ctx.createOscillator(); o3.type='sine'; o3.frequency.value=f*2.01; const g4=ctx.createGain(); g4.gain.setValueAtTime(vol*0.3,tt); g4.gain.exponentialRampToValueAtTime(0.0001,tt+0.08); o3.connect(g4); g4.connect(dest); o3.start(tt); o3.stop(tt+0.1); } return; }
if(kind==='g'){ [1300,1950].forEach((ff,i)=>{ const o=ctx.createOscillator(); o.type='square'; o.frequency.value=ff*(i?1.004:1); const bp=ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=ff; bp.Q.value=6; const g=ctx.createGain(); g.gain.setValueAtTime(vol*(i?0.5:1),t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.22); o.connect(bp); bp.connect(g); g.connect(dest); o.start(t); o.stop(t+0.25); });
const src=ctx.createBufferSource(); src.buffer=wmNoise(ctx,0.06); const hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=3000; const g3=ctx.createGain(); g3.gain.value=vol*0.4; src.connect(hp); hp.connect(g3); g3.connect(dest); src.start(t); return; }
if(kind==='t'){ const o=ctx.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(100,t); o.frequency.exponentialRampToValueAtTime(55,t+0.09); const g=ctx.createGain(); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.12); o.connect(g); g.connect(dest); o.start(t); o.stop(t+0.15);
const src=ctx.createBufferSource(); src.buffer=wmNoise(ctx,0.04); const fl=ctx.createBiquadFilter(); fl.type='lowpass'; fl.frequency.value=400; const g2=ctx.createGain(); g2.gain.value=vol*0.5; src.connect(fl); fl.connect(g2); g2.connect(dest); src.start(t); return; }
if(kind==='z'){ const o=ctx.createOscillator(); o.type='sawtooth'; o.frequency.setValueAtTime(2400,t); o.frequency.exponentialRampToValueAtTime(300,t+0.18); const bp=ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=1200; bp.Q.value=3; const g=ctx.createGain(); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.2); o.connect(bp); bp.connect(g); g.connect(dest); o.start(t); o.stop(t+0.22); return; }
if(kind==='a'){ const o=ctx.createOscillator(); o.type='triangle'; const g=ctx.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(vol,t+0.25); g.gain.linearRampToValueAtTime(0.0001,t+dur); o.frequency.setValueAtTime(620,t); o.frequency.linearRampToValueAtTime(920,t+dur*0.5); o.frequency.linearRampToValueAtTime(620,t+dur); o.connect(g); g.connect(dest); o.start(t); o.stop(t+dur+0.05); return; }
if(kind==='t'){ const o=ctx.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(100,t); o.frequency.exponentialRampToValueAtTime(55,t+0.09); const g=ctx.createGain(); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.12); o.connect(g); g.connect(dest); o.start(t); o.stop(t+0.15); const src=ctx.createBufferSource(); src.buffer=wm_noise(ctx,0.04); const fl=ctx.createBiquadFilter(); fl.type='lowpass'; fl.frequency.value=400; const g2=ctx.createGain(); g2.gain.value=vol*0.5; src.connect(fl); fl.connect(g2); g2.connect(dest); src.start(t); return; }
if(kind==='g'){ [1300,1950].forEach((ff,i)=>{ const o=ctx.createOscillator(); o.type='square'; o.frequency.value=ff*(i?1.004:1); const bp=ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=ff; bp.Q.value=6; const g=ctx.createGain(); g.gain.setValueAtTime(vol*(i?0.5:1),t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.22); o.connect(bp); bp.connect(g); g.connect(dest); o.start(t); o.stop(t+0.25); }); const src=ctx.createBufferSource(); src.buffer=wm_noise(ctx,0.06); const hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=3000; const g3=ctx.createGain(); g3.gain.value=vol*0.4; src.connect(hp); hp.connect(g3); g3.connect(dest); src.start(t); return; }
if(kind==='z'){ const o=ctx.createOscillator(); o.type='sawtooth'; o.frequency.setValueAtTime(2400,t); o.frequency.exponentialRampToValueAtTime(300,t+0.18); const bp=ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=1200; bp.Q.value=3; const g=ctx.createGain(); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.2); o.connect(bp); bp.connect(g); g.connect(dest); o.start(t); o.stop(t+0.22); return; }
if(kind==='a'){ const o=ctx.createOscillator(); o.type='triangle'; const g=ctx.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(vol,t+0.25); g.gain.linearRampToValueAtTime(0.0001,t+dur); o.frequency.setValueAtTime(620,t); o.frequency.linearRampToValueAtTime(920,t+dur*0.5); o.frequency.linearRampToValueAtTime(620,t+dur); o.connect(g); g.connect(dest); o.start(t); o.stop(t+dur+0.05); return; }
if(kind==='l'){ const o1=ctx.createOscillator(); o1.type='sine'; o1.frequency.value=f; const o2=ctx.createOscillator(); o2.type='sine'; o2.frequency.value=f*2.76; const g=ctx.createGain(); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0001,t+dur); const g2=ctx.createGain(); g2.gain.setValueAtTime(vol*0.35,t); g2.gain.exponentialRampToValueAtTime(0.0001,t+dur*0.6); o1.connect(g); o2.connect(g2); g.connect(dest); g2.connect(dest); o1.start(t); o2.start(t); o1.stop(t+dur+0.05); o2.stop(t+dur+0.05); return; }
if(kind==='c'){ const o=ctx.createOscillator(); o.type='sine'; o.frequency.value=f; const g=ctx.createGain(); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.5); o.connect(g); g.connect(dest); o.start(t); o.stop(t+0.55); return; }
if(kind==='r'){ const o=ctx.createOscillator(); o.type='triangle'; o.frequency.value=f; const g=ctx.createGain(); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.35); o.connect(g); g.connect(dest); o.start(t); o.stop(t+0.4); return; }
const o=ctx.createOscillator(); const g=ctx.createGain(); let node=o;
if(kind==='m'||kind==='x'){ o.type='sawtooth'; o.frequency.value=f; const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=(kind==='x'?1500:1100); o.connect(lp); node=lp; g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t+dur); }
else if(kind==='b'){ o.type='triangle'; o.frequency.value=f; const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=320; o.connect(lp); node=lp; g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t+dur); }
else if(kind==='p'){ o.type='sine'; o.frequency.value=f; g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(vol,t+0.4); g.gain.linearRampToValueAtTime(0.0001,t+dur); }
else { o.type='sine'; o.frequency.value=f; g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+0.03); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
const dl=ctx.createDelay(1); dl.delayTime.value=0.28; const fb=ctx.createGain(); fb.gain.value=0.3; g.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(dest); }
node.connect(g); g.connect(dest);
o.start(t); o.stop(t+dur+0.1);
}
function wmRunScore(bpm,total,E){
const ctx=wmCtx(); const master=wmMaster(0.9);
const SD=60/bpm/2; const byStep={};
E.forEach(ev=>{ (byStep[ev[0]]=byStep[ev[0]]||[]).push(ev); });
let step=0;
const timer=setInterval(()=>{ const l=byStep[step]; if(l) for(let i=0;i<l.length;i++) wmVoice(ctx,master,l[i]); step=(step+1)%total; }, SD*1000);
WM={nodes:[master],timers:[timer]};
}
/* --- M1 : mp3 Pixabay, volume DOUX (fallback synthwave) --- */
function wmStartNeon(){
wmStopAudio();
try{
const a=new Audio('sound/neon-city.mp3');
a.loop=true; a.volume=0; a.preload='auto';
WM_audio=a;
a.addEventListener('error', function(){ if(WM_audio===a){ wmStopAudio(); wmNeonFallback(); } }, {once:true});
const p=a.play();
const fadeIn=function(){ if(WM_audio!==a) return; const f=setInterval(function(){ if(WM_audio!==a){clearInterval(f);return;} if(a.volume<0.20)a.volume=Math.min(0.20,a.volume+0.020); else clearInterval(f); },90); };
if(p&&typeof p.then==='function'){ p.then(fadeIn).catch(function(){ if(WM_audio===a){ wmStopAudio(); wmNeonFallback(); } }); } else fadeIn();
}catch(e){ wmNeonFallback(); }
}
function wmNeonFallback(){
const ctx=wmCtx(); const master=wmMaster(0.16);
const nodes=[master], timers=[];
const pad=ctx.createGain(); pad.gain.value=0.05; pad.connect(master);
[110,164.8,220].forEach((f,i)=>{ const o=ctx.createOscillator(); o.type='sawtooth'; o.frequency.value=f; o.detune.value=i*6-6; const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=700; o.connect(lp); lp.connect(pad); o.start(); nodes.push(o,lp); });
const bassPat=[55,55,110,55, 49,49,98,49, 43.6,43.6,87.3,43.6, 41.2,41.2,82.4,41.2]; let bi=0;
timers.push(setInterval(()=>{ const o=ctx.createOscillator(); o.type='square'; o.frequency.value=bassPat[bi%bassPat.length]; const g=ctx.createGain(); const t=ctx.currentTime; g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.10,t+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t+0.28); const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=500; o.connect(lp); lp.connect(g); g.connect(master); o.start(t); o.stop(t+0.3); bi++; },300));
WM={nodes,timers};
}
/* --- M2 : Grottes de Cristal (mélodie chantante + écho) --- */
function wmStartGlacier(){
const bpm=80, SD=60/bpm/2, mf=m=>440*Math.pow(2,(m-69)/12);
const E=[];
const A=[[0,74,3],[4,69,3],[8,72,3],[12,74,3],[16,77,6],[24,76,2],[28,74,4],[32,72,3],[36,69,3],[40,67,3],[44,72,4],[52,74,6],[60,69,4]];
const B=[[0,76,3],[4,74,3],[8,72,3],[12,69,3],[16,67,6],[24,69,2],[28,72,4],[32,74,3],[36,77,3],[40,79,3],[44,76,4],[52,74,6],[60,72,4]];
const pA=[[0,[62,65,69]],[16,[58,62,65]],[32,[55,58,62]],[48,[57,61,64]]];
const pB=[[0,[58,62,65]],[16,[53,57,60]],[32,[55,58,62]],[48,[62,65,69]]];
const rA=[38,38,34,34,31,31,33,33], rB=[34,34,29,29,31,31,38,38];
function phrase(off,mel,pads,roots){
for(let i=0;i<mel.length;i++) E.push([off+mel[i][0],'f',mf(mel[i][1]),mel[i][2]*SD,0.10]);
for(let i=0;i<pads.length;i++) for(let j=0;j<pads[i][1].length;j++) E.push([off+pads[i][0],'p',mf(pads[i][1][j]),16*SD,0.03]);
for(let bar=0;bar<8;bar++){ const r=roots[bar]; E.push([off+bar*8,'b',mf(r),3*SD,0.08]); E.push([off+bar*8+4,'b',mf(r),3*SD,0.08]); E.push([off+bar*8+6,'b',mf(r+7),2*SD,0.05]); }
E.push([off+28,'f',mf(89),2*SD,0.04]); E.push([off+60,'f',mf(93),2*SD,0.04]);
}
phrase(0,A,pA,rA); phrase(64,B,pB,rB);
wmRunScore(bpm,128,E);
}

/* --- M3 : Banque Dorée — mp3 Pixabay (coffre-fort.mp3) + fallback ambiance feutrée --- */
function wmStartVault(){
wmStopAudio();
try{
const a=new Audio('sound/coffre-fort.mp3');
a.loop=true; a.volume=0; a.preload='auto';
WM_audio=a;
a.addEventListener('error', function(){ if(WM_audio===a){ wmStopAudio(); wmVaultFallback(); } }, {once:true});
const p=a.play();
const fadeIn=function(){ if(WM_audio!==a) return; const f=setInterval(function(){ if(WM_audio!==a){clearInterval(f);return;} if(a.volume<0.5)a.volume=Math.min(0.5,a.volume+0.04); else clearInterval(f); },90); };
if(p&&typeof p.then==='function'){ p.then(fadeIn).catch(function(){ if(WM_audio===a){ wmStopAudio(); wmVaultFallback(); } }); } else fadeIn();
}catch(e){ wmVaultFallback(); }
}
function wmVaultFallback(){
const ctx=wmCtx(); const master=wmMaster(0.5);
const nodes=[master], timers=[];
const hum=ctx.createOscillator(); hum.type='sine'; hum.frequency.value=48;
const hum2=ctx.createOscillator(); hum2.type='sine'; hum2.frequency.value=96.5;
const hg=ctx.createGain(); hg.gain.value=0;
hum.connect(hg); hum2.connect(hg); hg.connect(master);
hum.start(); hum2.start(); nodes.push(hum,hum2);
hg.gain.linearRampToValueAtTime(0.030, ctx.currentTime+3);
const air=ctx.createBufferSource(); air.buffer=wmNoise(ctx,2); air.loop=true;
const af=ctx.createBiquadFilter(); af.type='lowpass'; af.frequency.value=220;
const ag=ctx.createGain(); ag.gain.value=0;
air.connect(af); af.connect(ag); ag.connect(master); air.start(); nodes.push(air);
ag.gain.linearRampToValueAtTime(0.014, ctx.currentTime+3);
const sub=ctx.createOscillator(); sub.type='sine'; sub.frequency.value=40;
const sg=ctx.createGain(); sg.gain.value=0;
sub.connect(sg); sg.connect(master); sub.start(); nodes.push(sub);
const pl=ctx.createOscillator(); pl.type='sine'; pl.frequency.value=0.25;
const plg=ctx.createGain(); plg.gain.value=0.010;
pl.connect(plg); plg.connect(sg.gain); pl.start(); nodes.push(pl);
sg.gain.linearRampToValueAtTime(0.018, ctx.currentTime+2);
timers.push(setInterval(()=>{
const t=ctx.currentTime;
const o=ctx.createOscillator(); o.type='sine';
o.frequency.setValueAtTime(900,t); o.frequency.linearRampToValueAtTime(1400,t+1.5); o.frequency.linearRampToValueAtTime(900,t+3);
const f=ctx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=1200; f.Q.value=2;
const g=ctx.createGain(); g.gain.setValueAtTime(0.0001,t);
g.gain.linearRampToValueAtTime(0.014,t+1.2); g.gain.linearRampToValueAtTime(0.0001,t+3);
o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t+3.1);
},9000));
timers.push(setInterval(()=>{
const t=ctx.currentTime; const dir=Math.random()<0.5?1:-1;
const o=ctx.createOscillator(); o.type='triangle';
o.frequency.setValueAtTime(dir>0?200:260,t); o.frequency.linearRampToValueAtTime(dir>0?260:200,t+4);
const g=ctx.createGain(); g.gain.setValueAtTime(0.0001,t);
g.gain.linearRampToValueAtTime(0.011,t+1.5); g.gain.linearRampToValueAtTime(0.0001,t+4);
o.connect(g); g.connect(master); o.start(t); o.stop(t+4.1);
},11000));
timers.push(setInterval(()=>{
const t=ctx.currentTime;
const o=ctx.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(85,t);
const vib=ctx.createOscillator(); vib.type='sine'; vib.frequency.value=3; const vg=ctx.createGain(); vg.gain.value=4; vib.connect(vg); vg.connect(o.frequency);
const f=ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=300;
const g=ctx.createGain(); g.gain.setValueAtTime(0.0001,t);
g.gain.linearRampToValueAtTime(0.020,t+0.8); g.gain.linearRampToValueAtTime(0.0001,t+2.5);
o.connect(f); f.connect(g); g.connect(master); o.start(t); vib.start(t); o.stop(t+2.6); vib.stop(t+2.6);
},14000));
const pent=[523.25,587.33,659.25,783.99,880.00];
timers.push(setInterval(()=>{
const t=ctx.currentTime; const f=pent[Math.floor(Math.random()*pent.length)];
const o=ctx.createOscillator(); o.type='sine'; o.frequency.value=f;
const o2=ctx.createOscillator(); o2.type='sine'; o2.frequency.value=f*2;
const g=ctx.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.016,t+0.05); g.gain.linearRampToValueAtTime(0.0001,t+1.6);
const g2=ctx.createGain(); g2.gain.setValueAtTime(0.0001,t); g2.gain.linearRampToValueAtTime(0.006,t+0.05); g2.gain.linearRampToValueAtTime(0.0001,t+1.0);
o.connect(g); o2.connect(g2); g.connect(master); g2.connect(master);
o.start(t); o2.start(t); o.stop(t+1.7); o2.stop(t+1.1);
},7000));
WM={nodes,timers};
}
/* --- Routeur --- */
function towerPlayWorldMusic(world){
try{
const key='w'+world;
if(WM_lastKey===key) return;
WM_lastKey=key;
wmStop();
if(typeof SoundEngine!=='undefined' && typeof SoundEngine.stopMusic==='function'){
SoundEngine.stopMusic(false);
}
if(world===1) return wmStartNeon();
if(world===2) return wmStartGlacier();
if(world===3) return wmStartVault();
if(typeof SoundEngine!=='undefined'){
const k=TOWER_CHAPTERS[world-1].season===3?'s3menu':'s2menu';
setTimeout(()=>{ if(typeof SoundEngine.startMusicSeasonal==='function') SoundEngine.startMusicSeasonal(k); },100);
}
}catch(e){}
}
