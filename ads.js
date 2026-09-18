/* ============================================================
ADS.JS — Pubs : AdMob réel si APK Capacitor, simulé sinon
============================================================ */
const ADMOB_IDS = {
  interstitial: "ca-app-pub-1819170082992254/9095343035", // pub après le menu explicatif
  rewarded: "ca-app-pub-1819170082992254/1893666559" // pub pour doubler les pièces
};
const ADS = {
  native() {
    return !!(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob);
  },
  showInterstitial() {
    if (!this.native()) return Promise.resolve(false);
    const A = window.Capacitor.Plugins.AdMob;
    return A.prepareInterstitial({ adId: ADMOB_IDS.interstitial })
      .then(() => A.showInterstitial()).then(() => true).catch(() => false);
  },
  showRewarded() {
    if (!this.native()) return Promise.resolve(false);
    const A = window.Capacitor.Plugins.AdMob;
    return A.prepareRewardVideoAd({ adId: ADMOB_IDS.rewarded })
      .then(() => A.showRewardVideoAd()).then(() => true).catch(() => false);
  }
};
let __adDone = null, __adIv = null, __skipIv = null;
function hideAdModals() {
  ['modal-launch-ad', 'simulated-ad-overlay', 'modal-support'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = 'none';
  });
}
function proceedAfterAd() {
  hideAdModals();
  if (typeof showMainMenu === 'function') { showMainMenu(); return; }
  const t = document.getElementById('screen-title'); if (t) t.style.display = 'none';
}
function showSimulatedAd(done) {
  __adDone = done;
  const ov = document.getElementById('simulated-ad-overlay');
  const timer = document.getElementById('ad-timer');
  const closeBtn = document.getElementById('ad-close-btn');
  if (!ov) { if (done) done(); return; }
  ov.style.display = 'flex';
  if (closeBtn) closeBtn.style.display = 'none';
  let t = 5; if (timer) timer.innerText = t;
  if (__adIv) clearInterval(__adIv);
  __adIv = setInterval(() => {
    t--; if (timer) timer.innerText = Math.max(t, 0);
    if (t <= 0) { clearInterval(__adIv); __adIv = null; if (closeBtn) closeBtn.style.display = 'inline-block'; }
  }, 1000);
}
function closeSimulatedAd() {
  if (__adIv) { clearInterval(__adIv); __adIv = null; }
  const ov = document.getElementById('simulated-ad-overlay'); if (ov) ov.style.display = 'none';
  const done = __adDone; __adDone = null;
  if (done) done();
}
function openLaunchAdModal() { playLaunchAd(); }
function playLaunchAd() {
  hideAdModals();
  if (ADS.native()) { ADS.showInterstitial().then(() => proceedAfterAd()); return; }
  showSimulatedAd(proceedAfterAd);
}
function watchAdToDoubleReward() {
  if (ADS.native()) {
    ADS.showRewarded().then(ok => { if (ok) socket.emit('double_reward'); });
    return;
  }
  showSimulatedAd(() => { socket.emit('double_reward'); });
}
function openSupportModal() {
  const m = document.getElementById('modal-support');
  if (!m) { proceedAfterAd(); return; }
  m.style.display = 'flex';
  const btn = document.getElementById('support-skip-btn');
  const lbl = document.getElementById('support-skip-lbl');
  const fr = (typeof currentLang !== 'undefined' && currentLang === 'fr');
  let t = 5;
  if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; }
  if (lbl) lbl.innerText = '⏭️ ' + (fr ? 'Passer' : 'Skip') + ' (' + t + ')';
  if (__skipIv) clearInterval(__skipIv);
  __skipIv = setInterval(() => {
    t--;
    if (t <= 0) {
      clearInterval(__skipIv); __skipIv = null;
      if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
      if (lbl) lbl.innerText = '⏭️ ' + (fr ? 'Passer et jouer' : 'Skip and play');
    } else if (lbl) lbl.innerText = '⏭️ ' + (fr ? 'Passer' : 'Skip') + ' (' + t + ')';
  }, 1000);
}
function closeSupportModal() {
  if (__skipIv) { clearInterval(__skipIv); __skipIv = null; }
  const m = document.getElementById('modal-support'); if (m) m.style.display = 'none';
}
