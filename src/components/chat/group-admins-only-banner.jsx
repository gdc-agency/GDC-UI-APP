import { useTheme } from '@/context/theme-context';
import React, { memo } from 'react';
import { Text, View } from 'react-native';

/**
 * WhatsApp-style footer when only group admins may post.
 */
export const GroupAdminsOnlyBanner = memo(function GroupAdminsOnlyBanner({ bottomInset = 0 }) {
  const { colors } = useTheme();

  return (
    <View
      className="min-h-[52px] items-center justify-center border-t bg-chat-composer px-5 pt-3.5"
      style={{ paddingBottom: Math.max(bottomInset, 10), borderTopColor: colors.borderStrong }}>
      <Text className="text-center text-[15px] font-medium text-chat-muted">
        Only <Text className="font-extrabold text-primary-mid">admins</Text> can send messages
      </Text>
    </View>
  );
});
