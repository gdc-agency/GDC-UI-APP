const { getDefaultConfig } = require('expo/metro-config');
const fs = require('fs');
const path = require('path');

const projectRoot = __dirname;

/** @param {string} p */
function isExistingFile(p) {
  try {
    return fs.existsSync(p) && fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

/**
 * engine.io-client ships `build/cjs/package.json` "browser" aliases (websocket.node → websocket, etc.).
 * Metro does not always apply those for nested relative requires, which pulls in Node's `ws` and breaks RN.
 * @param {*} context Metro resolution context
 * @param {string} moduleName
 * @returns {{ type: 'sourceFile', filePath: string } | null}
 */
function resolveEngineIoBrowserAliases(context, moduleName) {
  const origin = context.originModulePath;
  if (!origin || typeof moduleName !== 'string') return null;
  const originPosix = origin.split(path.sep).join('/');
  if (!originPosix.includes('/engine.io-client/')) return null;

  /** @type {Array<[RegExp, string]>} */
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
      const relative = moduleName.slice(2);
      const base = path.join(projectRoot, relative);

      const suffixes = [
        '',
        platform ? `.${platform}.jsx` : null,
        platform ? `.${platform}.js` : null,
        '.native.jsx',
        '.native.js',
        '.jsx',
        '.js',
      ].filter(Boolean);

      for (const suf of suffixes) {
        const candidate = base + suf;
        if (isExistingFile(candidate)) {
          return { type: 'sourceFile', filePath: path.normalize(candidate) };
        }
      }

      for (const ext of ['.jsx', '.js']) {
        const indexFile = path.join(base, `index${ext}`);
        if (isExistingFile(indexFile)) {
          return { type: 'sourceFile', filePath: path.normalize(indexFile) };
        }
      }

      if (isExistingFile(base)) {
        return { type: 'sourceFile', filePath: path.normalize(base) };
      }
    }

    const engineIoAlias = resolveEngineIoBrowserAliases(context, moduleName);
    if (engineIoAlias) return engineIoAlias;

    if (typeof defaultResolveRequest === 'function') {
      return defaultResolveRequest(context, moduleName, platform);
    }

    return context.resolveRequest(context, moduleName, platform);
  };

  return config;
})();
