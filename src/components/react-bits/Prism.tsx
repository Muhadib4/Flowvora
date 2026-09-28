import { classes, effectStyle, type AmbientEffectProps } from './ambient';
import styles from './ambient-effects.module.css';

export type PrismProps = AmbientEffectProps;

/** A restrained CSS prism identity accent with a static reduced-motion state. */
export default function Prism({ className, paused = false, ...visual }: PrismProps) {
  return (
    <div
      aria-hidden="true"
      className={classes(styles.frame, styles.prism, paused && styles.paused, className)}
      style={effectStyle(visual, ['#8b96ff', '#65c9a8', '#c1a7ff'])}
    >
      <span className={classes(styles.motion, styles.prismShape)} />
      <span className={classes(styles.motion, styles.prismBeam)} />
    </div>
  );
}
