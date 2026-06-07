const base = require('./app.json');

/** arm64 = smallest APK (~99% phones). universal = arm64 + armeabi-v7a for very old 32-bit devices. */
const apkArch = process.env.APK_ARCH || 'arm64';
const reactNativeArchitectures =
  apkArch === 'universal' ? ['arm64-v8a', 'armeabi-v7a'] : ['arm64-v8a'];

const plugins = base.expo.plugins.map((plugin) => {
  if (Array.isArray(plugin) && plugin[0] === 'expo-build-properties') {
    const [, options = {}] = plugin;
    return [
      'expo-build-properties',
      {
        ...options,
        android: {
          ...options.android,
          enableProguardInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
          enablePngCrunchInReleaseBuilds: true,
          reactNativeArchitectures,
        },
      },
    ];
  }
  return plugin;
});

module.exports = {
  expo: {
    ...base.expo,
    plugins,
  },
};
