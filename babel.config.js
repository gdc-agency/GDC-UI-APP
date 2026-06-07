const path = require('path');

const projectRoot = __dirname;

module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    plugins: [
      [
        'module-resolver',
        {
          cwd: projectRoot,
          alias: {
            '^@/(.*)$': './src/\\1',
            '@assets': './assets',
            '@app': './app',
            '@components': './src/components',
            '@screens': './src/screens',
            '@navigation': './src/navigation',
            '@data': './src/data',
            '@hooks': './src/hooks',
            '@utils': './src/utils',
            '@theme': './src/theme',
            '@context': './src/context',
            '@constants': './src/data/constants',
            '@services': './src/data',
          },
          extensions: ['.js', '.jsx', '.ios.js', '.android.js', '.ios.jsx', '.android.jsx', '.json'],
        },
      ],
    ],
  };
};
