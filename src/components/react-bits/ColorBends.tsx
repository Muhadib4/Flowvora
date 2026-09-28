import { classes, effectStyle, type AmbientEffectProps } from './ambient';
import styles from './ambient-effects.module.css';

export type ColorBendsProps = AmbientEffectProps;

/** Calm CSS ribbons inspired by ColorBends, suitable for a low-cost board backdrop. */
export default function ColorBends({ className, paused = false, ...visual }: ColorBendsProps) {
  return (
    <div
      aria-hidden="true"
      className={classes(styles.frame, styles.colorBends, paused && styles.paused, className)}
      style={effectStyle(visual, ['#7b8cff', '#65c9a8', '#343d68'])}
    >
      <span className={classes(styles.motion, styles.ribbon)} />
      <span className={classes(styles.motion, styles.ribbon)} />
      <span className={classes(styles.motion, styles.ribbon)} />
    </div>
  );
}
