import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { pondDistance } from "../core/pond";
import { type Pond, WATER_Y, createPond } from "./pond";
import { softPoints } from "./soft-points";

/** Sky colour at the horizon; the fog uses it too so far ground melts into the sky. */
export const HORIZON = new THREE.Color("#1a2a4a");
const ZENITH = new THREE.Color("#070c1a");

const FIREFLIES = 18;

/**
 * Winter: a light dusting of snow. Bluish grey and darker than it looks, so
 * the firelit ground near the camp doesn't wash out to white.
 */
export const SNOW = new THREE.Color('#a4b0c2');

/** Gentle rolling ground that stays flat around the fire and the seat. */
export function groundHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const k = THREE.MathUtils.smoothstep(r, 4, 10);
  const rolling =
    (Math.sin(x * 0.35 + 1.3) * Math.cos(z * 0.31 - 0.7) * 0.5 +
      Math.sin(x * 0.9 + z * 0.7) * 0.15) *
    k *
    0.9;
  // The pond: level the bank, then dig a shallow basin below the water line.
  const d = pondDistance(x, z);
  const bank = THREE.MathUtils.smoothstep(d, 1.3, 2.0);
  const basin = 1 - THREE.MathUtils.smoothstep(d, 0.75, 1.3);
  return rolling * bank - basin * 0.4;
}

function seeded(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Dome with a soft glow near the horizon fading to near-black overhead. */
function skyDome(): THREE.Mesh {
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(150, 32, 16),
    new THREE.ShaderMaterial({
      uniforms: { uHorizon: { value: HORIZON }, uZenith: { value: ZENITH } },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uHorizon, uZenith;
        varying vec3 vDir;
        void main() {
          float t = smoothstep(0.0, 0.42, normalize(vDir).y);
          gl_FragColor = vec4(mix(uHorizon, uZenith, pow(t, 0.6)), 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      fog: false,
    }),
  );
  dome.renderOrder = -10;
  dome.frustumCulled = false;
  return dome;
}

/**
 * A drifting overcast between the ridges (r 78) and the stars (r 90). Drawn
 * before the stars, which the stage dims separately.
 */
function cloudDome(): THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial> {
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(85, 32, 16),
    new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uLevel: { value: 0 } },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime, uLevel;
        varying vec3 vDir;
        float hash(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }
        float vnoise(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
        }
        void main() {
          vec3 d = normalize(vDir);
          // Project onto a flat cloud deck overhead so the puffs shrink toward the horizon.
          vec2 q = d.xz / max(d.y, 0.08) * 1.6 + vec2(uTime * 0.02, uTime * 0.008);
          float n = vnoise(q) * 0.6 + vnoise(q * 2.3 + 7.1) * 0.3 + vnoise(q * 5.1 + 3.7) * 0.1;
          float a = uLevel * (0.55 + 0.4 * n) * smoothstep(-0.02, 0.12, d.y);
          gl_FragColor = vec4(vec3(0.075, 0.085, 0.11) * (0.8 + 0.4 * n), a);
        }
      `,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      fog: false,
    }),
  );
  dome.renderOrder = -5;
  dome.frustumCulled = false;
  dome.visible = false;
  return dome;
}

/** A ring of ridge silhouettes; `peak` is how far the tallest summit rises. */
function ridge(radius: number, base: number, peak: number, color: string, cap: string, seed: number): THREE.Mesh {
  const rand = seeded(seed);
  const waves = Array.from({ length: 6 }, (_, i) => ({ f: 2 + i * 3 + Math.floor(rand() * 3), p: rand() * 6.28, a: 1 / (i + 1.5) }));
  const total = waves.reduce((s, w) => s + w.a, 0);
  const SEG = 240;
  const body = new THREE.Color(color);
  const snow = new THREE.Color(cap);
  const top = new THREE.Color();
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= SEG; i++) {
    const a = (i / SEG) * Math.PI * 2;
    let n = 0;
    for (const w of waves) n += Math.sin(a * w.f + w.p) * w.a;
    const rise = 0.5 + (0.5 * n) / total;
    const h = base + rise * peak;
    const x = Math.cos(a) * radius;
    const z = Math.sin(a) * radius;
    // Three rows: foot, the snow line just under the summit, the summit. Only the higher peaks are capped.
    pos.push(x, -2, z, x, h - peak * 0.18, z, x, h, z);
    top.copy(body).lerp(snow, THREE.MathUtils.smoothstep(rise, 0.45, 0.8));
    col.push(body.r, body.g, body.b, body.r, body.g, body.b, top.r, top.g, top.b);
    if (i < SEG) {
      const b = i * 3;
      idx.push(b, b + 1, b + 3, b + 1, b + 4, b + 3, b + 1, b + 2, b + 4, b + 2, b + 5, b + 4);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide }));
  mesh.frustumCulled = false;
  return mesh;
}

function ground(): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(70, 70, 160, 160).rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  const colors = new Float32Array(p.count * 3);
  const grass = new THREE.Color("#1c2e1f");
  const moss = new THREE.Color("#263320");
  const soil = new THREE.Color("#2a241b");
  const mud = new THREE.Color("#1d1a15");
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    p.setY(i, groundHeight(x, z));
    const n = Math.sin(x * 1.7 + 0.3) * Math.cos(z * 1.3 + 1.1) * 0.5 + 0.5;
    const m = Math.sin(x * 0.6 - z * 0.8) * 0.5 + 0.5;
    c.copy(grass)
      .lerp(moss, n)
      .lerp(soil, m * 0.35);
    // Bare, damp earth along the water's edge.
    c.lerp(mud, 1 - THREE.MathUtils.smoothstep(pondDistance(x, z), 1.05, 1.5));
    // A patchy dusting of snow, melted around the fire and the water, thin where the camp is trodden.
    const patch = Math.sin(x * 0.9 - z * 0.4 + 2.1) * Math.cos(z * 1.1 + x * 0.3) * 0.5 + 0.5;
    let snow = THREE.MathUtils.smoothstep(patch * 0.6 + n * 0.4, 0.2, 0.5);
    snow *= THREE.MathUtils.smoothstep(Math.hypot(x, z), 1.3, 2.2);
    snow *= THREE.MathUtils.smoothstep(pondDistance(x, z), 1.1, 1.7);
    if (CLEARINGS.some(([cx, cz, cr]) => Math.hypot(x - cx, z - cz) < cr)) snow *= 0.4;
    c.lerp(SNOW, snow * 0.9);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }),
  );
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Three stacked cones, unit height, so one instanced draw makes a whole pine.
 * Vertex colours carry the needles and the snow on the upper half of each
 * tier; the instance colour only varies brightness.
 */
function pineGeometry(): THREE.BufferGeometry {
  const needles = new THREE.Color('#15281c');
  const tiers = [
    { r: 1, h: 0.5, y: 0.25 },
    { r: 0.76, h: 0.46, y: 0.55 },
    { r: 0.5, h: 0.44, y: 0.82 },
  ].map((t) => {
    const cone = new THREE.ConeGeometry(t.r, t.h, 8, 2).toNonIndexed();
    const p = cone.attributes.position;
    const col = new Float32Array(p.count * 3);
    for (let f = 0; f < p.count; f += 3) {
      // Whole faces, so the snow line stays crisp: faces above the tier's middle (the base cap is below it).
      const cy = (p.getY(f) + p.getY(f + 1) + p.getY(f + 2)) / 3;
      const c = cy > 0 ? SNOW : needles;
      for (let v = 0; v < 3; v++) col.set([c.r, c.g, c.b], (f + v) * 3);
    }
    cone.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return cone.translate(0, t.y, 0);
  });
  const merged = mergeGeometries(tiers);
  tiers.forEach((t) => t.dispose());
  return merged;
}

/**
 * A tuft of four flat blades standing close together, unit height. Blades
 * taper to a point, lean out only a little and are darker at the base, so a
 * field of them reads as short neat grass rather than spikes.
 */
function tuftGeometry(): THREE.BufferGeometry {
  const rand = seeded(97);
  const pos: number[] = [];
  const col: number[] = [];
  const nor: number[] = [];
  const idx: number[] = [];
  const SEG = 4;
  for (let b = 0; b < 4; b++) {
    const yaw = (b / 4) * Math.PI * 2 + rand() * 0.8;
    const lean = 0.03 + rand() * 0.06;
    const height = 0.6 + rand() * 0.4;
    const width = 0.03 + rand() * 0.015;
    const dx = Math.cos(yaw);
    const dz = Math.sin(yaw);
    const base = pos.length / 3;
    for (let i = 0; i <= SEG; i++) {
      const t = i / SEG;
      const w = width * (1 - t * t);
      const out = 0.02 + lean * t * t;
      // Blade faces outward; its width runs across (perpendicular to the lean).
      for (const sgn of [-1, 1]) {
        pos.push(dx * out - dz * w * sgn, height * t, dz * out + dx * w * sgn);
        const shade = 0.45 + 0.75 * t;
        col.push(shade, shade, shade);
        // Mostly upward normals: blades take the firelight evenly from either side.
        nor.push(dx * 0.35, 0.9, dz * 0.35);
      }
      if (i < SEG) {
        const a = base + i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  geo.setIndex(idx);
  return geo;
}

/** Trampled ground where nothing grows: around the seat and where the dog lies (x, z, radius). */
const CLEARINGS: Array<[number, number, number]> = [
  [-1.35, -1.74, 0.8],
  [-2.7, -1.0, 1.0],
  // In front of the dog's nose and paws.
  [-1.7, -0.8, 0.95],
  // The whole rug under the tarp (see rug.ts): grass would poke through it.
  [-2.13, -1.32, 1.95],
];

export interface Environment {
  group: THREE.Group;
  update(time: number, fire: THREE.PointLight): void;
  setPointScale(pxPerUnit: number): void;
  setRain(level: number): void;
}

export function createEnvironment(): Environment {
  const group = new THREE.Group();
  const clouds = cloudDome();
  group.add(skyDome(), clouds);
  // Ridges sit inside the star sphere so they hide stars below the skyline.
  group.add(ridge(78, 3.2, 9.5, '#0c1528', '#3a4862', 5));
  group.add(ridge(62, 2.6, 5.2, '#080e1c', '#2a364a', 23));
  group.add(ground());

  const dirt = new THREE.Mesh(
    new THREE.CircleGeometry(1.2, 40),
    new THREE.MeshStandardMaterial({ color: 0x33261a, roughness: 1 }),
  );
  dirt.rotation.x = -Math.PI / 2;
  dirt.position.y = 0.006;
  dirt.receiveShadow = true;
  group.add(dirt);

  const rand = seeded(7);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  const c = new THREE.Color();

  // Grass: short tufts, thicker near the camp and thinning out with distance.
  const TUFTS = 260;
  const blades = new THREE.InstancedMesh(
    tuftGeometry(),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 1,
      vertexColors: true,
      side: THREE.DoubleSide,
    }),
    TUFTS,
  );
  const green = new THREE.Color("#3a6b33");
  const dry = new THREE.Color("#6b6a32");
  for (let i = 0; i < TUFTS;) {
    const a = rand() * Math.PI * 2;
    // The camp itself is trodden bare; grass starts a little way out.
    const r = 2.7 + rand() * 9;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    // Keep the foreground between the camera and the fire low and open.
    if (z > 3.4) continue;
    if (pondDistance(x, z) < 1.3) continue;
    if (CLEARINGS.some(([cx, cz, cr]) => Math.hypot(x - cx, z - cz) < cr))
      continue;
    const near = z > 1.5 ? 0.7 : 1;
    const h = (0.07 + rand() * 0.05) * near;
    const w = 0.6 + rand() * 0.25;
    q.setFromEuler(e.set(0, rand() * 6.28, 0));
    m.compose(pos.set(x, groundHeight(x, z) - 0.01, z), q, scl.set(w, h, w));
    blades.setMatrixAt(i, m);
    blades.setColorAt(
      i,
      c
        .copy(green)
        .lerp(dry, rand() * 0.25)
        .multiplyScalar(0.8 + rand() * 0.25),
    );
    i++;
  }
  blades.receiveShadow = true;
  group.add(blades);

  // Pines: a near ring that catches the firelight and a denser far ring of silhouettes.
  const rings = [
    { count: 26, r0: 8, dr: 4, h0: 1.5, dh: 1.5, w0: 0.6, dw: 0.35 },
    { count: 46, r0: 13, dr: 7, h0: 2.2, dh: 2.2, w0: 0.8, dw: 0.5 },
  ];
  const total = rings.reduce((s, r) => s + r.count, 0);
  const tops = new THREE.InstancedMesh(
    pineGeometry(),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 1,
      flatShading: true,
      vertexColors: true,
    }),
    total,
  );
  const trunks = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.1, 0.15, 1, 6).translate(0, 0.5, 0),
    new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: 1 }),
    total,
  );
  let t = 0;
  q.identity();
  for (const ring of rings) {
    for (let i = 0; i < ring.count; i++, t++) {
      const a =
        Math.PI * 0.82 +
        (i / ring.count) * Math.PI * 1.36 +
        (rand() - 0.5) * 0.18;
      const r = ring.r0 + rand() * ring.dr;
      const h = ring.h0 + rand() * ring.dh;
      const w = ring.w0 + rand() * ring.dw;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      // No tree stands in the pond or right on its bank.
      const y = pondDistance(x, z) < 1.7 ? -50 : groundHeight(x, z) - 0.05;
      q.setFromEuler(e.set(0, rand() * 6.28, 0));
      m.compose(pos.set(x, y + 0.45, z), q, scl.set(w, h, w));
      tops.setMatrixAt(t, m);
      tops.setColorAt(t, c.setScalar(0.75 + rand() * 0.5));
      m.compose(pos.set(x, y, z), q, scl.set(1, 0.7, 1));
      trunks.setMatrixAt(t, m);
    }
  }
  tops.castShadow = trunks.castShadow = true;
  group.add(tops, trunks);

  // Fireflies drifting low among the grass, blinking slowly.
  const flies = softPoints(FIREFLIES, THREE.AdditiveBlending);
  const homes = Array.from({ length: FIREFLIES }, () => {
    const a = rand() * Math.PI * 2;
    const r = 3.2 + rand() * 6;
    return {
      x: Math.cos(a) * r,
      z: Math.sin(a) * r,
      y: 0.35 + rand() * 1.1,
      phase: rand() * 6.28,
      speed: 0.25 + rand() * 0.35,
    };
  });
  group.add(flies.points);

  const pond: Pond = createPond(HORIZON, ZENITH);
  group.add(pond.group);

  return {
    group,
    update(time, fire) {
      pond.update(time, fire);
      clouds.material.uniforms.uTime.value = time;
      homes.forEach((h, i) => {
        const p = time * h.speed + h.phase;
        flies.pos[i * 3] = h.x + Math.sin(p) * 0.7 + Math.sin(p * 2.3) * 0.2;
        flies.pos[i * 3 + 1] =
          h.y +
          Math.max(WATER_Y, groundHeight(h.x, h.z)) +
          Math.sin(p * 1.7) * 0.25;
        flies.pos[i * 3 + 2] = h.z + Math.cos(p * 0.8) * 0.7;
        const blink = Math.pow(
          Math.max(0, Math.sin(time * 0.9 + h.phase * 3)),
          3,
        );
        flies.size[i] = 0.07;
        flies.color.set([0.9 * blink, 1.5 * blink, 0.3 * blink, 1], i * 4);
      });
      flies.geo.attributes.position.needsUpdate = true;
      flies.geo.attributes.aSize.needsUpdate = true;
      flies.geo.attributes.aColor.needsUpdate = true;
    },
    setRain(level) {
      clouds.visible = level > 0;
      clouds.material.uniforms.uLevel.value = level;
      pond.setRain(level);
    },
    setPointScale(pxPerUnit) {
      flies.points.material.uniforms.uPx.value = pxPerUnit;
    },
  };
}
