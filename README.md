# YoungWave

A full-stack real-time chat application built for modern, mobile-first communication. YoungWave supports public rooms, private direct messages, media sharing, and role-based moderation — all powered by a self-hosted PocketBase backend.

**Live Demo:** [youngwave-chat.pages.dev](https://youngwave-chat.pages.dev)

---

## Features

- **Real-time messaging** via PocketBase Server-Sent Events
- **Public rooms** with owner, moderator, member, and guest roles
- **Image and video uploads** stored directly in PocketBase
- **Emoji reactions** on every message
- **Inline edit and soft delete** with role-aware moderation controls
- **Guest join requests** — guests request access, room owners approve or reject
- **Private direct messages** between authenticated users
- **Typing indicators** with multi-user support
- **Mobile-responsive layout** with collapsible sidebar
- **User agreement modal** with persistent acceptance state

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vanilla JavaScript (ES Modules), HTML5, CSS3 |
| Backend | PocketBase (self-hosted, Go-based BaaS) |
| Frontend Hosting | Cloudflare Pages |
| Backend Tunnel | Cloudflare Tunnel (`pb.mohitchdev.me`) |
| Authentication | PocketBase OAuth2 (Google) + ephemeral guest accounts |

---

## Architecture

```
Client (Cloudflare Pages)
        │
        │  HTTPS API requests
        ▼
Cloudflare Tunnel → pb.mohitchdev.me
        │
        ▼
PocketBase (self-hosted backend)
├── REST API
├── Realtime SSE subscriptions
└── File storage
```

The frontend is a static site deployed globally via Cloudflare Pages. The backend runs on a self-hosted PocketBase instance, exposed securely over HTTPS through a named Cloudflare Tunnel — no open ports, no reverse proxy configuration required.

---

## Migration: Firebase → PocketBase

This project was originally built on Firebase (Firestore, Firebase Storage, Firebase Auth). It was migrated to PocketBase to resolve Firebase Storage upload failures on the free tier and to gain full control over the backend.

The migration involved:

- Rewriting all Firestore queries to PocketBase REST API calls
- Replacing Firebase Storage uploads with PocketBase file fields via FormData
- Migrating Firebase Auth (Google + Anonymous) to PocketBase OAuth2 and guest account flows
- Adding video upload support (not feasible within Firebase free tier limits)
- Preserving all existing features across rooms, DMs, reactions, roles, and moderation

---

## Running Locally

**Requirements:** PocketBase binary (download from [pocketbase.io](https://pocketbase.io))

```bash
# Clone the repository
git clone https://github.com/MohitCh30/youngwave-chat
cd youngwave-chat

# Start PocketBase
cd pocketbase-server
./pocketbase serve

# Serve the frontend
cd ../public
python3 -m http.server 3000 --bind 127.0.0.1
```

Open `http://127.0.0.1:3000` in your browser.  
PocketBase Admin UI: `http://127.0.0.1:8090/_/`

---

## Database Schema

| Collection | Purpose |
|-----------|---------|
| `users` | Authentication — Google OAuth and guest accounts |
| `rooms` | Room metadata: name, rules, creator |
| `messages` | Room messages with text, image, video, and reactions |
| `dm_messages` | Direct message history between users |
| `members` | Room membership and role assignments |
| `join_requests` | Pending guest access requests awaiting approval |
| `typing` | Ephemeral typing indicator state per room |

---

## Project Structure

```
youngwave-chat/
├── public/
│   ├── index.html        # App shell and layout
│   ├── main.js           # All application logic (~1350 lines)
│   ├── style.css         # Theming and responsive layout
│   └── assets/
│       └── default.png   # Default user avatar
└── pocketbase-server/
    └── pocketbase        # PocketBase binary (not committed)
```

---

## Known Limitations

- **Google OAuth** — the PocketBase OAuth2 popup flow has a Cross-Origin-Opener-Policy conflict on the current Cloudflare Tunnel setup. Guest login is fully functional. OAuth will be resolved on a dedicated server deployment.
- **Realtime SSE** — Cloudflare's free tunnel applies timeouts to long-lived HTTP connections. The PocketBase client reconnects automatically; messages and room state are not lost.

---

## Roadmap

- [ ] Resolve Google OAuth on dedicated cloud hosting
- [ ] Typing indicators in direct messages
- [ ] Read receipts
- [ ] Push notifications
- [ ] Dark / light theme toggle

---

## Author

**Mohit Chaudhary**  
[github.com/MohitCh30](https://github.com/MohitCh30)
