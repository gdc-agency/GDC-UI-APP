import { FadeIn as ReanimatedFadeIn, FadeOut as ReanimatedFadeOut } from 'react-native-reanimated';

/** Subtle content fade-in — premium, not flashy. */
export const FadeIn = ReanimatedFadeIn.duration(220);

/** Subtle content fade-out. */
export const FadeOut = ReanimatedFadeOut.duration(180);

export { FadeInDown, FadeInUp, FadeOutDown, FadeOutUp } from 'react-native-reanimated';
