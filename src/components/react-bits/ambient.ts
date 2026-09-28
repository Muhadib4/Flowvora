import type { CSSProperties } from 'react';

export interface AmbientEffectProps {
  className?: string;
  style?: CSSProperties;
  colors?: readonly [string, string, string];
  background?: string;
  intensity?: number;
  speed?: number;
  paused?: boolean;
}

export function classes(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

export function effectStyle(
  props: AmbientEffectProps,
  defaults: readonly [string, string, string],
  extra?: CSSProperties,
): CSSProperties {
  const [color1, color2, color3] = props.colors ?? defaults;
  const safeSpeed = Math.min(60, Math.max(6, props.speed ?? 20));
  const safeIntensity = Math.min(1, Math.max(0, props.intensity ?? 1));

  return {
    '--rb-base': props.background ?? '#0b0d10',
    '--rb-c1': color1,
    '--rb-c2': color2,
    '--rb-c3': color3,
    '--rb-speed': `${safeSpeed}s`,
    '--rb-intensity': safeIntensity,
    ...extra,
    ...props.style,
  } as CSSProperties;
}
