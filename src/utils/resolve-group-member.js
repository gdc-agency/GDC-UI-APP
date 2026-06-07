/**
 * Resolve group member display from directory (never show raw "User {id}" when avoidable).
 * @param {string} memberId
 * @param {Record<string, { displayName?: string; name?: string; roleLabel?: string; avatarUrl?: string | null }>} directory
 * @param {{ onlineUserIds?: Set<string> }} [opts]
 */
export function resolveGroupMember(memberId, directory, opts = {}) {
  const id = String(memberId || '').trim();
  const dir = directory?.[id];
  const displayName =
    (dir?.displayName && String(dir.displayName).trim()) ||
    (dir?.name && String(dir.name).trim()) ||
    '';
  const online = opts.onlineUserIds?.has(id) ?? false;
  return {
    id,
    displayName: displayName || (id ? `Member` : ''),
    name: displayName || dir?.name || '',
    roleLabel: dir?.roleLabel || '',
    avatarUrl: dir?.avatarUrl || null,
    online,
    hasDirectoryHit: !!displayName,
  };
}

/**
 * @param {string} memberId
 * @param {string} createdById
 * @param {string[]} adminIds
 * @returns {'creator' | 'admin' | 'member'}
 */
export function groupMemberRole(memberId, createdById, adminIds) {
  const id = String(memberId);
  if (createdById && id === String(createdById)) return 'creator';
  if (Array.isArray(adminIds) && adminIds.some((a) => String(a) === id)) return 'admin';
  return 'member';
}
