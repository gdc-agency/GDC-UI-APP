import { apiRequest } from '@/data/api/http';

/**
 * @param {string} token
 */
export async function getTeams(token) {
  return apiRequest('/api/teams/getTeams', { method: 'GET', token });
}

/** Team Leader / Employee: `{ team_name, members }` from Auth service. */
export async function getMyTeamRoster(token) {
  return apiRequest('/api/teams/my-team-roster', { method: 'GET', token });
}

/** Team Leader / Employee: Admin/HR + role-scoped team directory for chat/contact pickers. */
export async function getVisibleDirectory(token) {
  return apiRequest('/api/teams/visible-directory', { method: 'GET', token });
}
