import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const SPLASH_INTRO_SEEN_KEY = '@gdc/splash_intro_seen';

const FIRST_LAUNCH_MS = 2800;
const RETURNING_MS = 1100;

export function useFirstLaunchSplash(hydrated) {
  const [introDone, setIntroDone] = useState(false);
  const [isFirstLaunch, setIsFirstLaunch] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const seen = await AsyncStorage.getItem(SPLASH_INTRO_SEEN_KEY);
      if (!cancelled) setIsFirstLaunch(!seen);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated || isFirstLaunch === null) return undefined;

    const duration = isFirstLaunch ? FIRST_LAUNCH_MS : RETURNING_MS;
    const timer = setTimeout(async () => {
      if (isFirstLaunch) {
        await AsyncStorage.setItem(SPLASH_INTRO_SEEN_KEY, '1');
      }
      setIntroDone(true);
    }, duration);

    return () => clearTimeout(timer);
  }, [hydrated, isFirstLaunch]);

  return {
    introDone,
    showLoader: isFirstLaunch === true,
    splashReady: isFirstLaunch !== null,
  };
}
