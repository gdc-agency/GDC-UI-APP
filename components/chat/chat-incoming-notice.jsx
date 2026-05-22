import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import { BrandColors } from '@/constants/brand';
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * In-chat banner for new messages (not tab bar badge).
 * @param {{
 *   title: string;
 *   preview: string;
 *   senderName?: string;
 *   onPress: () => void;
 *   onDismiss: () => void;
 * }} props
 */
export function ChatIncomingNotice({ title, preview, senderName, onPress, onDismiss }) {
  const slide = useRef(new Animated.Value(-72)).current;

  useEffect(() => {
    Animated.spring(slide, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 6 }).start();
    const t = setTimeout(() => onDismiss(), 5000);
    return () => clearTimeout(t);
  }, [onDismiss, slide]);

  return (
    <Animated.View style={[styles.wrap, { transform: [{ translateY: slide }] }]}>
      <Pressable style={styles.card} onPress={onPress}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="message-text" size={20} color="#fff" />
        </View>
        <View style={styles.textCol}>
          <Text style={styles.title} numberOfLines={1}>
            {senderName ? `${senderName} · ${title}` : title}
          </Text>
          <Text style={styles.preview} numberOfLines={2}>
            {preview}
          </Text>
        </View>
        <Pressable onPress={onDismiss} hitSlop={12} style={styles.closeBtn}>
          <MaterialCommunityIcons name="close" size={18} color="#64748b" />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 8,
    left: 12,
    right: 12,
    zIndex: 20,
    elevation: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d1d7db',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BrandColors.primaryMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: { flex: 1, minWidth: 0 },
  title: { fontSize: 13, fontWeight: '800', color: '#111b21' },
  preview: { marginTop: 2, fontSize: 12.5, color: '#667781', lineHeight: 17 },
  closeBtn: { padding: 4 },
});
