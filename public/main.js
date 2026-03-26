import PocketBase from "https://cdn.jsdelivr.net/npm/pocketbase@0.21.3/dist/pocketbase.es.mjs";
const pb = new PocketBase("https://pb.mohitchdev.me");
pb.autoCancellation(false);

pb.collection("users").authRefresh().catch(() => {});
// ---------------- STATE ----------------
let currentRoom = null; // room id
let currentRoomName = null;
let currentDM = null; // chat id
let currentRoomRole = null; // owner/moderator/member/guest
let typingTimeout = null;
let roomsSubActive = false;
let guestEmail = null;
let guestPassword = null;

// ---------------- DOM ----------------
const loginScreen = document.getElementById("login-screen");
const appScreen = document.getElementById("app-screen");
const sidebar = document.getElementById("sidebar");
const collapseBtn = document.getElementById("collapseBtn");
const sidebarToggle = document.getElementById("sidebarToggle");
const roomListEl = document.getElementById("room-list");
const dmListEl = document.getElementById("dm-list");
const dmsSection = document.getElementById("dms-section");

const msgDiv = document.getElementById("messages");
const roomRulesEl = document.getElementById("room-rules");
const googleBtn = document.getElementById("googleLoginBtn");
const anonBtn = document.getElementById("anonLoginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userNameEl = document.getElementById("userName");
const userPhotoEl = document.getElementById("userPhoto");
const userStatusEl = document.getElementById("userStatus");
const chatHeaderEl = document.getElementById("chat-header");
const typingIndicatorEl = document.getElementById("typingIndicator");

const messageInput = document.getElementById("messageInput");

const sendBtn = document.getElementById("sendBtn");
const attachBtn = document.getElementById("attachBtn");
const createRoomBtnHeader = document.getElementById("createRoomBtnHeader");
const settingsBtn = document.getElementById("settingsBtn");

const modal = document.getElementById("modal");
const modalCreateBtn = document.getElementById("modalCreateBtn");
const modalCancelBtn = document.getElementById("modalCancelBtn");
const roomNameInput = document.getElementById("roomNameInput");
const roomRulesInput = document.getElementById("roomRulesInput");

// Admin slide-in panel
const adminPanel = document.getElementById("admin-panel");
const adminCloseBtn = document.getElementById("adminCloseBtn");
const adminRoomTitle = document.getElementById("adminRoomTitle");
const adminInfoEl = document.getElementById("admin-info");
const requestListEl = document.getElementById("request-list");
const memberListEl = document.getElementById("member-list");
const deleteRoomBtn = document.getElementById("deleteRoomBtn");
const imageInput = document.getElementById("imageUpload");

const attachmentPreview = document.getElementById("attachmentPreview");

// ---------------- UTIL ----------------
function esc(v) {
  return String(v || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function nowNum() {
  return Date.now();
}

function currentUser() {
  return pb.authStore.isValid ? pb.authStore.model : null;
}

function isGuestUser(user) {
  return Boolean(user && user.email && user.email.endsWith("@youngwave.temp"));
}

function displayNameOf(user) {
  return user?.name || "Guest";
}

function photoOf(user) {
  return user?.avatarUrl || "assets/default.png";
}

function getDMChatId(uid1, uid2) {
  return uid1 < uid2 ? `${uid1}__${uid2}` : `${uid2}__${uid1}`;
}

function formatCreated(record) {
  if (!record?.created) return "";
  return new Date(record.created).toLocaleTimeString();
}

function renderRules(rawRules) {
  const rules = rawRules || "";
  if (!rules.trim()) {
    roomRulesEl.innerHTML = "";
    roomRulesEl.classList.add("hidden");
    return;
  }
  const parts = rules
    .split(/[\n\.]/)
    .map((r) => r.trim())
    .filter((r) => r.length > 0);

  roomRulesEl.innerHTML = `
    <div class="rules-box">
      <ol>
        ${parts.map((p) => `<li>${p}</li>`).join("")}
      </ol>
    </div>
  `;
  roomRulesEl.classList.remove("hidden");
}

function createVideoElements() {
  let videoInput = document.getElementById("videoUpload");
  if (!videoInput && imageInput?.parentElement) {
    videoInput = document.createElement("input");
    videoInput.id = "videoUpload";
    videoInput.type = "file";
    videoInput.accept = "video/mp4,video/webm,video/ogg";
    videoInput.className = "file-input";
    imageInput.parentElement.appendChild(videoInput);
  }

  let videoBtn = document.getElementById("videoBtn");
  if (!videoBtn && attachBtn?.parentElement) {
    videoBtn = document.createElement("button");
    videoBtn.id = "videoBtn";
    videoBtn.type = "button";
    videoBtn.className = attachBtn.className;
    videoBtn.textContent = "🎥";
    attachBtn.insertAdjacentElement("afterend", videoBtn);
  }

  return { videoInput, videoBtn };
}

const { videoInput, videoBtn } = createVideoElements();

// ---------------- SUBS CLEANUP ----------------
function clearSubs() {
  pb.collection("messages").unsubscribe("*");
  pb.collection("typing").unsubscribe("*");
  pb.collection("members").unsubscribe("*");
  pb.collection("join_requests").unsubscribe("*");
  pb.collection("dm_messages").unsubscribe("*");

  stopTyping();
  if (adminPanel) adminPanel.classList.remove("open");
  currentRoomRole = null;
}

// ---------------- SIDEBAR / TOGGLES ----------------
if (collapseBtn && sidebar) {
  collapseBtn.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
    collapseBtn.textContent = sidebar.classList.contains("collapsed")
      ? "⟩"
      : "⟨";
  });
}

if (sidebarToggle && sidebar) {
  sidebarToggle.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
  });
}

if (adminCloseBtn && adminPanel) {
  adminCloseBtn.addEventListener("click", () => {
    adminPanel.classList.remove("open");
  });
}

// ---------------- AUTH BUTTONS ----------------
if (googleBtn) {
  googleBtn.onclick = async () => {
    try {
      const authData = await pb.collection("users").authWithOAuth2({ provider: "google" });
      console.log("OAuth result:", authData);
      console.log("Auth valid:", pb.authStore.isValid);
      console.log("Auth model:", pb.authStore.model);
      if (authData) window.location.reload();
    } catch (e) {
      console.error(e);
      alert("Google login failed.");
    }
  };
}

if (anonBtn) {
  anonBtn.onclick = async () => {
    try {
      guestEmail = `guest_${Date.now()}@youngwave.temp`;
      guestPassword = `${Math.random().toString(36).slice(2)}Aa1!`;

      await pb.collection("users").create({
        email: guestEmail,
        password: guestPassword,
        passwordConfirm: guestPassword,
        name: "Guest",
      });

      await pb.collection("users").authWithPassword(guestEmail, guestPassword);
    } catch (e) {
      console.error(e);
      alert("Guest login failed.");
    }
  };
}

if (attachBtn && imageInput) {
  attachBtn.onclick = () => imageInput.click();
}

if (videoBtn && videoInput) {
  videoBtn.onclick = () => videoInput.click();
}

// ---------------- REACTIONS ----------------
const REACTIONS = [
  { key: "like", icon: "👍" },
  { key: "love", icon: "❤️" },
  { key: "laugh", icon: "😂" },
  { key: "wow", icon: "😮" },
  { key: "angry", icon: "😡" },
  { key: "sad", icon: "😭" },
  { key: "pray", icon: "🙏" },
  { key: "fire", icon: "🔥" },
  { key: "skull", icon: "💀" },
];

function buildReactionsUI(kind, msgId, data, container) {
  const bar = document.createElement("div");
  bar.className = "reaction-bar";

  const reactions = data.reactions || {};

  REACTIONS.forEach((r) => {
    const btn = document.createElement("button");
    btn.className = "reaction-btn";
    btn.textContent = r.icon;
    btn.onclick = () => toggleReaction(kind, msgId, r.key);
    bar.appendChild(btn);

    const list = reactions[r.key] || [];
    if (list.length > 0) {
      const span = document.createElement("span");
      span.className = "reaction-count";
      span.textContent = ` ${list.length}`;
      bar.appendChild(span);
    }
  });

  container.appendChild(bar);
}

async function toggleReaction(kind, msgId, type) {
  const user = currentUser();
  if (!user) return;

  const coll = kind === "room" ? "messages" : "dm_messages";

  try {
    const record = await pb.collection(coll).getOne(msgId);
    const reactions = record.reactions || {};
    const list = reactions[type] || [];
    if (list.includes(user.id)) {
      reactions[type] = list.filter((id) => id !== user.id);
    } else {
      reactions[type] = [...list, user.id];
    }
    await pb.collection(coll).update(msgId, { reactions });
  } catch (e) {
    console.error("reaction update failed:", e);
  }
}

// ---------------- ROOM HELPERS ----------------
async function getRoomByName(roomName) {
  const records = await pb
    .collection("rooms")
    .getFullList({ filter: `name = "${esc(roomName)}"`, sort: "created" });
  return records[0];
}

async function getMemberRecord(roomId, userId) {
  const records = await pb.collection("members").getFullList({
    filter: `room_id = "${esc(roomId)}" && user_id = "${esc(userId)}"`,
  });
  return records[0];
}

async function upsertMember(roomId, userId, displayName, role) {
  const existing = await pb.collection("members").getFullList({
    filter: `room_id = "${esc(roomId)}" && user_id = "${esc(userId)}"`,
  });
  if (existing.length > 0) {
    await pb.collection("members").update(existing[0].id, {
      role,
      display_name: displayName,
    });
    return existing[0];
  }

  return pb.collection("members").create({
    room_id: roomId,
    user_id: userId,
    display_name: displayName,
    role,
    banned: false,
  });
}

// ---------------- ROOMS LIST ----------------
async function loadRoomsList() {
  if (!roomListEl) return;
  try {
    const rooms = await pb.collection("rooms").getFullList({ sort: "created" });
    roomListEl.innerHTML = "";

    rooms.forEach((room) => {
      const li = document.createElement("li");
      li.className = "room-row";
      li.textContent = room.name;
      li.style.cursor = "pointer";
      li.onclick = () => onRoomClick(room.name);
      roomListEl.appendChild(li);
    });
  } catch (e) {
    console.error("loadRoomsList error:", e);
  }
}

function ensureRoomsSubscription() {
  if (roomsSubActive) return;
  roomsSubActive = true;
  pb.collection("rooms").subscribe("*", () => {
    loadRoomsList();
  });
}

// ---------------- ROOM CLICK / JOIN FLOW ----------------
async function onRoomClick(roomName) {
  const user = currentUser();
  if (!user) {
    alert("Log in to open rooms.");
    return;
  }

  try {
    const roomData = await getRoomByName(roomName);
    if (!roomData) {
      alert("Room not found.");
      return;
    }

    const memberData = await getMemberRecord(roomData.id, user.id);
    if (memberData?.banned) {
      alert("You are banned from this room.");
      return;
    }

    if (isGuestUser(user)) {
      if (memberData) {
        await loadRoom(roomData.name);
      } else {
        const ok = confirm(`Request to join "${roomData.name}" as a guest?`);
        if (!ok) return;

        await pb.collection("join_requests").create({
          room_id: roomData.id,
          user_id: user.id,
          display_name: "Guest",
        });

        alert("Join request sent. You'll auto-enter when approved.");

        pb.collection("members").subscribe("*", async (e) => {
          if (
            e.record.room_id === roomData.id &&
            e.record.user_id === user.id &&
            !e.record.banned
          ) {
            await loadRoom(roomData.name);
          }
        });
      }
      return;
    }

    await loadRoom(roomData.name);
  } catch (e) {
    console.error("onRoomClick error:", e);
    alert("Failed to open room.");
  }
}

// ---------------- CREATE ROOM ----------------
if (createRoomBtnHeader) {
  createRoomBtnHeader.addEventListener("click", () => {
    const user = currentUser();
    if (!user || isGuestUser(user)) {
      alert("Only logged-in members can create rooms.");
      return;
    }
    modal.classList.remove("hidden");
    roomNameInput.value = "";
    roomRulesInput.value = "";
  });
}

if (modalCancelBtn) {
  modalCancelBtn.addEventListener("click", () => modal.classList.add("hidden"));
}

if (modalCreateBtn) {
  modalCreateBtn.addEventListener("click", async () => {
    const user = currentUser();
    if (!user || isGuestUser(user)) {
      alert("Only logged-in members can create rooms.");
      return;
    }

    const name = roomNameInput.value.trim();
    const rules = roomRulesInput.value.trim();
    if (!name) {
      alert("Room name required.");
      return;
    }

    try {
      const existing = await getRoomByName(name);
      if (existing) {
        alert("Room already exists.");
        return;
      }

      const room = await pb.collection("rooms").create({
        name,
        rules: rules || "",
        created_by: user.id,
      });

      await upsertMember(room.id, user.id, displayNameOf(user), "owner");
      modal.classList.add("hidden");
      await loadRoomsList();
    } catch (e) {
      console.error("create room failed:", e);
      alert("Failed to create room.");
    }
  });
}

// ---------------- ADMIN PANEL ----------------
async function renderJoinRequests(roomId) {
  requestListEl.innerHTML = "";
  const requests = await pb.collection("join_requests").getFullList({
    filter: `room_id = "${esc(roomId)}"`,
    sort: "created",
  });

  requests.forEach((reqRecord) => {
    const li = document.createElement("li");
    li.className = "request-item";

    const nameDiv = document.createElement("div");
    nameDiv.className = "request-name";
    nameDiv.textContent = reqRecord.display_name || "Guest";

    const actions = document.createElement("div");
    actions.className = "request-actions";

    const approve = document.createElement("button");
    approve.className = "approve";
    approve.textContent = "Approve";
    approve.onclick = async () => {
      await upsertMember(
        roomId,
        reqRecord.user_id,
        reqRecord.display_name || "Guest",
        "guest"
      );
      await pb.collection("join_requests").delete(reqRecord.id);
    };

    const reject = document.createElement("button");
    reject.className = "reject";
    reject.textContent = "Reject";
    reject.onclick = async () => {
      await pb.collection("join_requests").delete(reqRecord.id);
    };

    actions.appendChild(approve);
    actions.appendChild(reject);
    li.appendChild(nameDiv);
    li.appendChild(actions);
    requestListEl.appendChild(li);
  });
}

async function renderMembers(roomId) {
  memberListEl.innerHTML = "";
  const members = await pb.collection("members").getFullList({
    filter: `room_id = "${esc(roomId)}"`,
    sort: "created",
  });

  const me = currentUser();

  members.forEach((m) => {
    const uid = m.user_id;
    const li = document.createElement("li");
    li.className = "member-item";

    const left = document.createElement("div");
    left.className = "member-name";
    left.textContent = m.display_name || "Member";

    const roleSpan = document.createElement("span");
    roleSpan.className = "member-role";
    roleSpan.textContent = m.role;
    left.appendChild(roleSpan);

    const right = document.createElement("div");
    right.className = "member-actions";

    const isSelf = me && uid === me.id;

    if (!isSelf) {
      if (currentRoomRole === "owner") {
        const promote = document.createElement("button");
        promote.className = "promote";
        if (m.role === "moderator") {
          promote.textContent = "Remove mod";
          promote.onclick = async () => {
            await pb.collection("members").update(m.id, { role: "member" });
          };
        } else {
          promote.textContent = "Make mod";
          promote.onclick = async () => {
            await pb.collection("members").update(m.id, { role: "moderator" });
          };
        }
        right.appendChild(promote);
      }

      const kick = document.createElement("button");
      kick.className = "kick";
      kick.textContent = "Kick";
      kick.onclick = async () => {
        await pb.collection("members").delete(m.id);
      };
      right.appendChild(kick);

      const ban = document.createElement("button");
      ban.className = "ban";
      ban.textContent = "Ban";
      ban.onclick = async () => {
        await pb.collection("members").update(m.id, { banned: true });
      };
      right.appendChild(ban);
    }

    li.appendChild(left);
    li.appendChild(right);
    memberListEl.appendChild(li);
  });
}

function setupAdminPanel(roomId, roomName) {
  const user = currentUser();
  if (
    !user ||
    !currentRoomRole ||
    (currentRoomRole !== "owner" && currentRoomRole !== "moderator")
  ) {
    adminPanel.classList.remove("open");
    memberListEl.innerHTML = "";
    requestListEl.innerHTML = "";
    return;
  }

  adminRoomTitle.textContent = `Settings – ${roomName}`;
  adminInfoEl.textContent = `You are ${currentRoomRole.toUpperCase()} of this room.`;

  renderJoinRequests(roomId);
  renderMembers(roomId);

  pb.collection("join_requests").subscribe("*", (e) => {
    if (e.record.room_id === roomId) renderJoinRequests(roomId);
  });

  pb.collection("members").subscribe("*", (e) => {
    if (e.record.room_id === roomId) renderMembers(roomId);
  });

  deleteRoomBtn.style.display = currentRoomRole === "owner" ? "block" : "none";
  deleteRoomBtn.onclick = async () => {
    const sure = confirm(`Delete room "${roomName}" and all its messages?`);
    if (!sure) return;

    try {
      const msgs = await pb.collection("messages").getFullList({
        filter: `room_id = "${esc(roomId)}"`,
      });
      await Promise.all(msgs.map((m) => pb.collection("messages").delete(m.id)));

      const mems = await pb.collection("members").getFullList({
        filter: `room_id = "${esc(roomId)}"`,
      });
      await Promise.all(mems.map((m) => pb.collection("members").delete(m.id)));

      const reqs = await pb.collection("join_requests").getFullList({
        filter: `room_id = "${esc(roomId)}"`,
      });
      await Promise.all(reqs.map((r) => pb.collection("join_requests").delete(r.id)));

      const tps = await pb.collection("typing").getFullList({
        filter: `room_id = "${esc(roomId)}"`,
      });
      await Promise.all(tps.map((t) => pb.collection("typing").delete(t.id)));

      await pb.collection("rooms").delete(roomId);

      clearSubs();
      currentRoom = null;
      currentRoomName = null;
      chatHeaderEl.textContent = "Select a room";
      msgDiv.innerHTML = "";
      roomRulesEl.textContent = "";
      roomRulesEl.classList.add("hidden");
    } catch (e) {
      console.error("delete room failed:", e);
      alert("Failed to delete room.");
    }
  };
}

if (settingsBtn) {
  settingsBtn.addEventListener("click", async () => {
    if (!currentRoom) return alert("Select a room first.");
    const user = currentUser();
    if (!user) return alert("Login first.");
    if (currentRoomRole !== "owner" && currentRoomRole !== "moderator") {
      return alert("Only owners/moderators can open room settings.");
    }

    setupAdminPanel(currentRoom, currentRoomName || "Room");
    adminPanel.classList.add("open");
  });
}

// ---------------- LOAD ROOM ----------------
async function loadRoom(roomName) {
  clearSubs();

  const roomData = await getRoomByName(roomName);
  if (!roomData) {
    alert("Room not found.");
    return;
  }

  currentRoom = roomData.id;
  currentRoomName = roomData.name;
  currentDM = null;
  chatHeaderEl.textContent = roomData.name;
  msgDiv.innerHTML = "";

  renderRules(roomData.rules || "");

  const user = currentUser();
  currentRoomRole = null;

  if (user) {
    const memberData = await getMemberRecord(roomData.id, user.id);

    let roleToSet;
    if (memberData) {
      if (roomData.created_by && user.id === roomData.created_by) {
        roleToSet = "owner";
      } else if (memberData.role) {
        roleToSet = memberData.role;
      } else {
        roleToSet = roomData.created_by === user.id ? "owner" : "member";
      }
    } else {
      roleToSet = roomData.created_by === user.id ? "owner" : "member";
    }

    currentRoomRole = roleToSet;
    await upsertMember(roomData.id, user.id, displayNameOf(user), roleToSet);
  }

  await reloadAndRenderMessages();

  pb.collection("messages").subscribe("*", (e) => {
    if (e.record.room_id === currentRoom) {
      reloadAndRenderMessages();
    }
  });

  pb.collection("typing").subscribe("*", (e) => {
    if (e.record.room_id === currentRoom) {
      updateTypingIndicator();
    }
  });

  updateTypingIndicator();
}

async function reloadAndRenderMessages() {
  if (!currentRoom) return;
  const records = await pb.collection("messages").getFullList({
    filter: `room_id = "${esc(currentRoom)}"`,
    sort: "created",
  });
  renderRoomMessages(records);
}

function renderRoomMessages(records) {
  msgDiv.innerHTML = "";
  const me = currentUser();

  records.forEach((data) => {
    const msg = document.createElement("div");
    msg.className = "message";

    const isSelf = me && data.user_id === me.id;
    if (isSelf) msg.classList.add("right");

    if (data.deleted) {
      const tomb = document.createElement("div");
      tomb.className = "deleted-label";
      tomb.textContent =
        data.deleted_by_role === "admin"
          ? "This message was deleted by an admin."
          : "This message was deleted.";
      msg.appendChild(tomb);
      msgDiv.appendChild(msg);
      return;
    }

    const header = document.createElement("div");
    header.className = "message-header";

    const avatar = document.createElement("img");
    avatar.className = "msg-photo";
    avatar.src = data.user_photo || "assets/default.png";

    const nameSpan = document.createElement("span");
    nameSpan.className = "msg-name";
    nameSpan.textContent = data.user_name || "Guest";

    const timeSpan = document.createElement("span");
    timeSpan.className = "msg-time";
    timeSpan.textContent = formatCreated(data);

    header.appendChild(avatar);
    header.appendChild(nameSpan);
    header.appendChild(timeSpan);

    const textDiv = document.createElement("div");
    textDiv.className = "text";
    textDiv.textContent = `${data.text || ""}${data.edited ? " (edited)" : ""}`;

    msg.appendChild(header);
    msg.appendChild(textDiv);

    if (Array.isArray(data.image) && data.image.length > 0) {
      data.image.forEach((imgName) => {
        const img = document.createElement("img");
        img.className = "msg-image";
        img.src = pb.files.getUrl(data, imgName);
        msg.appendChild(img);
      });
    }

    if (data.video) {
      const video = document.createElement("video");
      video.src = pb.files.getUrl(data, data.video);
      video.controls = true;
      video.className = "msg-video";
      video.style.maxWidth = "280px";
      video.style.borderRadius = "10px";
      video.style.marginTop = "6px";
      msg.appendChild(video);
    }

    if (nameSpan && data.user_id && me && !isGuestUser(me) && data.user_id !== me.id) {
      nameSpan.onclick = () => openDirectMessage(data.user_id, data.user_name || "User");
    }

    const canEdit = isSelf;
    const senderRole = data.role || "member";
    let canDelete = false;

    if (isSelf) {
      canDelete = true;
    } else if (currentRoomRole === "owner") {
      canDelete = true;
    } else if (currentRoomRole === "moderator") {
      if (senderRole === "member" || senderRole === "guest") {
        canDelete = true;
      }
    }

    if (canEdit) {
      const editBtn = document.createElement("button");
      editBtn.className = "edit-btn";
      editBtn.textContent = "Edit";
      editBtn.onclick = () => inlineEditMessageRoom(data.id, textDiv, data.text || "");
      msg.appendChild(editBtn);
    }

    if (canDelete) {
      const del = document.createElement("button");
      del.className = "delete-btn";
      del.textContent = "Delete";
      del.onclick = () => softDeleteRoomMessage(data.id, !isSelf);
      msg.appendChild(del);
    }

    buildReactionsUI("room", data.id, data, msg);
    msgDiv.appendChild(msg);
  });

  msgDiv.scrollTop = msgDiv.scrollHeight;
}

// ---------------- INLINE EDIT & DELETE (ROOM) ----------------
async function inlineEditMessageRoom(msgId, textDiv, oldText) {
  const existing = textDiv.querySelector("textarea");
  if (existing) return;

  const original = oldText || "";

  textDiv.textContent = "";
  const textarea = document.createElement("textarea");
  textarea.value = original;
  textarea.style.width = "100%";
  textarea.style.minHeight = "40px";
  textarea.style.resize = "vertical";
  textarea.style.borderRadius = "8px";
  textarea.style.border = "1px solid rgba(255,255,255,0.15)";
  textarea.style.background = "rgba(0,0,0,0.5)";
  textarea.style.color = "white";
  textarea.style.padding = "4px 6px";

  const actions = document.createElement("div");
  actions.style.marginTop = "4px";
  actions.style.display = "flex";
  actions.style.gap = "6px";

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save";
  saveBtn.style.fontSize = "11px";
  saveBtn.onclick = async () => {
    const newText = textarea.value.trim();
    if (!newText) {
      textDiv.textContent = original;
      return;
    }
    await pb.collection("messages").update(msgId, { text: newText, edited: true });
  };

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.style.fontSize = "11px";
  cancelBtn.onclick = () => {
    textDiv.textContent = original;
  };

  actions.appendChild(saveBtn);
  actions.appendChild(cancelBtn);
  textDiv.appendChild(textarea);
  textDiv.appendChild(actions);
}

async function softDeleteRoomMessage(msgId, byAdmin) {
  await pb.collection("messages").update(msgId, {
    deleted: true,
    deleted_by_role: byAdmin ? "admin" : "",
    text: "",
    reactions: {},
  });
}

// ---------------- DIRECT MESSAGES ----------------
function registerDM(otherUid, otherName) {
  const user = currentUser();
  if (!user || !dmListEl) return;
  const chatId = getDMChatId(user.id, otherUid);

  const existing = dmListEl.querySelector(`[data-chatid="${chatId}"]`);
  if (existing) return;

  const li = document.createElement("li");
  li.dataset.chatid = chatId;
  li.textContent = otherName;
  li.onclick = () => openDirectMessage(otherUid, otherName);
  dmListEl.appendChild(li);

  if (dmsSection) dmsSection.style.display = "block";
}

async function openDirectMessage(otherUid, otherName) {
  const user = currentUser();
  if (!user || isGuestUser(user)) {
    alert("Please login with Google to use private messages.");
    return;
  }

  clearSubs();

  const chatId = getDMChatId(user.id, otherUid);
  registerDM(otherUid, otherName);

  currentRoom = null;
  currentRoomName = null;
  currentDM = chatId;
  chatHeaderEl.textContent = `DM with ${otherName}`;
  roomRulesEl.classList.add("hidden");
  msgDiv.innerHTML = "";

  await reloadAndRenderDM();

  pb.collection("dm_messages").subscribe("*", (e) => {
    if (e.record.chat_id === currentDM) {
      reloadAndRenderDM();
    }
  });
}

async function reloadAndRenderDM() {
  if (!currentDM) return;
  const records = await pb.collection("dm_messages").getFullList({
    filter: `chat_id = "${esc(currentDM)}"`,
    sort: "created",
  });
  renderDM(records);
}

function renderDM(records) {
  msgDiv.innerHTML = "";
  const me = currentUser();

  records.forEach((data) => {
    const msg = document.createElement("div");
    msg.className = "message";

    const isSelf = me && data.user_id === me.id;
    if (isSelf) msg.classList.add("right");

    if (data.deleted) {
      const tomb = document.createElement("div");
      tomb.className = "deleted-label";
      tomb.textContent = "This message was deleted.";
      msg.appendChild(tomb);
      msgDiv.appendChild(msg);
      return;
    }

    const header = document.createElement("div");
    header.className = "message-header";

    const avatar = document.createElement("img");
    avatar.className = "msg-photo";
    avatar.src = data.user_photo || "assets/default.png";

    const nameSpan = document.createElement("span");
    nameSpan.className = "msg-name";
    nameSpan.textContent = data.user_name || "Guest";

    const timeSpan = document.createElement("span");
    timeSpan.className = "msg-time";
    timeSpan.textContent = formatCreated(data);

    header.appendChild(avatar);
    header.appendChild(nameSpan);
    header.appendChild(timeSpan);

    const textDiv = document.createElement("div");
    textDiv.className = "text";
    textDiv.textContent = `${data.text || ""}${data.edited ? " (edited)" : ""}`;

    msg.appendChild(header);
    msg.appendChild(textDiv);

    if (Array.isArray(data.image) && data.image.length > 0) {
      data.image.forEach((imgName) => {
        const img = document.createElement("img");
        img.className = "msg-image";
        img.src = pb.files.getUrl(data, imgName);
        msg.appendChild(img);
      });
    }

    if (data.video) {
      const video = document.createElement("video");
      video.src = pb.files.getUrl(data, data.video);
      video.controls = true;
      video.className = "msg-video";
      video.style.maxWidth = "280px";
      video.style.borderRadius = "10px";
      video.style.marginTop = "6px";
      msg.appendChild(video);
    }

    if (isSelf) {
      const editBtn = document.createElement("button");
      editBtn.className = "edit-btn";
      editBtn.textContent = "Edit";
      editBtn.onclick = () => inlineEditDMMessage(data.id, textDiv, data.text || "");
      msg.appendChild(editBtn);

      const delBtn = document.createElement("button");
      delBtn.className = "delete-btn";
      delBtn.textContent = "Delete";
      delBtn.onclick = () => softDeleteDMMessage(data.id);
      msg.appendChild(delBtn);
    }

    buildReactionsUI("dm", data.id, data, msg);
    msgDiv.appendChild(msg);
  });

  msgDiv.scrollTop = msgDiv.scrollHeight;
}

async function inlineEditDMMessage(msgId, textDiv, oldText) {
  const existing = textDiv.querySelector("textarea");
  if (existing) return;

  const original = oldText || "";

  textDiv.textContent = "";
  const textarea = document.createElement("textarea");
  textarea.value = original;
  textarea.style.width = "100%";
  textarea.style.minHeight = "40px";
  textarea.style.resize = "vertical";
  textarea.style.borderRadius = "8px";
  textarea.style.border = "1px solid rgba(255,255,255,0.15)";
  textarea.style.background = "rgba(0,0,0,0.5)";
  textarea.style.color = "white";
  textarea.style.padding = "4px 6px";

  const actions = document.createElement("div");
  actions.style.marginTop = "4px";
  actions.style.display = "flex";
  actions.style.gap = "6px";

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save";
  saveBtn.style.fontSize = "11px";
  saveBtn.onclick = async () => {
    const newText = textarea.value.trim();
    if (!newText) {
      textDiv.textContent = original;
      return;
    }
    await pb.collection("dm_messages").update(msgId, {
      text: newText,
      edited: true,
    });
  };

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.style.fontSize = "11px";
  cancelBtn.onclick = () => {
    textDiv.textContent = original;
  };

  actions.appendChild(saveBtn);
  actions.appendChild(cancelBtn);
  textDiv.appendChild(textarea);
  textDiv.appendChild(actions);
}

async function softDeleteDMMessage(msgId) {
  await pb.collection("dm_messages").update(msgId, {
    deleted: true,
    text: "",
    reactions: {},
  });
}

// ---------------- SEND MESSAGE + UPLOAD ----------------
if (sendBtn) {
  sendBtn.onclick = async () => {
    const imgFile = imageInput?.files?.[0] || null;
    const vidFile = videoInput?.files?.[0] || null;
    const text = messageInput.value.trim();

    if (!currentRoom && !currentDM) {
      alert("Select a room or DM first.");
      return;
    }

    const user = currentUser();
    if (!user) return;
    if (!text && !imgFile && !vidFile) return;

    try {
      if (currentRoom) {
        const formData = new FormData();
        formData.append("room_id", currentRoom);
        formData.append("text", text);
        formData.append("user_name", displayNameOf(user));
        formData.append("user_id", user.id);
        formData.append("user_photo", user.avatarUrl || "");
        formData.append("role", currentRoomRole || "member");
        formData.append("deleted", "false");
        formData.append("edited", "false");
        formData.append("reactions", "{}");

        if (imgFile) formData.append("image", imgFile);
        if (vidFile) formData.append("video", vidFile);

        await pb.collection("messages").create(formData);
      } else if (currentDM) {
        const formData = new FormData();
        formData.append("chat_id", currentDM);
        formData.append("text", text);
        formData.append("user_name", displayNameOf(user));
        formData.append("user_id", user.id);
        formData.append("user_photo", user.avatarUrl || "");
        formData.append("deleted", "false");
        formData.append("edited", "false");
        formData.append("reactions", "{}");

        if (imgFile) formData.append("image", imgFile);
        if (vidFile) formData.append("video", vidFile);

        await pb.collection("dm_messages").create(formData);
      }

      attachmentPreview.innerHTML = "";
      attachmentPreview.classList.add("hidden");
      messageInput.value = "";
      if (imageInput) imageInput.value = "";
      if (videoInput) videoInput.value = "";
    } catch (e) {
      console.error("send failed:", e);
      alert("Failed to send message.");
    }
  };
}

// ---------------- TYPING ----------------
if (messageInput) {
  messageInput.addEventListener("input", () => {
    if (currentRoom) markTyping();
  });
  messageInput.addEventListener("blur", stopTyping);
}

async function markTyping() {
  if (!currentRoom) return;
  const user = currentUser();
  if (!user) return;

  try {
    const existing = await pb.collection("typing").getFullList({
      filter: `room_id = "${esc(currentRoom)}" && user_id = "${esc(user.id)}"`,
    });

    if (existing.length > 0) {
      await pb.collection("typing").update(existing[0].id, {
        user_name: displayNameOf(user),
      });
    } else {
      await pb.collection("typing").create({
        room_id: currentRoom,
        user_id: user.id,
        user_name: displayNameOf(user),
      });
    }
  } catch (e) {
    console.warn("typing set error:", e);
  }

  if (typingTimeout) clearTimeout(typingTimeout);
  typingTimeout = setTimeout(stopTyping, 3000);
}

async function stopTyping() {
  typingTimeout = null;
  if (!currentRoom) return;
  const user = currentUser();
  if (!user) return;

  try {
    const existing = await pb.collection("typing").getFullList({
      filter: `room_id = "${esc(currentRoom)}" && user_id = "${esc(user.id)}"`,
    });
    if (existing.length > 0) {
      await pb.collection("typing").delete(existing[0].id);
    }
  } catch (_) {
    // ignore
  }
}

async function updateTypingIndicator() {
  if (!currentRoom) {
    typingIndicatorEl.textContent = "";
    return;
  }

  const user = currentUser();
  const records = await pb.collection("typing").getFullList({
    filter: `room_id = "${esc(currentRoom)}"`,
  });

  const typingUsers = records
    .filter((r) => !user || r.user_id !== user.id)
    .map((r) => r.user_name || "Someone");

  if (typingUsers.length === 0) {
    typingIndicatorEl.textContent = "";
  } else if (typingUsers.length === 1) {
    typingIndicatorEl.textContent = `${typingUsers[0]} is typing...`;
  } else {
    typingIndicatorEl.textContent = `${typingUsers[0]} and ${typingUsers.length - 1} others are typing...`;
  }
}

// ---------------- ATTACHMENT PREVIEW ----------------
if (imageInput) {
  imageInput.addEventListener("change", () => {
    const file = imageInput.files[0];
    if (!file) {
      attachmentPreview.classList.add("hidden");
      attachmentPreview.innerHTML = "";
      return;
    }

    attachmentPreview.classList.remove("hidden");
    attachmentPreview.innerHTML = `<div>📎 Attached: ${file.name}</div>`;

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        attachmentPreview.innerHTML += `<img src="${e.target.result}" />`;
      };
      reader.readAsDataURL(file);
    }
  });
}

if (videoInput) {
  videoInput.addEventListener("change", () => {
    const file = videoInput.files[0];
    if (!file) return;
    attachmentPreview.classList.remove("hidden");
    const previous = attachmentPreview.innerHTML || "";
    attachmentPreview.innerHTML = `${previous}<div>🎥 Attached: ${file.name}</div>`;
  });
}

attachmentPreview.classList.add("hidden");
attachmentPreview.innerHTML = "";

// ---------------- LOGOUT ----------------
if (logoutBtn) {
  logoutBtn.onclick = async () => {
    const user = currentUser();

    try {
      if (user && isGuestUser(user)) {
        await pb.collection("users").delete(user.id);
      }
    } catch (e) {
      console.warn("Guest cleanup failed:", e);
    }

    pb.authStore.clear();
    guestEmail = null;
    guestPassword = null;
  };
}

// ---------------- AUTH STORE WATCH ----------------
pb.authStore.onChange(
  async (_token, model) => {
    if (model) {
      loginScreen.style.display = "none";
      appScreen.style.display = "flex";

      userNameEl.textContent = displayNameOf(model);
      userPhotoEl.src = photoOf(model);
      userStatusEl.textContent = "Online";

      await loadRoomsList();
      ensureRoomsSubscription();

      const disclaimerModal = document.getElementById("disclaimerModal");
      const agreeBtn = document.getElementById("agreeBtn");
      const disagreeBtn = document.getElementById("disagreeBtn");

      if (!localStorage.getItem("acceptedDisclaimer")) {
        disclaimerModal.classList.remove("hidden");
      }

      if (agreeBtn) {
        agreeBtn.onclick = () => {
          localStorage.setItem("acceptedDisclaimer", "true");
          disclaimerModal.classList.add("hidden");
        };
      }

      if (disagreeBtn) {
        disagreeBtn.onclick = async () => {
          alert("You must accept the agreement to use YoungWave.");
          localStorage.removeItem("acceptedDisclaimer");

          const user = currentUser();
          try {
            if (user && isGuestUser(user)) await pb.collection("users").delete(user.id);
          } catch (_) {
            // ignore
          }
          pb.authStore.clear();
        };
      }
    } else {
      clearSubs();
      currentRoom = null;
      currentRoomName = null;
      currentDM = null;
      chatHeaderEl.textContent = "Select a room";
      msgDiv.innerHTML = "";
      roomRulesEl.textContent = "";
      roomRulesEl.classList.add("hidden");
      appScreen.style.display = "none";
      loginScreen.style.display = "flex";
      userStatusEl.textContent = "Offline";
    }
  },
  true
);
