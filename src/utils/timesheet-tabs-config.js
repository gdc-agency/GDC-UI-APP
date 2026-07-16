import { isAdminRole, isHrRole } from '@/utils/roles';

/**
 * Mirrors GDC-CRM `timesheetTabsForRole` (mobile route slugs + optional tabId).
 * @param {string | null | undefined} role
 * @returns {Array<{ slug: string, tabId?: string, label: string }>}
 */
export function timesheetNavTabsForRole(role) {
  if (isAdminRole(role)) return [];
  if (isHrRole(role)) {
    return [
      { slug: 'timesheet', tabId: 'my-attendance', label: 'My attendance' },
      { slug: 'timesheet', tabId: 'overview', label: 'Overview' },
      { slug: 'clock-records', label: 'Attendance Logs' },
      { slug: 'manual-records', label: 'Manual TimeSheet' },
    ];
  }
  if (String(role || '').trim() === 'Team Leader') {
    return [
      { slug: 'timesheet', tabId: 'my-attendance', label: 'My attendance' },
      { slug: 'timesheet', tabId: 'team-overview', label: 'Team attendance' },
      { slug: 'timesheet', tabId: 'team-records', label: 'Team attendance log' },
    ];
  }
  if (String(role || '').trim() === 'Employee') {
    return [{ slug: 'timesheet', tabId: 'my-attendance', label: 'My attendance' }];
  }
  return [];
}

export function shouldUseAdminTimesheetOverview(role) {
  return isAdminRole(role) || isHrRole(role);
}

/** Default sub-tab when opening Timesheet (CRM `defaultTimesheetTab`). */
export function defaultTimesheetSubTab(role) {
  if (isAdminRole(role)) return 'overview';
  return 'my-attendance';
}
