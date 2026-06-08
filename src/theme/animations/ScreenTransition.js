import { FadeOut } from './FadeIn';
import { enterDown } from './motion';

/** Default screen mount transition — match dashboard section motion. */
export const ScreenTransition = {
  entering: enterDown(0),
  exiting: FadeOut,
};

export default ScreenTransition;
