'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import { Effect, EffectComposer, EffectPass, RenderPass } from 'postprocessing';
import * as THREE from 'three';

import { animateWhileVisible } from './animation';
import styles from './PixelBlast.module.css';
import {
  createLiquidEffect,
  createTouchTexture,
  FRAGMENT_SHADER,
  SHAPE_MAP,
  VERTEX_SHADER,
} from './pixel-blast-shaders';
import { useReducedMotion } from './useReducedMotion';

export interface PixelBlastProps {
  variant?: keyof typeof SHAPE_MAP;
  pixelSize?: number;
  color?: string;
  className?: string;
  style?: CSSProperties;
  antialias?: boolean;
  patternScale?: number;
  patternDensity?: number;
  liquid?: boolean;
  liquidStrength?: number;
  liquidRadius?: number;
  liquidWobbleSpeed?: number;
  pixelSizeJitter?: number;
  enableRipples?: boolean;
  rippleIntensityScale?: number;
  rippleThickness?: number;
  rippleSpeed?: number;
  autoPauseOffscreen?: boolean;
  speed?: number;
  transparent?: boolean;
  edgeFade?: number;
  noiseAmount?: number;
  maxDpr?: number;
  reducedMotion?: boolean;
  onError?: () => void;
}

/**
 * Typed adaptation of the supplied React Bits PixelBlast source.
 * It observes pointer input passively and never becomes a drag/drop hit target.
 */
export default function PixelBlast({
  variant = 'square',
  pixelSize = 3,
  color = '#7B8CFF',
  className = '',
  style,
  antialias = false,
  patternScale = 2,
  patternDensity = 1,
  liquid = false,
  liquidStrength = 0.1,
  liquidRadius = 1,
  liquidWobbleSpeed = 4.5,
  pixelSizeJitter = 0,
  enableRipples = true,
  rippleIntensityScale = 1,
  rippleThickness = 0.1,
  rippleSpeed = 0.3,
  autoPauseOffscreen = true,
  speed = 0.5,
  transparent = true,
  edgeFade = 0.5,
  noiseAmount = 0,
  maxDpr = 1.5,
  reducedMotion,
  onError,
}: PixelBlastProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const systemReducedMotion = useReducedMotion();
  const shouldReduceMotion = reducedMotion ?? systemReducedMotion;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || shouldReduceMotion) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias,
        alpha: true,
        powerPreference: 'low-power',
      });
    } catch {
      onError?.();
      return;
    }

    renderer.debug.onShaderError = () => onError?.();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Math.max(1, maxDpr)));
    renderer.setClearColor(0, transparent ? 0 : 1);
    container.appendChild(renderer.domElement);

    const uniforms = {
      uResolution: { value: new THREE.Vector2() },
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uClickPos: { value: Array.from({ length: 10 }, () => new THREE.Vector2(-1, -1)) },
      uClickTimes: { value: new Float32Array(10) },
      uShapeType: { value: SHAPE_MAP[variant] },
      uPixelSize: { value: pixelSize * renderer.getPixelRatio() },
      uScale: { value: patternScale },
      uDensity: { value: patternDensity },
      uPixelJitter: { value: pixelSizeJitter },
      uEnableRipples: { value: enableRipples ? 1 : 0 },
      uRippleSpeed: { value: rippleSpeed },
      uRippleThickness: { value: rippleThickness },
      uRippleIntensity: { value: rippleIntensityScale },
      uEdgeFade: { value: edgeFade },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      glslVersion: THREE.GLSL3,
    });
    const geometry = new THREE.PlaneGeometry(2, 2);
    const scene = new THREE.Scene();
    scene.add(new THREE.Mesh(geometry, material));
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const touch = liquid ? createTouchTexture() : null;
    if (touch) touch.radiusScale = liquidRadius;

    const postEffects: Effect[] = [];
    if (touch) {
      postEffects.push(
        createLiquidEffect(touch.texture, {
          strength: liquidStrength,
          frequency: liquidWobbleSpeed,
        }),
      );
    }

    if (noiseAmount > 0) {
      postEffects.push(
        new Effect(
          'NoiseEffect',
          `
            uniform float uTime;
            uniform float uAmount;
            float hash(vec2 point) {
              return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453);
            }
            void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
              float noise = hash(floor(uv * vec2(1920.0, 1080.0)) + floor(uTime * 60.0));
              outputColor = inputColor + vec4(vec3((noise - 0.5) * uAmount), 0.0);
            }
          `,
          {
            uniforms: new Map<string, THREE.Uniform<number>>([
              ['uTime', new THREE.Uniform(0)],
              ['uAmount', new THREE.Uniform(noiseAmount)],
            ]),
          },
        ),
      );
    }

    const composer = postEffects.length > 0 ? new EffectComposer(renderer, { multisampling: 0 }) : null;
    if (composer) {
      composer.addPass(new RenderPass(scene, camera));
      const effectPass = new EffectPass(camera, ...postEffects);
      effectPass.renderToScreen = true;
      composer.addPass(effectPass);
    }

    const resize = () => {
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      renderer.setSize(width, height, false);
      uniforms.uResolution.value.set(renderer.domElement.width, renderer.domElement.height);
      composer?.setSize(width, height);
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    let clickIndex = 0;
    const pointerPosition = (event: PointerEvent) => {
      const bounds = container.getBoundingClientRect();
      if (
        bounds.width === 0 ||
        bounds.height === 0 ||
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom
      ) {
        return null;
      }

      return {
        x: (event.clientX - bounds.left) / bounds.width,
        y: 1 - (event.clientY - bounds.top) / bounds.height,
      };
    };

    const handlePointerDown = (event: PointerEvent) => {
      const point = pointerPosition(event);
      if (!point || !enableRipples) return;

      uniforms.uClickPos.value[clickIndex]?.set(
        point.x * renderer.domElement.width,
        point.y * renderer.domElement.height,
      );
      uniforms.uClickTimes.value[clickIndex] = uniforms.uTime.value;
      clickIndex = (clickIndex + 1) % 10;
    };

    const handlePointerMove = (event: PointerEvent) => {
      const point = pointerPosition(event);
      if (point && event.pointerType !== 'touch') touch?.addTouch(point);
    };

    document.addEventListener('pointerdown', handlePointerDown, { passive: true });
    if (touch) document.addEventListener('pointermove', handlePointerMove, { passive: true });

    const handleContextLoss = (event: Event) => {
      event.preventDefault();
      onError?.();
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLoss);

    const stopAnimation = animateWhileVisible(
      container,
      (seconds) => {
        uniforms.uTime.value = 100 + seconds * speed;
        touch?.update();

        postEffects.forEach((effect) => {
          const timeUniform = effect.uniforms.get('uTime') as THREE.Uniform<number> | undefined;
          if (timeUniform) timeUniform.value = uniforms.uTime.value;
        });

        if (composer) composer.render();
        else renderer.render(scene, camera);
      },
      onError,
      { pauseOffscreen: autoPauseOffscreen },
    );

    return () => {
      stopAnimation();
      resizeObserver.disconnect();
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLoss);
      composer?.dispose();
      touch?.texture.dispose();
      geometry.dispose();
      material.dispose();
      scene.clear();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [
    antialias,
    autoPauseOffscreen,
    color,
    edgeFade,
    enableRipples,
    liquid,
    liquidRadius,
    liquidStrength,
    liquidWobbleSpeed,
    maxDpr,
    noiseAmount,
    onError,
    patternDensity,
    patternScale,
    pixelSize,
    pixelSizeJitter,
    rippleIntensityScale,
    rippleSpeed,
    rippleThickness,
    shouldReduceMotion,
    speed,
    transparent,
    variant,
  ]);

  if (shouldReduceMotion) {
    return (
      <div
        aria-hidden="true"
        className={`${styles.fallback} ${className}`}
        style={{ '--rb-pixel-color': color, ...style } as CSSProperties}
      />
    );
  }

  return <div ref={containerRef} aria-hidden="true" className={`${styles.container} ${className}`} style={style} />;
}
