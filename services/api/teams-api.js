import { apiRequest } from '@/services/api/http';

/**
 * @param {string} token
 */
export async function getTeams(token) {
  return apiRequest('/api/teams/getTeams', { method: 'GET', token });
}
