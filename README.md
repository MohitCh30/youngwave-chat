# YoungWave

**A shared space for chaos, emotion, and late-night brainwaves.**

YoungWave is a real-time chat app built for Gen-Z — rooms, direct messages, image and video sharing, reactions, and role-based moderation. No fluff, no corporate SaaS energy.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla JS, HTML, CSS — no framework, no bundler |
| Backend | PocketBase (self-hosted SQLite + REST + realtime SSE) |
| Auth | Google OAuth2 via PocketBase + anonymous guest sessions |
| Hosting | Cloudflare Pages (frontend) + Cloudflare Tunnel (backend) |
| Storage | PocketBase file storage (images, videos) |

---

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
