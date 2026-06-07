import { SlideInDown as ReanimatedSlideInDown, SlideOutDown as ReanimatedSlideOutDown } from 'react-native-reanimated';

/** Bottom sheet / modal enter. */
export const SlideUp = ReanimatedSlideInDown.duration(260).springify().damping(22);

/** Bottom sheet / modal exit. */
export const SlideDown = ReanimatedSlideOutDown.duration(200);

export { SlideInUp, SlideOutUp } from 'react-native-reanimated';
