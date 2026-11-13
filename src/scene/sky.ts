import * as THREE from "three";
import {
  OBSERVER,
  equatorialToHorizontal,
  galacticToEquatorial,
  greenwichSiderealDeg,
  horizontalToScene,
  tonightMidnightKst,
} from "../core/sky";
import { STARS } from "./sky-data";

const RADIUS = 90;
/** Pixel sizes per magnitude bucket (brightest first). */
const BUCKETS: Array<{ maxMag: number; size: number }> = [
  { maxMag: 1.5, size: 12 },
  { maxMag: 2.5, size: 9 },
  { maxMag: 3.5, size: 7 },
  { maxMag: 4.5, size: 5 },
  { maxMag: 5.3, size: 3.8 },
  { maxMag: 99, size: 3 },
];

function starTexture(): THREE.Texture {
  const size = 32;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const g = canvas.getContext("2d")!;
  const grad = g.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.25, "rgba(255,255,255,0.9)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.35)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const MILKY_POINTS = 2600;

/**
 * The Milky Way as a haze of big, very faint points scattered around the
 * galactic plane (denser and warmer toward the galactic centre). It follows
 * the same real-sky transform as the stars, so it is only in view on nights
 * when the plane actually crosses the southern sky.
 */
function milkyWay(
  toScene: (ra: number, dec: number) => [number, number, number] | null,
): THREE.Points {
  let seed = 4242;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const gauss = () => (rand() + rand() + rand() + rand() - 2) * 1.7;
  const pos: number[] = [];
  const size: number[] = [];
  const color: number[] = [];
  for (let i = 0; i < MILKY_POINTS; i++) {
    const l = rand() * 360;
    const fromCentre = Math.min(l, 360 - l);
    const core = Math.exp(-((fromCentre / 55) ** 2));
    const b = gauss() * (5 + 6 * core);
    const { ra, dec } = galacticToEquatorial(l, b);
    const p = toScene(ra, dec);
    const sz = 22 + rand() * 34;
    const a = (0.012 + 0.03 * core) * (0.5 + rand());
    if (!p) continue;
    pos.push(...p);
    size.push(sz);
    color.push((0.75 + 0.25 * core) * a, 0.8 * a, (1 - 0.25 * core) * a);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("aSize", new THREE.Float32BufferAttribute(size, 1));
  geo.setAttribute("aColor", new THREE.Float32BufferAttribute(color, 3));
  const points = new THREE.Points(
    geo,
    new THREE.ShaderMaterial({
      uniforms: { uDpr: { value: Math.min(window.devicePixelRatio, 1.5) } },
      vertexShader: /* glsl */ `
        attribute float aSize;
        attribute vec3 aColor;
        uniform float uDpr;
        varying vec3 vColor;
        void main() {
          vColor = aColor;
          gl_PointSize = aSize * uDpr;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          float a = 1.0 - smoothstep(0.0, 1.0, d);
          gl_FragColor = vec4(vColor * a * a, 1.0);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    }),
  );
  points.frustumCulled = false;
  return points;
}

const BLUE = new THREE.Color("#a9bcff");
const WHITE = new THREE.Color("#fff6ec");
const ORANGE = new THREE.Color("#ffc580");

function starColor(bv: number, mag: number, out: THREE.Color): THREE.Color {
  if (bv < 0.6) out.copy(BLUE).lerp(WHITE, Math.max(0, (bv + 0.3) / 0.9));
  else out.copy(WHITE).lerp(ORANGE, Math.min(1, (bv - 0.6) / 1.0));
  // Fainter stars dimmer so the sky has depth.
  return out.multiplyScalar(THREE.MathUtils.clamp(1.3 - mag * 0.1, 0.7, 1));
}

/**
 * The real sky over 38°N 127°E at tonight's midnight (KST), drawn so that due
 * south is straight ahead. Stars below the horizon are skipped.
 */
export function createSky(now: Date): THREE.Group {
  const group = new THREE.Group();
  const lst = greenwichSiderealDeg(tonightMidnightKst(now)) + OBSERVER.lonDeg;
  const toScene = (
    ra: number,
    dec: number,
  ): [number, number, number] | null => {
    const { alt, az } = equatorialToHorizontal(ra, dec, lst, OBSERVER.latDeg);
    if (alt < 0) return null;
    const [x, y, z] = horizontalToScene(alt, az);
    return [x * RADIUS, y * RADIUS, z * RADIUS];
  };

  group.add(milkyWay(toScene));

  const positions: number[][] = BUCKETS.map(() => []);
  const colors: number[][] = BUCKETS.map(() => []);
  const c = new THREE.Color();
  for (let i = 0; i < STARS.length; i += 4) {
    const p = toScene(STARS[i], STARS[i + 1]);
    if (!p) continue;
    const mag = STARS[i + 2];
    const b = BUCKETS.findIndex((x) => mag <= x.maxMag);
    positions[b].push(...p);
    starColor(STARS[i + 3], mag, c);
    colors[b].push(c.r, c.g, c.b);
  }
  const map = starTexture();
  BUCKETS.forEach((bucket, b) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions[b], 3),
    );
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors[b], 3));
    const points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: bucket.size,
        sizeAttenuation: false,
        vertexColors: true,
        fog: false,
        map,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    points.frustumCulled = false;
    group.add(points);
  });

  return group;
}
