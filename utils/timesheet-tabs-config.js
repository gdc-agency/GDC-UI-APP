import { isAdminOrHrRole, isAdminRole } from '@/utils/roles';

/** Mirrors GDC-Frontend `timesheetTabsForRole` (route slugs for mobile). */
export function timesheetNavTabsForRole(role) {
  if (isAdminRole(role)) return [];
  const r = String(role || '').trim();
  if (r === 'HR') {
    return [
      { slug: 'timesheet', label: 'Attendance overview' },
      { slug: 'clock-records', label: 'Clock records' },
      { slug: 'manual-records', label: 'Manual timesheet' },
    ];
  }
  if (r === 'Team Leader') {
    return [
      { slug: 'timesheet', tabId: 'my-attendance', label: 'My attendance' },
      { slug: 'timesheet', tabId: 'team-overview', label: 'Team overview' },
      { slug: 'timesheet', tabId: 'team-records', label: 'Team records' },
    ];
  }
  if (r === 'Employee') {
    return [{ slug: 'timesheet', label: 'My attendance' }];
  }
  return [];
}

export function shouldUseAdminTimesheetOverview(role) {
  return isAdminOrHrRole(role);
}
