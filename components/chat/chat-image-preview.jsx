import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// NEW UI FIX FOR IMAGE PREVIEW UI — single image full-screen (no gallery swipe)
const SLIDE_DISTANCE = 900;
const H_PAD = 14;

/**
 * @param {{ visible: boolean; uri: string; onClose: () => void }} props
 */
export function ChatImagePreview({ visible, uri, onClose }) {
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const slide = useRef(new Animated.Value(0)).current;
  const [galleryH, setGalleryH] = useState(0);

  const frameW = Math.max(0, screenW - H_PAD * 2);
  const frameH = Math.max(0, (galleryH > 0 ? galleryH : screenH * 0.72) - H_PAD * 2);

  useEffect(() => {
    if (!visible) return undefined;
    slide.setValue(0);
    Animated.spring(slide, {
      toValue: 1,
      useNativeDriver: true,
      stiffness: 360,
      damping: 34,
    }).start();
    return undefined;
  }, [visible, slide]);

  const closeAnimated = () => {
    Animated.timing(slide, { toValue: 0, duration: 220, useNativeDriver: true }).start(({ finished }) => {
      if (finished) onClose();
    });
  };

  if (!uri) return null;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={closeAnimated}>
      <Animated.View
        style={[
          styles.root,
          { width: screenW, height: screenH },
          {
            transform: [
              {
                translateY: slide.interpolate({
                  inputRange: [0, 1],
                  outputRange: [SLIDE_DISTANCE, 0],
                }),
              },
            ],
          },
        ]}>
        <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'android' ? 8 : 4) }]}>
          <Pressable style={styles.headerBtn} onPress={closeAnimated} hitSlop={12}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          </Pressable>
          <View style={styles.headerSpacer} />
          <Pressable style={styles.headerBtn} onPress={closeAnimated} hitSlop={12}>
            <MaterialCommunityIcons name="close" size={24} color="#fff" />
          </Pressable>
        </View>

        <View
          style={styles.imageHost}
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h > 0 && Math.abs(h - galleryH) > 1) setGalleryH(h);
          }}>
          <View style={[styles.page, { height: galleryH || undefined }]}>
            <View style={[styles.imageFrame, { width: frameW, height: frameH }]}>
              <Image source={{ uri }} style={styles.previewImage} contentFit="contain" transition={200} />
            </View>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: { flex: 1 },
  imageHost: {
    flex: 1,
    width: '100%',
  },
  page: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageFrame: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
});
