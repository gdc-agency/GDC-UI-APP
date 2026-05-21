# Push notifications (Phase 2)

FCM is not wired in CRM-App yet. Deployed Auth already stores in-app notifications and emits `newNotification` on Socket.IO.

## Rollout checklist

1. `npx expo install expo-notifications expo-device`
2. Firebase project → FCM server key / service account
3. **Backend (when allowed):** `notification_devices(user_id, token, platform, updated_at)`
4. Auth: on `createNotificationForRecipient`, if recipient has no active socket, send FCM with `{ title, body, data: { targetPath } }`
5. CRM: register token after login; `addNotificationResponseReceivedListener` → `router.push(targetPath)`

Do not call `dispatch` or `realtime-relay` from the mobile app.
