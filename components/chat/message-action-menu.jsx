import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import { BrandColors } from '@/constants/brand';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// NEW UI FIX FOR MESSAGE ACTION UI — context menu + delete bottom sheet (slides up from bottom)
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
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: backdrop }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={() => closeAnimated()} />

        {!deleteStep ? (
          <Animated.View
            style={[
              styles.contextAnchor,
              alignMe ? styles.contextAnchorMe : styles.contextAnchorOther,
              {
                opacity: anim,
                transform: [
                  { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
                  { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) },
                ],
              },
            ]}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={styles.contextCard}>
                {contextActions.map((row, index) => (
                  <Pressable
                    key={row.key}
                    style={({ pressed }) => [
                      styles.contextRow,
                      index < contextActions.length - 1 && styles.contextRowBorder,
                      pressed && styles.rowPressed,
                    ]}
                    onPress={() => runAction(row.key)}>
                    <MaterialCommunityIcons
                      name={row.icon}
                      size={20}
                      color={row.danger ? '#ef4444' : BrandColors.text}
                    />
                    <Text style={[styles.contextLabel, row.danger && styles.contextLabelDanger]}>{row.label}</Text>
                  </Pressable>
                ))}
              </View>
            </Pressable>
          </Animated.View>
        ) : (
          <View style={styles.sheetOverlay} pointerEvents="box-none">
            <Animated.View
              style={[
                styles.deleteSheetWrap,
                {
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
                },
              ]}>
              <Pressable onPress={(e) => e.stopPropagation()}>
                <View style={styles.deleteSheet}>
                  <View style={styles.sheetHandle} />
                  <Text style={styles.deleteTitle}>Delete Message</Text>

                  <View style={styles.deleteActionGroup}>
                    {deleteRows.map((row, index) => (
                      <Pressable
                        key={row.key}
                        style={({ pressed }) => [
                          styles.deleteRow,
                          index < deleteRows.length - 1 && styles.deleteRowBorder,
                          pressed && styles.rowPressed,
                        ]}
                        onPress={() => runDeleteAction(row.key)}>
                        <MaterialCommunityIcons name={row.icon} size={22} color="#ef4444" />
                        <Text style={styles.deleteLabel}>{row.label}</Text>
                      </Pressable>
                    ))}
                  </View>

                  <Pressable
                    style={({ pressed }) => [styles.deleteCancelGroup, pressed && styles.rowPressed]}
                    onPress={() => closeAnimated()}>
                    <Text style={styles.deleteCancelText}>Cancel</Text>
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

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.45)' },
  contextAnchor: {
    position: 'absolute',
    top: '36%',
    maxWidth: 220,
    width: '58%',
  },
  contextAnchorOther: { left: 18 },
  contextAnchorMe: { right: 18, alignItems: 'flex-end' },
  contextCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d1d5db',
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 12,
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  contextRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb' },
  contextLabel: { fontSize: 16, fontWeight: '500', color: BrandColors.text },
  contextLabelDanger: { color: '#ef4444', fontWeight: '600' },
  sheetOverlay: { flex: 1, justifyContent: 'flex-end' },
  deleteSheetWrap: {
    paddingHorizontal: 14,
  },
  deleteSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 8,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 16,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    marginBottom: 12,
  },
  deleteTitle: {
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: BrandColors.text,
    marginBottom: 14,
  },
  deleteActionGroup: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d1d5db',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
  },
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  deleteRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb' },
  deleteLabel: { fontSize: 16, fontWeight: '500', color: '#ef4444' },
  deleteCancelGroup: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 4,
  },
  deleteCancelText: { fontSize: 16, fontWeight: '600', color: '#007aff' },
  rowPressed: { backgroundColor: '#f1f5f9' },
});
