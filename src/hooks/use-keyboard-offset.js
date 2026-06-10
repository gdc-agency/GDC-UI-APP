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
      paddingBottom: keyboardH > 0 ? 0 : 8,
    };
  });

  const listContentAnimatedStyle = useAnimatedStyle(() => {
    const keyboardH = Math.max(-height.value, 0);
    const safeBottomValue = keyboardH > 0 ? keyboardH + 6 : safeBottom.value + 10;
    return {
      paddingBottom: composerHeight.value + safeBottomValue + typingPad.value,
    };
  });

  return { composerAnimatedStyle, listContentAnimatedStyle };
}

export const CHAT_COMPOSER_BAR_HEIGHT = 68;
export const CHAT_REPLY_STRIP_HEIGHT = 52;
