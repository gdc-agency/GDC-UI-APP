# GDC Realtime Notification & Messaging Architecture

Production design aligned with WhatsApp / Messenger / Slack patterns, mapped to **your deployed stack** (no breaking backend changes).

## Stack map

| Layer | Service | Role |
|-------|---------|------|
| Mobile app | `CRM-App` (Expo / React Native) | UI, badges, socket client, local unread |
| Web app | `GDC-Frontend` (Next.js) | Admin web; chat via REST + local events |
| Chat API | `Chat-Services` | Threads, messages, `POST /chats/:id/read` |
| Notifications + Socket hub | `Aouth-Service` | `notifications` table, Socket.IO, relay |
| Tasks | `taskmanagment-Services` | Dispatches task notifications via Auth internal API |
| Attendance / leave | `Attendence-Service` | Can dispatch via same Auth pattern |

Realtime hub: **Socket.IO on Auth** (`/socket.io`). Microservices call `POST /api/auth/notifications/realtime-relay`.

---

## 1. Global notification system

### Source of truth (already deployed)

**Table:** `notifications` (Auth DB)

| Column | Purpose |
|--------|---------|
| `recipient_user_id` | Who receives it |
| `title` / `description` | Panel copy |
| `category` | `attendance` \| `task` \| `request` \| `system` |
| `event_key` | Idempotent upsert |
| `target_path` | Deep link (`/dashboard/...`) |
| `is_read` | Read state |

### REST (Auth) — client-safe

```
GET    /api/auth/notifications?limit=
PATCH  /api/auth/notifications/:id/read
PATCH  /api/auth/notifications/read-all
DELETE /api/auth/notifications/:id
```

### Realtime (Auth socket → `user:{id}`)

| Event | When |
|-------|------|
| `newNotification` | Row inserted (task, leave, system, etc.) |
| `task.updated` | Task service relay |
| `dailyUpdates.updated` | Daily update relay |

### CRM-App wiring (implemented)

- **Alerts tab badge:** `useGdcNotificationRealtime` — listens `newNotification`, `task.updated`, `dailyUpdates.updated`, reconciles with REST.
- **Inbox screen:** `app/dashboard/notifications.jsx` — list, mark read, delete, navigate via `targetPath`.
- **Invalidate bus:** `utils/notification-invalidate.js` — keeps tab badge + list in sync.

### Categories → product areas

| Category | Examples |
|----------|----------|
| `task` | Assigned, review, approved |
| `request` | Leave submitted / approved / rejected |
| `attendance` | Clock-in reminders, anomalies |
| `system` | Announcements, maintenance |

Task service already calls `POST /api/auth/notifications/dispatch` (internal key). **CRM-App** creates chat alerts client-side via `POST /api/auth/notifications` (`upsert` + `event_key` `chat-msg-{chatId}`) when `receiveMessage` / thread refresh detects an incoming message.

---

## 2. WhatsApp-style message counters

### Model (client-side today)

- Per-thread `unread` on CRM thread rows.
- Increment on `receiveMessage` when chat **not** open and sender ≠ me.
- Reset to `0` on `openChat` + `POST /chats/:chatId/read`.
- List UI: green `#25D366` badge, bold preview (see `messages.jsx` `ChatThreadRow`).

### Seen / blue ticks

- DB: `chat_messages.read_by_user_ids[]` (Chat-Services).
- API: `POST /chats/:chatId/read`.
- Socket: `chat.read`, `message_seen` → `applySeenToThread` in `useGdcChatInbox.js`.
- UI ticks: `utils/chat-message-status.js` — `sent` → gray single, `delivered` → gray double, `seen` → blue double.

### Gap (optional future backend — not required for v1)

Dedicated `chat_unread_counts(user_id, chat_id, count)` would avoid client recompute and power web sidebar without loading messages. **Not deployed; CRM computes from threads.**

---

## 3. Bottom navigation message counter (implemented)

```
totalUnread = Σ thread.unread
```

- Published: `utils/chat-unread-bus.js` from `useGdcChatInbox`.
- Consumed: `app/dashboard/(tabs)/_layout.jsx` → **Chat tab** `tabBarBadge`.
- Provider: `GdcInboxProvider` keeps socket + threads alive on all dashboard tabs.

---

## 4. Notification bell counter (implemented on mobile)

- **Tab:** Alerts (`notifications`) with `tabBarBadge` from realtime hook.
- **Screen:** Full panel with read/unread, timestamps, categories.

### GDC-Frontend (recommended next)

Wire `Topbar.tsx` bell to same Auth REST + optional Socket.IO client (mirror CRM hook). Today: decorative dot only; unread math exists in `src/lib/messaging.ts`.

---

## 5. Realtime event catalog

### Auth Socket.IO

**Client → server**

| Event | Payload |
|-------|---------|
| `register` | `{ userId }` |
| `joinRoom` | `chatId` → room `chat:{id}` |
| `chatTyping` | `{ chatId, typing }` |
| `message_seen` | fallback read broadcast |

**Server → client**

| Event | Purpose |
|-------|---------|
| `receiveMessage` | New chat message |
| `chat.thread.updated` | Thread metadata |
| `chat.read` / `message_seen` | Read receipts |
| `chatTyping` | Typing indicator |
| `newNotification` | In-app notification |
| `presence:update` | Online status |
| `task.updated` | Task board refresh hint |

Chat-Services relays via `utils/realtimeRelay.js` → Auth `realtime-relay`.

---

## 6. Message status flow

```
sending → sent → delivered → seen
```

| Stage | Trigger |
|-------|---------|
| `sending` | Optimistic outgoing (files) |
| `sent` | HTTP accept / socket own message |
| `delivered` | Peer online + message in thread (client heuristic) |
| `seen` | `read_by_user_ids` contains peer |

---

## 7. Database design (deployed + recommended indexes)

### Auth — `notifications`

```sql
CREATE INDEX idx_notifications_recipient_unread
  ON notifications (recipient_user_id, is_read, created_at DESC);
```

### Chat — `chat_messages`

```sql
CREATE INDEX idx_chat_messages_chat_created
  ON chat_messages (chat_id, created_at DESC);
-- GIN on read_by_user_ids if filtering seen per message at scale
```

### Optional future tables (not deployed)

```sql
-- notification_devices (FCM tokens)
-- chat_unread_counts (user_id, chat_id, count)
-- notification_preferences (per category mute)
```

---

## 8. API surface (summary)

Already live — see service route files. Internal-only:

- `POST /api/auth/notifications/dispatch` (`x-internal-notify-key`)
- `POST /api/auth/notifications/realtime-relay`

---

## 9–10. Mobile UI & state management

**CRM-App state (no Redux required today):**

| Concern | Location |
|---------|----------|
| Chat inbox + socket | `hooks/useGdcChatInbox.js` |
| Shared inbox instance | `context/gdc-inbox-context.jsx` |
| Tab badges | `_layout.jsx` + buses |
| Notification realtime | `hooks/useGdcNotificationRealtime.js` |
| Chrome (hide tab in chat) | `context/chat-chrome-context.jsx` |

Optional later: Zustand store if web + mobile share package.

---

## 11. Push notifications (phase 2 — not in app yet)

1. Add `expo-notifications` + FCM credentials.
2. Store device tokens in Auth (`notification_devices`) — **new migration when backend allows**.
3. On `createNotificationForRecipient`, fan-out FCM if user offline.
4. Notification tap → `target_path` / chat deep link.

See `services/push/README.md` for rollout checklist.

---

## 12. Folder structure (CRM-App)

```
context/
  gdc-inbox-context.jsx      # Single inbox + socket for dashboard
  chat-chrome-context.jsx
hooks/
  useGdcChatInbox.js         # Chat state, unread, ticks, socket
  useGdcNotificationRealtime.js
utils/
  chat-unread-bus.js
  compute-total-chat-unread.js
  notification-invalidate.js
  notification-helpers.js
services/
  api/notifications-api.js
  api/chat-api.js
  realtime/gdc-socket.js
app/dashboard/
  notifications.jsx          # Bell panel
  (tabs)/messages.jsx
  (tabs)/_layout.jsx         # Tab badges
docs/
  NOTIFICATION_ARCHITECTURE.md
```

---

## Security & performance

- **JWT** on REST; socket `register` with `userId` (harden with server JWT verify when Auth allows).
- **Never** ship `INTERNAL_NOTIFY_KEY` in mobile builds.
- **Debounce** read ack (`scheduleMarkChatRead` ~200ms).
- **Cap** notification list `limit` ≤ 200.
- **Buffer** closed-chat messages `slice(-80)` to limit memory.
- **Idempotent** notifications via `event_key`.

---

## Multi-device sync

| Data | Sync mechanism |
|------|----------------|
| New message | `receiveMessage` on all connected clients |
| Unread count | Client increment; reset on open + `markChatRead` |
| Seen ticks | `chat.read` / `message_seen` |
| Task/leave alerts | `newNotification` + REST refresh |
| Tab badges | Buses + provider |

---

## Troubleshooting: messages only appear after leaving chat

If new messages update the list preview but not the open conversation, **Chat-Services realtime relay** is likely off. In `Chat-Services/.env` set (same values as Auth):

```
GDC_API_URL=http://YOUR_AUTH_HOST:PORT
INTERNAL_NOTIFY_KEY=<same as Aouth-Service>
```

Restart Chat-Services. CRM also listens for `chat.message` as a fallback and refetches the open chat.

---

## Constraint: deployed backend unchanged

All features above use **existing** Auth + Chat APIs and socket events. Optional enhancements (unread aggregate API, FCM table, announcement entity) are documented for a **future** backend release without blocking mobile/web v1.
