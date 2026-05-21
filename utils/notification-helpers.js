import * as Linking from 'expo-linking';

import { deleteNotification, deleteNotificationByEventKey } from '@/services/api/notifications-api';
import { ApiError } from '@/services/api/http';

const TAB_BASE = '/dashboard/(tabs)';

/**
 * Delete one notification: numeric id first, then optional eventKey fallback (no backend changes).
 *
 * @param {string} token
 * @param {{ id?: string; eventKey?: string }} item
 */
export async function deleteNotificationSmart(token, item) {
  const idStr = String(item?.id ?? '').trim();
  const numericId = Number(idStr);
  if (Number.isFinite(numericId)) {
    try {
      await deleteNotification(token, numericId);
      return;
    } catch (e) {
      const is404 = e instanceof ApiError && e.status === 404;
      if (is404 && item?.eventKey) {
        await deleteNotificationByEventKey(token, item.eventKey);
        return;
      }
      throw e;
    }
  }
  if (item?.eventKey) {
    await deleteNotificationByEventKey(token, item.eventKey);
    return;
  }
  throw new Error('Invalid notification id');
}

/**
 * Normalize GET /api/auth/notifications (and similar) to a row array.
 * @param {unknown} res
 * @returns {Array<Record<string, unknown>>}
 */
export function normalizeNotificationsList(res) {
  if (Array.isArray(res)) return /** @type {Array<Record<string, unknown>>} */ (res);
  if (res && typeof res === 'object') {
    const o = /** @type {Record<string, unknown>} */ (res);
    if (Array.isArray(o.data)) return /** @type {Array<Record<string, unknown>>} */ (o.data);
    if (Array.isArray(o.notifications)) return /** @type {Array<Record<string, unknown>>} */ (o.notifications);
    if (Array.isArray(o.rows)) return /** @type {Array<Record<string, unknown>>} */ (o.rows);
    if (o.success === true && Array.isArray(o.data)) return /** @type {Array<Record<string, unknown>>} */ (o.data);
  }
  return [];
}

/**
 * Map API row to UI item (handles snake_case fallbacks).
 * @param {Record<string, unknown>} row
 */
export function mapNotificationRow(row) {
  const id = row.id != null ? String(row.id) : '';
  const read = row.read === true || row.is_read === true || row.isRead === true;
  const createdAt =
    row.createdAt != null
      ? String(row.createdAt)
      : row.created_at != null
        ? String(row.created_at)
        : '';
  const category = String(row.category || 'system').toLowerCase();
  return {
    id,
    title: String(row.title || ''),
    description: String(row.description || ''),
    category,
    read,
    createdAt,
    eventKey: row.eventKey != null ? String(row.eventKey) : row.event_key != null ? String(row.event_key) : undefined,
    targetPath: row.targetPath != null ? String(row.targetPath) : row.target_path != null ? String(row.target_path) : undefined,
  };
}

/**
 * Open in-app route or external URL from notification `targetPath`.
 * @param {{ push: (href: string) => void }} router
 * @param {string | undefined} targetPath
 * @returns {boolean} true if navigation was attempted
 */
export function navigateFromNotificationTarget(router, targetPath) {
  const raw = String(targetPath || '').trim();
  if (!raw) return false;

  if (/^https?:\/\//i.test(raw)) {
    void Linking.openURL(raw);
    return true;
  }

  const qIndex = raw.indexOf('?');
  const pathPart = (qIndex >= 0 ? raw.slice(0, qIndex) : raw).trim() || '/';
  const query = qIndex >= 0 ? raw.slice(qIndex) : '';

  const pathNorm = pathPart.startsWith('/') ? pathPart : `/${pathPart}`;

  if (pathNorm === '/' || pathNorm === '') {
    router.push(TAB_BASE);
    return true;
  }

  const firstSeg = pathNorm.replace(/^\//, '').split('/')[0];
  if (firstSeg && /^[a-z0-9-]+$/i.test(firstSeg)) {
    router.push(`${TAB_BASE}/route/${firstSeg}${query}`);
    return true;
  }

  return false;
}
