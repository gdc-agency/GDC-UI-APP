import React, { useMemo } from 'react';
import { Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/**
 * Soft multi-hump wave (cloud-like) between a blue header and white body — matches signup mockup style.
 */
export function WaveDivider({ fill = '#FFFFFF' }) {
  const width = Dimensions.get('window').width;
  const h = 52;

  const d = useMemo(() => {
    const w = width;
    return [
      `M0,${h * 0.35}`,
      `C${w * 0.12},${h * 0.05} ${w * 0.22},${h * 0.85} ${w * 0.34},${h * 0.42}`,
      `S${w * 0.52},${h * 0.08} ${w * 0.62},${h * 0.48}`,
      `S${w * 0.78},${h * 0.92} ${w * 0.88},${h * 0.38}`,
      `C${w * 0.94},${h * 0.2} ${w},${h * 0.45} ${w},${h * 0.55}`,
      `L${w},${h}`,
      `L0,${h}`,
      'Z',
    ].join(' ');
  }, [width, h]);

  return (
    <Svg width={width} height={h} viewBox={`0 0 ${width} ${h}`} preserveAspectRatio="none">
      <Path d={d} fill={fill} />
    </Svg>
  );
}
