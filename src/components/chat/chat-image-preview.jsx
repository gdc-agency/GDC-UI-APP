import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  View,
  useWindowDimensions,
} from 'react-native';
import { mergeStyle } from '@/utils/merge-style';
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
        className="flex-1 bg-chat-wallpaper"
        style={mergeStyle(
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
        )}>
        <View
          className="flex-row items-center justify-between px-1 pb-1"
          style={{ paddingTop: insets.top + (Platform.OS === 'android' ? 8 : 4) }}>
          <Pressable className="h-11 w-11 items-center justify-center" onPress={closeAnimated} hitSlop={12}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          </Pressable>
          <View className="flex-1" />
          <Pressable className="h-11 w-11 items-center justify-center" onPress={closeAnimated} hitSlop={12}>
            <MaterialCommunityIcons name="close" size={24} color="#fff" />
          </Pressable>
        </View>

        <View
          className="w-full flex-1"
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h > 0 && Math.abs(h - galleryH) > 1) setGalleryH(h);
          }}>
          <View className="flex-1 items-center justify-center" style={{ height: galleryH || undefined }}>
            <View
              className="items-center justify-center overflow-hidden rounded-[14px] bg-chat-bubble-in"
              style={{ width: frameW, height: frameH }}>
              <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="contain" transition={200} />
            </View>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}
