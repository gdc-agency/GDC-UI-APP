import { apiRequest } from '@/data/api/http';

/**
 * @param {Record<string, string | number | undefined | null>} params
 */
function buildQuery(params) {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    if (value === undefined || value === null || value === '') continue;
    q.set(key, String(value));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

/**
 * GET /api/client-portal/clients
 * @param {string} token
 * @param {{ page?: number; limit?: number; search?: string; status?: string }} [params]
 */
export async function listPortalClients(token, params = {}) {
  return apiRequest(`/api/client-portal/clients${buildQuery(params)}`, { method: 'GET', token });
}

/**
 * GET /api/client-portal/stats
 * @param {string} token
 */
export async function getPortalOrgStats(token) {
  return apiRequest('/api/client-portal/stats', { method: 'GET', token });
}

/**
 * POST /api/client-portal/clients
 * @param {string} token
 * @param {{ companyName: string; contactEmail: string; contactName?: string; contactPhone?: string; notes?: string }} body
 */
export async function createPortalClient(token, body) {
  return apiRequest('/api/client-portal/clients', { method: 'POST', token, body });
}

/**
 * DELETE /api/client-portal/clients/:id
 * @param {string} token
 * @param {string|number} id
 */
export async function deletePortalClient(token, id) {
  return apiRequest(`/api/client-portal/clients/${encodeURIComponent(String(id))}`, {
    method: 'DELETE',
    token,
  });
}

/**
 * POST /api/client-portal/clients/:id/invite
 * @param {string} token
 * @param {string|number} id
 * @param {string} [email]
 */
export async function invitePortalClient(token, id, email) {
  return apiRequest(`/api/client-portal/clients/${encodeURIComponent(String(id))}/invite`, {
    method: 'POST',
    token,
    body: email ? { email } : {},
  });
}

/**
 * POST /api/client-portal/clients/:id/shares
 * @param {string} token
 * @param {string|number} clientId
 * @param {{ shareType: string; title: string; summary?: string }} body
 */
export async function createPortalShare(token, clientId, body) {
  return apiRequest(`/api/client-portal/clients/${encodeURIComponent(String(clientId))}/shares`, {
    method: 'POST',
    token,
    body,
  });
}
