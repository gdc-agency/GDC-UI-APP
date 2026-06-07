const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const fs = require('fs');
const path = require('path');

const projectRoot = __dirname;
const srcRoot = path.join(projectRoot, 'src');

/** @param {string} p */
function isExistingFile(p) {
  try {
    return fs.existsSync(p) && fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

/**
 * Resolve @/ imports from src, with legacy folder name remapping.
 * @param {string} relative
 * @param {string | undefined} platform
 */
function remapAliasRelative(relative) {
  if (relative.startsWith('constants/')) {
    return `data/constants/${relative.slice('constants/'.length)}`;
  }
  if (relative.startsWith('services/')) {
    return `data/${relative.slice('services/'.length)}`;
  }
  if (relative.startsWith('animations/') || relative === 'animations') {
    return relative === 'animations' ? 'theme/animations' : `theme/${relative}`;
  }
  if (relative.startsWith('features/')) {
    return relative.replace('features/', 'screens/').replace('/screens/', '/');
  }
  return relative;
}

function resolveAliasPath(relative, platform) {
  const mapped = remapAliasRelative(relative);
  const roots = [srcRoot, projectRoot];
  const suffixes = [
    platform ? `.${platform}.jsx` : null,
    platform ? `.${platform}.js` : null,
    '.native.jsx',
    '.native.js',
    '.jsx',
    '.js',
    '',
  ].filter(Boolean);

  for (const root of roots) {
    const base = path.join(root, mapped);
    for (const suf of suffixes) {
      const candidate = base + suf;
      if (isExistingFile(candidate)) return path.normalize(candidate);
    }
    for (const ext of ['.jsx', '.js']) {
      const indexFile = path.join(base, `index${ext}`);
      if (isExistingFile(indexFile)) return path.normalize(indexFile);
    }
    if (isExistingFile(base)) return path.normalize(base);
  }

  return null;
}

/**
 * engine.io-client browser aliases for React Native socket.io.
 * @param {*} context
 * @param {string} moduleName
 */
function resolveEngineIoBrowserAliases(context, moduleName) {
  const origin = context.originModulePath;
  if (!origin || typeof moduleName !== 'string') return null;
  const originPosix = origin.split(path.sep).join('/');
  if (!originPosix.includes('/engine.io-client/')) return null;

  const pairs = [
    [/^\.\/websocket\.node\.js$/, './websocket.js'],
    [/^\.\/polling-xhr\.node\.js$/, './polling-xhr.js'],
    [/^\.\/globals\.node\.js$/, './globals.js'],
    [/^\.\.\/globals\.node\.js$/, '../globals.js'],
  ];

  for (const [re, rel] of pairs) {
    if (!re.test(moduleName)) continue;
    const fromDir = path.dirname(origin);
    const candidate = path.normalize(path.join(fromDir, rel));
    if (isExistingFile(candidate)) {
      return { type: 'sourceFile', filePath: candidate };
    }
  }

  if (moduleName === 'ws') {
    const stub = path.join(projectRoot, 'metro-ws-stub.js');
    if (isExistingFile(stub)) {
      return { type: 'sourceFile', filePath: path.normalize(stub) };
    }
  }

  return null;
}

module.exports = (() => {
  const config = getDefaultConfig(projectRoot);
  const defaultResolveRequest = config.resolver.resolveRequest;

  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName.startsWith('@/')) {
      const resolved = resolveAliasPath(moduleName.slice(2), platform);
      if (resolved) return { type: 'sourceFile', filePath: resolved };
    }

    const namedAliases = {
      '@navigation': 'navigation',
      '@components': 'components',
      '@screens': 'screens',
      '@data': 'data',
      '@hooks': 'hooks',
      '@utils': 'utils',
      '@theme': 'theme',
      '@context': 'context',
      '@constants': 'data/constants',
      '@services': 'data',
      '@assets': path.join(projectRoot, 'assets'),
      '@app': path.join(projectRoot, 'app'),
    };

    if (namedAliases[moduleName]) {
      const target = namedAliases[moduleName];
      const resolved = target.includes(path.sep) || target.startsWith(projectRoot)
        ? (isExistingFile(target) ? path.normalize(target) : null)
        : resolveAliasPath(target, platform);
      if (resolved) return { type: 'sourceFile', filePath: resolved };
    }

    const engineIoAlias = resolveEngineIoBrowserAliases(context, moduleName);
    if (engineIoAlias) return engineIoAlias;

    if (typeof defaultResolveRequest === 'function') {
      return defaultResolveRequest(context, moduleName, platform);
    }

    return context.resolveRequest(context, moduleName, platform);
  };

  return withNativeWind(config, { input: './global.css' });
})();
