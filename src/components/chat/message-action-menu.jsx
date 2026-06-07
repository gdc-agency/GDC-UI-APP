import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import { useTheme } from '@/context/theme-context';
import { cn } from '@/theme/cn';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CONTEXT_ACTIONS = [
  { key: 'reply', label: 'Reply', icon: 'reply', danger: false },
  { key: 'copy', label: 'Copy', icon: 'content-copy', danger: false },
  { key: 'forward', label: 'Forward', icon: 'share-outline', danger: false },
  { key: 'delete', label: 'Delete', icon: 'delete-outline', danger: true },
];

const DELETE_ACTIONS = [
  { key: 'hide', label: 'Delete for me', icon: 'delete-outline' },
  { key: 'everyone', label: 'Delete for everyone', icon: 'delete-outline' },
];

const SHEET_SLIDE_DISTANCE = 420;

export function MessageActionMenu({
  visible,
  message,
  canDeleteForEveryone,
  allowReply = true,
  onClose,
  onAction,
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const backdrop = useRef(new Animated.Value(0)).current;
  const anim = useRef(new Animated.Value(0)).current;
  const [deleteStep, setDeleteStep] = useState(false);

  useEffect(() => {
    if (!visible) {
      setDeleteStep(false);
      return undefined;
    }
    backdrop.setValue(0);
    anim.setValue(0);
    Animated.parallel([
      Animated.timing(backdrop, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
        stiffness: deleteStep ? 380 : 420,
        damping: deleteStep ? 34 : 32,
      }),
    ]).start();
    return undefined;
  }, [visible, deleteStep, backdrop, anim]);

  const closeAnimated = (after) => {
    Animated.parallel([
      Animated.timing(backdrop, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) {
        setDeleteStep(false);
        onClose();
        after?.();
      }
    });
  };

  const runAction = (key) => {
    if (key === 'delete') {
      setDeleteStep(true);
      anim.setValue(0);
      backdrop.setValue(1);
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
        stiffness: 380,
        damping: 34,
      }).start();
      return;
    }
    closeAnimated(() => onAction(key, message));
  };

  const runDeleteAction = (key) => {
    closeAnimated(() => onAction(key, message));
  };

  const deleteRows = DELETE_ACTIONS.filter((r) => r.key !== 'everyone' || canDeleteForEveryone);
  const contextActions = allowReply ? CONTEXT_ACTIONS : CONTEXT_ACTIONS.filter((r) => r.key !== 'reply');
  const alignMe = !!message?.me;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={() => closeAnimated()}>
      <View className="flex-1">
        <Animated.View
          className="absolute inset-0"
          style={{ backgroundColor: colors.modalBackdrop, opacity: backdrop }}
        />
        <Pressable style={StyleSheet.absoluteFill} onPress={() => closeAnimated()} />

        {!deleteStep ? (
          <Animated.View
            className={cn('absolute top-[36%] w-[58%] max-w-[220px]', alignMe ? 'right-[18px] items-end' : 'left-[18px]')}
            style={{
              opacity: anim,
              transform: [
                { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
                { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) },
              ],
            }}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View className="overflow-hidden rounded-xl border border-border-strong bg-card elevation-[12]">
                {contextActions.map((row, index) => (
                  <Pressable
                    key={row.key}
                    className={cn(
                      'flex-row items-center gap-3.5 px-4 py-3.5',
                      index < contextActions.length - 1 && 'border-b border-border-strong',
                    )}
                    style={({ pressed }) => (pressed ? { backgroundColor: colors.surfaceMuted } : undefined)}
                    onPress={() => runAction(row.key)}>
                    <MaterialCommunityIcons
                      name={row.icon}
                      size={20}
                      color={row.danger ? '#ef4444' : colors.text}
                    />
                    <Text className={cn('text-base font-medium text-text', row.danger && 'font-semibold text-[#ef4444]')}>
                      {row.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Pressable>
          </Animated.View>
        ) : (
          <View className="flex-1 justify-end" pointerEvents="box-none">
            <Animated.View
              className="px-3.5"
              style={{
                paddingBottom: Math.max(insets.bottom, 12),
                opacity: anim,
                transform: [
                  {
                    translateY: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [SHEET_SLIDE_DISTANCE, 0],
                    }),
                  },
                ],
              }}>
              <Pressable onPress={(e) => e.stopPropagation()}>
                <View
                  className="rounded-t-[20px] px-[18px] pb-2 pt-2.5 elevation-[16]"
                  style={{ backgroundColor: colors.modalSheetBg }}>
                  <View className="mb-3 h-1 w-10 self-center rounded-sm bg-border-strong" />
                  <Text className="mb-3.5 text-center text-[17px] font-bold text-text">Delete Message</Text>

                  <View className="mb-2.5 overflow-hidden rounded-xl border border-border-strong">
                    {deleteRows.map((row, index) => (
                      <Pressable
                        key={row.key}
                        className={cn(
                          'flex-row items-center gap-2.5 px-4 py-[15px]',
                          index < deleteRows.length - 1 && 'border-b border-border-strong',
                        )}
                        style={({ pressed }) => (pressed ? { backgroundColor: colors.surfaceMuted } : undefined)}
                        onPress={() => runDeleteAction(row.key)}>
                        <MaterialCommunityIcons name={row.icon} size={22} color="#ef4444" />
                        <Text className="text-base font-medium text-[#ef4444]">{row.label}</Text>
                      </Pressable>
                    ))}
                  </View>

                  <Pressable
                    className="mb-1 items-center rounded-xl border border-border-strong py-[15px]"
                    style={({ pressed }) => (pressed ? { backgroundColor: colors.surfaceMuted } : undefined)}
                    onPress={() => closeAnimated()}>
                    <Text className="text-base font-semibold text-primary-mid">Cancel</Text>
                  </Pressable>
                </View>
              </Pressable>
            </Animated.View>
          </View>
        )}
      </View>
    </Modal>
  );
}
