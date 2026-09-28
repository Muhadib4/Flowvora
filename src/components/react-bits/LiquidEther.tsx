import { classes, effectStyle, type AmbientEffectProps } from './ambient';
import styles from './ambient-effects.module.css';

export type LiquidEtherProps = AmbientEffectProps;

/** Lightweight ambient liquid field with no canvas allocation or pointer capture. */
export default function LiquidEther({ className, paused = false, ...visual }: LiquidEtherProps) {
  return (
    <div
      aria-hidden="true"
      className={classes(styles.frame, styles.liquidEther, paused && styles.paused, className)}
      style={effectStyle(visual, ['#6478e8', '#56ad92', '#27334b'])}
    >
      <span className={classes(styles.motion, styles.liquidBlob)} />
      <span className={classes(styles.motion, styles.liquidBlob)} />
      <span className={classes(styles.motion, styles.liquidBlob)} />
    </div>
  );
}
