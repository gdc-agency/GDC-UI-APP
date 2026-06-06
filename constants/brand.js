import { lightTheme } from './themes';

/** Circular GDC emblem — splash / login screens. */
export const BRAND_LOGO_SOURCE = require('../assets/images/brand-logo.png');

/** Topbar & drawer — same emblem, compact size. */
export const BRAND_NAV_LOGO_SOURCE = require('../assets/images/nav-logo.png');

/** Welcome / login logo card — white tile, 14px corners, full emblem visible. */
export const BRAND_LOGO_FRAME = {
  width: 120,
  height: 120,
  borderRadius: 14,
  padding: 10,
  backgroundColor: '#FFFFFF',
};

/** Short name shown on splash / headers (mockup-style). */
export const BRAND_SHORT_NAME = 'GDC';

export const BRAND_COMPANY_NAME = 'Global Digital Care';
export const BRAND_TAGLINE =
  'Your workplace hub for teams, attendance , and operations — secure, simple, and built for how you work.';

/** @deprecated Prefer `useTheme().colors` — kept for gradual migration. */
export const BrandColors = lightTheme;
