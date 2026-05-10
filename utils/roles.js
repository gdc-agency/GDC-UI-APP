/** Case-insensitive: session/JWT may use `admin`, `Admin`, etc. */
export function isAdminRole(role) {
  const r = String(role || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
  return r === 'admin';
}

export function isHrRole(role) {
  return String(role || '').toLowerCase().trim() === 'hr';
}

export function isAdminOrHrRole(role) {
  return isAdminRole(role) || isHrRole(role);
}
