import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import { useTheme } from '@/context/theme-context';
import { mergeStyle } from '@/utils/merge-style';
import { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SHEET_SLIDE = 360;

/**
 * @param {{
 *   visible: boolean;
 *   onClose: () => void;
 *   onPickGallery: () => void;
 *   onPickFiles: () => void;
 * }} props
 */
export function ChatAttachmentSheet({ visible, onClose, onPickGallery, onPickFiles }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;

  const sheetShadowStyle = Platform.select({
    ios: {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
    },
    android: { elevation: 16 },
    default: {},
  });

  useEffect(() => {
    if (!visible) return undefined;
    progress.setValue(0);
    Animated.spring(progress, {
      toValue: 1,
      useNativeDriver: true,
      stiffness: 340,
      damping: 32,
    }).start();
    return undefined;
  }, [progress, visible]);

  const closeAnimated = useCallback(() => {
    Animated.timing(progress, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onClose();
    });
  }, [onClose, progress]);

  const pickGallery = useCallback(() => {
    closeAnimated();
    setTimeout(() => onPickGallery(), 240);
  }, [closeAnimated, onPickGallery]);

  const pickFiles = useCallback(() => {
    closeAnimated();
    setTimeout(() => onPickFiles(), 240);
  }, [closeAnimated, onPickFiles]);

  const backdropOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const sheetTranslateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [SHEET_SLIDE, 0],
  });

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={closeAnimated}>
      <View className="flex-1 justify-end">
        <Pressable style={StyleSheet.absoluteFill} onPress={closeAnimated} accessibilityRole="button" accessibilityLabel="Close">
          <Animated.View
            pointerEvents="none"
            className="absolute inset-0"
            style={{ backgroundColor: colors.modalBackdrop, opacity: backdropOpacity }}
          />
        </Pressable>

        <Animated.View
          className="rounded-t-[22px] px-6 pt-2.5"
          style={mergeStyle(sheetShadowStyle, {
            backgroundColor: colors.modalSheetBg,
            paddingBottom: Math.max(insets.bottom, 12),
            transform: [{ translateY: sheetTranslateY }],
          })}>
          <View className="mb-[22px] h-1 w-10 self-center rounded-pill bg-border-strong" />

          <View className="flex-row items-start justify-center gap-12 pb-2">
            <Pressable
              className="min-w-[88px] items-center"
              style={({ pressed }) => (pressed ? { opacity: 0.82, transform: [{ scale: 0.96 }] } : undefined)}
              onPress={pickGallery}
              accessibilityRole="button"
              accessibilityLabel="Gallery">
              <View className="mb-2.5 h-16 w-16 items-center justify-center rounded-full bg-[#0d9ef7]">
                <MaterialCommunityIcons name="image-outline" size={28} color="#fff" />
              </View>
              <Text className="text-[15px] font-extrabold tracking-wide" style={{ color: colors.text }}>Gallery</Text>
            </Pressable>

            <Pressable
              className="min-w-[88px] items-center"
              style={({ pressed }) => (pressed ? { opacity: 0.82, transform: [{ scale: 0.96 }] } : undefined)}
              onPress={pickFiles}
              accessibilityRole="button"
              accessibilityLabel="Files">
              <View className="mb-2.5 h-16 w-16 items-center justify-center rounded-full bg-[#8e24aa]">
                <MaterialCommunityIcons name="file-document-outline" size={28} color="#fff" />
              </View>
              <Text className="text-[15px] font-extrabold tracking-wide" style={{ color: colors.text }}>Document</Text>
            </Pressable>
          </View>

          <View className="mb-1 mt-3 h-px bg-border-strong" />

          <Pressable
            className="items-center justify-center py-4"
            style={({ pressed }) => (pressed ? { opacity: 0.7 } : undefined)}
            onPress={closeAnimated}
            accessibilityRole="button"
            accessibilityLabel="Cancel">
            <Text className="text-base font-bold" style={{ color: colors.text }}>Cancel</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}
