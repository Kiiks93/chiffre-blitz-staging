/* ============================================================
PANEL ADMIN — PC : fenêtre popup · MOBILE : overlay DANS l'app
============================================================ */

// ⚠️ URL ABSOLUE OBLIGATOIRE (Le panel est servi par le backend Render)
const ADMIN_PANEL_URL = "https://chiffre-blitz-server.onrender.com/admin.html";

function isAdminMobile() {
  return /Android|iPhone|iPad|iPod|Tablet|Mobile/i.test(navigator.userAgent) ||
         (navigator.maxTouchPoints > 2 && Math.min(screen.width, screen.height) < 900);
}

function openAdminPanel() {
  // 💻 PC : popup séparée
  if (!isAdminMobile()) {
    window.open(ADMIN_PANEL_URL, "cb_admin", "width=430,height=780");
    return;
  }

  // 📱 MOBILE : overlay plein écran DANS l'application (iframe)
  let overlay = document.getElementById('admin-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'admin-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0f051d;display:flex;flex-direction:column;';

    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#0f051d;border-bottom:2px solid #00d2ff;flex-shrink:0;';
    bar.innerHTML = '<span style="color:#00d2ff;font-weight:900;font-size:14px;">⚡ PANEL ADMIN</span>';

    const closeBtn = document.createElement('button');
    closeBtn.id = 'admin-overlay-close';
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'width:38px;height:38px;border-radius:50%;border:none;background:#ff4b2b;color:#fff;font-size:18px;font-weight:900;cursor:pointer;';
    closeBtn.onclick = closeAdminPanel;
    bar.appendChild(closeBtn);

    const iframe = document.createElement('iframe');
    iframe.id = 'admin-iframe';
    // ✅ UTILISATION DE L'URL ABSOLUE
    iframe.src = ADMIN_PANEL_URL; 
    iframe.style.cssText = 'flex:1;width:100%;border:none;background:#0f051d;';
    // Autorise les permissions nécessaires si le panel utilise des APIs
    iframe.allow = "clipboard-write"; 

    overlay.appendChild(bar);
    overlay.appendChild(iframe);
    document.body.appendChild(overlay);
  } else {
    overlay.style.display = 'flex';
    const iframe = document.getElementById('admin-iframe');
    if (iframe) iframe.src = ADMIN_PANEL_URL; // Recharge le panel
  }
}

function closeAdminPanel() {
  const overlay = document.getElementById('admin-overlay');
  if (overlay) {
    const iframe = document.getElementById('admin-iframe');
    if (iframe) iframe.src = 'about:blank'; // Coupe le socket du panel
    overlay.style.display = 'none';
    return;
  }
  const modal = document.getElementById("admin-modal");
  if (modal) modal.style.display = "none";
}

// Le ✕ DANS admin.html (iframe) demande au parent de fermer l'overlay
window.addEventListener('message', (e) => {
  if (e.data && (e.data.cbAction === 'close_admin' || e.data.action === 'close_admin_panel')) closeAdminPanel();
});
