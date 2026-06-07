import React from 'react';
import { Animated, Easing, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useThemeOptional } from '@/context/theme-context';
import { cn } from '@/theme/cn';

const ShimmerCtx = React.createContext(null);

function useSkeletonPalette() {
  const theme = useThemeOptional();
  return {
    base: theme?.colors?.skeletonBase ?? '#eef2f7',
    highlight: theme?.colors?.skeletonHighlight ?? '#ffffff',
    edge: theme?.colors?.surfaceMuted ?? '#f8fafc',
  };
}

export function SkeletonGroup({ children, speedMs = 1400, delayMs = 0 }) {
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

export function SkeletonBox({ width = '100%', height = 14, radius = 10, style, className }) {
  const ctx = React.useContext(ShimmerCtx);
  const palette = useSkeletonPalette();
  const x = ctx?.x;
  const ready = ctx?.ready ?? true;
  const translateX = x ? x.interpolate({ inputRange: [-1, 1], outputRange: [-260, 260] }) : 0;

  return (
    <View
      className={cn('overflow-hidden', className)}
      style={[{ width, height, borderRadius: radius, backgroundColor: palette.base }, style]}>
      {ready ? (
        <Animated.View
          className="absolute bottom-0 top-0 w-[260px] opacity-70"
          style={{ transform: [{ translateX }] }}>
          <LinearGradient
            colors={[palette.edge, palette.highlight, palette.edge]}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
          />
        </Animated.View>
      ) : (
        <View className="absolute inset-0 bg-white/[0.06]" />
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
    <View className="flex-row gap-3">
      <SkeletonBox width={primaryW} height={44} radius={14} />
      <SkeletonBox width={secondaryW} height={44} radius={14} />
    </View>
  );
}

export function SkeletonListRow({ withIcon = true }) {
  return (
    <View className="flex-row items-center gap-3 border-b border-[#eef2f7] px-3 py-3">
      {withIcon ? <SkeletonBox width={42} height={42} radius={21} /> : null}
      <View className="flex-1">
        <SkeletonBox width="64%" height={14} radius={8} />
        <View className="h-2" />
        <SkeletonBox width="92%" height={12} radius={8} />
        <View className="h-1.5" />
        <SkeletonBox width="38%" height={10} radius={8} />
      </View>
    </View>
  );
}

export function SkeletonCardGrid({ cols = 2, rows = 2 }) {
  const total = cols * rows;
  return (
    <View className="flex-row flex-wrap gap-2.5">
      {Array.from({ length: total }, (_, i) => (
        <View key={`c-${i}`} style={{ width: cols === 2 ? '47%' : '100%', flexGrow: 1, minWidth: 140 }}>
          <View className="rounded-2xl border border-[#e2e8f0] bg-card p-3">
            <SkeletonBox width={30} height={30} radius={10} />
            <View className="h-2.5" />
            <SkeletonBox width="64%" height={10} radius={8} />
            <View className="h-2" />
            <SkeletonBox width="40%" height={22} radius={10} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function SkeletonProfileForm() {
  return (
    <View className="gap-3.5">
      <View className="items-center gap-3">
        <SkeletonBox width={116} height={116} radius={58} />
        <SkeletonBox width="44%" height={16} radius={10} />
        <SkeletonBox width="30%" height={12} radius={10} />
      </View>
      <View className="gap-3">
        <View className="rounded-[14px] border border-border-light bg-[#f8fbff] px-3.5 py-3">
          <SkeletonBox width="34%" height={10} radius={8} />
          <View className="h-2.5" />
          <SkeletonBox width="92%" height={14} radius={10} />
        </View>
        <View className="rounded-[14px] border border-border-light bg-[#f8fbff] px-3.5 py-3">
          <SkeletonBox width="26%" height={10} radius={8} />
          <View className="h-2.5" />
          <SkeletonBox width="86%" height={14} radius={10} />
        </View>
        <View className="rounded-[14px] border border-border-light bg-[#f8fbff] px-3.5 py-3">
          <SkeletonBox width="22%" height={10} radius={8} />
          <View className="h-2.5" />
          <SkeletonBox width="74%" height={14} radius={10} />
        </View>
        <SkeletonBox width="100%" height={48} radius={14} />
      </View>
    </View>
  );
}
