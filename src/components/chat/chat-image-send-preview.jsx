import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import { useTheme } from '@/context/theme-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * @param {{ visible: boolean; uri: string; onClose: () => void; onSend: (caption?: string) => void; sending?: boolean }} props
 */
export function ChatImageSendPreview({ visible, uri, onClose, onSend, sending = false }) {
  const { colors, chatTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) setLoading(true);
  }, [visible, uri]);

  const cardW = Math.min(screenW - 32, 400);
  const cardH = Math.min(screenH * 0.58, 520);

  const sendGradient = useMemo(
    () => [colors.primaryLight, chatTheme.sendBtn, colors.primaryMid],
    [colors, chatTheme],
  );

  const handleSend = useCallback(() => {
    if (sending) return;
    onSend('');
  }, [onSend, sending]);

  if (!uri) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.85)" />
      <View className="flex-1 bg-[#0b141a]">
        {Platform.OS === 'ios' ? (
          <BlurView intensity={28} tint="dark" className="absolute inset-0" />
        ) : (
          <View className="absolute inset-0 bg-[#0b141a]" />
        )}

        <View className="flex-1" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
          {/* Header */}
          <View className="flex-row items-center justify-between px-3 py-2">
            <Pressable
              className="h-11 w-11 items-center justify-center rounded-full"
              onPress={onClose}
              disabled={sending}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close">
              <MaterialCommunityIcons name="close" size={26} color="#e9edef" />
            </Pressable>
            <Text className="text-[17px] font-bold text-[#e9edef]">Send photo</Text>
            <View className="h-11 w-11" />
          </View>

          {/* Image card */}
          <View className="flex-1 items-center justify-center px-4">
            <Animated.View
              entering={FadeIn.duration(220)}
              exiting={FadeOut.duration(160)}
              className="overflow-hidden rounded-2xl bg-[#1f2c34] shadow-lg"
              style={{
                width: cardW,
                height: cardH,
                ...Platform.select({
                  ios: {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.35,
                    shadowRadius: 16,
                  },
                  android: { elevation: 12 },
                  default: {},
                }),
              }}>
              {loading ? (
                <View className="absolute inset-0 z-10 items-center justify-center bg-[#1f2c34]">
                  <ActivityIndicator size="large" color="rgba(255,255,255,0.6)" />
                </View>
              ) : null}
              <Image
                source={{ uri }}
                style={{ width: cardW, height: cardH }}
                contentFit="contain"
                transition={200}
                onLoad={() => setLoading(false)}
                onError={() => setLoading(false)}
              />
            </Animated.View>

            <Text className="mt-4 text-center text-[13px] font-medium text-[#8696a0]">
              Review your photo before sending
            </Text>
          </View>

          {/* Bottom actions */}
          <View className="border-t border-white/10 px-4 pb-2 pt-3">
            <View className="flex-row items-center gap-3">
              <Pressable
                className="h-[50px] flex-1 items-center justify-center rounded-xl border border-white/15 bg-white/5"
                onPress={onClose}
                disabled={sending}
                accessibilityRole="button"
                accessibilityLabel="Cancel">
                <Text className="text-[15px] font-bold text-[#e9edef]">Cancel</Text>
              </Pressable>

              <Pressable
                className="h-[50px] flex-[1.35] overflow-hidden rounded-xl"
                onPress={handleSend}
                disabled={sending}
                accessibilityRole="button"
                accessibilityLabel="Send photo">
                <LinearGradient
                  colors={sendGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="h-full flex-row items-center justify-center gap-2">
                  {sending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="send" size={20} color="#fff" />
                      <Text className="text-[15px] font-extrabold text-white">Send</Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
