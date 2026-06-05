/** App logo — `assets/images/gdcLogo1.png` (no extra circle/frame in UI). */
export const BRAND_LOGO_SOURCE = require('../assets/images/icon.png');

/** Welcome / login / splash logo frame — slight corner radius, not a circle. */
export const BRAND_LOGO_BORDER_RADIUS = 8;

/** White logo card + image sizing (tight padding, centered). */
export const BRAND_LOGO_FRAME = {
  width: 112,
  height: 112,
  borderRadius: BRAND_LOGO_BORDER_RADIUS,
  padding: 4,
};

/** Short name shown on splash / headers (mockup-style). */
export const BRAND_SHORT_NAME = 'GDC';

export const BRAND_COMPANY_NAME = 'Global Digital Care';
export const BRAND_TAGLINE =
  'Your workplace hub for teams, attendance , and operations — secure, simple, and built for how you work.';

/** Auth / primary blues from `AuthShell` gradient (GDC-Frontend). */
export const BrandColors = {
  pageBg: '#F2F4FC',
  primary: '#0b4da6',
  primaryMid: '#1260c8',
  primaryLight: '#35a4ff',
  /** Deep splash / hero gradient (mockup: rich blue, lighter toward bottom). */
  splashTop: '#062a66',
  splashMid: '#0b4da6',
  splashBottom: '#1e74e8',
  card: '#FFFFFF',
  text: '#0f172a',
  textMuted: '#64748b',
  border: '#D9DEEF',
  inputBg: '#FFFFFF',
  /** Underline inputs on login (light blue). */
  inputUnderline: '#6eb3f7',
};
