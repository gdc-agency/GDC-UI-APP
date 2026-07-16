const fs = require('fs');
const path = require('path');

const base = require('./app.json');

/** arm64 = smallest APK (~99% phones). universal = arm64 + armeabi-v7a for very old 32-bit devices. */
const apkArch = process.env.APK_ARCH || 'arm64';
const reactNativeArchitectures =
  apkArch === 'universal' ? ['arm64-v8a', 'armeabi-v7a'] : ['arm64-v8a'];

const ORG_API = {
  apiMode: 'remote',
  apiBaseUrl: 'https://org-gdc-backend.onrender.com',
  taskApiBaseUrl: 'https://org-task-backend.onrender.com',
  chatApiBaseUrl: 'https://org-chat-backend-rey1.onrender.com',
  attendanceApiBaseUrl: 'https://org-attendence-backend.onrender.com',
  apiPort: 5000,
  taskApiPort: 5001,
  chatApiPort: 5002,
  attendanceApiPort: 5003,
};

function readEnvFile(filePath) {
  /** @type {Record<string, string>} */
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const fileEnv = readEnvFile(path.join(__dirname, '.env'));
const env = { ...fileEnv, ...process.env };

function envOr(key, fallback) {
  const v = String(env[key] ?? '').trim();
  return v || fallback;
}

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
    extra: {
      ...base.expo.extra,
      ...ORG_API,
      apiMode: envOr('EXPO_PUBLIC_API_MODE', ORG_API.apiMode),
      apiBaseUrl: envOr('EXPO_PUBLIC_API_BASE_URL', ORG_API.apiBaseUrl),
      taskApiBaseUrl: envOr('EXPO_PUBLIC_TASK_API_BASE_URL', ORG_API.taskApiBaseUrl),
      chatApiBaseUrl: envOr('EXPO_PUBLIC_CHAT_API_BASE_URL', ORG_API.chatApiBaseUrl),
      attendanceApiBaseUrl: envOr(
        'EXPO_PUBLIC_ATTENDANCE_API_BASE_URL',
        ORG_API.attendanceApiBaseUrl,
      ),
      devLanHost: envOr('EXPO_PUBLIC_DEV_LAN_HOST', ''),
      router: base.expo.extra?.router ?? {},
      eas: base.expo.extra?.eas ?? {},
    },
  },
};
