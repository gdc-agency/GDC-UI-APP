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

module.exports = (() => {
  const config = getDefaultConfig(projectRoot);

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

    return context.resolveRequest(context, moduleName, platform);
  };

  return config;
})();
