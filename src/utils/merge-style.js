import { StyleSheet } from 'react-native';

/** Flatten style arrays for React Native Web (avoids CSSStyleDeclaration indexed setter crash). */
export function mergeStyle(...parts) {
  return StyleSheet.flatten(parts.filter(Boolean)) ?? {};
}
