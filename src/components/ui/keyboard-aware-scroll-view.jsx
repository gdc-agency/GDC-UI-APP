import React from 'react';
import {
  KeyboardAwareScrollView as RNKeyboardAwareScrollView,
  KeyboardAvoidingView as RNKeyboardAvoidingView,
} from 'react-native-keyboard-controller';

/**
 * ScrollView that keeps focused TextInputs visible above the keyboard.
 * Use on any form screen (login, profile, leave, tasks, etc.).
 */
export const KeyboardAwareScrollView = React.forwardRef(function KeyboardAwareScrollView(
  {
    bottomOffset = 20,
    extraKeyboardSpace = 24,
    keyboardShouldPersistTaps = 'handled',
    showsVerticalScrollIndicator = false,
    ...props
  },
  ref,
) {
  return (
    <RNKeyboardAwareScrollView
      ref={ref}
      bottomOffset={bottomOffset}
      extraKeyboardSpace={extraKeyboardSpace}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      {...props}
    />
  );
});

/** For modals / bottom sheets where padding-based avoidance works better. */
export function KeyboardAvoidingView({ behavior = 'padding', ...props }) {
  return <RNKeyboardAvoidingView behavior={behavior} {...props} />;
}
