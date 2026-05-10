import { apiRequest } from '@/services/api/http';

/**
 * POST /api/auth/login
 * @param {{ email: string; password: string }} credentials
 * @returns {Promise<{ message: string; token: string; user: object }>}
 */
export async function login(credentials) {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    body: {
      email: credentials.email.trim(),
      password: credentials.password,
    },
  });
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
