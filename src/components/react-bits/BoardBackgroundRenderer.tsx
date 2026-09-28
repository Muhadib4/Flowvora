'use client';

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';

import Balatro from './Balatro';
import ColorBends from './ColorBends';
import LightRays from './LightRays';
import LiquidEther from './LiquidEther';
import Prism from './Prism';
import styles from './BoardBackgroundRenderer.module.css';
import { useReducedMotion } from './useReducedMotion';

const PixelBlast = lazy(() => import('./PixelBlast'));

export type MotionBackgroundType =
  | 'balatro'
  | 'liquidEther'
  | 'colorBends'
  | 'lightRays'
  | 'pixelBlast'
  | 'prism';

export type BoardBackground =
  | { type: 'solid'; value: string }
  | { type: 'gradient'; value: string }
  | {
      type: MotionBackgroundType;
      preset?: string;
      colors?: readonly [string, string, string];
      fallback?: string;
      intensity?: number;
      speed?: number;
    };

export interface BoardBackgroundRendererProps {
  background?: BoardBackground;
  className?: string;
  motionEnabled?: boolean;
  reducedMotion?: boolean;
  interactive?: boolean;
  overlayOpacity?: number;
  onEffectError?: (type: MotionBackgroundType) => void;
}

interface MotionPreset {
  colors: readonly [string, string, string];
  fallback: string;
}

const DEFAULT_BACKGROUND: BoardBackground = { type: 'solid', value: '#0B0D10' };

const MOTION_PRESETS: Record<MotionBackgroundType, MotionPreset> = {
  balatro: {
    colors: ['#7B8CFF', '#65C9A8', '#313A62'],
    fallback: 'radial-gradient(circle at 18% 12%, #27304b 0, transparent 42%), #0B0D10',
  },
  liquidEther: {
    colors: ['#657AE8', '#56AD92', '#25364A'],
    fallback: 'radial-gradient(circle at 22% 18%, #263c51 0, transparent 42%), #0B0D10',
  },
  colorBends: {
    colors: ['#7687EB', '#61B99B', '#39416A'],
    fallback: 'linear-gradient(145deg, #202944 0%, #11151B 48%, #172B29 100%)',
  },
  lightRays: {
    colors: ['#8797F4', '#65C9A8', '#2B3351'],
    fallback: 'radial-gradient(ellipse at 50% 0%, #273252 0%, #11151B 44%, #0B0D10 100%)',
  },
  pixelBlast: {
    colors: ['#7B8CFF', '#65C9A8', '#2A3152'],
    fallback: 'radial-gradient(circle at 50% 42%, #283050 0%, #11151B 45%, #0B0D10 100%)',
  },
  prism: {
    colors: ['#8B96FF', '#65C9A8', '#B09CE0'],
    fallback: 'radial-gradient(circle at 50% 45%, #2A3150 0%, #11151B 42%, #0B0D10 100%)',
  },
};

function useIsVisible<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const updateDocumentVisibility = () => setIsVisible(!document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible((entry?.isIntersecting ?? false) && !document.hidden);
    });

    observer.observe(element);
    document.addEventListener('visibilitychange', updateDocumentVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', updateDocumentVisibility);
    };
  }, []);

  return [ref, isVisible] as const;
}

function isMotionBackground(background: BoardBackground): background is Extract<BoardBackground, { type: MotionBackgroundType }> {
  return background.type !== 'solid' && background.type !== 'gradient';
}

/** Mounts exactly one backdrop, suspends it offscreen, and always retains a static fallback. */
export default function BoardBackgroundRenderer({
  background = DEFAULT_BACKGROUND,
  className = '',
  motionEnabled = true,
  reducedMotion,
  interactive = false,
  overlayOpacity = 0.28,
  onEffectError,
}: BoardBackgroundRendererProps) {
  const [rootRef, isVisible] = useIsVisible<HTMLDivElement>();
  const systemReducedMotion = useReducedMotion();
  const shouldReduceMotion = reducedMotion ?? systemReducedMotion;
  const [failedType, setFailedType] = useState<MotionBackgroundType | null>(null);

  useEffect(() => {
    setFailedType(null);
  }, [background.type]);

  const handleEffectError = useCallback(() => {
    if (!isMotionBackground(background)) return;
    setFailedType(background.type);
    onEffectError?.(background.type);
  }, [background, onEffectError]);

  let fallback = '#0B0D10';
  let content: ReactNode = null;

  if (background.type === 'solid' || background.type === 'gradient') {
    fallback = background.value;
  } else {
    const preset = MOTION_PRESETS[background.type];
    const colors = background.colors ?? preset.colors;
    fallback = background.fallback ?? preset.fallback;
    const canAnimate = motionEnabled && !shouldReduceMotion && isVisible && failedType !== background.type;

    if (canAnimate) {
      const visualProps = {
        colors,
        speed: background.speed,
        intensity: background.intensity,
        background: '#0B0D10',
      };

      switch (background.type) {
        case 'balatro':
          content = <Balatro {...visualProps} mouseInteraction={false} />;
          break;
        case 'liquidEther':
          content = <LiquidEther {...visualProps} />;
          break;
        case 'colorBends':
          content = <ColorBends {...visualProps} />;
          break;
        case 'lightRays':
          content = <LightRays color={colors[0]} speed={background.speed} intensity={background.intensity} background="#0B0D10" />;
          break;
        case 'pixelBlast':
          content = (
            <Suspense fallback={null}>
              <PixelBlast
                color={colors[0]}
                enableRipples={interactive}
                liquid={false}
                maxDpr={1.5}
                onError={handleEffectError}
                patternDensity={1.05}
                pixelSize={5}
                speed={0.45}
                variant="circle"
              />
            </Suspense>
          );
          break;
        case 'prism':
          content = <Prism {...visualProps} />;
          break;
      }
    }
  }

  const safeOverlayOpacity = Math.min(0.72, Math.max(0, overlayOpacity));

  return (
    <div ref={rootRef} aria-hidden="true" className={`${styles.root} ${className}`}>
      <div
        className={styles.fallback}
        style={{ '--rb-fallback': fallback } as CSSProperties}
      />
      {content ? <div className={styles.layer}>{content}</div> : null}
      <div
        className={styles.readability}
        style={{ '--rb-overlay-opacity': safeOverlayOpacity } as CSSProperties}
      />
    </div>
  );
}
