import { apiRequest } from '@/services/api/http';

/** Allowed categories match Aouth-Service `notification.controller` ALLOWED_CATEGORIES. */
/** @typedef {'attendance' | 'task' | 'request' | 'system'} NotificationCategory */

/**
 * GET /api/auth/notifications?limit=
 * List notifications for the logged-in user (newest first).
 *
 * @param {string} token
 * @param {number} [limit]
 */
export async function listNotifications(token, limit = 50) {
  const q = limit != null ? `?limit=${encodeURIComponent(String(limit))}` : '';
  return apiRequest(`/api/auth/notifications${q}`, { method: 'GET', token });
}

/**
 * POST /api/auth/notifications
 * Create a notification for the current user (e.g. reminders / client-side triggers).
 *
 * @param {string} token
 * @param {{
 *   title: string;
 *   description?: string;
 *   category?: NotificationCategory;
 *   eventKey?: string;
 *   targetPath?: string;
 *   upsert?: boolean;
 * }} body — `upsert` requires `eventKey` (idempotent update on server).
 */
export async function createMyNotification(token, body) {
  return apiRequest('/api/auth/notifications', { method: 'POST', token, body });
}

/**
 * PATCH /api/auth/notifications/read-all
 * @param {string} token
 */
export async function markAllNotificationsRead(token) {
  return apiRequest('/api/auth/notifications/read-all', { method: 'PATCH', token });
}

/**
 * PATCH /api/auth/notifications/:id/read
 * @param {string} token
 * @param {string|number} id
 */
export async function markNotificationRead(token, id) {
  return apiRequest(`/api/auth/notifications/${encodeURIComponent(String(id))}/read`, {
    method: 'PATCH',
    token,
  });
}

/**
 * DELETE /api/auth/notifications/:id
 * @param {string} token
 * @param {string|number} id
 */
export async function deleteNotification(token, id) {
  return apiRequest(`/api/auth/notifications/${encodeURIComponent(String(id))}`, {
    method: 'DELETE',
    token,
  });
}

/**
 * DELETE /api/auth/notifications/event-key/:eventKey
 * Remove one notification by its idempotency key (same user only).
 *
 * @param {string} token
 * @param {string} eventKey
 */
export async function deleteNotificationByEventKey(token, eventKey) {
  const key = encodeURIComponent(String(eventKey).trim());
  return apiRequest(`/api/auth/notifications/event-key/${key}`, { method: 'DELETE', token });
}

/**
 * DELETE /api/auth/notifications — clear all for current user
 * @param {string} token
 */
export async function clearAllNotifications(token) {
  return apiRequest('/api/auth/notifications', { method: 'DELETE', token });
}

/**
 * POST /api/auth/notifications/dispatch
 * **Server / trusted tools only** — requires `INTERNAL_NOTIFY_KEY` as header.
 * Do not ship the key inside a public mobile app.
 *
 * @param {string} internalNotifyKey — value for `x-internal-notify-key`
 * @param {{
 *   recipientUserId: number;
 *   title: string;
 *   description?: string;
 *   category?: NotificationCategory;
 *   eventKey?: string;
 *   targetPath?: string;
 * }} body
 */
export async function dispatchNotificationToUser(internalNotifyKey, body) {
  return apiRequest('/api/auth/notifications/dispatch', {
    method: 'POST',
    headers: { 'x-internal-notify-key': String(internalNotifyKey || '').trim() },
    body,
  });
}

/**
 * POST /api/auth/notifications/realtime-relay
 * **Server / trusted tools only** — push Socket.IO events without storing rows.
 *
 * @param {string} internalNotifyKey
 * @param {{ events: Array<{ event: string; rooms: string[]; payload?: object }> }} body
 */
export async function relayRealtimeNotificationEvents(internalNotifyKey, body) {
  return apiRequest('/api/auth/notifications/realtime-relay', {
    method: 'POST',
    headers: { 'x-internal-notify-key': String(internalNotifyKey || '').trim() },
    body,
  });
}
