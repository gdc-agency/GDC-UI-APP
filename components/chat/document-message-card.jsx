import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import { CircularProgressRing } from '@/components/chat/circular-progress-ring';
import { BrandColors } from '@/constants/brand';
import { CHAT_BUBBLE_MAX_WIDTH, CHAT_DOC_BUBBLE_WIDTH } from '@/constants/chat-layout';
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

const INNER_CARD = '#f0f2f5';
const ACTION_SIZE = 40;
const WA_BLUE = ChatTheme.bubbleOut;

/** @param {Record<string, unknown>} item */
function resolveDisplayFileName(item) {
  const raw = String(item.fileName || item.name || '').trim();
  if (raw) return raw;
  const uri = String(item.uri || '');
  const fromUri = uri.split('/').pop()?.split('?')[0];
  if (fromUri && fromUri.includes('.')) return decodeURIComponent(fromUri);
  return 'Document';
}

function FileIconTile({ fileMeta }) {
  return (
    <View style={[styles.iconTile, { backgroundColor: fileMeta.badgeColor }]}>
      <View style={styles.iconFold} />
      <MaterialCommunityIcons name={fileMeta.icon || 'file-outline'} size={22} color="#fff" />
      <Text style={styles.iconLabel}>{fileMeta.badgeLabel}</Text>
    </View>
  );
}

function DownloadIdleButton({ onPress }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={styles.downloadIdle}>
      <MaterialCommunityIcons name="arrow-down" size={20} color={WA_BLUE} />
    </Pressable>
  );
}

function TransferRing({ progress, outgoing }) {
  return (
    <CircularProgressRing
      progress={progress}
      size={ACTION_SIZE}
      strokeWidth={3}
      trackColor={outgoing ? 'rgba(255,255,255,0.35)' : '#dfe5e7'}
      progressColor={outgoing ? '#fff' : WA_BLUE}
      centerIcon="arrow-down"
      centerIconColor={outgoing ? '#fff' : WA_BLUE}
      showLabel={false}
    />
  );
}

export function DocumentMessageCard({
  item,
  isActionTarget = false,
  tickColor,
  normalizeTime = (t) => String(t || ''),
  compact = false,
  onLongPress,
  groupSenderName = '',
  groupSenderColor = ChatTheme.groupSenderName,
  showGroupSender = false,
}) {
  const isMe = !!item.me;
  const fileName = resolveDisplayFileName(item);
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
    if (compact || !item.id || isMe) return undefined;
    let cancelled = false;
    (async () => {
      const cached = await getCachedChatDocumentPath(String(item.id));
      if (cancelled) return;
      if (cached) {
        setLocalUri(cached);
        setDownloadPhase('done');
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
      Alert.alert('Download', 'Could not download file.');
      setDownloadPhase('idle');
      setDownloadProgress(0);
      return null;
    }
  }, [downloadPhase, fileName, isMe, isUploading, item.id, item.uri]);

  const handleDownloadPress = useCallback(
    (e) => {
      e?.stopPropagation?.();
      void handleDownload();
    },
    [handleDownload],
  );

  const showSenderAction = isMe && (isUploading || isFailed);
  const showReceiverAction = !isMe && downloadPhase !== 'done';

  const renderSenderAction = () => {
    if (isFailed) {
      return (
        <View style={styles.actionFailOut}>
          <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#fff" />
        </View>
      );
    }
    return <TransferRing progress={uploadProgress} outgoing />;
  };

  const renderReceiverAction = () => {
    if (downloadPhase === 'downloading') {
      return <TransferRing progress={downloadProgress} outgoing={false} />;
    }
    return <DownloadIdleButton onPress={handleDownloadPress} />;
  };

  const renderFileInfo = (outgoing) => (
    <View style={styles.textCol}>
      <Text
        style={[outgoing ? styles.fileNameOut : styles.fileNameIn, isActionTarget && styles.fileNameSelected]}
        numberOfLines={2}
        ellipsizeMode="tail">
        {fileName}
      </Text>
      {metaLine ? (
        <Text style={outgoing ? styles.metaOut : styles.metaIn} numberOfLines={1}>
          {metaLine}
        </Text>
      ) : null}
    </View>
  );

  const renderFileRow = (outgoing) => (
    <View style={styles.fileRow}>
      <FileIconTile fileMeta={fileMeta} />
      {renderFileInfo(outgoing)}
      {outgoing ? (showSenderAction ? renderSenderAction() : null) : showReceiverAction ? renderReceiverAction() : null}
    </View>
  );

  const renderSender = () => (
    <View style={[styles.bubbleOut, isActionTarget && styles.bubbleOutSelected]}>
      {renderFileRow(true)}
      <View style={styles.footerOut}>
        {item.time ? <Text style={styles.timeOut}>{normalizeTime(String(item.time))}</Text> : null}
        {isUploading ? (
          <MaterialCommunityIcons name="clock-outline" size={14} color="rgba(255,255,255,0.85)" />
        ) : (
          <MaterialCommunityIcons name={statusIconName(messageStatus)} size={15} color={ticks} />
        )}
      </View>
    </View>
  );

  const renderReceiver = () => (
    <View style={[styles.bubbleIn, isActionTarget && styles.bubbleInSelected]}>
      {showGroupSender && groupSenderName ? (
        <Text style={[styles.groupNameInBubble, { color: groupSenderColor }]} numberOfLines={1}>
          {groupSenderName}
        </Text>
      ) : null}
      <View style={styles.innerCard}>{renderFileRow(false)}</View>
      <View style={styles.footerIn}>
        {item.time ? <Text style={styles.timeIn}>{normalizeTime(String(item.time))}</Text> : null}
      </View>
    </View>
  );

  const body = (
    <Animated.View
      style={[{ transform: [{ scale }] }, styles.root, isMe && styles.rootMe, compact && styles.compact]}>
      {isMe ? renderSender() : renderReceiver()}
    </Animated.View>
  );

  if (compact) return body;

  const canOpen =
    (isMe && !isUploading && (localUri || item.uri)) ||
    (!isMe && downloadPhase === 'done');

  return (
    <Pressable
      onPress={canOpen ? () => void openDocument() : undefined}
      onLongPress={onLongPress}
      delayLongPress={280}
      onPressIn={animatePressIn}
      onPressOut={animatePressOut}
      disabled={!isMe && downloadPhase === 'downloading'}>
      {body}
    </Pressable>
  );
}

const docBubbleBase = {
  width: CHAT_DOC_BUBBLE_WIDTH,
  maxWidth: CHAT_BUBBLE_MAX_WIDTH,
  minWidth: 248,
};

const styles = StyleSheet.create({
  root: {
    alignSelf: 'flex-start',
    width: CHAT_DOC_BUBBLE_WIDTH,
    maxWidth: CHAT_BUBBLE_MAX_WIDTH,
    minWidth: 248,
  },
  rootMe: { alignSelf: 'flex-end' },
  compact: { minWidth: 0, width: 'auto' },
  bubbleOut: {
    ...docBubbleBase,
    backgroundColor: ChatTheme.bubbleOut,
    borderRadius: 12,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 2,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 7,
    alignSelf: 'flex-end',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  bubbleOutSelected: {
    backgroundColor: '#eef4ff',
    borderWidth: 1,
    borderColor: '#c7dcff',
  },
  bubbleIn: {
    ...docBubbleBase,
    backgroundColor: ChatTheme.bubbleIn,
    borderRadius: 12,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 2,
    paddingHorizontal: 8,
    paddingTop: 7,
    paddingBottom: 6,
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
  },
  bubbleInSelected: {
    borderWidth: 1,
    borderColor: '#c7dcff',
  },
  groupNameInBubble: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 5,
    marginLeft: 2,
  },
  innerCard: {
    backgroundColor: INNER_CARD,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    width: '100%',
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  iconTile: {
    width: 44,
    height: 50,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 4,
    overflow: 'hidden',
    flexShrink: 0,
    marginRight: 10,
  },
  iconFold: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 11,
    height: 11,
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderBottomLeftRadius: 3,
  },
  iconLabel: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '800',
    marginTop: 1,
  },
  textCol: {
    flex: 1,
    flexShrink: 1,
    minWidth: 72,
    paddingRight: 6,
  },
  fileNameOut: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
  },
  fileNameIn: {
    color: ChatTheme.bubbleInText,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
  },
  fileNameSelected: { color: BrandColors.primaryMid },
  metaOut: { marginTop: 3, color: 'rgba(255,255,255,0.92)', fontSize: 12 },
  metaIn: { marginTop: 3, color: ChatTheme.metaMuted, fontSize: 12 },
  downloadIdle: {
    width: ACTION_SIZE,
    height: ACTION_SIZE,
    borderRadius: ACTION_SIZE / 2,
    borderWidth: 2,
    borderColor: WA_BLUE,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginLeft: 4,
  },
  actionFailOut: {
    width: ACTION_SIZE,
    height: ACTION_SIZE,
    borderRadius: ACTION_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginLeft: 4,
  },
  footerOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 6,
    paddingTop: 2,
    minHeight: 16,
  },
  timeOut: { color: 'rgba(255,255,255,0.92)', fontSize: 11, fontWeight: '500' },
  footerIn: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 4,
    paddingLeft: 2,
  },
  timeIn: { color: ChatTheme.metaMuted, fontSize: 11, fontWeight: '500' },
});
