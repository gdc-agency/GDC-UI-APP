import { getApiBaseUrl } from '@/constants/api-config';

/** CRM / Auth role → short label */
export function formatDisplayRole(roleRaw) {
  const r = String(roleRaw || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace('teamleader', 'team_leader');
  if (r === 'admin') return 'Admin';
  if (r === 'hr') return 'HR';
  if (r === 'team_leader' || r === 'team leader') return 'Team Leader';
  if (r === 'employee') return 'Employee';
  return roleRaw ? String(roleRaw) : '';
}

/**
 * @param {string | null | undefined} raw
 * @returns {string | null}
 */
export function resolveProfileImageUri(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  /** Group avatars / uploads may be stored as data URLs in Chat DB — must not prefix API host. */
  if (/^data:image\//i.test(s)) return s;
  if (/^(blob:|file:)/i.test(s)) return s;
  const base = getApiBaseUrl().replace(/\/+$/, '');
  if (s.startsWith('/')) return `${base}${s}`;
  return `${base}/${s.replace(/^\//, '')}`;
}

/**
 * @param {string | number} id
 * @param {Record<string, unknown>} u
 */
export function mapDirectoryUser(id, u) {
  const sid = String(id);
  const displayName = String(u?.name ?? u?.full_name ?? u?.username ?? u?.email ?? u?.gdc_id ?? 'User').trim();
  const roleLabel = formatDisplayRole(u?.role);
  const avatarUrl = resolveProfileImageUri(u?.profile_image ?? u?.profileImage ?? u?.avatar ?? u?.photo);
  return { id: sid, displayName, roleLabel, avatarUrl };
}

// NEW CODE ADDED FOR CHAT LIST NAME LOADING — prefer directory name over "Chat" placeholder
/** Prefer directory peer name when thread still has the "Chat" placeholder. */
export function resolveChatPeerDisplayName(thread, peer) {
  const stored = String(thread?.headerName || thread?.listTitle || thread?.name || '').trim();
  const peerName = String(peer?.displayName || '').trim();
  if (stored && stored !== 'Chat') return stored;
  return peerName || '';
}

// NEW CODE ADDED FOR CHAT LIST NAME LOADING — text fallback instead of skeleton bar
/** @param {string} name @param {string | undefined} peerId */
export function isChatDisplayNamePending(name, peerId) {
  const n = String(name || '').trim();
  return (!n || n === 'Chat') && !!peerId;
}

/**
 * @param {number} bytes
 */
export function formatFileSize(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n < 0) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
