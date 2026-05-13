import React from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * A subtle global shimmer sweep.
 * - Always running (infinite loop)
 * - PointerEvents disabled (never blocks UI)
 * - Low opacity so it feels premium, not distracting
 */
export function ShimmerSweep({ opacity = 0.09, durationMs = 2200, style }) {
  const { width, height } = useWindowDimensions();
  const translateX = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const w = Math.max(320, width);
    translateX.setValue(-w);
    const loop = Animated.loop(
      Animated.timing(translateX, {
        toValue: w,
        duration: durationMs,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [durationMs, translateX, width]);

  // Wider than screen so edges stay soft.
  const beamW = Math.max(220, Math.round(width * 0.55));
  const beamH = Math.max(520, height);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.root, style]}>
      <Animated.View
        style={[
          styles.beam,
          {
            width: beamW,
            height: beamH,
            opacity,
            transform: [{ translateX }, { rotateZ: '-18deg' }],
          },
        ]}>
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.85)', 'rgba(255,255,255,0)']}
          locations={[0, 0.52, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    zIndex: 5,
  },
  beam: {
    position: 'absolute',
    left: 0,
    top: -120,
  },
});

