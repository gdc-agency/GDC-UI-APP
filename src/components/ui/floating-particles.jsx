import React, { useMemo, useState } from 'react';
import { Animated, Easing, Platform, View, useWindowDimensions } from 'react-native';

import { useTheme } from '@/context/theme-context';
import { cn } from '@/theme/cn';
import { mergeStyle } from '@/utils/merge-style';

function makeRng(seed) {
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

/** Mixed bubble sizes like the original StyleSheet version. */
const SIZE_POOL = [3, 4, 5, 6, 8, 10, 12, 14, 17, 20];

function pickSize(rand) {
  return SIZE_POOL[Math.floor(rand() * SIZE_POOL.length)];
}

/**
 * @param {number} size
 * @param {string} primaryLight
 */
function bubbleStyle(size, primaryLight) {
  const radius = size / 2;
  return {
    width: size,
    height: size,
    borderRadius: radius,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: Platform.OS === 'android' ? 1 : 0,
    borderColor: 'rgba(125,211,252,0.55)',
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: primaryLight,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.9,
          shadowRadius: Math.max(4, size * 0.85),
        }
      : null),
  };
}

/**
 * Magical particle overlay — pointerEvents disabled so taps pass through.
 * @param {{
 *   density?: number;
 *   seed?: number;
 *   style?: import('react-native').ViewStyle;
 *   className?: string;
 *   rising?: boolean;
 *   twinkles?: boolean;
 *   variant?: 'full' | 'tabBar';
 * }} props
 */
export function FloatingParticles({
  density = 1,
  seed = 1337,
  style,
  className,
  rising = true,
  twinkles = true,
  variant = 'full',
}) {
  const { colors } = useTheme();
  const { width: windowW, height: windowH } = useWindowDimensions();
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const risingRef = React.useRef(null);
  const twinkleRef = React.useRef(null);

  const regionW = layout.width > 0 ? layout.width : windowW;
  const regionH =
    layout.height > 0 ? layout.height : variant === 'tabBar' ? Math.max(64, windowH * 0.12) : windowH;

  if (!risingRef.current) {
    const rand = makeRng(seed);
    const count = Math.round((variant === 'tabBar' ? 14 : 18) * density);
    risingRef.current = Array.from({ length: count }, (_, i) => {
      const size = pickSize(rand);
      const left = rand();
      const drift = -18 + rand() * 36;
      const duration = 2400 + Math.round(rand() * 2800);
      const delay = Math.round(rand() * 850) + (i % 5) * 90;
      const progress = new Animated.Value(0);
      const phase = rand();
      return { size, left, drift, duration, delay, progress, phase };
    });
  }

  if (!twinkleRef.current) {
    const rand = makeRng(seed + 42);
    const count = Math.round((variant === 'tabBar' ? 12 : 14) * density);
    twinkleRef.current = Array.from({ length: count }, (_, i) => {
      const size = pickSize(rand);
      const x = rand();
      const y = variant === 'tabBar' ? 0.68 + rand() * 0.3 : 0.12 + rand() * 0.68;
      const duration = 1600 + Math.round(rand() * 2200);
      const delay = Math.round(rand() * 900) + (i % 6) * 120;
      const pulse = new Animated.Value(0);
      const drift = -8 + rand() * 16;
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

  const safeW = Math.max(120, regionW);
  const safeH = Math.max(variant === 'tabBar' ? 48 : 520, regionH);
  const riseStartY = variant === 'tabBar' ? 4 : 18;
  const riseEndY = variant === 'tabBar' ? -Math.min(26, safeH * 0.32) : -60;

  return (
    <View
      pointerEvents="none"
      className={cn('absolute inset-0', className)}
      style={style}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (width > 0 && height > 0) {
          setLayout((prev) =>
            prev.width === width && prev.height === height ? prev : { width, height },
          );
        }
      }}>
      {rising
        ? (risingRef.current ?? []).map((p, idx) => {
            const leftPx = clamp(Math.round(p.left * (safeW - p.size)), 4, safeW - p.size - 4);

            const translateY = p.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [riseStartY, riseEndY - Math.round(p.size * 1.6)],
            });
            const translateX = p.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, p.drift],
            });
            const opacity = p.progress.interpolate({
              inputRange: [0, 0.1, 0.75, 1],
              outputRange: [0, variant === 'tabBar' ? 0.72 : 0.95, variant === 'tabBar' ? 0.4 : 0.55, 0],
            });
            const scale = p.progress.interpolate({
              inputRange: [0, 0.45, 1],
              outputRange: [0.75, 1.05, 1.25],
            });

            return (
              <Animated.View
                key={`r-${idx}`}
                style={mergeStyle(bubbleStyle(p.size, colors.primaryLight), {
                  position: 'absolute',
                  left: leftPx,
                  bottom: 0,
                  opacity,
                  transform: [{ translateX }, { translateY }, { scale }],
                })}
              />
            );
          })
        : null}

      {twinkles
        ? (twinkleRef.current ?? []).map((p, idx) => {
            const x = clamp(Math.round(p.x * (safeW - p.size)), 4, safeW - p.size - 4);
            const y = clamp(Math.round(p.y * (safeH - p.size)), 4, safeH - p.size - 4);

            const opacity = p.pulse.interpolate({
              inputRange: [0, 1],
              outputRange: variant === 'tabBar' ? [0.1, 0.62] : [0.12, 0.88],
            });
            const scale = p.pulse.interpolate({
              inputRange: [0, 1],
              outputRange: [0.7, 1.2],
            });
            const driftX = p.pulse.interpolate({
              inputRange: [0, 1],
              outputRange: [0, p.drift],
            });

            return (
              <Animated.View
                key={`t-${idx}`}
                style={mergeStyle(bubbleStyle(p.size, colors.primaryLight), {
                  position: 'absolute',
                  left: x,
                  top: y,
                  opacity,
                  transform: [{ translateX: driftX }, { scale }],
                })}
              />
            );
          })
        : null}
    </View>
  );
}
