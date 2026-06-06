/**
 * One-time helper to wrap static style modules with theme factories.
 * Run: node scripts/convert-themed-styles.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function convertRouteDetailStyles() {
  const file = path.join(root, 'components/dashboard/route-modules/route-detail-styles.js');
  let s = fs.readFileSync(file, 'utf8');
  s = s.replace(
    /import \{ BrandColors \} from '@\/constants\/brand';\nimport \{ StyleSheet \} from 'react-native';\n\nconst styles = StyleSheet\.create\(/,
    "import { StyleSheet } from 'react-native';\n\n/** @param {import('@/constants/themes').AppThemeColors} c */\nexport function createRouteDetailStyles(c) {\n  return StyleSheet.create(",
  );
  s = s.replace(/BrandColors\.(\w+)/g, 'c.$1');
  s = s.replace(/backgroundColor: '#fff'/gi, 'backgroundColor: c.card');
  s = s.replace(/backgroundColor: '#ffffff'/gi, 'backgroundColor: c.card');
  s = s.replace(/backgroundColor: '#FFFFFF'/gi, 'backgroundColor: c.card');
  s = s.replace(/color: '#0f172a'/gi, 'color: c.text');
  s = s.replace(/color: '#0F172A'/g, 'color: c.text');
  s = s.replace(/borderColor: '#dbe4fb'/gi, 'borderColor: c.borderLight');
  s = s.replace(/borderColor: '#e2e8f0'/gi, 'borderColor: c.borderStrong');
  s = s.replace(/\}\);\nexport default styles;/, '});\n}\n');
  fs.writeFileSync(file, s);
}

function convertPaletteStyles(fileRel, colorsFn, stylesFn, colorsConst, stylesConst, extraImport = '') {
  const file = path.join(root, fileRel);
  let s = fs.readFileSync(file, 'utf8');

  if (extraImport) {
    s = s.replace(extraImport, '');
  }

  s = s.replace(
    new RegExp(`export const ${colorsConst} = \\{[\\s\\S]*?\\};\\n\\n`),
    '',
  );

  s = s.replace(
    new RegExp(`export const ${stylesConst} = StyleSheet\\.create\\(`),
    `/** @param {import('@/constants/themes').AppThemeColors} c */\nexport function ${stylesFn}(c) {\n  const ${colorsConst} = ${colorsFn}(c);\n  return StyleSheet.create(`,
  );

  s = s.replace(/\}\);\s*$/, `});\n}\n`);

  if (!s.includes(colorsFn)) {
    s = `import { ${colorsFn} } from '@/constants/themed-palettes';\n${s}`;
  }

  fs.writeFileSync(file, s);
}

convertRouteDetailStyles();
convertPaletteStyles(
  'components/dashboard/route-modules/timesheet-styles.js',
  'getTsColors',
  'createTimesheetStyles',
  'TsColors',
  'timesheetStyles',
);
convertPaletteStyles(
  'components/dashboard/route-modules/request-styles.js',
  'getRqColors',
  'createRequestStyles',
  'RqColors',
  'requestStyles',
);
convertPaletteStyles(
  'components/dashboard/route-modules/availability-styles.js',
  'getAvColors',
  'createAvailabilityStyles',
  'AvColors',
  'availabilityStyles',
);

// timesheet-tl-styles special case
{
  const file = path.join(root, 'components/dashboard/route-modules/timesheet-tl-styles.js');
  let s = fs.readFileSync(file, 'utf8');
  s = s.replace(/import \{ TsColors \} from '\.\/timesheet-styles';\n\n/, '');
  s = s.replace(/export const TlColors = \{[\s\S]*?\};\n\n/, '');
  s = s.replace(
    /export const tlStyles = StyleSheet\.create\(/,
    "import { getTlColors } from '@/constants/themed-palettes';\nimport { getTsColors } from '@/constants/themed-palettes';\n\n/** @param {import('@/constants/themes').AppThemeColors} c */\nexport function createTlStyles(c) {\n  const TlColors = getTlColors(c);\n  const TsColors = getTsColors(c);\n  return StyleSheet.create(",
  );
  s = s.replace(/\}\);\s*$/, `});\n}\n`);
  fs.writeFileSync(file, s);
}

console.log('Themed style modules converted.');
