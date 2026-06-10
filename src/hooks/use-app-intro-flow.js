import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const INTRO_SEEN_KEY = '@gdc/splash_intro_seen';

const SPLASH_MS = 1500;
const LOADING_MS = 2600;

/**
 * App open sequence:
 * splash (brand) → loading (first install only) → welcome
 */
export function useAppIntroFlow(hydrated) {
  const [phase, setPhase] = useState('splash');
  const [isFirstLaunch, setIsFirstLaunch] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const seen = await AsyncStorage.getItem(INTRO_SEEN_KEY);
      if (!cancelled) setIsFirstLaunch(!seen);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated || isFirstLaunch === null) return undefined;

    if (phase === 'splash') {
      const timer = setTimeout(() => {
        setPhase(isFirstLaunch ? 'loading' : 'welcome');
      }, SPLASH_MS);
      return () => clearTimeout(timer);
    }

    if (phase === 'loading') {
      const timer = setTimeout(async () => {
        await AsyncStorage.setItem(INTRO_SEEN_KEY, '1');
        setPhase('welcome');
      }, LOADING_MS);
      return () => clearTimeout(timer);
    }

    return undefined;
  }, [phase, hydrated, isFirstLaunch]);

  return {
    phase,
    flowReady: hydrated && isFirstLaunch !== null,
  };
}
