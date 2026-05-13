/**
 * expo-status-bar ships a tsconfig meant for the Expo monorepo (extends expo-module-scripts).
 * In a consumer app that breaks the TS language service when those files are opened.
 * Replace with a config that extends the installed `expo` package base.
 */
const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'node_modules', 'expo-status-bar', 'tsconfig.json');
const fixed = {
  extends: '../expo/tsconfig.base.json',
  compilerOptions: {
    noEmit: true,
  },
  include: ['./src/**/*.ts', './src/**/*.tsx'],
  exclude: ['**/__mocks__/*', '**/__tests__/*', '**/__rsc_tests__/*'],
};

try {
  if (!fs.existsSync(path.dirname(target))) {
    process.exit(0);
  }
  fs.writeFileSync(target, `${JSON.stringify(fixed, null, 2)}\n`, 'utf8');
  // eslint-disable-next-line no-console
  console.log('[postinstall] Patched expo-status-bar/tsconfig.json for IDE TypeScript.');
} catch (e) {
  // eslint-disable-next-line no-console
  console.warn('[postinstall] Could not patch expo-status-bar/tsconfig.json:', e.message);
}
