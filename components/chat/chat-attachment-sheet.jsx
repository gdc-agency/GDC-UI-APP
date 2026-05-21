import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import React, { useCallback, useEffect, useRef } from 'react';
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
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;

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
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeAnimated} accessibilityRole="button" accessibilityLabel="Close">
          <Animated.View
            pointerEvents="none"
            style={[styles.backdrop, { opacity: backdropOpacity }]}
          />
        </Pressable>

        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, 12),
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}>
          <View style={styles.grabber} />

          <View style={styles.optionsRow}>
            <Pressable
              style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
              onPress={pickGallery}
              accessibilityRole="button"
              accessibilityLabel="Gallery">
              <View style={[styles.optionIcon, styles.optionIconGallery]}>
                <MaterialCommunityIcons name="image-outline" size={28} color="#fff" />
              </View>
              <Text style={styles.optionLabel}>Gallery</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
              onPress={pickFiles}
              accessibilityRole="button"
              accessibilityLabel="Files">
              <View style={[styles.optionIcon, styles.optionIconFiles]}>
                <MaterialCommunityIcons name="file-document-outline" size={28} color="#fff" />
              </View>
              <Text style={styles.optionLabel}>Document</Text>
            </Pressable>
          </View>

          <View style={styles.divider} />

          <Pressable
            style={({ pressed }) => [styles.cancelBtn, pressed && styles.cancelBtnPressed]}
            onPress={closeAnimated}
            accessibilityRole="button"
            accessibilityLabel="Cancel">
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.52)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 10,
    paddingHorizontal: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: { elevation: 16 },
      default: {},
    }),
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
    marginBottom: 22,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 48,
    paddingBottom: 8,
  },
  option: {
    alignItems: 'center',
    minWidth: 88,
  },
  optionPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
  optionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  optionIconGallery: {
    backgroundColor: '#0d9ef7',
  },
  optionIconFiles: {
    backgroundColor: '#8e24aa',
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#334155',
    letterSpacing: 0.1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e2e8f0',
    marginTop: 12,
    marginBottom: 4,
  },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  cancelBtnPressed: {
    opacity: 0.7,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1266f1',
  },
});
