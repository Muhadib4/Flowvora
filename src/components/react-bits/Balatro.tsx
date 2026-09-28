import type { CSSProperties } from 'react';

import { classes, effectStyle, type AmbientEffectProps } from './ambient';
import styles from './ambient-effects.module.css';

export interface BalatroProps extends AmbientEffectProps {
  isRotate?: boolean;
  mouseInteraction?: boolean;
  pixelFilter?: number;
}

/** A pointer-safe, CSS interpretation used when the original Balatro shader is unavailable. */
export default function Balatro({
  className,
  isRotate = false,
  mouseInteraction = false,
  pixelFilter = 700,
  paused = false,
  ...visual
}: BalatroProps) {
  const pixelSize = Math.round(Math.min(28, Math.max(10, pixelFilter / 42)));
  const style = effectStyle(visual, ['#7b8cff', '#65c9a8', '#3d4778'], {
    '--rb-pixel-size': `${pixelSize}px`,
  } as CSSProperties);

  return (
    <div
      aria-hidden="true"
      className={classes(styles.frame, styles.balatro, paused && styles.paused, className)}
      data-mouse-interaction={mouseInteraction || undefined}
      data-rotate={isRotate || undefined}
      style={style}
    >
      <span className={classes(styles.motion, styles.balatroOrb)} />
      <span className={classes(styles.motion, styles.balatroOrb)} />
      <span className={classes(styles.motion, styles.balatroOrb)} />
    </div>
  );
}
