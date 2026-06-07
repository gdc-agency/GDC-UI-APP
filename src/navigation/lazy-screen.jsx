import React, { Suspense, lazy } from 'react';

import { ScreenLoader } from '../components/ui/screen-loader';

/**
 * Lazy-load a screen module without changing Expo Router file paths.
 * @param {() => Promise<{ default: React.ComponentType<any> }>} loader
 */
export function createLazyScreen(loader) {
  const LazyComponent = lazy(loader);

  return function LazyScreenRoute(props) {
    return (
      <Suspense fallback={<ScreenLoader />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}
