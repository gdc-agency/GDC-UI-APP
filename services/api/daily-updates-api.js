import { taskApiRequest } from '@/services/api/task-http';

/**
 * @param {unknown} data
 * @returns {Array<Record<string, unknown>>}
 */
function extractDataArray(data) {
  if (Array.isArray(data)) return /** @type {Array<Record<string, unknown>>} */ (data);
  if (!data || typeof data !== 'object') return [];
  const d = /** @type {{ data?: unknown }} */ (data);
  if (Array.isArray(d.data)) return /** @type {Array<Record<string, unknown>>} */ (d.data);
  return [];
}

/** @param {string} token */
export async function listMyEmployeeDailyUpdates(token) {
  const res = await taskApiRequest('/api/daily-updates/employee', { token });
  return extractDataArray(res);
}

/**
 * @param {string} token
 * @param {{ date: string; body: string }} body
 */
export async function upsertMyEmployeeDailyUpdate(token, body) {
  return taskApiRequest('/api/daily-updates/employee', { method: 'PUT', token, body });
}

/**
 * @param {string} token
 * @param {string} dateYmd
 */
export async function getTeamLeaderDailyBundle(token, dateYmd) {
  const q = encodeURIComponent(dateYmd);
  return taskApiRequest(`/api/daily-updates/team-leader?date=${q}`, { token });
}

/**
 * @param {string} token
 * @param {{ date: string; body: string }} body
 */
export async function upsertTeamLeaderDailySummary(token, body) {
  return taskApiRequest('/api/daily-updates/team-leader/summary', { method: 'PUT', token, body });
}

/**
 * @param {string} token
 * @param {string} dateYmd
 */
export async function getLeadershipDailyOverview(token, dateYmd) {
  const q = encodeURIComponent(dateYmd);
  return taskApiRequest(`/api/daily-updates/leadership?date=${q}`, { token });
}

/**
 * @param {string} token
 * @param {{ date: string; body: string }} body
 */
export async function upsertHrDailySummary(token, body) {
  return taskApiRequest('/api/daily-updates/hr/summary', { method: 'PUT', token, body });
}
