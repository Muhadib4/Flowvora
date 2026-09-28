import type { CSSProperties } from 'react';

import { classes, effectStyle, type AmbientEffectProps } from './ambient';
import styles from './ambient-effects.module.css';

export interface LightRaysProps extends Omit<AmbientEffectProps, 'colors'> {
  color?: string;
  origin?: 'top-left' | 'top' | 'top-right';
}

const origins: Record<NonNullable<LightRaysProps['origin']>, readonly [string, string]> = {
  'top-left': ['15%', '0%'],
  top: ['50%', '0%'],
  'top-right': ['85%', '0%'],
};

/** Decorative ray field that never intercepts focus, clicks, or drag gestures. */
export default function LightRays({
  className,
  color = '#7b8cff',
  origin = 'top',
  paused = false,
  ...visual
}: LightRaysProps) {
  const [originX, originY] = origins[origin];
  const style = effectStyle(
    { ...visual, colors: [color, '#65c9a8', '#29304c'] },
    [color, '#65c9a8', '#29304c'],
    { '--rb-origin-x': originX, '--rb-origin-y': originY } as CSSProperties,
  );

  return (
    <div
      aria-hidden="true"
      className={classes(styles.frame, styles.lightRays, paused && styles.paused, className)}
      style={style}
    >
      <span className={classes(styles.motion, styles.rayField)} />
      <span className={classes(styles.motion, styles.rayGlow)} />
    </div>
  );
}
