import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import { BrandColors } from '@/constants/brand';
import { ChatTheme } from '@/constants/chat-theme';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { memo, useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
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

const WA_BG = '#0B141A';
const FAB_SIZE = 52;
/** Same blue as chat composer send button (`ChatTheme.sendBtn`). */
const FAB_GRADIENT = [BrandColors.primaryLight, ChatTheme.sendBtn, BrandColors.primaryMid];
const DOUBLE_TAP_SCALE = 2.5;
const MAX_PINCH_SCALE = 4;

/**
 * @param {{ visible: boolean; uri: string; onClose: () => void; onSend: (caption?: string) => void; sending?: boolean }} props
 */
export function ChatImageSendPreview({ visible, uri, onClose, onSend, sending = false }) {
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();

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
      <StatusBar barStyle="light-content" backgroundColor={WA_BG} />
      <GestureHandlerRootView style={styles.gestureRoot}>
        <View style={[styles.modalHost, { width: screenW, height: screenH }]}>
          <Animated.View style={[styles.backdrop, backdropStyle]} />
          <Animated.View style={[styles.sheet, { width: screenW, height: screenH }, sheetStyle]}>
            <ZoomablePreviewImage
              uri={uri}
              screenW={screenW}
              screenH={screenH}
              onDismiss={closeAnimated}
              dismissEnabled={!sending}
            />

            <View
              style={[styles.headerOverlay, { paddingTop: insets.top + (Platform.OS === 'android' ? 8 : 4) }]}
              pointerEvents="box-none">
              <Pressable
                style={styles.backHit}
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
      <Animated.View style={[styles.imageStage, { width: screenW, height: stageH }]}>
        {loading ? (
          <View style={styles.placeholder}>
            <ActivityIndicator size="large" color="rgba(255,255,255,0.55)" />
          </View>
        ) : null}
        <Animated.View style={[styles.imageWrap, imageAnimStyle]}>
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

const SendFab = memo(function SendFab({ bottom, right, onPress, sending }) {
  const pressScale = useSharedValue(1);

  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  return (
    <Animated.View style={[styles.fabAnchor, { bottom, right }, fabStyle]} pointerEvents="box-none">
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          if (!sending) pressScale.value = withSpring(0.9, { damping: 18, stiffness: 400 });
        }}
        onPressOut={() => {
          pressScale.value = withSpring(1, { damping: 18, stiffness: 400 });
        }}
        disabled={sending}
        style={styles.fabPress}
        accessibilityRole="button"
        accessibilityLabel="Send photo">
        <LinearGradient colors={FAB_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fab}>
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <MaterialCommunityIcons name="send" size={22} color="#fff" style={styles.fabIcon} />
          )}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  modalHost: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: WA_BG,
  },
  sheet: {
    flex: 1,
    backgroundColor: WA_BG,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backHit: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageStage: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: WA_BG,
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WA_BG,
  },
  imageWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabAnchor: {
    position: 'absolute',
    zIndex: 30,
  },
  fabPress: {
    borderRadius: FAB_SIZE / 2,
    ...Platform.select({
      ios: {
        shadowColor: ChatTheme.sendBtn,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabIcon: {
    marginLeft: 2,
    marginTop: 1,
  },
});
