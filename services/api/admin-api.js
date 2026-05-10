import { apiRequest } from '@/services/api/http';

/**
 * GET /api/admin/workforceCount
 * @param {string} token
 */
export async function getWorkforceCount(token) {
  return apiRequest('/api/admin/workforceCount', { method: 'GET', token });
}

/**
 * GET /api/admin/pendingUsersCount
 * @param {string} token
 */
export async function getPendingUsersCount(token) {
  return apiRequest('/api/admin/pendingUsersCount', { method: 'GET', token });
}

/**
 * GET /api/admin/pending-users — array of user rows
 * @param {string} token
 */
export async function getPendingUsersList(token) {
  return apiRequest('/api/admin/pending-users', { method: 'GET', token });
}

/**
 * GET /api/admin/Allusers
 * @param {string} token
 * @param {{ approvedOnly?: boolean; pendingOnly?: boolean; role?: string; gdc_id?: string }} [query]
 * @returns {Promise<{ success?: boolean; count?: number; data: object[] }>}
 */
export async function getAllUsers(token, query = {}) {
  const q = new URLSearchParams();
  if (query.approvedOnly) q.set('approvedOnly', 'true');
  if (query.pendingOnly) q.set('pendingOnly', 'true');
  if (query.role) q.set('role', query.role);
  if (query.gdc_id) q.set('gdc_id', query.gdc_id);
  const suffix = q.toString() ? `?${q.toString()}` : '';
  return apiRequest(`/api/admin/Allusers${suffix}`, { method: 'GET', token });
}

/**
 * POST /api/admin/approve-user
 * @param {string} token
 * @param {{ userId: number; role: string }} body — role: employee | hr | team_leader | admin
 */
export async function approveUser(token, body) {
  return apiRequest('/api/admin/approve-user', { method: 'POST', token, body });
}

/**
 * POST /api/admin/reject-user
 * Body must match Swagger: `{ "userId": <number> }` (JSON).
 *
 * @param {string} token
 * @param {{ userId: number }} body
 */
export async function rejectUser(token, body) {
  const userId = Number(body.userId);
  if (!Number.isFinite(userId) || userId < 1) {
    throw new Error('reject-user requires a valid numeric userId');
  }
  return apiRequest('/api/admin/reject-user', {
    method: 'POST',
    token,
    body: { userId },
  });
}

/**
 * PUT /api/admin/update-role/:id
 * @param {string} token
 * @param {number|string} userId
 * @param {{ role: string }} body
 */
export async function updateUserRole(token, userId, body) {
  const id = encodeURIComponent(String(userId));
  return apiRequest(`/api/admin/update-role/${id}`, { method: 'PUT', token, body });
}

/**
 * GET /api/admin/assignable-users
 * @param {string} token
 */
export async function getAssignableUsers(token) {
  return apiRequest('/api/admin/assignable-users', { method: 'GET', token });
}

/**
 * GET /api/admin/departments
 * @param {string} token
 */
export async function listDepartments(token) {
  return apiRequest('/api/admin/departments', { method: 'GET', token });
}

/**
 * POST /api/admin/departments
 * @param {string} token
 * @param {string} name
 */
export async function createDepartment(token, name) {
  return apiRequest('/api/admin/departments', { method: 'POST', token, body: { name } });
}

/**
 * DELETE /api/admin/departments/:name
 * @param {string} token
 * @param {string} name
 */
export async function deleteDepartment(token, name) {
  const enc = encodeURIComponent(name);
  return apiRequest(`/api/admin/departments/${enc}`, { method: 'DELETE', token });
}
