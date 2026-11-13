import * as THREE from "three";
import { BOOST } from "../audio/schedule";
import { softPoints } from "./soft-points";

const SPARKS = 60;
const SMOKE = 26;
/** `tint`: how much of the aurora colour a sheet takes; inner sheets take less so the core stays orange. */
const FLAME_LAYERS: Array<{
  x: number;
  z: number;
  w: number;
  h: number;
  seed: number;
  tint: number;
}> = [
  { x: 0, z: 0, w: 1.7, h: 2.0, seed: 0, tint: 1 },
  { x: -0.17, z: 0.1, w: 1.3, h: 1.5, seed: 7.3, tint: 0.3 },
  { x: 0.18, z: -0.08, w: 1.25, h: 1.35, seed: 13.9, tint: 0.3 },
  { x: 0.02, z: 0.18, w: 1.0, h: 1.05, seed: 21.1, tint: 0 },
];
const FIRE_LIGHT = new THREE.Color(0xff7a2e);

const NOISE = /* glsl */ `
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
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * vnoise(p);
    p = p * 2.03 + 17.1;
    a *= 0.5;
  }
  return v;
}
`;

/** 0..1 flare level following the same rise/hold/decay timing as the audio boost. */
function flareLevel(t: number): number {
  const { riseS, holdS, decayS } = BOOST;
  if (t < 0) return 0;
  if (t < riseS) return t / riseS;
  if (t < riseS + holdS) return 1;
  if (t < riseS + holdS + decayS) return 1 - (t - riseS - holdS) / decayS;
  return 0;
}

/**
 * One sheet of flame: an upright quad that turns to face the camera, shaded
 * with scrolling noise into a teardrop of licking tongues. Colours are HDR so
 * the hot core feeds the bloom pass.
 */
function flameMaterial(
  seed: number,
  w: number,
  h: number,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSeed: { value: seed },
      uFlare: { value: 0 },
      uSize: { value: new THREE.Vector2(w, h) },
      // Aurora powder: two colours burning in drifting patches along the flame's edge.
      uA: { value: new THREE.Color() },
      uB: { value: new THREE.Color() },
      uAurora: { value: 0 },
    },
    vertexShader: /* glsl */ `
      uniform vec2 uSize;
      uniform float uFlare;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 center = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        vec3 up = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
        vec3 right = normalize(cross(up, vec3(0.0, 0.0, 1.0)));
        vec3 p = center.xyz
          + right * position.x * uSize.x * (1.0 + 0.2 * uFlare)
          + up * position.y * uSize.y * (1.0 + 0.45 * uFlare);
        gl_Position = projectionMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime, uSeed, uFlare, uAurora;
      uniform vec3 uA, uB;
      varying vec2 vUv;
      ${NOISE}
      void main() {
        float y = vUv.y;
        float x = vUv.x - 0.5;
        float t = uTime * (1.0 + 0.25 * uFlare);
        // Turbulence pushes the flame sideways more the higher it gets.
        float n1 = fbm(vec2(x * 2.4 + uSeed, y * 1.7 - t * 1.25));
        float n2 = fbm(vec2(x * 6.5 - uSeed, y * 4.2 - t * 2.7));
        x += (n1 - 0.5) * 0.42 * y + (n2 - 0.5) * 0.14 * y;
        // Teardrop: pinched at the wood, widest low down, tapering to a tip.
        float w = 0.31 * (1.0 - pow(y, 1.35)) * smoothstep(0.0, 0.1, y) + 0.015;
        float body = 1.0 - smoothstep(w * 0.25, w, abs(x));
        // Rising noise eats holes into the upper flame so it breaks into tongues.
        float erosion = fbm(vec2(x * 5.5 + uSeed * 3.0, y * 3.2 - t * 3.3));
        float v = body * (1.2 - y) - erosion * (0.3 + y * 1.05);
        v = clamp(v * 2.1, 0.0, 1.0);
        vec3 c = mix(vec3(0.55, 0.035, 0.0), vec3(1.0, 0.3, 0.02), smoothstep(0.0, 0.35, v));
        c = mix(c, vec3(1.0, 0.68, 0.2), smoothstep(0.3, 0.7, v));
        c = mix(c, vec3(1.0, 0.88, 0.55), smoothstep(0.8, 1.0, v));
        float a = smoothstep(0.0, 0.22, v);
        vec3 col = c * a * (0.62 + 0.25 * uFlare);
        if (uAurora > 0.0) {
          // Metal salts burn cooler than the core, so their colour shows in the
          // outer mantle: a slightly wider flame whose inside is left to the orange.
          float body2 = 1.0 - smoothstep(w * 0.3, w * 1.45 + 0.03, abs(x));
          float v2 = clamp((body2 * (1.3 - y) - erosion * (0.3 + y * 1.0)) * 2.1, 0.0, 1.0);
          float mantle = smoothstep(0.0, 0.3, v2) * (1.0 - smoothstep(0.05, 0.38, v));
          // Colour comes and goes in patches that rise with the flame.
          float patches = smoothstep(0.3, 0.62, n2) * 0.75 + 0.25;
          vec3 tint = mix(uA, uB, smoothstep(0.42, 0.58, n1));
          float k = mantle * patches * uAurora;
          col = col * (1.0 - 0.7 * k) + tint * k * (0.35 + 0.45 * v2);
        }
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    fog: false,
  });
}

/** Glowing coal bed under the logs: dark crust with slowly breathing orange cracks. */
function emberBed(): THREE.Mesh<THREE.CircleGeometry, THREE.ShaderMaterial> {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 32),
    new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uFlare: { value: 0 } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime, uFlare;
        varying vec2 vUv;
        ${NOISE}
        void main() {
          vec2 p = vUv - 0.5;
          float r = length(p) * 2.0;
          float cells = fbm(p * 9.0 + 3.0);
          float breathe = fbm(p * 4.0 + vec2(uTime * 0.25, -uTime * 0.18));
          float glow = smoothstep(0.42, 0.72, cells * 0.6 + breathe * 0.6);
          glow *= 1.0 - smoothstep(0.35, 1.0, r);
          vec3 hot = mix(vec3(1.6, 0.22, 0.02), vec3(3.2, 1.3, 0.25), glow * glow);
          vec3 c = vec3(0.012, 0.009, 0.008) + hot * glow * (0.9 + 0.6 * uFlare);
          gl_FragColor = vec4(c, 1.0 - smoothstep(0.75, 1.0, r));
        }
      `,
      transparent: true,
      depthWrite: false,
      fog: false,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.012;
  return mesh;
}

/** Charred-bark emissive map: mostly black with thin glowing seams. */
function charTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const g = canvas.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, size, size);
  let seed = 11;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 26; i++) {
    let x = rand() * size;
    let y = rand() * size;
    g.strokeStyle = `rgba(255,${90 + Math.floor(rand() * 90)},20,${0.35 + rand() * 0.5})`;
    g.lineWidth = 0.8 + rand() * 1.8;
    g.beginPath();
    g.moveTo(x, y);
    for (let k = 0; k < 5; k++) {
      x += (rand() - 0.5) * 14;
      y += 4 + rand() * 12;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeLogs(): {
  group: THREE.Group;
  glow: THREE.MeshStandardMaterial[];
} {
  const group = new THREE.Group();
  const bark = new THREE.MeshStandardMaterial({
    color: 0x2b1b12,
    roughness: 0.95,
    emissive: 0xffffff,
    emissiveMap: charTexture(),
    emissiveIntensity: 1.6,
  });
  const ends = new THREE.MeshStandardMaterial({
    color: 0x1a100a,
    emissive: 0xff5a14,
    emissiveIntensity: 0.9,
  });
  // A teepee of five burning logs over two crossed base logs.
  for (let i = 0; i < 5; i++) {
    const log = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.1, 1.0, 10),
      [bark, ends, ends],
    );
    const a = (i / 5) * Math.PI * 2 + 0.3;
    log.position.set(Math.cos(a) * 0.2, 0.26, Math.sin(a) * 0.2);
    log.rotation.set(0, -a, Math.PI / 2 - 0.85);
    group.add(log);
  }
  for (let i = 0; i < 2; i++) {
    const log = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.1, 0.95, 10),
      [bark, ends, ends],
    );
    log.position.set(0, 0.09, 0);
    log.rotation.set(0, 0.5 + i * 1.45, Math.PI / 2);
    group.add(log);
  }
  const stone = new THREE.MeshStandardMaterial({
    color: 0x6f6a66,
    roughness: 1,
    flatShading: true,
  });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const s = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.13 + (i % 3) * 0.02, 0),
      stone,
    );
    s.position.set(Math.cos(a) * 0.66, 0.07, Math.sin(a) * 0.66);
    s.rotation.set(i, i * 2, 0);
    group.add(s);
  }
  // Only the stone ring casts: the logs sit under the light and would black out the pit.
  group.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.receiveShadow = true;
    mesh.castShadow = mesh.material === stone;
  });
  return { group, glow: [bark, ends] };
}

interface Particle {
  life: number;
  rate: number;
  x: number;
  z: number;
  phase: number;
  reach: number;
}

export interface Fire {
  group: THREE.Group;
  /** The firelight, for things that reflect it. */
  light: THREE.PointLight;
  update(dt: number): void;
  flare(): void;
  /** Coloured flames: `colors` are one or two sRGB hex strings, `level` is 0..1. */
  setAurora(colors: readonly string[], level: number): void;
  /** `pxPerUnit`: drawing-buffer pixels one world unit covers at distance 1. */
  setPointScale(pxPerUnit: number): void;
}

export function createFire(): Fire {
  const group = new THREE.Group();
  const logs = makeLogs();
  group.add(logs.group);
  const bed = emberBed();
  group.add(bed);

  const quad = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
  const flames = FLAME_LAYERS.map((l) => {
    const m = new THREE.Mesh(quad, flameMaterial(l.seed, l.w, l.h));
    m.position.set(l.x, 0.12, l.z);
    m.frustumCulled = false;
    group.add(m);
    return m.material;
  });
  const auroraTint = new THREE.Color();
  let auroraLevel = 0;
  let auroraKey = "";

  const smoke = softPoints(SMOKE, THREE.NormalBlending);
  const sparks = softPoints(SPARKS, THREE.AdditiveBlending);
  smoke.points.renderOrder = 1;
  sparks.points.renderOrder = 2;
  group.add(smoke.points, sparks.points);

  const light = new THREE.PointLight(0xff7a2e, 20, 0, 1.7);
  light.position.set(0, 0.75, 0);
  light.castShadow = true;
  light.shadow.mapSize.set(512, 512);
  light.shadow.camera.near = 0.15;
  light.shadow.camera.far = 16;
  light.shadow.bias = -0.012;
  light.shadow.normalBias = 0.03;
  group.add(light);

  const respawn = (p: Particle, spread: number) => {
    const r = Math.sqrt(Math.random()) * spread;
    const a = Math.random() * Math.PI * 2;
    p.x = Math.cos(a) * r;
    p.z = Math.sin(a) * r;
    p.rate = 0.6 + Math.random() * 0.8;
    p.phase = Math.random() * Math.PI * 2;
    p.reach = 0.6 + Math.random() * 0.8;
  };
  const make = (count: number, spread: number): Particle[] =>
    Array.from({ length: count }, () => {
      const p: Particle = {
        life: Math.random(),
        rate: 1,
        x: 0,
        z: 0,
        phase: 0,
        reach: 1,
      };
      respawn(p, spread);
      return p;
    });
  const sparkState = make(SPARKS, 0.22);
  const smokeState = make(SMOKE, 0.18);

  let time = 0;
  let flareStart = -Infinity;

  function update(dt: number) {
    time += dt;
    const level = flareLevel((Date.now() - flareStart) / 1000);

    for (const m of flames) {
      m.uniforms.uTime.value = time;
      m.uniforms.uFlare.value = level;
    }
    bed.material.uniforms.uTime.value = time;
    bed.material.uniforms.uFlare.value = level;

    // Sparks: shoot up, wobble, and die out; more and higher while a new log catches.
    for (let i = 0; i < SPARKS; i++) {
      const p = sparkState[i];
      p.life += dt * p.rate * (0.22 + 0.2 * level);
      if (p.life >= 1) {
        p.life -= 1;
        respawn(p, 0.22);
      }
      const l = p.life;
      const wob = 0.12 + 0.5 * l;
      sparks.pos[i * 3] =
        p.x + Math.sin(time * 2.1 + p.phase) * wob * l + l * l * 0.35;
      sparks.pos[i * 3 + 1] = 0.35 + l * (2.2 + 1.6 * level) * p.reach;
      sparks.pos[i * 3 + 2] =
        p.z + Math.cos(time * 1.7 + p.phase * 1.3) * wob * l;
      const fade =
        Math.pow(1 - l, 1.6) *
        (0.55 + 0.45 * Math.sin(time * 14 + p.phase * 5));
      sparks.size[i] = 0.035 + 0.03 * p.reach;
      sparks.color.set([3.2 * fade, 1.25 * fade, 0.28 * fade, 1], i * 4);
    }
    sparks.geo.attributes.position.needsUpdate = true;
    sparks.geo.attributes.aSize.needsUpdate = true;
    sparks.geo.attributes.aColor.needsUpdate = true;

    // Smoke: faint grey puffs that swell and drift downwind above the flame tip.
    for (let i = 0; i < SMOKE; i++) {
      const p = smokeState[i];
      p.life += dt * p.rate * 0.11;
      if (p.life >= 1) {
        p.life -= 1;
        respawn(p, 0.18);
      }
      const l = p.life;
      smoke.pos[i * 3] =
        p.x + l * l * 1.3 + Math.sin(time * 0.6 + p.phase) * 0.25 * l;
      smoke.pos[i * 3 + 1] = 1.25 + l * 4.2 * p.reach;
      smoke.pos[i * 3 + 2] = p.z + Math.cos(time * 0.5 + p.phase) * 0.25 * l;
      smoke.size[i] = 0.55 + l * 1.9;
      // Lit warm from below near the flame, cooling to grey as it rises.
      const warm = Math.max(0, 1 - l * 3);
      const alpha =
        Math.sin(Math.PI * Math.min(1, l * 1.15)) * 0.085 * (1 + 0.6 * level);
      smoke.color.set(
        [0.09 + 0.35 * warm, 0.085 + 0.12 * warm, 0.085 + 0.02 * warm, alpha],
        i * 4,
      );
    }
    smoke.geo.attributes.position.needsUpdate = true;
    smoke.geo.attributes.aSize.needsUpdate = true;
    smoke.geo.attributes.aColor.needsUpdate = true;

    // The light breathes and wanders a little so shadows dance.
    const flicker =
      Math.sin(time * 11) * 0.6 +
      Math.sin(time * 17.3) * 0.4 +
      Math.sin(time * 5.1);
    light.intensity = (20 + flicker * 2.6) * (1 + 0.7 * level);
    light.color.copy(FIRE_LIGHT).lerp(auroraTint, 0.3 * auroraLevel);
    light.position.set(
      Math.sin(time * 7.3) * 0.035,
      0.75 + Math.sin(time * 9.1) * 0.03,
      Math.cos(time * 5.9) * 0.035,
    );
    const pulse = 1 + flicker * 0.08 + 0.5 * level;
    logs.glow[0].emissiveIntensity = 1.6 * pulse;
    logs.glow[1].emissiveIntensity = 0.9 * pulse;
  }

  return {
    group,
    light,
    update,
    flare() {
      flareStart = Date.now();
    },
    setAurora(colors, level) {
      auroraLevel = colors.length === 0 ? 0 : level;
      flames.forEach(
        (m, i) =>
          (m.uniforms.uAurora.value = auroraLevel * FLAME_LAYERS[i].tint),
      );
      const key = colors.join();
      if (auroraLevel === 0 || key === auroraKey) return;
      auroraKey = key;
      const last = colors[colors.length - 1];
      for (const m of flames) {
        m.uniforms.uA.value.set(colors[0]);
        m.uniforms.uB.value.set(last);
      }
      auroraTint.set(colors[0]).lerp(new THREE.Color(last), 0.5);
    },
    setPointScale(pxPerUnit) {
      smoke.points.material.uniforms.uPx.value = pxPerUnit;
      sparks.points.material.uniforms.uPx.value = pxPerUnit;
    },
  };
}
