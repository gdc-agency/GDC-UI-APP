import { attendanceApiRequest } from '@/data/api/attendance-http';

/**
 * @param {unknown} data
 */
function extractDataArray(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  const d = /** @type {{ data?: unknown }} */ (data);
  if (Array.isArray(d.data)) return d.data;
  return [];
}

/**
 * @param {unknown} data
 */
function extractRecordRows(data) {
  if (!data || typeof data !== 'object') return [];
  const d = /** @type {{ rows?: unknown }} */ (data);
  return Array.isArray(d.rows) ? d.rows : [];
}

/**
 * @param {string} token
 * @param {{ role?: string; search?: string }} [query]
 */
export async function getAttendance7Days(token, query = {}) {
  const params = new URLSearchParams();
  if (query.role) params.set('role', query.role);
  if (query.search) params.set('search', query.search);
  const qs = params.toString();
  const res = await attendanceApiRequest(`/api/attendance/7-days${qs ? `?${qs}` : ''}`, { token });
  return extractDataArray(res);
}

/**
 * @param {string} token
 * @param {{ role?: string; search?: string; reference_date?: string }} [query]
 */
export async function getAttendance30Days(token, query = {}) {
  const params = new URLSearchParams();
  if (query.role) params.set('role', query.role);
  if (query.search) params.set('search', query.search);
  if (query.reference_date) params.set('reference_date', query.reference_date);
  const qs = params.toString();
  const res = await attendanceApiRequest(`/api/attendance/30-days${qs ? `?${qs}` : ''}`, { token });
  if (!res || typeof res !== 'object') return { period_start: '', period_end: '', users: [] };
  const d = /** @type {{ data?: { period_start?: string; period_end?: string; users?: unknown[] } }} */ (res);
  const inner = d.data && typeof d.data === 'object' ? d.data : d;
  const users = Array.isArray(inner.users) ? inner.users : [];
  return {
    period_start: inner.period_start ?? '',
    period_end: inner.period_end ?? '',
    users,
  };
}

/**
 * @param {string} token
 * @param {{ role?: string; attendance?: string }} [query]
 */
export async function getAttendanceSummary(token, query = {}) {
  const params = new URLSearchParams();
  if (query.role) params.set('role', query.role);
  if (query.attendance) params.set('attendance', query.attendance);
  const qs = params.toString();
  const res = await attendanceApiRequest(`/api/attendanceSummary${qs ? `?${qs}` : ''}`, { token });
  if (!res || typeof res !== 'object') return { users: [], total: 0, present: 0, absent: 0, leave: 0 };
  const d = /** @type {{ data?: { users?: unknown[]; total?: number; present?: number; absent?: number; leave?: number } }} */ (res);
  const inner = d.data && typeof d.data === 'object' ? d.data : /** @type {Record<string, unknown>} */ (res);
  return {
    users: Array.isArray(inner.users) ? inner.users : [],
    total: Number(inner.total) || 0,
    present: Number(inner.present) || 0,
    absent: Number(inner.absent) || 0,
    leave: Number(inner.leave) || 0,
  };
}

/**
 * @param {string} token
 * @param {'today' | '7days' | '30days'} [filter]
 */
export async function getWorkStats(token, filter = '7days') {
  const res = await attendanceApiRequest(`/api/workStats?filter=${encodeURIComponent(filter)}`, { token });
  if (!res || typeof res !== 'object') return { total_minutes: 0 };
  const d = /** @type {{ data?: { total_minutes?: number } }} */ (res);
  return d.data && typeof d.data === 'object' ? d.data : /** @type {{ total_minutes?: number }} */ (res);
}

/** @param {string} token */
export async function getClockHistory(token) {
  const res = await attendanceApiRequest('/api/clockHistory', { token });
  return extractDataArray(res);
}

/** @param {string} token */
export async function getMyTodayStatus(token) {
  const res = await attendanceApiRequest('/api/today-status', { token });
  if (!res || typeof res !== 'object') return null;
  const d = /** @type {{ data?: Record<string, unknown> }} */ (res);
  return d.data && typeof d.data === 'object' ? d.data : null;
}

/**
 * @param {string} token
 * @param {{ role?: string; from?: string; to?: string; gdc_id?: string; id?: string; department?: string }} [query]
 */
export async function getClockRecords(token, query = {}) {
  const params = new URLSearchParams();
  if (query.role) params.set('role', query.role);
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.gdc_id) params.set('gdc_id', query.gdc_id);
  if (query.id) params.set('id', query.id);
  if (query.department) params.set('department', query.department);
  const qs = params.toString();
  const res = await attendanceApiRequest(`/api/clock-records${qs ? `?${qs}` : ''}`, { token });
  return extractRecordRows(res);
}

/**
 * @param {string} token
 * @param {{ role?: string; from?: string; to?: string; status?: string; gdc_id?: string; id?: string; department?: string }} [query]
 */
export async function getManualTimesheetRecords(token, query = {}) {
  const params = new URLSearchParams();
  if (query.role) params.set('role', query.role);
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.status) params.set('status', query.status);
  if (query.gdc_id) params.set('gdc_id', query.gdc_id);
  if (query.id) params.set('id', query.id);
  if (query.department) params.set('department', query.department);
  const qs = params.toString();
  const res = await attendanceApiRequest(`/api/manual-timesheet${qs ? `?${qs}` : ''}`, { token });
  return extractRecordRows(res);
}

/** @param {string} token */
export async function listLeaveRequests(token) {
  const res = await attendanceApiRequest('/api/getLeave', { token });
  return Array.isArray(res) ? res : [];
}

/** @param {string} token */
export async function listManualTimeRequests(token) {
  const res = await attendanceApiRequest('/api/getManualTime', { token });
  return Array.isArray(res) ? res : [];
}

/**
 * @param {string} token
 * @param {{ leave_type: string; start_date: string; end_date: string; reason?: string }} body
 */
export async function createLeaveRequest(token, body) {
  return attendanceApiRequest('/api/createLeave', { method: 'POST', token, body });
}

/**
 * @param {string} token
 * @param {{ date: string; check_in?: string; check_out?: string; break_in?: string; break_out?: string; reason?: string }} body
 */
export async function createManualTimeRequest(token, body) {
  return attendanceApiRequest('/api/createManualTime', { method: 'POST', token, body });
}

/** @param {string} token @param {string} id */
export async function approveLeaveRequest(token, id) {
  return attendanceApiRequest(`/api/approveLeave/${encodeURIComponent(id)}`, { method: 'PUT', token });
}

/**
 * @param {string} token
 * @param {string} id
 * @param {{ rejection_reason: string }} body
 */
export async function rejectLeaveRequest(token, id, body) {
  return attendanceApiRequest(`/api/rejectLeave/${encodeURIComponent(id)}`, { method: 'PUT', token, body });
}

/** @param {string} token @param {string} id */
export async function approveManualTimeRequest(token, id) {
  return attendanceApiRequest(`/api/approveManualTime/${encodeURIComponent(id)}`, { method: 'PUT', token });
}

/**
 * @param {string} token
 * @param {string} id
 * @param {{ rejection_reason: string }} body
 */
export async function rejectManualTimeRequest(token, id, body) {
  return attendanceApiRequest(`/api/rejectManualTime/${encodeURIComponent(id)}`, { method: 'PUT', token, body });
}

/**
 * @param {string} token
 * @param {{ shift_start: string; shift_end: string; effective_date: string }} body
 */
export async function saveShiftTiming(token, body) {
  return attendanceApiRequest('/api/shift-timing', { method: 'POST', token, body });
}

/** @param {string} token */
export async function getCurrentShift(token) {
  return attendanceApiRequest('/api/current-shift', { token });
}
