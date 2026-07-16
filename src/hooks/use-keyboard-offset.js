import { useEffect } from 'react';
import { useKeyboardState, useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

/** Final keyboard height — for scroll triggers and list extraData. */
export default function useKeyboardOffset() {
  return useKeyboardState((state) => state.height);
}

export function useChatComposerKeyboard({ safeAreaBottom, composerStackHeight, typingFooterHeight }) {
  const { height } = useReanimatedKeyboardAnimation();
  const safeBottom = useSharedValue(Math.max(safeAreaBottom, 0));
  const composerHeight = useSharedValue(composerStackHeight);
  const typingPad = useSharedValue(typingFooterHeight);

  useEffect(() => {
    safeBottom.value = Math.max(safeAreaBottom, 0);
  }, [safeAreaBottom, safeBottom]);

  useEffect(() => {
    composerHeight.value = composerStackHeight;
  }, [composerStackHeight, composerHeight]);

  useEffect(() => {
    typingPad.value = typingFooterHeight;
  }, [typingFooterHeight, typingPad]);

  const composerAnimatedStyle = useAnimatedStyle(() => {
    // Reanimated height is negative when keyboard opens (translateY convention).
    const keyboardH = Math.max(-height.value, 0);
    const bottomInset = keyboardH > 0 ? keyboardH : safeBottom.value;
    return {
      bottom: bottomInset,
      paddingBottom: keyboardH > 0 ? 0 : CHAT_COMPOSER_WRAPPER_PADDING,
    };
  });

  /** Reserve space so the last bubble sits above the absolute composer (WhatsApp-style). */
  const listFooterSpacerStyle = useAnimatedStyle(() => {
    const keyboardH = Math.max(-height.value, 0);
    const bottomInset = keyboardH > 0 ? keyboardH + 6 : safeBottom.value + CHAT_COMPOSER_WRAPPER_PADDING;
    return {
      height: composerHeight.value + bottomInset + typingPad.value + CHAT_MESSAGE_BOTTOM_GAP,
    };
  });

  return { composerAnimatedStyle, listFooterSpacerStyle };
}

/** Composer row (input + send) — matches min-h-12 + pt-2 + pb-1.5 + border. */
export const CHAT_COMPOSER_BAR_HEIGHT = 80;
export const CHAT_REPLY_STRIP_HEIGHT = 52;
/** Extra padding on the absolute composer wrapper when keyboard is closed. */
export const CHAT_COMPOSER_WRAPPER_PADDING = 8;
/** Gap between last message bubble and the input bar. */
export const CHAT_MESSAGE_BOTTOM_GAP = 12;
