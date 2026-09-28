/** React Bits PixelBlast algorithms and shaders; typed for Flowvora. */
import { Effect } from 'postprocessing';
import * as THREE from 'three';

interface TouchPoint {
  x: number;
  y: number;
  age: number;
  force: number;
  vx: number;
  vy: number;
}

export interface TouchTexture {
  texture: THREE.Texture;
  addTouch: (point: { x: number; y: number }) => void;
  update: () => void;
  radiusScale: number;
}

export function createTouchTexture(): TouchTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('PixelBlast could not create its touch texture.');

  context.fillStyle = 'black';
  context.fillRect(0, 0, size, size);

  const texture = new THREE.Texture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  const trail: TouchPoint[] = [];
  let last: { x: number; y: number } | null = null;
  let radius = size * 0.1;
  const maxAge = 64;

  const drawPoint = (point: TouchPoint) => {
    const x = point.x * size;
    const y = (1 - point.y) * size;
    let intensity = 1;

    if (point.age < maxAge * 0.3) {
      intensity = Math.sin((point.age / (maxAge * 0.3) * Math.PI) / 2);
    } else {
      const value = 1 - (point.age - maxAge * 0.3) / (maxAge * 0.7);
      intensity = -value * (value - 2) || 0;
    }

    intensity *= point.force;
    const red = ((point.vx + 1) / 2) * 255;
    const green = ((point.vy + 1) / 2) * 255;
    const blue = intensity * 255;
    const offset = size * 5;

    context.shadowOffsetX = offset;
    context.shadowOffsetY = offset;
    context.shadowBlur = radius;
    context.shadowColor = `rgba(${red}, ${green}, ${blue}, ${0.22 * intensity})`;
    context.beginPath();
    context.fillStyle = 'rgb(255 0 0)';
    context.arc(x - offset, y - offset, radius, 0, Math.PI * 2);
    context.fill();
  };

  return {
    texture,
    addTouch(point) {
      let force = 0;
      let vx = 0;
      let vy = 0;

      if (last) {
        const dx = point.x - last.x;
        const dy = point.y - last.y;
        const squaredDistance = dx * dx + dy * dy;
        if (squaredDistance === 0) return;

        const distance = Math.sqrt(squaredDistance);
        vx = dx / distance;
        vy = dy / distance;
        force = Math.min(squaredDistance * 10_000, 1);
      }

      last = point;
      trail.push({ ...point, age: 0, force, vx, vy });
      if (trail.length > 96) trail.splice(0, trail.length - 96);
    },
    update() {
      context.fillStyle = 'black';
      context.fillRect(0, 0, size, size);

      for (let index = trail.length - 1; index >= 0; index -= 1) {
        const point = trail[index];
        if (!point) continue;

        const force = (point.force / maxAge) * (1 - point.age / maxAge);
        point.x += point.vx * force;
        point.y += point.vy * force;
        point.age += 1;
        if (point.age > maxAge) trail.splice(index, 1);
      }

      trail.forEach(drawPoint);
      texture.needsUpdate = true;
    },
    set radiusScale(value: number) {
      radius = size * 0.1 * value;
    },
    get radiusScale() {
      return radius / (size * 0.1);
    },
  };
}

export function createLiquidEffect(
  texture: THREE.Texture,
  options: { strength?: number; frequency?: number },
): Effect {
  return new Effect(
    'LiquidEffect',
    `
      uniform sampler2D uTexture;
      uniform float uStrength;
      uniform float uTime;
      uniform float uFrequency;

      void mainUv(inout vec2 uv) {
        vec4 touch = texture2D(uTexture, uv);
        float vx = touch.r * 2.0 - 1.0;
        float vy = touch.g * 2.0 - 1.0;
        float intensity = touch.b;
        float wave = 0.5 + 0.5 * sin(uTime * uFrequency + intensity * 6.2831853);
        uv += vec2(vx, vy) * uStrength * intensity * wave;
      }
    `,
    {
      uniforms: new Map<string, THREE.Uniform<THREE.Texture | number>>([
        ['uTexture', new THREE.Uniform(texture)],
        ['uStrength', new THREE.Uniform(options.strength ?? 0.025)],
        ['uTime', new THREE.Uniform(0)],
        ['uFrequency', new THREE.Uniform(options.frequency ?? 4.5)],
      ]),
    },
  );
}

export const SHAPE_MAP = {
  square: 0,
  circle: 1,
  triangle: 2,
  diamond: 3,
} as const;

export const VERTEX_SHADER = `
  void main() {
    gl_Position = vec4(position, 1.0);
  }
`;

export const FRAGMENT_SHADER = `
  precision highp float;

  uniform vec3 uColor;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uPixelSize;
  uniform float uScale;
  uniform float uDensity;
  uniform float uPixelJitter;
  uniform int uEnableRipples;
  uniform float uRippleSpeed;
  uniform float uRippleThickness;
  uniform float uRippleIntensity;
  uniform float uEdgeFade;
  uniform int uShapeType;

  const int SHAPE_SQUARE = 0;
  const int SHAPE_CIRCLE = 1;
  const int SHAPE_TRIANGLE = 2;
  const int SHAPE_DIAMOND = 3;
  const int MAX_CLICKS = 10;

  uniform vec2 uClickPos[MAX_CLICKS];
  uniform float uClickTimes[MAX_CLICKS];
  out vec4 fragColor;

  float bayer2(vec2 value) {
    value = floor(value);
    return fract(value.x / 2.0 + value.y * value.y * 0.75);
  }

  #define BAYER4(value) (bayer2(0.5 * (value)) * 0.25 + bayer2(value))
  #define BAYER8(value) (BAYER4(0.5 * (value)) * 0.25 + bayer2(value))
  #define FBM_OCTAVES 5
  #define FBM_LACUNARITY 1.25
  #define FBM_GAIN 1.0

  float hash11(float value) {
    return fract(sin(value) * 43758.5453);
  }

  float valueNoise(vec3 position) {
    vec3 integerPosition = floor(position);
    vec3 fractionalPosition = fract(position);
    float n000 = hash11(dot(integerPosition + vec3(0.0, 0.0, 0.0), vec3(1.0, 57.0, 113.0)));
    float n100 = hash11(dot(integerPosition + vec3(1.0, 0.0, 0.0), vec3(1.0, 57.0, 113.0)));
    float n010 = hash11(dot(integerPosition + vec3(0.0, 1.0, 0.0), vec3(1.0, 57.0, 113.0)));
    float n110 = hash11(dot(integerPosition + vec3(1.0, 1.0, 0.0), vec3(1.0, 57.0, 113.0)));
    float n001 = hash11(dot(integerPosition + vec3(0.0, 0.0, 1.0), vec3(1.0, 57.0, 113.0)));
    float n101 = hash11(dot(integerPosition + vec3(1.0, 0.0, 1.0), vec3(1.0, 57.0, 113.0)));
    float n011 = hash11(dot(integerPosition + vec3(0.0, 1.0, 1.0), vec3(1.0, 57.0, 113.0)));
    float n111 = hash11(dot(integerPosition + vec3(1.0, 1.0, 1.0), vec3(1.0, 57.0, 113.0)));
    vec3 blend = fractionalPosition * fractionalPosition * fractionalPosition * (fractionalPosition * (fractionalPosition * 6.0 - 15.0) + 10.0);
    float x00 = mix(n000, n100, blend.x);
    float x10 = mix(n010, n110, blend.x);
    float x01 = mix(n001, n101, blend.x);
    float x11 = mix(n011, n111, blend.x);
    float y0 = mix(x00, x10, blend.y);
    float y1 = mix(x01, x11, blend.y);
    return mix(y0, y1, blend.z) * 2.0 - 1.0;
  }

  float fbm(vec2 uv, float time) {
    vec3 position = vec3(uv * uScale, time);
    float amplitude = 1.0;
    float frequency = 1.0;
    float sum = 1.0;
    for (int octave = 0; octave < FBM_OCTAVES; ++octave) {
      sum += amplitude * valueNoise(position * frequency);
      frequency *= FBM_LACUNARITY;
      amplitude *= FBM_GAIN;
    }
    return sum * 0.5 + 0.5;
  }

  float circleMask(vec2 point, float coverage) {
    float radius = sqrt(coverage) * 0.25;
    float distanceToEdge = length(point - 0.5) - radius;
    float antialias = 0.5 * fwidth(distanceToEdge);
    return coverage * (1.0 - smoothstep(-antialias, antialias, distanceToEdge * 2.0));
  }

  float triangleMask(vec2 point, vec2 id, float coverage) {
    if (mod(id.x + id.y, 2.0) > 0.5) point.x = 1.0 - point.x;
    float distanceToEdge = point.y - sqrt(coverage) * (1.0 - point.x);
    float antialias = fwidth(distanceToEdge);
    return coverage * clamp(0.5 - distanceToEdge / antialias, 0.0, 1.0);
  }

  float diamondMask(vec2 point, float coverage) {
    float radius = sqrt(coverage) * 0.564;
    return step(abs(point.x - 0.49) + abs(point.y - 0.49), radius);
  }

  void main() {
    float pixelSize = uPixelSize;
    vec2 fragmentCoordinate = gl_FragCoord.xy - uResolution * 0.5;
    float aspectRatio = uResolution.x / uResolution.y;
    vec2 pixelId = floor(fragmentCoordinate / pixelSize);
    vec2 pixelUv = fract(fragmentCoordinate / pixelSize);
    float cellPixelSize = 8.0 * pixelSize;
    vec2 cellId = floor(fragmentCoordinate / cellPixelSize);
    vec2 uv = cellId * cellPixelSize / uResolution * vec2(aspectRatio, 1.0);
    float base = fbm(uv, uTime * 0.05) * 0.5 - 0.65;
    float feed = base + (uDensity - 0.5) * 0.3;

    if (uEnableRipples == 1) {
      for (int index = 0; index < MAX_CLICKS; ++index) {
        vec2 clickPosition = uClickPos[index];
        if (clickPosition.x < 0.0) continue;
        vec2 clickUv = ((clickPosition - uResolution * 0.5 - cellPixelSize * 0.5) / uResolution) * vec2(aspectRatio, 1.0);
        float elapsed = max(uTime - uClickTimes[index], 0.0);
        float radius = distance(uv, clickUv);
        float ring = exp(-pow((radius - uRippleSpeed * elapsed) / uRippleThickness, 2.0));
        float attenuation = exp(-elapsed) * exp(-10.0 * radius);
        feed = max(feed, ring * attenuation * uRippleIntensity);
      }
    }

    float bayer = BAYER8(fragmentCoordinate / uPixelSize) - 0.5;
    float monochrome = step(0.5, feed + bayer);
    float hash = fract(sin(dot(floor(fragmentCoordinate / uPixelSize), vec2(127.1, 311.7))) * 43758.5453);
    float coverage = monochrome * (1.0 + (hash - 0.5) * uPixelJitter);
    float mask;

    if (uShapeType == SHAPE_CIRCLE) mask = circleMask(pixelUv, coverage);
    else if (uShapeType == SHAPE_TRIANGLE) mask = triangleMask(pixelUv, pixelId, coverage);
    else if (uShapeType == SHAPE_DIAMOND) mask = diamondMask(pixelUv, coverage);
    else mask = coverage;

    if (uEdgeFade > 0.0) {
      vec2 normalized = gl_FragCoord.xy / uResolution;
      float edge = min(min(normalized.x, normalized.y), min(1.0 - normalized.x, 1.0 - normalized.y));
      mask *= smoothstep(0.0, uEdgeFade, edge);
    }

    vec3 srgbColor = mix(
      uColor * 12.92,
      1.055 * pow(uColor, vec3(1.0 / 2.4)) - 0.055,
      step(0.0031308, uColor)
    );
    fragColor = vec4(srgbColor, mask);
  }
`;
