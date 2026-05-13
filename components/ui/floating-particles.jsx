import React from 'react';
import { Animated, Easing, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';

import { BrandColors } from '@/constants/brand';

function makeRng(seed) {
  // simple deterministic PRNG (mulberry32)
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Full-screen magical particles overlay.
 * - Rising particles from bottom (looping)
 * - Twinkle particles around UI (soft pulse, slow drift)
 * pointerEvents is disabled so it never blocks taps.
 */
export function FloatingParticles({ density = 1, seed = 1337, style, rising = true, twinkles = true }) {
  const { width, height } = useWindowDimensions();
  const risingRef = React.useRef(null);
  const twinkleRef = React.useRef(null);

  // Create particles once; keep counts stable to avoid React Compiler edge cases.
  if (!risingRef.current) {
    const rand = makeRng(seed);
    const count = Math.round(18 * density);
    risingRef.current = Array.from({ length: count }, (_, i) => {
      const size = 5 + Math.round(rand() * 10);
      const left = rand() * 1; // normalized; mapped each render
      const drift = -22 + rand() * 44;
      const duration = 2600 + Math.round(rand() * 3000);
      // Important: avoid long "nothing happens" windows on first render.
      // Stagger is small, plus randomness, so some particles start immediately.
      const delay = Math.round(rand() * 850) + (i % 5) * 90;
      const progress = new Animated.Value(0);
      const phase = rand();
      return { size, left, drift, duration, delay, progress, phase };
    });
  }

  if (!twinkleRef.current) {
    const rand = makeRng(seed + 42);
    const count = Math.round(14 * density);
    twinkleRef.current = Array.from({ length: count }, (_, i) => {
      const size = 4 + Math.round(rand() * 7);
      const x = rand() * 1;
      const y = 0.12 + rand() * 0.68; // keep away from very top/bottom
      const duration = 1800 + Math.round(rand() * 2200);
      const delay = Math.round(rand() * 900) + (i % 6) * 120;
      const pulse = new Animated.Value(0);
      const drift = -10 + rand() * 20;
      return { size, x, y, duration, delay, pulse, drift };
    });
  }

  React.useEffect(() => {
    if (!rising) return undefined;
    const risingParticles = risingRef.current ?? [];
    const loops = [];

    risingParticles.forEach((p) => {
      let stopped = false;

      const runOnce = (startDelayMs) => {
        if (stopped) return;
        // Start mid-flight sometimes so particles are visible immediately.
        const startAt = clamp(p.phase ?? 0, 0, 0.92);
        p.progress.setValue(startAt);
        const remaining = Math.max(220, Math.round(p.duration * (1 - startAt)));

        const a = Animated.sequence([
          Animated.delay(startDelayMs),
          Animated.timing(p.progress, {
            toValue: 1,
            duration: remaining,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]);

        a.start(({ finished }) => {
          if (!finished || stopped) return;
          p.progress.setValue(0);
          runOnce(120);
        });

        loops.push({ stop: () => a.stop() });
      };

      runOnce(p.delay);
      loops.push({ stop: () => (stopped = true) });
    });

    return () => loops.forEach((l) => l.stop?.());
  }, [rising]);

  React.useEffect(() => {
    if (!twinkles) return undefined;
    const twinkleParticles = twinkleRef.current ?? [];
    const loops = twinkleParticles.map((p) => {
      p.pulse.setValue(0);
      const loop = Animated.loop(
        Animated.sequence([
          Animated.delay(p.delay),
          Animated.timing(p.pulse, {
            toValue: 1,
            duration: p.duration,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(p.pulse, {
            toValue: 0,
            duration: p.duration,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return loop;
    });
    return () => loops.forEach((l) => l.stop());
  }, [twinkles]);

  const safeW = Math.max(240, width);
  const safeH = Math.max(520, height);

  return (
    <View pointerEvents="none" style={[styles.root, style]}>
      {/* Rising particles */}
      {rising
        ? (risingRef.current ?? []).map((p, idx) => {
        const leftPx = clamp(Math.round(p.left * safeW), 8, safeW - p.size - 8);
        // Smaller start offset so particles appear above tab bar faster.
        const startY = 18;
        const endY = -60 - Math.round(p.size * 2.2);

        const translateY = p.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [startY, endY],
        });
        const translateX = p.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, p.drift],
        });
        const opacity = p.progress.interpolate({
          inputRange: [0, 0.12, 0.82, 1],
          outputRange: [0, 0.9, 0.45, 0],
        });
        // Color/visibility trick: start bright on tab bar, turn sky-blue on white screens.
        // We can’t animate backgroundColor with native driver, so we crossfade 2 layers.
        const whiteLayerOpacity = p.progress.interpolate({
          inputRange: [0, 0.18, 1],
          outputRange: [0.95, 0.2, 0],
        });
        const blueLayerOpacity = p.progress.interpolate({
          inputRange: [0, 0.12, 0.5, 1],
          outputRange: [0, 0.55, 0.75, 0.65],
        });
        const scale = p.progress.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0.9, 1.05, 1.22],
        });

        return (
          <Animated.View
            key={`r-${idx}`}
            style={[
              styles.rising,
              {
                width: p.size,
                height: p.size,
                left: leftPx,
                opacity,
                transform: [{ translateX }, { translateY }, { scale }],
              },
            ]}
          >
            <Animated.View
              style={[
                styles.particleLayer,
                styles.particleWhite,
                { opacity: whiteLayerOpacity },
              ]}
            />
            <Animated.View
              style={[
                styles.particleLayer,
                styles.particleBlue,
                { opacity: blueLayerOpacity },
              ]}
            />
          </Animated.View>
        );
      })
        : null}

      {/* Twinkle particles (around UI/cards/buttons) */}
      {twinkles
        ? (twinkleRef.current ?? []).map((p, idx) => {
        const x = clamp(Math.round(p.x * safeW), 8, safeW - p.size - 8);
        const y = clamp(Math.round(p.y * safeH), 8, safeH - p.size - 8);

        const opacity = p.pulse.interpolate({
          inputRange: [0, 1],
          outputRange: [0.05, 0.55],
        });
        const whiteLayerOpacity = p.pulse.interpolate({
          inputRange: [0, 1],
          outputRange: [0.2, 0],
        });
        const blueLayerOpacity = p.pulse.interpolate({
          inputRange: [0, 1],
          outputRange: [0.25, 0.6],
        });
        const scale = p.pulse.interpolate({
          inputRange: [0, 1],
          outputRange: [0.92, 1.18],
        });
        const driftX = p.pulse.interpolate({
          inputRange: [0, 1],
          outputRange: [0, p.drift],
        });

        return (
          <Animated.View
            key={`t-${idx}`}
            style={[
              styles.twinkle,
              {
                width: p.size,
                height: p.size,
                left: x,
                top: y,
                opacity,
                transform: [{ translateX: driftX }, { scale }],
              },
            ]}
          >
            <Animated.View style={[styles.particleLayer, styles.particleWhite, { opacity: whiteLayerOpacity }]} />
            <Animated.View style={[styles.particleLayer, styles.particleBlueSoft, { opacity: blueLayerOpacity }]} />
          </Animated.View>
        );
      })
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  rising: {
    position: 'absolute',
    bottom: 0,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    shadowColor: BrandColors.primaryLight,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.72,
    shadowRadius: 12,
    ...(Platform.OS === 'android' ? { elevation: 8 } : null),
  },
  twinkle: {
    position: 'absolute',
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    shadowColor: BrandColors.primaryLight,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 10,
    ...(Platform.OS === 'android' ? { elevation: 6 } : null),
  },
  particleLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
  },
  particleWhite: {
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  particleBlue: {
    backgroundColor: 'rgba(56,189,248,0.78)', // sky blue (visible on white screens)
  },
  particleBlueSoft: {
    backgroundColor: 'rgba(56,189,248,0.55)',
  },
});

