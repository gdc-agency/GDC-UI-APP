/** Matches CRM EmployeeAvailabilityView annual leave default. */
export const ANNUAL_LEAVE_DAYS = 24;

/**
 * @param {'today' | '7d' | '30d' | 'month'} preset
 * @returns {{ start: string; end: string }}
 */
export function getAvailabilityLogRange(preset) {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  const toYmd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (preset === 'today') {
    const s = toYmd(end);
    return { start: s, end: s };
  }
  if (preset === 'month') {
    const start = new Date(end.getFullYear(), end.getMonth(), 1);
    return { start: toYmd(start), end: toYmd(end) };
  }
  const days = preset === '7d' ? 7 : 30;
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  return { start: toYmd(start), end: toYmd(end) };
}

/**
 * @param {Array<{ date?: string; status?: string; hours?: number; breaks?: number }>} log
 * @param {string} start
 * @param {string} end
 */
export function filterAvailabilityLogByRange(log, start, end) {
  return (log || []).filter((r) => {
    if (!r?.date) return false;
    if (start && r.date < start) return false;
    if (end && r.date > end) return false;
    return true;
  });
}

/**
 * Personal KPIs derived from attendance log + approved leave (CRM-style).
 * @param {Array<{ date?: string; status?: string; hours?: number; breaks?: number }>} log
 * @param {Array<{ status?: string; from?: string; to?: string; dayCount?: number; employee?: string; gdcId?: string }>} ownLeaves
 * @param {{ gdcId?: string; name?: string }} user
 */
export function computeMyAvailabilityKpis(log, ownLeaves = [], user = {}) {
  const rows = Array.isArray(log) ? log : [];
  let present = 0;
  let absent = 0;
  let leaveDays = 0;
  let totalHours = 0;
  let totalBreaks = 0;
  let overtime = 0;

  for (const row of rows) {
    if (row.status === 'Present') present += 1;
    else if (row.status === 'Leave') leaveDays += 1;
    else if (row.status === 'Absent') absent += 1;
    const h = typeof row.hours === 'number' ? row.hours : 0;
    totalHours += h;
    overtime += Math.max(0, h - 8);
    totalBreaks += Number(row.breaks) || 0;
  }

  const workingDays = present + absent + leaveDays;
  const availabilityRate = workingDays > 0 ? Math.round((present / workingDays) * 100) : 0;
  const avgDailyHours = present > 0 ? totalHours / present : 0;

  const approved = (ownLeaves || []).filter((l) => String(l.status || '').toLowerCase() === 'approved');
  const leaveUsed = approved.reduce((sum, l) => sum + (Number(l.dayCount) || 1), 0);
  const leaveRemaining = Math.max(0, ANNUAL_LEAVE_DAYS - leaveUsed);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = approved
    .map((l) => ({ ...l, startMs: new Date(`${String(l.from || '').slice(0, 10)}T12:00:00`).getTime() }))
    .filter((l) => Number.isFinite(l.startMs) && l.startMs >= today.getTime())
    .sort((a, b) => a.startMs - b.startMs)[0];

  const gdc = String(user?.gdcId || '').trim();
  const name = String(user?.name || '').trim().toLowerCase();

  return {
    present,
    absent,
    leaveDays,
    totalHours,
    totalBreaks,
    overtime,
    workingDays,
    availabilityRate,
    avgDailyHours,
    leaveRemaining,
    leaveUsed,
    upcomingLeave: upcoming
      ? {
          from: upcoming.from,
          to: upcoming.to,
          type: upcoming.type || 'Leave',
        }
      : null,
    matchedUserKey: gdc || name,
  };
}

/**
 * Mon–Sun week strip labels from personal log.
 * @param {Array<{ date?: string; status?: string }>} log
 */
export function buildWeekAvailabilityStrip(log) {
  const now = new Date();
  const day = now.getDay(); // 0 Sun
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() + mondayOffset);

  const byDate = new Map((log || []).map((r) => [r.date, r.status]));
  const days = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const pad = (n) => String(n).padStart(2, '0');
    const ymd = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const isFuture = d > now;
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    let kind = 'absent';
    if (isFuture) kind = 'future';
    else if (isWeekend) kind = 'weekend';
    else {
      const st = byDate.get(ymd);
      if (st === 'Present') kind = 'present';
      else if (st === 'Leave') kind = 'leave';
      else kind = 'absent';
    }
    days.push({
      ymd,
      label: d.toLocaleDateString('en-GB', { weekday: 'short' }),
      dayNum: d.getDate(),
      kind,
      isToday: ymd === `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    });
  }
  return days;
}

/**
 * @param {string | undefined} a
 * @param {string | undefined} b
 */
export function teamsMatch(a, b) {
  const na = String(a || '')
    .trim()
    .toLowerCase();
  const nb = String(b || '')
    .trim()
    .toLowerCase();
  if (!na || !nb || na === '—' || nb === '—') return false;
  return na === nb;
}

/**
 * Format shift API times for schedule cards.
 * @param {Record<string, unknown> | null | undefined} shift
 */
export function formatShiftWindow(shift) {
  const start = String(shift?.shift_start ?? shift?.start ?? '09:00').slice(0, 5);
  const end = String(shift?.shift_end ?? shift?.end ?? '18:00').slice(0, 5);
  const toLabel = (hm) => {
    const [hRaw, mRaw] = String(hm).split(':');
    let h = Number(hRaw);
    const m = Number(mRaw) || 0;
    if (!Number.isFinite(h)) return hm;
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${String(m).padStart(2, '0')} ${ap}`;
  };
  return {
    startLabel: toLabel(start),
    endLabel: toLabel(end),
    breakStartLabel: '01:00 PM',
    breakEndLabel: '02:00 PM',
    rangeLabel: `${toLabel(start)} – ${toLabel(end)}`,
  };
}
