import { ZoomIn as ReanimatedZoomIn, ZoomOut as ReanimatedZoomOut } from 'react-native-reanimated';

/** Card / avatar scale-in. */
export const ScaleIn = ReanimatedZoomIn.duration(220).springify().damping(18);

/** Card scale-out. */
export const ScaleOut = ReanimatedZoomOut.duration(160);
