import { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, Keyboard, Platform } from 'react-native';

function keyboardBottomInset(event) {
  const windowHeight = Dimensions.get('window').height;
  const keyboardTop = event?.endCoordinates?.screenY ?? windowHeight;
  return Math.max(0, windowHeight - keyboardTop);
}

/** Tracks keyboard height from screen bottom — clears to 0 when keyboard hides. */
export default function useKeyboardOffset() {
  const [offset, setOffset] = useState(0);
  const lastEvent = useRef(null);

  const applyOffset = useCallback((event) => {
    if (!event) return;
    lastEvent.current = event;
    setOffset(keyboardBottomInset(event));
  }, []);

  const clearOffset = useCallback(() => {
    lastEvent.current = null;
    setOffset(0);
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvents = Platform.OS === 'ios' ? ['keyboardWillHide', 'keyboardDidHide'] : ['keyboardDidHide'];

    const onShow = (event) => {
      applyOffset(event);
      if (Platform.OS === 'android') {
        requestAnimationFrame(() => applyOffset(event));
        setTimeout(() => applyOffset(event), 60);
        setTimeout(() => applyOffset(event), 150);
      }
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSubs = hideEvents.map((name) => Keyboard.addListener(name, clearOffset));
    const dimensionSub = Dimensions.addEventListener('change', () => {
      if (lastEvent.current) applyOffset(lastEvent.current);
    });

    return () => {
      showSub.remove();
      hideSubs.forEach((sub) => sub.remove());
      dimensionSub.remove();
    };
  }, [applyOffset, clearOffset]);

  return offset;
}

export const CHAT_COMPOSER_BAR_HEIGHT = 68;
export const CHAT_REPLY_STRIP_HEIGHT = 52;
