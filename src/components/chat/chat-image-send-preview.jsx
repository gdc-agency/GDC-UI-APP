import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import { useTheme } from '@/context/theme-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  View,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FAB_SIZE = 52;
const DOUBLE_TAP_SCALE = 2.5;
const MAX_PINCH_SCALE = 4;

/**
 * @param {{ visible: boolean; uri: string; onClose: () => void; onSend: (caption?: string) => void; sending?: boolean }} props
 */
export function ChatImageSendPreview({ visible, uri, onClose, onSend, sending = false }) {
  const { colors, chatTheme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();

  const fabGradient = useMemo(
    () => [colors.primaryLight, chatTheme.sendBtn, colors.primaryMid],
    [colors, chatTheme],
  );

  const fabShadowStyle = Platform.select({
    ios: {
      shadowColor: chatTheme.sendBtn,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
    },
    android: { elevation: 8 },
    default: {},
  });

  const sheetOpacity = useSharedValue(0);
  const sheetScale = useSharedValue(0.94);
  const backdropOpacity = useSharedValue(0);

  const resetEntrance = useCallback(() => {
    sheetOpacity.value = 0;
    sheetScale.value = 0.94;
    backdropOpacity.value = 0;
  }, [backdropOpacity, sheetOpacity, sheetScale]);

  const runClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const closeAnimated = useCallback(() => {
    if (sending) return;
    sheetOpacity.value = withTiming(0, { duration: 220 });
    backdropOpacity.value = withTiming(0, { duration: 220 });
    sheetScale.value = withTiming(0.94, { duration: 220 }, (finished) => {
      if (finished) runOnJS(runClose)();
    });
  }, [sending, backdropOpacity, sheetOpacity, sheetScale, runClose]);

  useEffect(() => {
    if (!visible) {
      resetEntrance();
      return undefined;
    }
    backdropOpacity.value = withTiming(1, { duration: 280 });
    sheetOpacity.value = withTiming(1, { duration: 280 });
    sheetScale.value = withSpring(1, { damping: 22, stiffness: 280 });
    return undefined;
  }, [visible, backdropOpacity, sheetOpacity, sheetScale, resetEntrance]);

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: sheetOpacity.value,
    transform: [{ scale: sheetScale.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const handleSend = useCallback(() => {
    if (sending) return;
    onSend('');
  }, [onSend, sending]);

  if (!uri) return null;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={closeAnimated}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={chatTheme.wallpaper} />
      <GestureHandlerRootView className="flex-1">
        <View className="flex-1 bg-transparent" style={{ width: screenW, height: screenH }}>
          <Animated.View className="absolute inset-0 bg-chat-wallpaper" style={backdropStyle} />
          <Animated.View
            className="flex-1 bg-chat-wallpaper"
            style={[{ width: screenW, height: screenH }, sheetStyle]}>
            <ZoomablePreviewImage
              uri={uri}
              screenW={screenW}
              screenH={screenH}
              onDismiss={closeAnimated}
              dismissEnabled={!sending}
            />

            <View
              className="absolute left-0 right-0 top-0 z-20 flex-row items-center px-2"
              style={{ paddingTop: insets.top + (Platform.OS === 'android' ? 8 : 4) }}
              pointerEvents="box-none">
              <Pressable
                className="h-11 w-11 items-center justify-center"
                onPress={closeAnimated}
                disabled={sending}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Close preview">
                <MaterialCommunityIcons name="arrow-left" size={26} color="#fff" />
              </Pressable>
            </View>

            <SendFab
              bottom={Math.max(insets.bottom, 16) + 12}
              right={16}
              onPress={handleSend}
              sending={sending}
              fabGradient={fabGradient}
              fabShadowStyle={fabShadowStyle}
            />
          </Animated.View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const ZoomablePreviewImage = memo(function ZoomablePreviewImage({
  uri,
  screenW,
  screenH,
  onDismiss,
  dismissEnabled,
}) {
  const [loading, setLoading] = useState(true);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const dismissY = useSharedValue(0);
  const imageOpacity = useSharedValue(0);

  useEffect(() => {
    setLoading(true);
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    dismissY.value = 0;
    imageOpacity.value = 0;
  }, [uri, dismissY, imageOpacity, savedScale, scale, translateX, translateY]);

  const handleLoaded = useCallback(() => {
    setLoading(false);
    imageOpacity.value = withTiming(1, { duration: 320 });
  }, [imageOpacity]);

  const resetZoom = () => {
    'worklet';
    scale.value = withSpring(1);
    savedScale.value = 1;
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(MAX_PINCH_SCALE, Math.max(0.5, savedScale.value * e.scale));
    })
    .onEnd(() => {
      if (scale.value < 1) {
        resetZoom();
      } else if (scale.value > MAX_PINCH_SCALE) {
        scale.value = withSpring(MAX_PINCH_SCALE);
        savedScale.value = MAX_PINCH_SCALE;
      } else {
        savedScale.value = scale.value;
      }
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(280)
    .onEnd(() => {
      if (scale.value > 1.05) {
        resetZoom();
      } else {
        scale.value = withSpring(DOUBLE_TAP_SCALE);
        savedScale.value = DOUBLE_TAP_SCALE;
      }
    });

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onUpdate((e) => {
      if (scale.value <= 1.05) {
        dismissY.value = Math.max(0, e.translationY);
        return;
      }
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (scale.value <= 1.05) {
        const shouldDismiss =
          dismissEnabled && (dismissY.value > 100 || (e.velocityY > 900 && dismissY.value > 40));
        if (shouldDismiss) {
          runOnJS(onDismiss)();
          return;
        }
        dismissY.value = withSpring(0, { damping: 20, stiffness: 280 });
        return;
      }
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    });

  const gestures = Gesture.Simultaneous(pinch, Gesture.Exclusive(doubleTap, pan));

  const imageAnimStyle = useAnimatedStyle(() => {
    const dismissOpacity = 1 - Math.min(1, dismissY.value / 280);
    return {
      opacity: imageOpacity.value * dismissOpacity,
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value + dismissY.value },
        { scale: scale.value },
      ],
    };
  });

  const stageH = screenH;

  return (
    <GestureDetector gesture={gestures}>
      <Animated.View
        className="absolute inset-0 items-center justify-center bg-chat-wallpaper"
        style={{ width: screenW, height: stageH }}>
        {loading ? (
          <View className="absolute inset-0 items-center justify-center bg-chat-wallpaper">
            <ActivityIndicator size="large" color="rgba(255,255,255,0.55)" />
          </View>
        ) : null}
        <Animated.View className="items-center justify-center" style={imageAnimStyle}>
          <Image
            source={{ uri }}
            style={{ width: screenW, height: stageH }}
            contentFit="contain"
            transition={0}
            onLoad={handleLoaded}
            cachePolicy="memory-disk"
          />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
});

const SendFab = memo(function SendFab({ bottom, right, onPress, sending, fabGradient, fabShadowStyle }) {
  const pressScale = useSharedValue(1);

  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  return (
    <Animated.View
      className="absolute z-30"
      style={[{ bottom, right }, fabStyle]}
      pointerEvents="box-none">
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          if (!sending) pressScale.value = withSpring(0.9, { damping: 18, stiffness: 400 });
        }}
        onPressOut={() => {
          pressScale.value = withSpring(1, { damping: 18, stiffness: 400 });
        }}
        disabled={sending}
        className="rounded-full"
        style={[{ borderRadius: FAB_SIZE / 2 }, fabShadowStyle]}
        accessibilityRole="button"
        accessibilityLabel="Send photo">
        <LinearGradient
          colors={fabGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="items-center justify-center"
          style={{ width: FAB_SIZE, height: FAB_SIZE, borderRadius: FAB_SIZE / 2 }}>
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <MaterialCommunityIcons name="send" size={22} color="#fff" style={{ marginLeft: 2, marginTop: 1 }} />
          )}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
});
