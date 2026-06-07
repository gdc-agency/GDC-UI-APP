import { FadeIn, FadeOut } from './FadeIn';

/** Default screen mount transition — keep subtle. */
export const ScreenTransition = {
  entering: FadeIn,
  exiting: FadeOut,
};

export default ScreenTransition;
