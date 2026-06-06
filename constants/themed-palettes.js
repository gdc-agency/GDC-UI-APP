/** Shared surface tokens for module style sheets. @param {import('./themes').AppThemeColors} c */
function sharedSurface(c) {
  const isDark = c.mode === 'dark';
  return {
    inputBg: c.inputBg,
    inputBorder: c.inputBorder,
    inputPlaceholder: c.inputPlaceholder,
    surfaceMuted: c.surfaceMuted,
    surfaceElevated: c.surfaceElevated,
    chipBg: c.chipBg,
    chipActiveBg: c.chipActiveBg,
    chipActiveBorder: c.chipActiveBorder,
    chipActiveText: c.chipActiveText,
    divider: isDark ? c.borderStrong : '#f1f5f9',
    dividerSoft: isDark ? c.borderLight : '#E8EDF3',
    dropdownBg: c.card,
    infoBg: isDark ? '#172554' : '#EFF6FF',
    infoBorder: isDark ? '#1d4ed8' : '#BFDBFE',
    infoText: isDark ? '#93c5fd' : '#1d4ed8',
    segmentActiveBg: isDark ? '#172554' : '#EFF6FF',
    metaBarBg: isDark ? '#172554' : '#EFF6FF',
    metaBarManualBg: isDark ? '#431407' : '#FFF7ED',
    timePanelBg: isDark ? c.surfaceElevated : '#F8FAFC',
    timePanelBorder: isDark ? c.borderLight : '#EEF2F7',
    pillTrackBg: isDark ? c.surfaceMuted : '#F1F5F9',
    tabActiveBg: c.card,
    exportBtnBg: isDark ? '#172554' : '#EFF6FF',
    exportBtnDangerBg: isDark ? '#450a0a' : '#FFF5F5',
    avatarBg: isDark ? '#172554' : '#DBEAFE',
    avatarBorder: isDark ? '#1d4ed8' : '#BFDBFE',
    durationChipBg: isDark ? '#172554' : '#EFF6FF',
    durationChipAmberBg: isDark ? '#431407' : '#FFEDD5',
    heroIconBg: isDark ? c.surfaceElevated : c.card,
  };
}

/** @param {import('./themes').AppThemeColors} c */
export function getTsColors(c) {
  return {
    ...sharedSurface(c),
    blue: c.primaryMid,
    green: '#22C55E',
    red: '#EF4444',
    orange: '#F59E0B',
    purple: '#8B5CF6',
    greenBg: c.mode === 'dark' ? '#052e16' : '#DCFCE7',
    greenText: c.mode === 'dark' ? '#86efac' : '#15803D',
    redBg: c.mode === 'dark' ? '#450a0a' : '#FEE2E2',
    redText: c.mode === 'dark' ? '#fca5a5' : '#B91C1C',
    amberBg: c.mode === 'dark' ? '#431407' : '#FFEDD5',
    amberText: c.mode === 'dark' ? '#fdba74' : '#C2410C',
    border: c.borderStrong,
    bg: c.pageBg,
    text: c.text,
    textMuted: c.textMuted,
    white: c.card,
  };
}

/** @param {import('./themes').AppThemeColors} c */
export function getRqColors(c) {
  return {
    ...sharedSurface(c),
    blue: c.primaryMid,
    green: '#16A34A',
    greenBg: c.mode === 'dark' ? '#052e16' : '#DCFCE7',
    greenText: c.mode === 'dark' ? '#86efac' : '#15803D',
    red: '#DC2626',
    redBg: c.mode === 'dark' ? '#450a0a' : '#FEE2E2',
    redText: c.mode === 'dark' ? '#fca5a5' : '#B91C1C',
    amber: '#F59E0B',
    amberBg: c.mode === 'dark' ? '#451a03' : '#FEF3C7',
    amberText: c.mode === 'dark' ? '#fcd34d' : '#B45309',
    bg: c.pageBg,
    card: c.card,
    text: c.text,
    textMuted: c.textMuted,
    white: c.card,
    border: c.borderStrong,
  };
}

/** @param {import('./themes').AppThemeColors} c */
export function getAvColors(c) {
  return {
    ...sharedSurface(c),
    blue: c.primaryMid,
    green: '#16A34A',
    greenBg: c.mode === 'dark' ? '#052e16' : '#DCFCE7',
    greenText: c.mode === 'dark' ? '#86efac' : '#15803D',
    red: '#DC2626',
    redBg: c.mode === 'dark' ? '#450a0a' : '#FEE2E2',
    orange: '#EA580C',
    orangeBg: c.mode === 'dark' ? '#431407' : '#FFEDD5',
    orangeText: c.mode === 'dark' ? '#fdba74' : '#C2410C',
    purple: '#7C3AED',
    border: c.borderStrong,
    bg: c.pageBg,
    card: c.card,
    text: c.text,
    textMuted: c.textMuted,
    white: c.card,
  };
}

/** @param {import('./themes').AppThemeColors} c */
export function getTlColors(c) {
  return {
    ...sharedSurface(c),
    indigo: '#4F46E5',
    indigoLight: c.mode === 'dark' ? '#1e1b4b' : '#EEF2FF',
    violet: '#7C3AED',
    slate: c.textMuted,
    border: c.borderStrong,
    card: c.card,
    bg: c.pageBg,
  };
}
