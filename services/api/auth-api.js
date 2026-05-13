import { apiRequest } from '@/services/api/http';

/** C0 / C1 control chars break JSON if they slip into manually built bodies; strip for login. */
function stripControlsForJson(s) {
  return String(s ?? '').replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
}

/**
 * POST /api/auth/login
 * @param {{ email: string; password: string }} credentials
 * @returns {Promise<{ message: string; token: string; user: object }>}
 */
export async function login(credentials) {
  const email = stripControlsForJson(credentials.email).trim();
  const password = stripControlsForJson(credentials.password);
  return apiRequest('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

/** GET /api/auth/users — lightweight user directory used by chat display names. */
export async function listAuthUsers(token) {
  return apiRequest('/api/auth/users', { method: 'GET', token });
}

/**
 * DELETE /api/auth/delete-user/:hashId
 * Removes a user by `users.hash_id` (UUID). Use rows from admin directory (`hash_id` on user objects).
 *
 * @param {string} token
 * @param {string} hashId
 */
export async function deleteUserByHashId(token, hashId) {
  const trimmed = String(hashId ?? '').trim();
  if (!trimmed) {
    throw new Error('hashId is required');
  }
  const id = encodeURIComponent(trimmed);
  return apiRequest(`/api/auth/delete-user/${id}`, { method: 'DELETE', token });
}
