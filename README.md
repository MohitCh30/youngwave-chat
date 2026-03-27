# YoungWave

**A shared space for chaos, emotion, and late-night brainwaves.**

YoungWave is a real-time chat app built for Gen-Z — rooms, direct messages, image and video sharing, reactions, and role-based moderation. No fluff, no corporate SaaS energy.

---

**Live Demo:** [youngwave-chat.pages.dev](https://youngwave-chat.pages.dev)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla JS, HTML, CSS — no framework, no bundler |
| Backend | PocketBase (self-hosted SQLite + REST + realtime SSE) |
| Auth | Google OAuth2 via PocketBase + anonymous guest sessions |
| Hosting | Cloudflare Pages (frontend) + Cloudflare Tunnel (backend) |
| Storage | PocketBase file storage (images, videos) |

---

## Screenshots 

<img width="1920" height="864" alt="518691609-d6abe339-16bc-4f40-8bc9-7ee82408807d" src="https://github.com/user-attachments/assets/7cfbeba6-cb0d-4bf6-8ee9-a91522813941" /> 

<img width="1767" height="875" alt="518691773-a62ea9cc-c584-48ed-83fb-5b4def878801" src="https://github.com/user-attachments/assets/c5bf77ed-4d37-46c5-98ad-4132457ec799" /> 

<img width="1507" height="850" alt="518692149-2d83ae21-3d7f-445e-afde-5ab2fb20ddf9" src="https://github.com/user-attachments/assets/1a389141-b8a5-43ff-a37f-ed261daad37c" />

<img width="1580" height="697" alt="Screenshot From 2026-03-26 17-35-08" src="https://github.com/user-attachments/assets/4eeeeeb4-01b6-47cd-969b-e3a8ddd1dc1e" />

## Features

- **Google login** — one click, pulls your name and profile picture automatically
- **Guest mode** — enter as a voyager, request access to rooms, no account needed
- **Rooms** — create rooms with custom rules, invite or approve members
- **Role system** — owner, moderator, member, guest with enforced permissions
- **Direct messages** — private one-on-one conversations (Google login required)
- **Image sharing** — attach and send images inline
- **Video sharing** — send short video clips directly in chat
- **Reactions** — 9 emoji reactions per message
- **Typing indicators** — live per-room typing status
- **Inline editing** — edit your own messages in place
- **Soft delete** — deleted messages show a tombstone, not a gap
- **Admin panel** — manage members, approve join requests, ban or kick users, delete rooms
- **Mobile responsive** — sidebar collapses on small screens, fixed input area

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

## Infrastructure

- **systemd** — PocketBase and Cloudflare Tunnel run as system services, 
  auto-restarting on crash and starting on boot
- **Auto-updates** — weekly cron job checks and applies PocketBase releases
- **Monitoring** — UptimeKuma tracks backend availability with Telegram alerts


## Running Locally

**Requirements:** PocketBase binary (download from [pocketbase.io](https://pocketbase.io))

```bash
# Clone the repository
git clone https://github.com/MohitCh30/youngwave-chat
cd youngwave-chat

# Start PocketBase
cd pocketbase-server
./pocketbase serve

# Serve the frontend (in a separate terminal)
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
| `messages` | Room messages with text, image, video, reactions |
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

## Migration Story

YoungWave was originally built on Firebase (Firestore + Firebase Auth + Firebase Storage). The entire backend was migrated to PocketBase — replacing Firestore listeners with PocketBase realtime subscriptions, Firebase Storage uploads with PocketBase file fields via FormData, and Firebase Auth with PocketBase OAuth2 — without touching a single line of HTML or CSS.

Video support was added as part of the migration, something Firebase Storage was making painful with billing restrictions.

---

## Known Limitations

- **Realtime SSE** — Cloudflare's free tunnel applies timeouts to long-lived HTTP connections. The PocketBase client reconnects automatically; messages and room state are not lost.
- **Server uptime** — currently tunneled from a local machine. App availability depends on the host being online. Oracle Cloud Free Tier deployment is planned.

---

## Roadmap

- [ ] Dedicated cloud hosting (Oracle Cloud Free Tier)
- [ ] Typing indicators in direct messages
- [ ] Read receipts
- [ ] Push notifications
- [ ] Dark / light theme toggle
