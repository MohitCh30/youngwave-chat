import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  doc,
  deleteDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";
import {
  getDatabase,
  ref as rtdbRef,
  set as rtdbSet,
  onDisconnect as rtdbOnDisconnect,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

// ---------------- FIREBASE INIT ----------------
const firebaseConfig = {
  apiKey: "AIzaSyAwi4mJTNA0v5z_b8EJmyXxnYRi0bTf0fs",
  authDomain: "young-wave-0904.firebaseapp.com",
  projectId: "young-wave-0904",
  storageBucket: "young-wave-0904.firebasestorage.app",
  messagingSenderId: "394074722478",
  appId: "1:394074722478:web:60bf3fbcddc53d73039d3f",
  databaseURL: "https://young-wave-0904-default-rtdb.firebaseio.com",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app, "gs://young-wave-0904.firebasestorage.app");

const rtdb = getDatabase(app);
const provider = new GoogleAuthProvider();

// ---------------- STATE ----------------
let currentRoom = null;
let currentDM = null;
let currentRoomRole = null; // owner/moderator/member/guest
let unsubscribeMessages = null;
let unsubscribeTyping = null;
let unsubscribeMembers = null;
let unsubscribeRequests = null;
let typingTimeout = null;



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


// ---------------- SMALL WIRING ----------------

// bind input after login (DOM guaranteed)
onAuthStateChanged(auth, () => {

  if (attachBtn && imageInput) {
    attachBtn.onclick = () => imageInput.click();
  }
});


if (adminCloseBtn && adminPanel) {
  adminCloseBtn.addEventListener("click", () => {
    adminPanel.classList.remove("open");
  });
}

// ---------------- AUTH BUTTONS ----------------
if (googleBtn) {
  googleBtn.onclick = () =>
    signInWithPopup(auth, provider).catch((e) => console.error(e));
}
if (anonBtn) {
  anonBtn.onclick = () =>
    signInAnonymously(auth).catch((e) => console.error(e));
}

// ---------------- PRESENCE (RTDB) ----------------
function setupPresence(user) {
  if (!user) return;
  try {
    const statusRef = rtdbRef(rtdb, `status/${user.uid}`);
    const base = {
      displayName: user.displayName || "Guest",
      lastChanged: Date.now(),
    };
    rtdbSet(statusRef, { ...base, state: "online" }).catch((e) =>
      console.warn("Presence error:", e)
    );
    rtdbOnDisconnect(statusRef)
      .set({ ...base, state: "offline", lastChanged: Date.now() })
      .catch((e) => console.warn("onDisconnect error:", e));
  } catch (e) {
    console.warn("Presence setup skipped:", e);
  }
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

// Settings (⚙) → open admin panel if allowed
if (settingsBtn) {
  settingsBtn.addEventListener("click", () => {
    if (!currentRoom) return alert("Select a room first.");
    const user = auth.currentUser;
    if (!user) return alert("Login first.");
    if (currentRoomRole !== "owner" && currentRoomRole !== "moderator")
      return alert("Only owners/moderators can open room settings.");
    setupAdminPanel(currentRoom);
    adminPanel.classList.add("open");
  });
}

// ---------------- ROOMS LIST ----------------
const roomsRef = collection(db, "rooms");
if (roomListEl) {
  onSnapshot(roomsRef, (snapshot) => {
    roomListEl.innerHTML = "";
    snapshot.forEach((roomDoc) => {
      const roomId = roomDoc.id;
      const li = document.createElement("li");
      li.className = "room-row";
      li.textContent = roomId;
      li.style.cursor = "pointer";
      li.onclick = () => onRoomClick(roomId);
      roomListEl.appendChild(li);
    });
  });
}

// ---------------- ROOM CLICK / JOIN FLOW ----------------
async function onRoomClick(roomId) {
  const user = auth.currentUser;
  if (!user) {
    alert("Log in to open rooms.");
    return;
  }

  const memberRef = doc(db, "rooms", roomId, "members", user.uid);

  try {
    const memberSnap = await getDoc(memberRef);

    if (memberSnap.exists() && memberSnap.data().banned) {
      alert("You are banned from this room.");
      return;
    }

    // Guest flow: must request access
    if (user.isAnonymous) {
      if (memberSnap.exists()) {
        await loadRoom(roomId);
      } else {
        const ok = confirm(`Request to join "${roomId}" as a guest?`);
        if (!ok) return;

        await setDoc(doc(db, "rooms", roomId, "joinRequests", user.uid), {
          uid: user.uid,
          displayName: "Guest",
          requestedAt: Date.now(),
        });

        alert("Join request sent. You'll auto-enter when approved.");

        const unsub = onSnapshot(memberRef, (snap) => {
          if (snap.exists() && !snap.data().banned) {
            unsub();
            loadRoom(roomId);
          }
        });
      }
      return;
    }

    // Logged-in user: direct join
    await loadRoom(roomId);
  } catch (e) {
    console.error("onRoomClick error:", e);
    alert("Failed to open room (permissions?). Check rules.");
  }
}

// ---------------- CREATE ROOM ----------------
if (createRoomBtnHeader) {
  createRoomBtnHeader.addEventListener("click", () => {
    const user = auth.currentUser;
    if (!user || user.isAnonymous) {
      alert("Only logged-in members can create rooms.");
      return;
    }
    modal.classList.remove("hidden");
    roomNameInput.value = "";
    roomRulesInput.value = "";
  });
}

if (modalCancelBtn) {
  modalCancelBtn.addEventListener("click", () =>
    modal.classList.add("hidden")
  );
}

if (modalCreateBtn) {
  modalCreateBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user || user.isAnonymous) {
      alert("Only logged-in members can create rooms.");
      return;
    }
    const name = roomNameInput.value.trim();
    const rules = roomRulesInput.value.trim();
    if (!name) {
      alert("Room name required.");
      return;
    }

    const roomRef = doc(db, "rooms", name);
    await setDoc(roomRef, {
      createdAt: Date.now(),
      createdBy: user.uid,
      rules: rules || "",
    });

    await setDoc(
      doc(db, "rooms", name, "members", user.uid),
      {
        role: "owner",
        displayName: user.displayName || "Owner",
        joinedAt: Date.now(),
      },
      { merge: true }
    );

    modal.classList.add("hidden");
  });
}

// ---------------- SUBSCRIPTION CLEANUP ----------------
function clearSubs() {
  if (unsubscribeMessages) {
    unsubscribeMessages();
    unsubscribeMessages = null;
  }
  if (unsubscribeTyping) {
    unsubscribeTyping();
    unsubscribeTyping = null;
  }
  if (unsubscribeMembers) {
    unsubscribeMembers();
    unsubscribeMembers = null;
  }
  if (unsubscribeRequests) {
    unsubscribeRequests();
    unsubscribeRequests = null;
  }
  stopTyping();
  if (adminPanel) adminPanel.classList.remove("open");
  currentRoomRole = null;
}

// ---------------- ADMIN PANEL ----------------
function setupAdminPanel(roomId) {
  const user = auth.currentUser;
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

  adminRoomTitle.textContent = `Settings – ${roomId}`;
  adminInfoEl.textContent = `You are ${currentRoomRole.toUpperCase()} of this room.`;

  // JOIN REQUESTS
  const reqRef = collection(db, "rooms", roomId, "joinRequests");
  if (unsubscribeRequests) {
    unsubscribeRequests();
    unsubscribeRequests = null;
  }
  unsubscribeRequests = onSnapshot(reqRef, (snap) => {
    requestListEl.innerHTML = "";
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const li = document.createElement("li");
      li.className = "request-item";

      const nameDiv = document.createElement("div");
      nameDiv.className = "request-name";
      nameDiv.textContent = data.displayName || "Guest";

      const actions = document.createElement("div");
      actions.className = "request-actions";

      const approve = document.createElement("button");
      approve.className = "approve";
      approve.textContent = "Approve";
      approve.onclick = async () => {
        await setDoc(
          doc(db, "rooms", roomId, "members", data.uid),
          {
            role: "guest",
            displayName: data.displayName || "Guest",
            joinedAt: Date.now(),
          },
          { merge: true }
        );
        await deleteDoc(doc(db, "rooms", roomId, "joinRequests", data.uid));
      };

      const reject = document.createElement("button");
      reject.className = "reject";
      reject.textContent = "Reject";
      reject.onclick = async () => {
        await deleteDoc(doc(db, "rooms", roomId, "joinRequests", data.uid));
      };

      actions.appendChild(approve);
      actions.appendChild(reject);
      li.appendChild(nameDiv);
      li.appendChild(actions);
      requestListEl.appendChild(li);
    });
  });

  // MEMBERS
  const membersRef = collection(db, "rooms", roomId, "members");
  if (unsubscribeMembers) {
    unsubscribeMembers();
    unsubscribeMembers = null;
  }
  unsubscribeMembers = onSnapshot(membersRef, (snap) => {
    memberListEl.innerHTML = "";
    snap.forEach((docSnap) => {
      const uid = docSnap.id;
      const data = docSnap.data();

      const li = document.createElement("li");
      li.className = "member-item";

      const left = document.createElement("div");
      left.className = "member-name";
      left.textContent = data.displayName || "Member";

      const roleSpan = document.createElement("span");
      roleSpan.className = "member-role";
      roleSpan.textContent = data.role;
      left.appendChild(roleSpan);

      const right = document.createElement("div");
      right.className = "member-actions";

      const isSelf = auth.currentUser && uid === auth.currentUser.uid;

      if (!isSelf) {
        if (currentRoomRole === "owner") {
          const promote = document.createElement("button");
          promote.className = "promote";
          if (data.role === "moderator") {
            promote.textContent = "Remove mod";
            promote.onclick = async () =>
              await updateDoc(doc(db, "rooms", roomId, "members", uid), {
                role: "member",
              });
          } else {
            promote.textContent = "Make mod";
            promote.onclick = async () =>
              await updateDoc(doc(db, "rooms", roomId, "members", uid), {
                role: "moderator",
              });
          }
          right.appendChild(promote);
        }

        const kick = document.createElement("button");
        kick.className = "kick";
        kick.textContent = "Kick";
        kick.onclick = async () =>
          await deleteDoc(doc(db, "rooms", roomId, "members", uid));
        right.appendChild(kick);

        const ban = document.createElement("button");
        ban.className = "ban";
        ban.textContent = "Ban";
        ban.onclick = async () =>
          await updateDoc(doc(db, "rooms", roomId, "members", uid), {
            banned: true,
          });
        right.appendChild(ban);
      }

      li.appendChild(left);
      li.appendChild(right);
      memberListEl.appendChild(li);
    });
  });

  // Delete room (owner only)
  deleteRoomBtn.style.display = currentRoomRole === "owner" ? "block" : "none";
  deleteRoomBtn.onclick = async () => {
    const sure = confirm(`Delete room "${roomId}" and all its messages?`);
    if (!sure) return;
    await deleteDoc(doc(db, "rooms", roomId));
    clearSubs();
    currentRoom = null;
    chatHeaderEl.textContent = "Select a room";
    msgDiv.innerHTML = "";
    roomRulesEl.textContent = "";
    roomRulesEl.classList.add("hidden");
  };
}

// ---------------- LOAD ROOM ----------------
async function loadRoom(roomName) {
  clearSubs();

  currentRoom = roomName;
  currentDM = null;
  chatHeaderEl.textContent = roomName;
  msgDiv.innerHTML = "";

  const user = auth.currentUser;

  let roomSnap = null;
  let roomData = null;
  const roomDocRef = doc(db, "rooms", roomName);

  try {
    roomSnap = await getDoc(roomDocRef);
    if (roomSnap.exists()) {
      roomData = roomSnap.data();

      const rules = roomData.rules || "";
      if (rules.trim()) {
        const parts = rules
          .split(/[\n\.]/)               
          .map(r => r.trim())
          .filter(r => r.length > 0);
      
          roomRulesEl.innerHTML = `
          <div class="rules-box">
            <ol>
              ${parts.map(p => `<li>${p}</li>`).join("")}
            </ol>
          </div>
        `;
        
      
        roomRulesEl.classList.remove("hidden");
      } else {
        roomRulesEl.innerHTML = "";
        roomRulesEl.classList.add("hidden");
      }
      

      // OLD ROOM FIX: if no createdBy, assign to first logged-in non-guest who opens it
      if (!roomData.createdBy && user && !user.isAnonymous) {
        try {
          await updateDoc(roomDocRef, { createdBy: user.uid });
          roomData.createdBy = user.uid;
        } catch (e) {
          console.warn("Could not set createdBy for old room:", e);
        }
      }
    } else {
      roomRulesEl.textContent = "";
      roomRulesEl.classList.add("hidden");
    }
  } catch (e) {
    console.warn("room read error", e);
    roomRulesEl.textContent = "";
    roomRulesEl.classList.add("hidden");
  }

  currentRoomRole = null;

  if (user) {
    const memberRef = doc(db, "rooms", roomName, "members", user.uid);
    const memberSnap = await getDoc(memberRef);

    const base = {
      displayName: user.displayName || (user.isAnonymous ? "Guest" : "Member"),
      joinedAt: Date.now(),
    };

    const roomCreatorId = roomData ? roomData.createdBy : null;

    let roleToSet;

    if (memberSnap.exists()) {
      const data = memberSnap.data();

      // 🔥 Key fix for old rooms:
      // if you're the creator, you are owner even if old doc says "member"
      if (roomCreatorId && user.uid === roomCreatorId) {
        roleToSet = "owner";
      } else if (data.role) {
        roleToSet = data.role;
      } else {
        roleToSet = roomCreatorId === user.uid ? "owner" : "member";
      }
    } else {
      roleToSet = roomCreatorId === user.uid ? "owner" : "member";
    }

    currentRoomRole = roleToSet;
    await setDoc(memberRef, { ...base, role: roleToSet }, { merge: true });
  }

  // Messages
  const msgRef = collection(db, "rooms", roomName, "messages");
  const q = query(msgRef, orderBy("timestamp"));
  unsubscribeMessages = onSnapshot(q, (snapshot) => {
    msgDiv.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const msg = document.createElement("div");
      msg.className = "message";

      const isSelf = auth.currentUser && data.uid === auth.currentUser.uid;
      if (isSelf) msg.classList.add("right");

      if (data.deleted) {
        const tomb = document.createElement("div");
        tomb.className = "deleted-label";
        tomb.textContent =
          data.deletedByRole === "admin"
            ? "This message was deleted by an admin."
            : "This message was deleted.";
        msg.appendChild(tomb);
        msgDiv.appendChild(msg);
        return;
      }

      const timeString = data.timestamp
        ? new Date(data.timestamp.toDate()).toLocaleTimeString()
        : "";
      const editedLabel = data.edited ? " (edited)" : "";

      const header = document.createElement("div");
      header.className = "message-header";

      const avatar = document.createElement("img");
      avatar.className = "msg-photo";
      avatar.src = data.photo || "assets/default.png";

      const nameSpan = document.createElement("span");
      nameSpan.className = "msg-name";
      nameSpan.textContent = data.user;

      const timeSpan = document.createElement("span");
      timeSpan.className = "msg-time";
      timeSpan.textContent = timeString;

      header.appendChild(avatar);
      header.appendChild(nameSpan);
      header.appendChild(timeSpan);

      const textDiv = document.createElement("div");
      textDiv.className = "text";
      textDiv.textContent = (data.text || "") + editedLabel;

      msg.appendChild(header);
      msg.appendChild(textDiv);

      if (data.image) {
        const img = document.createElement("img");
        img.className = "msg-image";
        img.src = data.image;
        msg.appendChild(img);
      }

      if (
        nameSpan &&
        data.uid &&
        auth.currentUser &&
        !auth.currentUser.isAnonymous &&
        data.uid !== auth.currentUser.uid
      ) {
        nameSpan.onclick = () =>
          openDirectMessage(data.uid, data.user || "User");
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
        editBtn.onclick = () =>
          inlineEditMessageRoom(roomName, docSnap.id, textDiv, data.text || "");
        msg.appendChild(editBtn);
      }

      if (canDelete) {
        const del = document.createElement("button");
        del.className = "delete-btn";
        del.textContent = "Delete";
        del.onclick = () =>
          softDeleteRoomMessage(roomName, docSnap.id, !isSelf);
        msg.appendChild(del);
      }

      buildReactionsUI("room", roomName, docSnap.id, data, msg);
      msgDiv.appendChild(msg);
    });
    msgDiv.scrollTop = msgDiv.scrollHeight;
  });

  // Typing (Firestore docs)
  const typingRef = collection(db, "rooms", roomName, "typing");
  unsubscribeTyping = onSnapshot(typingRef, (snapshot) => {
    const typingUsers = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (!auth.currentUser || data.uid !== auth.currentUser.uid) {
        typingUsers.push(data.name || "Someone");
      }
    });
    if (typingUsers.length === 0) {
      typingIndicatorEl.textContent = "";
    } else if (typingUsers.length === 1) {
      typingIndicatorEl.textContent = `${typingUsers[0]} is typing...`;
    } else {
      typingIndicatorEl.textContent = `${typingUsers[0]} and ${
        typingUsers.length - 1
      } others are typing...`;
    }
  });
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

function buildReactionsUI(kind, parentId, msgId, data, container) {
  const bar = document.createElement("div");
  bar.className = "reaction-bar";

  const reactions = data.reactions || {};

  REACTIONS.forEach((r) => {
    const btn = document.createElement("button");
    btn.className = "reaction-btn";
    btn.textContent = r.icon;
    btn.onclick = () => toggleReaction(kind, parentId, msgId, r.key);
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

async function toggleReaction(kind, parentId, msgId, type) {
  if (!auth.currentUser) return;

  const basePath =
    kind === "room"
      ? ["rooms", parentId, "messages", msgId]
      : ["dm", parentId, "messages", msgId];

  const msgRef = doc(db, ...basePath);
  const snap = await getDoc(msgRef);
  if (!snap.exists()) return;
  const data = snap.data();
  const reactions = data.reactions || {};
  const list = reactions[type] || [];
  const hasReacted = list.includes(auth.currentUser.uid);
  const field = `reactions.${type}`;

  if (hasReacted) {
    await updateDoc(msgRef, { [field]: arrayRemove(auth.currentUser.uid) });
  } else {
    await updateDoc(msgRef, { [field]: arrayUnion(auth.currentUser.uid) });
  }
}

// ---------------- INLINE EDIT & DELETE (ROOM) ----------------
async function inlineEditMessageRoom(roomId, msgId, textDiv, oldText) {
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
    const msgRef = doc(db, "rooms", roomId, "messages", msgId);
    await updateDoc(msgRef, { text: newText, edited: true });
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

async function softDeleteRoomMessage(roomId, msgId, byAdmin) {
  const msgRef = doc(db, "rooms", roomId, "messages", msgId);
  await updateDoc(msgRef, {
    deleted: true,
    deletedByRole: byAdmin ? "admin" : null,
    text: "",
    image: null,
    reactions: {},
  });
}

// ---------------- DIRECT MESSAGES ----------------
function getDMChatId(uid1, uid2) {
  return uid1 < uid2 ? `${uid1}__${uid2}` : `${uid2}__${uid1}`;
}

function registerDM(otherUid, otherName) {
  if (!auth.currentUser || !dmListEl) return;
  const myId = auth.currentUser.uid;
  const chatId = getDMChatId(myId, otherUid);

  let existing = dmListEl.querySelector(`[data-chatid="${chatId}"]`);
  if (existing) return;

  const li = document.createElement("li");
  li.dataset.chatid = chatId;
  li.textContent = otherName;
  li.onclick = () => openDirectMessage(otherUid, otherName);
  dmListEl.appendChild(li);

  if (dmsSection) dmsSection.style.display = "block";
}

async function openDirectMessage(otherUid, otherName) {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) {
    alert("Please login with Google to use private messages.");
    return;
  }

  clearSubs();

  const chatId = getDMChatId(user.uid, otherUid);
  registerDM(otherUid, otherName);

  currentRoom = null;
  currentDM = chatId;
  chatHeaderEl.textContent = `DM with ${otherName}`;
  roomRulesEl.classList.add("hidden");
  msgDiv.innerHTML = "";

  const msgRef = collection(db, "dm", chatId, "messages");
  const q = query(msgRef, orderBy("timestamp"));

  unsubscribeMessages = onSnapshot(q, (snapshot) => {
    msgDiv.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const msg = document.createElement("div");
      msg.className = "message";

      const isSelf = auth.currentUser && data.uid === auth.currentUser.uid;
      if (isSelf) msg.classList.add("right");

      if (data.deleted) {
        const tomb = document.createElement("div");
        tomb.className = "deleted-label";
        tomb.textContent = "This message was deleted.";
        msg.appendChild(tomb);
        msgDiv.appendChild(msg);
        return;
      }

      const timeString = data.timestamp
        ? new Date(data.timestamp.toDate()).toLocaleTimeString()
        : "";
      const editedLabel = data.edited ? " (edited)" : "";

      const header = document.createElement("div");
      header.className = "message-header";

      const avatar = document.createElement("img");
      avatar.className = "msg-photo";
      avatar.src = data.photo || "assets/default.png";

      const nameSpan = document.createElement("span");
      nameSpan.className = "msg-name";
      nameSpan.textContent = data.user;

      const timeSpan = document.createElement("span");
      timeSpan.className = "msg-time";
      timeSpan.textContent = timeString;

      header.appendChild(avatar);
      header.appendChild(nameSpan);
      header.appendChild(timeSpan);

      const textDiv = document.createElement("div");
      textDiv.className = "text";
      textDiv.textContent = (data.text || "") + editedLabel;

      msg.appendChild(header);
      msg.appendChild(textDiv);

      if (data.image) {
        const img = document.createElement("img");
        img.className = "msg-image";
        img.src = data.image;
        msg.appendChild(img);
      }

      if (isSelf) {
        const editBtn = document.createElement("button");
        editBtn.className = "edit-btn";
        editBtn.textContent = "Edit";
        editBtn.onclick = () =>
          inlineEditDMMessage(chatId, docSnap.id, textDiv, data.text || "");
        msg.appendChild(editBtn);

        const delBtn = document.createElement("button");
        delBtn.className = "delete-btn";
        delBtn.textContent = "Delete";
        delBtn.onclick = () => softDeleteDMMessage(chatId, docSnap.id);
        msg.appendChild(delBtn);
      }

      buildReactionsUI("dm", chatId, docSnap.id, data, msg);
      msgDiv.appendChild(msg);
    });
    msgDiv.scrollTop = msgDiv.scrollHeight;
  });
}

async function inlineEditDMMessage(chatId, msgId, textDiv, oldText) {
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
    const msgRef = doc(db, "dm", chatId, "messages", msgId);
    await updateDoc(msgRef, { text: newText, edited: true });
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

async function softDeleteDMMessage(chatId, msgId) {
  const msgRef = doc(db, "dm", chatId, "messages", msgId);
  await updateDoc(msgRef, {
    deleted: true,
    text: "",
    image: null,
    reactions: {},
  });
}

// ---------------- SEND MESSAGE + UPLOAD ----------------
if (sendBtn) {
  sendBtn.onclick = async () => {
    
    const file = imageInput.files[0];

    const text = messageInput.value.trim();

    if (!currentRoom && !currentDM) {
      alert("Select a room or DM first.");
      return;
    }
    if (!auth.currentUser) return;
    if (!text && !file) return;
    
    let imageURL = null;

    if (file) {
      try {
        const sRef = storageRef(
          storage,
          `images/${Date.now()}-${auth.currentUser.uid}-${file.name}`
        );
        await uploadBytes(sRef, file);
        imageURL = await getDownloadURL(sRef);
      } catch (e) {
        console.error("upload failed:", e);
        alert("Image upload failed.");
        return;
      }
    }

    const payload = {
      text,
      user: auth.currentUser.displayName || "Guest",
      uid: auth.currentUser.uid,
      role: currentRoomRole,
      photo: auth.currentUser.photoURL || "assets/default.png",
      image: imageURL,
      timestamp: serverTimestamp(),
    };

    if (currentRoom) {
      await addDoc(collection(db, "rooms", currentRoom, "messages"), payload);
    } else if (currentDM) {
      await addDoc(collection(db, "dm", currentDM, "messages"), payload);
    }
    attachmentPreview.innerHTML = "";
    attachmentPreview.classList.add("hidden");
    messageInput.value = "";
    imageInput.value = "";
  };
}


if (messageInput) {
  messageInput.addEventListener("input", () => {
    if (currentRoom) markTyping();
  });
  messageInput.addEventListener("blur", stopTyping);
}



// ---------------- TYPING ----------------
async function markTyping() {
  if (!currentRoom || !auth.currentUser) return;
  try {
    await setDoc(
      doc(db, "rooms", currentRoom, "typing", auth.currentUser.uid),
      {
        uid: auth.currentUser.uid,
        name: auth.currentUser.displayName || "Guest",
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (e) {
    console.warn("Typing set error:", e);
  }

  if (typingTimeout) clearTimeout(typingTimeout);
  typingTimeout = setTimeout(stopTyping, 3000);
}

async function stopTyping() {
  typingTimeout = null;
  if (!currentRoom || !auth.currentUser) return;
  try {
    await deleteDoc(
      doc(db, "rooms", currentRoom, "typing", auth.currentUser.uid)
    );
  } catch (e) {
    // ignore
  }
}

// ---------------- AUTH STATE ----------------
onAuthStateChanged(auth, async (user) => {
  if (user) {
    loginScreen.style.display = "none";
    appScreen.style.display = "flex";
    userNameEl.textContent = user.displayName || "Guest";
    userPhotoEl.src = user.photoURL || "assets/default.png";
    userStatusEl.textContent = user.isAnonymous ? "Guest" : "Online";
    setupPresence(user);

    const disclaimerModal = document.getElementById("disclaimerModal");
    const agreeBtn = document.getElementById("agreeBtn");
    const disagreeBtn = document.getElementById("disagreeBtn");
    
    // Only show once per device
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
            await signOut(auth);
        };
    }
  }
  
  else {
    clearSubs();
    currentRoom = null;
    currentDM = null;
    chatHeaderEl.textContent = "Select a room";
    msgDiv.innerHTML = "";
    roomRulesEl.textContent = "";
    roomRulesEl.classList.add("hidden");
    appScreen.style.display = "none";
    loginScreen.style.display = "flex";
    userStatusEl.textContent = "Offline";
  }
});

// ---------------- LOGOUT + CLEANUP ----------------
async function cleanupGuest(user) {
  try {
    await deleteDoc(doc(db, "users", user.uid));
  } catch (e) {
    console.warn("Guest cleanup failed:", e);
  }
}

if (logoutBtn) {
  logoutBtn.onclick = async () => {
    const user = auth.currentUser;
    if (user && user.isAnonymous) {
      await cleanupGuest(user);
    }
    await signOut(auth);
  };
}

const attachmentPreview = document.getElementById("attachmentPreview");

imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];
  if (!file) {
    attachmentPreview.classList.add("hidden");
    attachmentPreview.innerHTML = "";
    return;
  }

  // Show filename
  attachmentPreview.classList.remove("hidden");
  attachmentPreview.innerHTML = `<div>📎 Attached: ${file.name}</div>`;

  // Show image preview if image
  if (file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = (e) => {
      attachmentPreview.innerHTML += `<img src="${e.target.result}" />`;
    };
    reader.readAsDataURL(file);
  }
});


attachmentPreview.classList.add("hidden");
attachmentPreview.innerHTML = "";



