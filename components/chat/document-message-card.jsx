import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import { CircularProgressRing } from '@/components/chat/circular-progress-ring';
import { BrandColors } from '@/constants/brand';
import { ChatTheme } from '@/constants/chat-theme';
import { downloadChatDocument, getCachedChatDocumentPath } from '@/utils/chat-document-download';
import { openChatDocument } from '@/utils/chat-document-open';
import { getChatFileMeta } from '@/utils/chat-file-meta';
import {
  isMessageUploading,
  resolveOutgoingMessageStatus,
  statusIconColor,
  statusIconName,
} from '@/utils/chat-message-status';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const WA_GREEN = '#25D366';

function FileTypeBadge({ fileMeta }) {
  return (
    <View style={[styles.badge, { backgroundColor: fileMeta.badgeColor }]}>
      <View style={styles.badgeFold} />
      <Text style={styles.badgeLabel}>{fileMeta.badgeLabel}</Text>
    </View>
  );
}

/**
 * @param {{
 *   item: Record<string, unknown>;
 *   isActionTarget?: boolean;
 *   tickColor?: string;
 *   normalizeTime?: (t: string) => string;
 *   compact?: boolean;
 *   onLongPress?: () => void;
 * }} props
 */
export function DocumentMessageCard({
  item,
  isActionTarget = false,
  tickColor,
  normalizeTime = (t) => String(t || ''),
  compact = false,
  onLongPress,
}) {
  const isMe = !!item.me;
  const fileName = String(item.fileName || 'Document');
  const fileMeta = getChatFileMeta(fileName);
  const metaLine = [item.fileSizeLabel, fileMeta.ext].filter(Boolean).join(' • ');
  const uploadProgress =
    typeof item.uploadProgress === 'number' ? Math.min(1, Math.max(0, item.uploadProgress)) : 0;
  const isUploading = isMessageUploading(item);
  const isFailed = isMe && item.status === 'failed';
  const messageStatus = resolveOutgoingMessageStatus(item);
  const ticks = tickColor ?? statusIconColor(messageStatus, isMe && !isActionTarget);

  const [downloadPhase, setDownloadPhase] = useState(/** @type {'idle' | 'downloading' | 'done'} */ ('idle'));
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [localUri, setLocalUri] = useState(/** @type {string | null} */ (null));
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (compact || !item.id) return undefined;
    let cancelled = false;
    (async () => {
      const cached = await getCachedChatDocumentPath(String(item.id));
      if (cancelled) return;
      if (cached) {
        setLocalUri(cached);
        if (!isMe) setDownloadPhase('done');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [compact, isMe, item.id]);

  const animatePressIn = useCallback(() => {
    Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  }, [scale]);

  const animatePressOut = useCallback(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 28, bounciness: 6 }).start();
  }, [scale]);

  const openDocument = useCallback(
    async (preferredUri) => {
      const uri = preferredUri || localUri || String(item.uri || '');
      if (!uri) throw new Error('File not available');
      await openChatDocument({
        uri,
        fileName,
        messageId: item.id ? String(item.id) : undefined,
      });
    },
    [fileName, item.id, item.uri, localUri],
  );

  const handleDownload = useCallback(async () => {
    if (isMe || isUploading || downloadPhase === 'downloading' || !item.uri) return null;
    setDownloadPhase('downloading');
    setDownloadProgress(0);
    try {
      const saved = await downloadChatDocument({
        messageId: String(item.id),
        uri: String(item.uri),
        fileName,
        onProgress: (ratio) => setDownloadProgress(Math.min(1, Math.max(0, ratio))),
      });
      setLocalUri(saved);
      setDownloadProgress(1);
      setDownloadPhase('done');
      return saved;
    } catch {
      setDownloadPhase('idle');
      setDownloadProgress(0);
      return null;
    }
  }, [downloadPhase, fileName, isMe, isUploading, item.id, item.uri]);

  const handleDocumentPress = useCallback(async () => {
    if (isUploading || isFailed || compact || downloadPhase === 'downloading') return;
    try {
      if (!isMe && downloadPhase !== 'done') {
        const saved = await handleDownload();
        if (!saved) return;
        await openDocument(saved);
        return;
      }
      await openDocument();
    } catch (e) {
      Alert.alert('Document', e?.message ?? 'Could not open file');
    }
  }, [compact, downloadPhase, handleDownload, isFailed, isMe, isUploading, openDocument]);

  const handleDownloadPress = useCallback(
    async (e) => {
      e?.stopPropagation?.();
      await handleDownload();
    },
    [handleDownload],
  );

  const renderSenderFooter = () => (
    <View style={styles.footerRow}>
      {isUploading ? (
        <Text style={styles.senderHint}>Sending document…</Text>
      ) : isFailed ? (
        <Text style={styles.senderFailed}>Upload failed · tap to retry later</Text>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      <View style={styles.timeRow}>
        {item.time ? <Text style={styles.senderTime}>{normalizeTime(String(item.time))}</Text> : null}
        {isMe ? (
          <MaterialCommunityIcons name={statusIconName(messageStatus)} size={14} color={ticks} />
        ) : null}
      </View>
    </View>
  );

  const renderSender = () => (
    <View style={[styles.senderBubble, isActionTarget && styles.senderBubbleSelected]}>
      <View style={styles.row}>
        <FileTypeBadge fileMeta={fileMeta} />
        <View style={styles.textCol}>
          <Text
            numberOfLines={2}
            style={[styles.senderName, isActionTarget && styles.senderNameSelected]}>
            {fileName}
          </Text>
          {metaLine ? (
            <Text style={[styles.senderMeta, isActionTarget && styles.senderMetaSelected]}>{metaLine}</Text>
          ) : null}
        </View>
        {isUploading ? (
          <CircularProgressRing
            progress={uploadProgress}
            size={42}
            strokeWidth={3}
            trackColor="rgba(255,255,255,0.35)"
            progressColor="#fff"
            labelColor="#fff"
          />
        ) : isFailed ? (
          <MaterialCommunityIcons name="refresh" size={26} color="#fff" />
        ) : null}
      </View>
      {renderSenderFooter()}
    </View>
  );

  const renderReceiver = () => (
    <View style={[styles.receiverBubble, isActionTarget && styles.receiverBubbleSelected]}>
      <View style={styles.row}>
        <FileTypeBadge fileMeta={fileMeta} />
        <View style={styles.textCol}>
          <Text numberOfLines={2} style={styles.receiverName}>
            {fileName}
          </Text>
          {metaLine ? <Text style={styles.receiverMeta}>{metaLine}</Text> : null}
        </View>
        {downloadPhase === 'downloading' ? (
          <CircularProgressRing
            progress={downloadProgress}
            size={42}
            strokeWidth={3}
            trackColor="#e9edef"
            progressColor={ChatTheme.bubbleOut}
            labelColor="#334155"
          />
        ) : downloadPhase === 'done' ? (
          <Pressable onPress={() => void openDocument()} hitSlop={8}>
            <MaterialCommunityIcons name="file-check-outline" size={26} color={WA_GREEN} />
          </Pressable>
        ) : (
          <Pressable style={styles.recvDownloadBtn} onPress={handleDownloadPress} hitSlop={8}>
            <MaterialCommunityIcons name="arrow-down-circle-outline" size={28} color="#8696a0" />
          </Pressable>
        )}
      </View>
      {item.time ? (
        <Text style={styles.receiverTime}>{normalizeTime(String(item.time))}</Text>
      ) : null}
    </View>
  );

  const body = (
    <Animated.View style={[{ transform: [{ scale }] }, compact && styles.compact]}>
      {isMe ? renderSender() : renderReceiver()}
    </Animated.View>
  );

  if (compact) return body;

  return (
    <Pressable
      onPress={() => void handleDocumentPress()}
      onLongPress={onLongPress}
      delayLongPress={280}
      onPressIn={animatePressIn}
      onPressOut={animatePressOut}
      disabled={isUploading || downloadPhase === 'downloading'}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  compact: { minWidth: 0 },
  senderBubble: {
    minWidth: 248,
    maxWidth: '100%',
    backgroundColor: ChatTheme.bubbleOut,
    borderRadius: 8,
    borderTopRightRadius: 2,
    paddingHorizontal: 10,
    paddingTop: 9,
    paddingBottom: 7,
  },
  senderBubbleSelected: {
    backgroundColor: '#eef4ff',
    borderWidth: 1,
    borderColor: '#c7dcff',
  },
  receiverBubble: {
    minWidth: 248,
    maxWidth: '100%',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderTopLeftRadius: 2,
    paddingHorizontal: 10,
    paddingTop: 9,
    paddingBottom: 7,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  receiverBubbleSelected: {
    borderWidth: 1,
    borderColor: '#c7dcff',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: {
    width: 40,
    height: 46,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 5,
    overflow: 'hidden',
  },
  badgeFold: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 11,
    height: 11,
    backgroundColor: 'rgba(255,255,255,0.32)',
    borderBottomLeftRadius: 4,
  },
  badgeLabel: { color: '#fff', fontSize: 9, fontWeight: '800' },
  textCol: { flex: 1, minWidth: 0 },
  senderName: { color: '#fff', fontSize: 14, fontWeight: '600', lineHeight: 18 },
  senderNameSelected: { color: BrandColors.primaryMid },
  senderMeta: { marginTop: 2, color: 'rgba(255,255,255,0.88)', fontSize: 12 },
  senderMetaSelected: { color: '#64748b' },
  receiverName: { color: '#111b21', fontSize: 14, fontWeight: '600', lineHeight: 18 },
  receiverMeta: { marginTop: 2, color: '#667781', fontSize: 12 },
  recvDownloadBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  footerRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 16,
  },
  senderHint: { flex: 1, color: 'rgba(255,255,255,0.9)', fontSize: 11 },
  senderFailed: { flex: 1, color: '#fecaca', fontSize: 11 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  senderTime: { color: 'rgba(255,255,255,0.9)', fontSize: 11 },
  receiverTime: {
    marginTop: 4,
    alignSelf: 'flex-end',
    color: '#667781',
    fontSize: 11,
  },
});
