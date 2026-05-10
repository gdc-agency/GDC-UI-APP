/**
 * Normalize admin list/count payloads — gateways or older servers may wrap differently.
 */

/** @param {unknown} res */
export function normalizePendingUsersList(res) {
  if (Array.isArray(res)) return res;
  if (res && typeof res === 'object' && Array.isArray(/** @type {any} */ (res).data)) return /** @type {any} */ (res).data;
  if (res && typeof res === 'object' && Array.isArray(/** @type {any} */ (res).users)) return /** @type {any} */ (res).users;
  if (res && typeof res === 'object' && Array.isArray(/** @type {any} */ (res).rows)) return /** @type {any} */ (res).rows;
  return [];
}

/** @param {unknown} res */
export function normalizeApprovedUsersList(res) {
  if (Array.isArray(res)) return res;
  if (res && typeof res === 'object' && Array.isArray(/** @type {any} */ (res).data)) return /** @type {any} */ (res).data;
  if (res && typeof res === 'object' && Array.isArray(/** @type {any} */ (res).users)) return /** @type {any} */ (res).users;
  if (res && typeof res === 'object' && Array.isArray(/** @type {any} */ (res).rows)) return /** @type {any} */ (res).rows;
  return [];
}

/** Postgres / JSON may return bool in odd shapes. */
export function isVerifiedRow(row) {
  const v = row?.is_verified;
  if (v === true || v === 1 || v === '1') return true;
  if (v === false || v === 0 || v === '0') return false;
  if (typeof v === 'string') {
    const s = v.toLowerCase().trim();
    if (s === 'false' || s === 'f' || s === 'no' || s === '0') return false;
    return s === 'true' || s === 't' || s === 'yes' || s === '1';
  }
  return Boolean(v);
}

export function isApprovedRow(row) {
  const v = row?.is_approved;
  if (v === true || v === 1 || v === '1') return true;
  if (v === false || v === 0 || v === '0') return false;
  if (typeof v === 'string') {
    const s = v.toLowerCase().trim();
    if (s === 'false' || s === 'f' || s === 'no' || s === '0') return false;
    return s === 'true' || s === 't' || s === 'yes' || s === '1';
  }
  return Boolean(v);
}

/** @param {unknown} res */
export function extractWorkforceCount(res) {
  if (res == null || typeof res !== 'object') return null;
  const o = /** @type {Record<string, unknown>} */ (res);
  const nested = o.data && typeof o.data === 'object' ? /** @type {Record<string, unknown>} */ (o.data) : null;
  const v = o.workforce ?? o.workForce ?? nested?.workforce ?? nested?.workForce;
  return v;
}

/** @param {unknown} res */
export function extractPendingUsersCount(res) {
  if (res == null || typeof res !== 'object') return null;
  const o = /** @type {Record<string, unknown>} */ (res);
  const nested = o.data && typeof o.data === 'object' ? /** @type {Record<string, unknown>} */ (o.data) : null;
  const v =
    o.pendingUsers ??
    o.pending_users ??
    o.pendingUserCount ??
    nested?.pendingUsers ??
    nested?.pending_users;
  return v;
}
