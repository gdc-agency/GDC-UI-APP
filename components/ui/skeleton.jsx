import React from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useThemeOptional } from '@/context/theme-context';

const ShimmerCtx = React.createContext(null);

function useSkeletonPalette() {
  const theme = useThemeOptional();
  return {
    base: theme?.colors?.skeletonBase ?? '#eef2f7',
    highlight: theme?.colors?.skeletonHighlight ?? '#ffffff',
    edge: theme?.colors?.surfaceMuted ?? '#f8fafc',
  };
}

export function SkeletonGroup({ children, speedMs = 1650, delayMs = 180 }) {
  const x = React.useRef(new Animated.Value(-1)).current;
  const [ready, setReady] = React.useState(delayMs <= 0);

  React.useEffect(() => {
    let t;
    if (!ready && delayMs > 0) {
      t = setTimeout(() => setReady(true), delayMs);
    }
    return () => {
      if (t) clearTimeout(t);
    };
  }, [delayMs, ready]);

  React.useEffect(() => {
    if (!ready) return undefined;
    x.setValue(-1);
    const loop = Animated.loop(
      Animated.timing(x, {
        toValue: 1,
        duration: speedMs,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [ready, speedMs, x]);

  // When not ready, we still render skeletons but without shimmer movement (professional “response time” feel).
  const value = React.useMemo(() => ({ x, ready }), [x, ready]);
  return <ShimmerCtx.Provider value={value}>{children}</ShimmerCtx.Provider>;
}

export function SkeletonBox({ width = '100%', height = 14, radius = 10, style }) {
  const ctx = React.useContext(ShimmerCtx);
  const palette = useSkeletonPalette();
  const x = ctx?.x;
  const ready = ctx?.ready ?? true;
  const translateX = x ? x.interpolate({ inputRange: [-1, 1], outputRange: [-260, 260] }) : 0;

  return (
    <View style={[styles.box, { width, height, borderRadius: radius, backgroundColor: palette.base }, style]}>
      {ready ? (
        <Animated.View style={[styles.shimmer, { transform: [{ translateX }] }]}>
          <LinearGradient
            colors={[palette.edge, palette.highlight, palette.edge]}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>
      ) : (
        <View style={styles.shimmerStatic} />
      )}
    </View>
  );
}

export function SkeletonText({ lines = 2, widths = ['92%', '72%'], lineH = 12, gap = 8, radius = 8, style }) {
  const w = Array.isArray(widths) ? widths : [];
  return (
    <View style={[{ gap }, style]}>
      {Array.from({ length: lines }, (_, i) => (
        <SkeletonBox key={`l-${i}`} width={w[i] ?? '86%'} height={lineH} radius={radius} />
      ))}
    </View>
  );
}

export function SkeletonButtonRow({ primaryW = '62%', secondaryW = '32%' }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <SkeletonBox width={primaryW} height={44} radius={14} />
      <SkeletonBox width={secondaryW} height={44} radius={14} />
    </View>
  );
}

export function SkeletonListRow({ withIcon = true }) {
  return (
    <View style={styles.listRow}>
      {withIcon ? <SkeletonBox width={42} height={42} radius={21} /> : null}
      <View style={{ flex: 1 }}>
        <SkeletonBox width="64%" height={14} radius={8} />
        <View style={{ height: 8 }} />
        <SkeletonBox width="92%" height={12} radius={8} />
        <View style={{ height: 6 }} />
        <SkeletonBox width="38%" height={10} radius={8} />
      </View>
    </View>
  );
}

export function SkeletonCardGrid({ cols = 2, rows = 2 }) {
  const total = cols * rows;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {Array.from({ length: total }, (_, i) => (
        <View key={`c-${i}`} style={{ width: cols === 2 ? '47%' : '100%', flexGrow: 1, minWidth: 140 }}>
          <View style={styles.card}>
            <SkeletonBox width={30} height={30} radius={10} />
            <View style={{ height: 10 }} />
            <SkeletonBox width="64%" height={10} radius={8} />
            <View style={{ height: 8 }} />
            <SkeletonBox width="40%" height={22} radius={10} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function SkeletonProfileForm() {
  return (
    <View style={{ gap: 14 }}>
      <View style={{ alignItems: 'center', gap: 12 }}>
        <SkeletonBox width={116} height={116} radius={58} />
        <SkeletonBox width="44%" height={16} radius={10} />
        <SkeletonBox width="30%" height={12} radius={10} />
      </View>
      <View style={{ gap: 12 }}>
        <View style={styles.inputSkel}>
          <SkeletonBox width="34%" height={10} radius={8} />
          <View style={{ height: 10 }} />
          <SkeletonBox width="92%" height={14} radius={10} />
        </View>
        <View style={styles.inputSkel}>
          <SkeletonBox width="26%" height={10} radius={8} />
          <View style={{ height: 10 }} />
          <SkeletonBox width="86%" height={14} radius={10} />
        </View>
        <View style={styles.inputSkel}>
          <SkeletonBox width="22%" height={10} radius={8} />
          <View style={{ height: 10 }} />
          <SkeletonBox width="74%" height={14} radius={10} />
        </View>
        <SkeletonBox width="100%" height={48} radius={14} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 260,
    opacity: 0.7,
  },
  shimmerStatic: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 12,
  },
  inputSkel: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbe4fb',
    backgroundColor: '#f8fbff',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});

