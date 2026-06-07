import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, '../src/screens/chat/messages-screen.jsx');
let c = fs.readFileSync(filePath, 'utf8');

if (!c.includes("messages-tw")) {
  c = c.replace(
    "import { useTheme } from '@/context/theme-context';",
    "import { useTheme } from '@/context/theme-context';\nimport { cn } from '@/theme/cn';\nimport { tw } from '@/theme/messages-tw';",
  );
}

c = c.replace(/,\s*StyleSheet/g, '');
c = c.replace(/StyleSheet,\s*/g, '');

const blockStart = '  const styles = useMemo(() => StyleSheet.create({';
const blockEnd = '  }), [colors, chatTheme]);';
const si = c.indexOf(blockStart);
const ei = c.indexOf(blockEnd, si);
if (si === -1 || ei === -1) {
  console.error('StyleSheet block not found');
  process.exit(1);
}
c = c.slice(0, si) + c.slice(ei + blockEnd.length);

c = c.replace(/function ChatThreadRow\(\{ item, onOpen, onHide, resolvePeerProfile, styles \}\)/g,
  'function ChatThreadRow({ item, onOpen, onHide, resolvePeerProfile })');
c = c.replace(/\n  styles,\n/g, '\n');
c = c.replace(/ styles=\{styles\}/g, '');
c = c.replace(/, styles, colors, chatTheme\]/g, ', colors, chatTheme]');

c = c.replace(/styles\./g, 'tw.');

c = c.replace(
  /const bubbleStyle = \[\n([\s\S]*?)\n  \];/,
  (_, body) => {
    const lines = body
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => l.replace(/,$/, ''));
    return `const bubbleClassName = cn(\n    ${lines.join(',\n    ')}\n  );`;
  },
);

c = c.replace(
  /const textStyles = \[\n([\s\S]*?)\n            \];/,
  (_, body) => {
    const lines = body
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => l.replace(/,$/, ''));
    return `const textClassName = cn(\n              ${lines.join(',\n              ')}\n            );`;
  },
);

c = c.replace(/style=\{bubbleStyle\}/g, 'className={bubbleClassName}');
c = c.replace(/style=\{textStyles\}/g, 'className={textClassName}');
c = c.replace(/style=\{tw\.(\w+)\}/g, 'className={tw.$1}');

function convertStyleArrays(source) {
  return source.replace(/style=\{(\[[\s\S]*?\])\}/g, (full, arrBody) => {
    if (!arrBody.includes('tw.')) return full;
    const hasInlineObject = /\{[^}]*:/.test(arrBody.replace(/tw\.\w+/g, ''));
    const twOnly = !hasInlineObject;
    const inner = arrBody.slice(1, -1).trim();
    if (twOnly) {
      return `className={cn(${inner})}`;
    }
    const parts = [];
    let depth = 0;
    let current = '';
    for (let i = 0; i < inner.length; i += 1) {
      const ch = inner[i];
      if (ch === '{' || ch === '(') depth += 1;
      if (ch === '}' || ch === ')') depth -= 1;
      if (ch === ',' && depth === 0) {
        parts.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    if (current.trim()) parts.push(current.trim());
    const twParts = parts.filter((p) => p.startsWith('tw.'));
    const inlineParts = parts.filter((p) => !p.startsWith('tw.'));
    if (!twParts.length) return full;
    if (!inlineParts.length) return `className={cn(${twParts.join(', ')})}`;
    const classPart = twParts.length ? `className={cn(${twParts.join(', ')})}` : '';
    const stylePart = inlineParts.length === 1
      ? `style={${inlineParts[0]}}`
      : `style={[${inlineParts.join(', ')}]}`;
    return [classPart, stylePart].filter(Boolean).join(' ');
  });
}

c = convertStyleArrays(c);

c = c.replace(/className=\{textClassName\}/g, 'className={textClassName}');
c = c.replace(/<Text style=\{textClassName\}/g, '<Text className={textClassName}');
c = c.replace(/<Text style=\{\[textClassName,/g, '<Text className={cn(textClassName,');

c = c.replace(
  /style=\{\[styles\.paperclipIcon\]\}/g,
  "style={{ transform: [{ rotate: '-45deg' }] }}",
);
c = c.replace(
  /className=\{tw\.paperclipIcon\}/g,
  "style={{ transform: [{ rotate: '-45deg' }] }}",
);

c = c.replace(
  /className=\{tw\.input\}/g,
  "className={tw.input} style={{ paddingTop: Platform.OS === 'ios' ? 12 : 10, paddingBottom: Platform.OS === 'ios' ? 12 : 10, textAlignVertical: 'center', includeFontPadding: false }}",
);

const homeTabStart = '  const homeTabBarStyle = useMemo(';
const homeTabEnd = '    [colors.splashTop],\n  );';
const hsi = c.indexOf(homeTabStart);
const hei = c.indexOf(homeTabEnd, hsi);
if (hsi !== -1 && hei !== -1) {
  c =
    c.slice(0, hsi) +
    "  const homeTabBarClassName =\n    'absolute left-0 right-0 bottom-0 h-[82px] rounded-t-[26px] bg-splash-top border border-[rgba(96,165,250,0.2)] px-3.5 pt-3 pb-3.5 shadow-md elevation-[12]';\n" +
    c.slice(hei + homeTabEnd.length);
  c = c.replace(/tabBarStyle=\{homeTabBarStyle\}/g, 'tabBarClassName={homeTabBarClassName}');
}

fs.writeFileSync(filePath, c);
console.log('Migrated messages-screen.jsx');
