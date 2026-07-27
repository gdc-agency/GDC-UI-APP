# WorkTym Mobile App

Expo Router + React Native CRM app for WorkTym.

## API modes

| Mode | Env | Backends |
|------|-----|----------|
| **remote** (default) | `EXPO_PUBLIC_API_MODE=remote` | Organization Render URLs |
| **local** | `EXPO_PUBLIC_API_MODE=local` | PC LAN ports 5000–5003 |

Organization URLs (production):

- Auth: `https://org-gdc-backend.onrender.com`
- Task: `https://org-task-backend.onrender.com`
- Chat: `https://org-chat-backend-rey1.onrender.com`
- Attendance: `https://org-attendence-backend.onrender.com`

Copy `.env.example` → `.env` before `expo start`. After URL changes, restart with cache clear:

```bash
npx expo start --lan -c
```

## Commands

```bash
npm install
npm start
npm run build:mobile
npm run generate:icons
```
