/* ============================================================
SOCIAL.JS — AMIS, SALONS PRIVÉS & TOURNOIS
============================================================ */
const SOCIAL_STYLES = {
  removeBtn: "font-size:10px; padding:4px 6px; background:rgba(255,75,43,0.2); color:#ff4b2b; border:1px solid #ff4b2b;",
  smallBtn: "font-size:10px; padding:4px 6px;",
  trophyBtn: "font-size:10px; padding:4px 6px; background:rgba(248,181,0,0.15); color:#f8b500; border:1px solid #f8b500;",
  sectionLabel: "text-align:left; font-size:9px; letter-spacing:2px; color:#00d2ff; margin:8px 0 4px 2px; font-weight:bold;",
  emptyList: "text-align:center; color:#aaa; margin-top:15px; font-size:11px;"
};

function escapeQuotes(str) { return String(str || "").replace(/'/g, "\\'"); }

/* ----- AMIS ----- */
function openFriendsModal() {
  if (!isProfileValid()) { checkAndShowProfileModal(); return; }
  document.getElementById("modal-friends").style.display = "flex";
  socket.emit("get_friends_list");
}
function closeFriendsModal() { document.getElementById("modal-friends").style.display = "none"; }

function updateFriendsBadge() {
  const d = i18n[currentLang];
  const totalCount = (window.lastRequestsCount || 0) + (myGameInvites ? myGameInvites.length : 0);
  const badge = document.getElementById("friends-main-badge");
  if (badge) { badge.innerText = totalCount; badge.style.display = totalCount > 0 ? "inline-block" : "none"; }
  const requestsTab = document.getElementById("friend-tab-requests");
  const invitesTab = document.getElementById("friend-tab-invites");
  if (requestsTab) requestsTab.innerText = `${d.friends_tab_requests} ${window.lastRequestsCount || 0}`;
  if (invitesTab) invitesTab.innerText = `${d.friends_tab_invites} ${myGameInvites.length}`;
}

function switchFriendTab(tab) {
  currentFriendFilter = tab;
  document.getElementById("friend-tab-all").classList.toggle("active", tab === "all");
  document.getElementById("friend-tab-requests").classList.toggle("active", tab === "requests");
  const invitesTab = document.getElementById("friend-tab-invites");
  if (invitesTab) invitesTab.classList.toggle("active", tab === "invites");
  if (tab === "invites") renderGameInvitesList();
  else socket.emit("get_friends_list");
}

function sendFriendRequest() {
  const target = document.getElementById("input-add-friend").value.trim();
  if (target) { socket.emit("send_friend_request", target); document.getElementById("input-add-friend").value = ""; }
}
function acceptFriend(id) { socket.emit("accept_friend_request", id); }
function removeFriend(id) { socket.emit("remove_friend", id); }

function inviteFriend(targetSocketId) {
  const randomRoomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
  socket.emit("create_room", { code: randomRoomCode, password: "", username: myProfile.username, avatar: myProfile.avatar, flag: myProfile.flag });
  socket.emit("invite_friend_to_game", { targetSocketId, roomCode: randomRoomCode });
  closeFriendsModal();
  showNotificationToast(i18n[currentLang].friend_room_created, "gift");
}

socket.on("receive_game_invite", (data) => {
  const d = i18n[currentLang];
  myGameInvites.unshift({ from: data.from, roomCode: data.roomCode, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) });
  updateFriendsBadge();
  if (currentFriendFilter === "invites" && document.getElementById("modal-friends").style.display === "flex") renderGameInvitesList();
  let inviteHtml = `${d.friend_game_invite_from} <b>${data.from}</b> !`;
  if (data.roomCode) inviteHtml += `<br><button class="power-btn equip" onclick="joinGameInviteByCode('${data.roomCode}')" style="margin-top:6px; font-size:11px; padding:4px 10px;">${d.friend_join_room}</button>`;
  showNotificationToast(inviteHtml, "gift");
});

// 📬 Demande d'ami reçue EN TEMPS RÉEL → pastille immédiate
socket.on("friend_request_received", (data) => {
  window.lastRequestsCount = (window.lastRequestsCount || 0) + 1;
  updateFriendsBadge();
  showNotificationToast("👥 " + ((data && data.from) || "Quelqu'un") + " t'a envoyé une demande d'ami !", "gift");
  socket.emit("get_friends_list");
});
socket.on("connect", () => {
  if (typeof isProfileValid === "function" && isProfileValid()) socket.emit("get_friends_list");
});

function renderGameInvitesList() {
  const d = i18n[currentLang];
  const container = document.getElementById("friends-list-container");
  container.innerHTML = "";
  if (myGameInvites.length === 0) { container.innerHTML = `<div style="${SOCIAL_STYLES.emptyList}">${d.friend_no_invites}</div>`; return; }
  myGameInvites.forEach((inv, index) => {
    const row = document.createElement("div");
    row.className = "friend-card";
    row.innerHTML = `
      <div style="text-align:left;">
        <div style="font-weight:bold; color:#fff; font-size:12px;">${inv.from}</div>
        <div style="font-size:10px; color:#00d2ff;">${d.friend_room} ${inv.roomCode} (${inv.time})</div>
      </div>
      <div style="display:flex; gap:4px; align-items:center;">
        <button class="power-btn equip" onclick="joinGameInviteByCode('${inv.roomCode}')" style="font-size:10px; padding:4px 8px;">${d.friend_join}</button>
        <button class="power-btn" onclick="removeGameInvite(${index})" style="${SOCIAL_STYLES.removeBtn}">✕</button>
      </div>`;
    container.appendChild(row);
  });
}
function removeGameInvite(index) { myGameInvites.splice(index, 1); updateFriendsBadge(); renderGameInvitesList(); }

function joinGameInviteByCode(roomCode) {
  if (!roomCode) return;
  if (!isProfileValid()) { checkAndShowProfileModal(); return; }
  myGameInvites = myGameInvites.filter(inv => inv.roomCode !== roomCode);
  updateFriendsBadge(); renderGameInvitesList(); closeFriendsModal();
  joinRoomDirect(roomCode, "");
}

socket.on("friends_list_data", (friends) => {
  const d = i18n[currentLang];
  const allFriends = friends || [];
  const incomingRequests = allFriends.filter(f => f.status === "pending" && !f.isRequester);
  const outgoingRequests = allFriends.filter(f => f.status === "pending" && f.isRequester);
  window.lastRequestsCount = incomingRequests.length;
  updateFriendsBadge();
  if (currentFriendFilter === "invites") return;
  const container = document.getElementById("friends-list-container");
  container.innerHTML = "";
  const makeLabel = (text) => { const el = document.createElement("div"); el.style.cssText = SOCIAL_STYLES.sectionLabel; el.innerText = text; return el; };
  const renderCard = (f) => {
    const row = document.createElement("div");
    row.className = "friend-card";
    const dotColor = f.isOnline ? "#38ef7d" : "#aaa";
    const statusText = f.isOnline ? d.friend_online : d.friend_offline;
    const safeName = escapeQuotes(f.username);
    let actionsHtml = "";
    if (f.status === "pending") {
      if (!f.isRequester) {
        actionsHtml += `<button class="power-btn equip" onclick="acceptFriend('${f.id}')" style="${SOCIAL_STYLES.smallBtn}">${d.friend_accept}</button>`;
        actionsHtml += `<button class="power-btn" onclick="removeFriend('${f.id}')" style="${SOCIAL_STYLES.removeBtn}">✕</button>`;
      } else {
        actionsHtml += `<span style="font-size:10px; color:#f8b500;">${d.friend_pending}</span>`;
        actionsHtml += `<button class="power-btn" onclick="removeFriend('${f.id}')" style="${SOCIAL_STYLES.removeBtn}" title="${d.friend_cancel}">✕</button>`;
      }
    } else {
      if (f.isOnline && f.targetSocketId) actionsHtml += `<button class="power-btn buy" onclick="inviteFriend('${f.targetSocketId}')" style="${SOCIAL_STYLES.smallBtn}">${d.friend_invite}</button>`;
    }
    actionsHtml += `<button class="power-btn" onclick="openTrophyRoom('${safeName}')" style="${SOCIAL_STYLES.trophyBtn}" title="${d.friend_view_trophy}">🏛️</button>`;
    if (f.status === "accepted") actionsHtml += `<button class="power-btn" onclick="removeFriend('${f.id}')" style="${SOCIAL_STYLES.removeBtn}">${d.friend_remove}</button>`;
    const subText = f.status === "pending" ? (f.isRequester ? d.friend_sent_req : d.friend_wants) : statusText;
    row.innerHTML = `
      <div style="display:flex; align-items:center; gap:6px;">
        <span style="width:7px; height:7px; border-radius:50%; background:${dotColor}; box-shadow:0 0 5px ${dotColor};"></span>
        <div style="text-align:left;">
          <div style="font-weight:bold; color:#fff; font-size:12px; cursor:pointer; text-decoration:underline dotted;" onclick="openTrophyRoom('${safeName}')" title="${d.friend_view_trophy}">${f.username}</div>
          <div style="font-size:9px; color:${f.status === "pending" ? "#f8b500" : dotColor};">${subText}</div>
        </div>
      </div>
      <div style="display:flex; gap:4px; align-items:center;">${actionsHtml}</div>`;
    return row;
  };
  if (currentFriendFilter === "requests") {
    if (incomingRequests.length === 0 && outgoingRequests.length === 0) { container.innerHTML = `<div style="${SOCIAL_STYLES.emptyList}">${d.friend_no_requests}</div>`; return; }
    if (incomingRequests.length > 0) { container.appendChild(makeLabel(d.friend_received)); incomingRequests.forEach(f => container.appendChild(renderCard(f))); }
    if (outgoingRequests.length > 0) { container.appendChild(makeLabel(d.friend_sent_label)); outgoingRequests.forEach(f => container.appendChild(renderCard(f))); }
    return;
  }
  const accepted = allFriends.filter(f => f.status === "accepted");
  if (accepted.length === 0) { container.innerHTML = `<div style="${SOCIAL_STYLES.emptyList}">${d.no_friends}</div>`; return; }
  accepted.forEach(f => container.appendChild(renderCard(f)));
});
socket.on("friend_error", (msg) => { showNotificationToast("❌ " + msg, "announcement"); });
socket.on("friend_success", (msg) => { showNotificationToast("✅ " + msg, "gift"); socket.emit("get_friends_list"); });
socket.on("friend_updated", () => { socket.emit("get_friends_list"); });

/* ----- SALONS ----- */
function openRoomsScreen() {
  if (!isProfileValid()) { checkAndShowProfileModal(); return; }
  hideAllScreens();
  sessionStorage.removeItem("cb_last_screen");
  window.history.replaceState({}, "", window.location.pathname);
  document.getElementById("screen-rooms").style.display = "flex";
  fetchRoomsList();
}
function fetchRoomsList() { socket.emit("get_rooms_list"); }
function openCreateRoomModal() {
  if (!isProfileValid()) { checkAndShowProfileModal(); return; }
  document.getElementById("custom-room-name").value = "";
  document.getElementById("custom-room-pass").value = "";
  document.getElementById("modal-create-room").style.display = "flex";
}
function closeCreateRoomModal() { document.getElementById("modal-create-room").style.display = "none"; }
function submitCreateRoom() {
  const d = i18n[currentLang];
  const code = document.getElementById("custom-room-name").value.trim().toUpperCase();
  const password = document.getElementById("custom-room-pass").value.trim();
  if (code !== "" && code.length < 2) { alert(d.rooms_name_short); return; }
  socket.emit("create_room", { code, password, username: myProfile.username, avatar: myProfile.avatar, flag: myProfile.flag });
  closeCreateRoomModal();
}
function openJoinCustomScreen(prefilledCode = "") {
  if (!isProfileValid()) { checkAndShowProfileModal(); return; }
  hideAllScreens();
  document.getElementById("screen-join-custom").style.display = "flex";
  document.getElementById("join-room-code-input").value = prefilledCode;
  document.getElementById("join-room-pass-input").value = "";
}
function submitJoinCustomRoom() {
  const d = i18n[currentLang];
  const roomCode = document.getElementById("join-room-code-input").value.trim().toUpperCase();
  const password = document.getElementById("join-room-pass-input").value.trim();
  if (!roomCode) { alert(d.rooms_invalid_code); return; }
  socket.emit("join_room", { code: roomCode, password });
}
function joinRoomFromList(code, hasPassword) { if (hasPassword) openJoinCustomScreen(code); else joinRoomDirect(code, ""); }
function joinRoomDirect(code, password) { socket.emit("join_room", { code: code.toUpperCase(), password }); }
function leaveCustomRoom() {
  socket.emit("leave_room");
  sessionStorage.removeItem("cb_last_screen");
  sessionStorage.removeItem("cb_pending_room");
  window.history.replaceState({}, "", window.location.pathname);
  openRoomsScreen();
}
function copyRoomLink() {
  const input = document.getElementById("room-share-link");
  input.select();
  navigator.clipboard.writeText(input.value).then(() => showNotificationToast("📋 " + i18n[currentLang].link_copied, "gift"));
}

// 📤 PARTAGE : natif si dispo, sinon MODALE (WhatsApp/SMS/Mail/Copier)
async function shareRoomLink() {
  const input = document.getElementById("room-share-link");
  const url = input.value;
  const d = i18n[currentLang];
  if (navigator.share) {
    try { await navigator.share({ title: "Chiffre Blitz ⚡", text: d.share_text, url: url }); return; }
    catch (e) { if (e && e.name === "AbortError") return; }
  }
  const eu = encodeURIComponent(url), et = encodeURIComponent(d.share_text);
  const old = document.getElementById("cb-share-modal"); if (old) old.remove();
  const m = document.createElement("div");
  m.id = "cb-share-modal"; m.className = "modal-overlay"; m.style.display = "flex"; m.style.zIndex = "10000";
  m.innerHTML = `<div class="modal-card" style="max-width:340px;text-align:center;">
    <h3 style="color:#00d2ff;margin:0 0 12px 0;">📤 Partager le salon</h3>
    <div style="display:flex;flex-direction:column;gap:8px;">
      <a href="https://wa.me/?text=${et}%20${eu}" target="_blank" class="btn-main btn-blue" style="text-decoration:none;">💬 WhatsApp</a>
      <a href="sms:?body=${et}%20${eu}" class="btn-main btn-blue" style="text-decoration:none;">💬 SMS</a>
      <a href="mailto:?subject=${encodeURIComponent("Chiffre Blitz")}&body=${et}%20${eu}" class="btn-main btn-blue" style="text-decoration:none;">📧 Email</a>
      <button class="btn-secondary" onclick="navigator.clipboard.writeText('${url}').then(()=>showNotificationToast('📋 Lien copié !','gift'));document.getElementById('cb-share-modal').remove();">📋 Copier le lien</button>
    </div>
    <button class="btn-secondary" onclick="document.getElementById('cb-share-modal').remove()" style="margin-top:10px;">❌ Fermer</button>
  </div>`;
  document.body.appendChild(m);
}

socket.on("rooms_list_data", (rooms) => {
  const d = i18n[currentLang];
  const listEl = document.getElementById("rooms-list");
  listEl.innerHTML = "";
  if (!rooms || rooms.length === 0) { listEl.innerHTML = `<div style="text-align:center; color:#aaa; margin-top:8px; font-size:11px;">${d.no_rooms}</div>`; return; }
  rooms.forEach(r => {
    const row = document.createElement("div");
    row.className = "room-row";
    const lockIcon = r.hasPassword ? " 🔒" : "";
    row.innerHTML = `<span class="room-info">${d.rooms_room} <b>${r.code}</b>${lockIcon} (${r.playersCount}/2)</span><button class="power-btn equip" onclick="joinRoomFromList('${r.code}', ${r.hasPassword})">${d.rooms_join}</button>`;
    listEl.appendChild(row);
  });
});
socket.on("rooms_list_changed", () => { if (document.getElementById("screen-rooms").style.display === "flex") fetchRoomsList(); });

socket.on("room_joined_success", (data) => {
  sessionStorage.setItem("cb_last_screen", "room");
  sessionStorage.setItem("cb_pending_room", data.code);
  hideAllScreens();
  document.getElementById("screen-room-waiting").style.display = "flex";
  document.getElementById("current-room-code").innerText = data.code;
  const shareUrl = `${window.location.origin}${window.location.pathname}?room=${data.code}`;
  window.history.replaceState({}, "", `?room=${data.code}`);
  document.getElementById("room-share-link").value = shareUrl;
  updateRoomPlayers(data.players);
});
socket.on("room_players_update", (data) => { updateRoomPlayers(data.players); });

function updateRoomPlayers(players) {
  const playersListEl = document.getElementById("room-players-list");
  if (!players || players.length === 0) { playersListEl.innerText = i18n[currentLang].waiting_opponent; return; }
  playersListEl.innerHTML = players.map(rawData => {
    const p = parsePlayer(rawData);
    const title = p.inventory && p.inventory.__equipped && p.inventory.__equipped.title;
    const titleHtml = title ? `<span style="font-size: 8px; color: #f8b500; margin-left: 3px;">[${getTitleDisplayNames()[title] || title}]</span>` : "";
    return `<div style="display:inline-flex; align-items:center; gap:4px;">${getAvatarBadgeHTML(p.flag, p.avatar, null, p)}<span>${p.username}</span>${titleHtml}</div>`;
  }).join(' <span style="color:#aaa; margin:0 4px;">vs</span> ');
  if (players && socket.id) {
    const opp = players.find(p => (p.socketId || p.id) !== socket.id);
    if (opp) cachedOpponent = parsePlayer(opp);
  }
}

// ❌ Erreur salon : si on revenait d'un lien, RECRÉE le salon disparu
socket.on("room_error", (msg) => {
  const pending = sessionStorage.getItem("cb_pending_room");
  if (pending) {
    sessionStorage.removeItem("cb_pending_room");
    socket.emit("create_room", { code: pending, password: "", username: myProfile.username, avatar: myProfile.avatar, flag: myProfile.flag });
    return;
  }
  showNotificationToast("❌ " + msg, "announcement");
});

/* ----- REPRISE AUTO DU SALON DEPUIS L'URL (?room=CODE) ----- */
(function initRoomFromURL() {
  const params = new URLSearchParams(window.location.search);
  const roomCode = (params.get("room") || "").trim().toUpperCase();
  if (!roomCode) return;
  sessionStorage.removeItem("cb_last_screen");
  sessionStorage.setItem("cb_pending_room", roomCode);
  const joinWhenReady = () => {
    const pending = sessionStorage.getItem("cb_pending_room");
    if (!pending) return;
    setTimeout(() => {
      if (sessionStorage.getItem("cb_pending_room") === pending) {
        sessionStorage.removeItem("cb_pending_room");
        joinRoomDirect(pending, "");
      }
    }, 800);
  };
  if (typeof isProfileValid === "function" && isProfileValid()) joinWhenReady();
  else socket.on("player_registered", joinWhenReady);
})();

/* ----- TOURNOIS ----- */
function openTournamentScreen() {
  if (!isProfileValid()) { checkAndShowProfileModal(); return; }
  hideAllScreens();
  document.getElementById("screen-tournament").style.display = "flex";
}
