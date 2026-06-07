import { CircularProgressRing } from '@/components/chat/circular-progress-ring';
import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import { CHAT_BUBBLE_MAX_WIDTH, CHAT_DOC_BUBBLE_WIDTH } from '@/data/constants/chat-layout';
import { useTheme } from '@/context/theme-context';
import { cn } from '@/theme/cn';
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
  Text,
  View,
} from 'react-native';

const ACTION_SIZE = 40;

const docBubbleSize = {
  width: CHAT_DOC_BUBBLE_WIDTH,
  maxWidth: CHAT_BUBBLE_MAX_WIDTH,
  minWidth: 248,
};

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
    <View
      className="mb-0 mr-2.5 h-[50px] w-11 shrink-0 items-center justify-end overflow-hidden rounded-[5px] pb-1"
      style={{ backgroundColor: fileMeta.badgeColor }}>
      <View className="absolute right-0 top-0 h-[11px] w-[11px] rounded-bl-[3px] bg-white/30" />
      <MaterialCommunityIcons name={fileMeta.icon || 'file-outline'} size={22} color="#fff" />
      <Text className="mt-px text-[8px] font-extrabold text-white">{fileMeta.badgeLabel}</Text>
    </View>
  );
}

function DownloadIdleButton({ onPress, bubbleOut }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      className="ml-1 shrink-0 items-center justify-center rounded-full border-2 border-chat-bubble-out bg-card"
      style={{ width: ACTION_SIZE, height: ACTION_SIZE, borderColor: bubbleOut }}>
      <MaterialCommunityIcons name="arrow-down" size={20} color={bubbleOut} />
    </Pressable>
  );
}

function TransferRing({ progress, outgoing, bubbleOut }) {
  return (
    <CircularProgressRing
      progress={progress}
      size={ACTION_SIZE}
      strokeWidth={3}
      trackColor={outgoing ? 'rgba(255,255,255,0.35)' : '#dfe5e7'}
      progressColor={outgoing ? '#fff' : bubbleOut}
      centerIcon="arrow-down"
      centerIconColor={outgoing ? '#fff' : bubbleOut}
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
  groupSenderColor,
  showGroupSender = false,
}) {
  const { colors, chatTheme } = useTheme();
  const resolvedGroupSenderColor = groupSenderColor ?? chatTheme.groupSenderName;

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
        <View
          className="ml-1 shrink-0 items-center justify-center rounded-full bg-white/20"
          style={{ width: ACTION_SIZE, height: ACTION_SIZE }}>
          <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#fff" />
        </View>
      );
    }
    return <TransferRing progress={uploadProgress} outgoing bubbleOut={chatTheme.bubbleOut} />;
  };

  const renderReceiverAction = () => {
    if (downloadPhase === 'downloading') {
      return <TransferRing progress={downloadProgress} outgoing={false} bubbleOut={chatTheme.bubbleOut} />;
    }
    return (
      <DownloadIdleButton onPress={handleDownloadPress} bubbleOut={chatTheme.bubbleOut} />
    );
  };

  const renderFileInfo = (outgoing) => (
    <View className="min-w-[72px] shrink flex-1 pr-1.5">
      <Text
        className={cn(
          'text-sm font-semibold leading-[19px]',
          outgoing ? 'text-white' : 'text-chat-bubble-in-text',
          isActionTarget && 'text-primary-mid',
        )}
        numberOfLines={2}
        ellipsizeMode="tail">
        {fileName}
      </Text>
      {metaLine ? (
        <Text
          className={cn('mt-[3px] text-xs', outgoing ? 'text-white/90' : 'text-chat-muted')}
          numberOfLines={1}>
          {metaLine}
        </Text>
      ) : null}
    </View>
  );

  const renderFileRow = (outgoing) => (
    <View className="w-full flex-row items-center">
      <FileIconTile fileMeta={fileMeta} />
      {renderFileInfo(outgoing)}
      {outgoing ? (showSenderAction ? renderSenderAction() : null) : showReceiverAction ? renderReceiverAction() : null}
    </View>
  );

  const renderSender = () => (
    <View
      className={cn(
        'self-end rounded-xl rounded-br-[2px] bg-chat-bubble-out px-2.5 pb-[7px] pt-2 elevation-[2]',
        isActionTarget && 'border bg-info-bg',
      )}
      style={[
        docBubbleSize,
        isActionTarget ? { borderColor: colors.chipActiveBorder } : undefined,
      ]}>
      {renderFileRow(true)}
      <View className="mt-1.5 min-h-4 flex-row items-center justify-end gap-1 pt-0.5">
        {item.time ? <Text className="text-[11px] font-medium text-white/90">{normalizeTime(String(item.time))}</Text> : null}
        {isUploading ? (
          <MaterialCommunityIcons name="clock-outline" size={14} color="rgba(255,255,255,0.85)" />
        ) : (
          <MaterialCommunityIcons name={statusIconName(messageStatus)} size={15} color={ticks} />
        )}
      </View>
    </View>
  );

  const renderReceiver = () => (
    <View
      className={cn(
        'self-start rounded-xl rounded-bl-[2px] border border-black/5 bg-chat-bubble-in px-2 pb-1.5 pt-[7px] elevation-[2]',
        isActionTarget && 'border',
      )}
      style={[
        docBubbleSize,
        isActionTarget ? { borderColor: colors.chipActiveBorder } : undefined,
      ]}>
      {showGroupSender && groupSenderName ? (
        <Text
          className="mb-[5px] ml-0.5 text-[13px] font-extrabold"
          style={{ color: resolvedGroupSenderColor }}
          numberOfLines={1}>
          {groupSenderName}
        </Text>
      ) : null}
      <View className="w-full rounded-lg bg-surface-muted px-2.5 py-[9px]">{renderFileRow(false)}</View>
      <View className="mt-1 pl-0.5">
        {item.time ? <Text className="text-[11px] font-medium text-chat-muted">{normalizeTime(String(item.time))}</Text> : null}
      </View>
    </View>
  );

  const body = (
    <Animated.View
      className={cn('self-start', isMe && 'self-end', compact && 'min-w-0 w-auto')}
      style={[
        { transform: [{ scale }] },
        compact ? undefined : docBubbleSize,
      ]}>
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
