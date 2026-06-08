import { FadeIn, FadeInDown } from 'react-native-reanimated';

export const STAGGER_MS = 55;

/** Team screen style — fade + slide up with spring. */
export function enterDown(delay = 0) {
  return FadeInDown.delay(delay).duration(320).springify().damping(20).stiffness(240);
}

export function enterFade(delay = 0) {
  return FadeIn.delay(delay).duration(280);
}

export function staggerDelay(base = 0, index = 0) {
  return base + index * STAGGER_MS;
}
