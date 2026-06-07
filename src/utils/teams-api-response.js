/**
 * Normalize GET /api/teams/getTeams payloads.
 *
 * @param {unknown} res
 * @returns {Array<Record<string, unknown>>}
 */
export function normalizeTeamsList(res) {
  if (Array.isArray(res)) return res;
  if (res && typeof res === 'object' && Array.isArray(/** @type {any} */ (res).teams)) {
    return /** @type {any} */ (res).teams;
  }
  if (res && typeof res === 'object' && Array.isArray(/** @type {any} */ (res).data)) {
    return /** @type {any} */ (res).data;
  }
  if (res && typeof res === 'object' && Array.isArray(/** @type {any} */ (res).rows)) {
    return /** @type {any} */ (res).rows;
  }
  return [];
}
