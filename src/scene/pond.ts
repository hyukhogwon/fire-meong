import * as THREE from "three";
import { POND } from "../core/pond";

/** Water surface height; the ground is dug below this inside the shoreline. */
export const WATER_Y = -0.07;
/** The water mesh reaches a little past the shoreline and fades out there. */
const REACH = 1.2;

function seeded(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/**
 * Still, dark water: it mirrors the night sky, more so at grazing angles, and
 * its small ripples catch the firelight.
 */
function waterMaterial(
  horizon: THREE.Color,
  zenith: THREE.Color,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uHorizon: { value: horizon },
      uZenith: { value: zenith },
      uFire: { value: new THREE.Vector3(0, 0.9, 0) },
      uFireColor: { value: new THREE.Color(0xff7a2e) },
      uFireLevel: { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      varying vec2 vP;
      void main() {
        vP = position.xz;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime, uFireLevel;
      uniform vec3 uHorizon, uZenith, uFire, uFireColor;
      varying vec3 vWorld;
      varying vec2 vP;
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
        float d = length(vP);
        vec2 q = vWorld.xz;
        // Two ripple fields sliding past each other tilt the surface a little.
        float a = vnoise(q * 3.1 + vec2(uTime * 0.21, uTime * 0.13)) + 0.5 * vnoise(q * 7.3 - uTime * 0.3);
        float b = vnoise(q * 3.1 + vec2(4.7 - uTime * 0.17, 9.2 + uTime * 0.19)) + 0.5 * vnoise(q * 7.3 + 3.3 + uTime * 0.27);
        vec3 n = normalize(vec3((a - 0.75) * 0.22, 1.0, (b - 0.75) * 0.22));
        vec3 v = normalize(cameraPosition - vWorld);
        vec3 r = reflect(-v, n);
        vec3 sky = mix(uHorizon, uZenith, pow(clamp(r.y, 0.0, 1.0), 0.6));
        float fresnel = pow(1.0 - max(dot(n, v), 0.0), 3.0);
        vec3 col = mix(vec3(0.006, 0.012, 0.02), sky * 1.5, 0.3 + 0.7 * fresnel);
        // The fire is too low and too far to mirror in the pond from here, so its
        // light shows as a warm wash that catches on the ripple crests nearest to it.
        vec3 l = uFire - vWorld;
        float fall = 1.0 / (1.0 + 0.12 * dot(l, l));
        float crest = pow(clamp(a * 0.72, 0.0, 1.0), 7.0) + pow(clamp(b * 0.72, 0.0, 1.0), 7.0);
        col += uFireColor * uFireLevel * fall * (0.1 + 1.1 * crest);
        gl_FragColor = vec4(col, 1.0 - smoothstep(1.0, ${REACH.toFixed(2)}, d));
      }
    `,
    transparent: true,
    depthWrite: false,
    fog: false,
  });
}

export interface Pond {
  group: THREE.Group;
  /** `fire`: the campfire's light, so the glow on the water follows its colour and flicker. */
  update(time: number, fire: THREE.PointLight): void;
}

export function createPond(horizon: THREE.Color, zenith: THREE.Color): Pond {
  const group = new THREE.Group();
  const rand = seeded(41);

  // Unit disc stretched to the pond's ellipse, so the shader sees shoreline distance directly.
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(REACH, 64).rotateX(-Math.PI / 2),
    waterMaterial(horizon, zenith),
  );
  water.position.set(POND.x, WATER_Y, POND.z);
  water.scale.set(POND.rx, 1, POND.rz);
  water.renderOrder = -1;
  group.add(water);

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  const c = new THREE.Color();
  /** A point at shoreline distance `d` and angle `a` around the pond. */
  const at = (a: number, d: number) =>
    pos.set(
      POND.x + Math.cos(a) * POND.rx * d,
      0,
      POND.z + Math.sin(a) * POND.rz * d,
    );

  // Reeds stand in clumps in the shallows, thickest on the far bank so the water stays in view.
  const REEDS = 150;
  const reeds = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.02, 1, 4).translate(0, 0.5, 0),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }),
    REEDS,
  );
  const HEADS = 22;
  const heads = new THREE.InstancedMesh(
    new THREE.CapsuleGeometry(0.022, 0.1, 3, 8),
    new THREE.MeshStandardMaterial({ color: 0x3a2416, roughness: 1 }),
    HEADS,
  );
  const green = new THREE.Color("#3f6a34");
  const straw = new THREE.Color("#77703a");
  let headCount = 0;
  for (let i = 0; i < REEDS;) {
    // sin(a) < 0 is the far bank; keep most clumps there and a few at the sides.
    const a = rand() < 0.75 ? Math.PI + rand() * Math.PI : rand() * Math.PI;
    const d = 0.93 + rand() * 0.2;
    const clump = 4 + Math.floor(rand() * 6);
    const { x: cx, z: cz } = at(a, d);
    for (let k = 0; k < clump && i < REEDS; k++, i++) {
      const x = cx + (rand() - 0.5) * 0.3;
      const z = cz + (rand() - 0.5) * 0.3;
      const h = 0.45 + rand() * 0.55;
      const lean = e.set(
        (rand() - 0.5) * 0.3,
        rand() * 6.28,
        (rand() - 0.5) * 0.3,
      );
      q.setFromEuler(lean);
      m.compose(pos.set(x, WATER_Y - 0.05, z), q, scl.set(1, h, 1));
      reeds.setMatrixAt(i, m);
      reeds.setColorAt(
        i,
        c
          .copy(green)
          .lerp(straw, rand() * 0.7)
          .multiplyScalar(0.7 + rand() * 0.5),
      );
      if (headCount < HEADS && k < 2 && rand() < 0.6) {
        // A cattail head rides near the tip of a taller stalk.
        const tip = new THREE.Vector3(0, h * 0.86, 0).applyQuaternion(q);
        m.compose(tip.add(pos), q, scl.set(1, 1, 1));
        heads.setMatrixAt(headCount++, m);
      }
    }
  }
  heads.count = headCount;
  reeds.castShadow = heads.castShadow = true;
  group.add(reeds, heads);

  // Lily pads drift in place on the surface.
  const PADS = 9;
  const pads = new THREE.InstancedMesh(
    new THREE.CircleGeometry(1, 14, 0.35, Math.PI * 2 - 0.7).rotateX(
      -Math.PI / 2,
    ),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }),
    PADS,
  );
  const padHomes = Array.from({ length: PADS }, () => {
    const p = at(rand() * Math.PI * 2, 0.25 + rand() * 0.6);
    return {
      x: p.x,
      z: p.z,
      size: 0.1 + rand() * 0.09,
      turn: rand() * 6.28,
      phase: rand() * 6.28,
    };
  });
  const padGreen = new THREE.Color("#2f5f33");
  padHomes.forEach((_, i) =>
    pads.setColorAt(i, c.copy(padGreen).multiplyScalar(0.7 + rand() * 0.6)),
  );
  pads.receiveShadow = true;
  group.add(pads);

  // A few stones sit half in the water along the near bank.
  const stone = new THREE.MeshStandardMaterial({
    color: 0x5f5d5a,
    roughness: 1,
    flatShading: true,
  });
  for (let i = 0; i < 7; i++) {
    const p = at(0.15 + rand() * (Math.PI - 0.3), 1.0 + rand() * 0.12);
    const s = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.09 + rand() * 0.1, 0),
      stone,
    );
    s.position.set(p.x, WATER_Y + 0.01, p.z);
    s.rotation.set(rand() * 6, rand() * 6, 0);
    s.scale.y = 0.6;
    s.castShadow = s.receiveShadow = true;
    group.add(s);
  }

  return {
    group,
    update(time, fire) {
      const u = water.material.uniforms;
      u.uTime.value = time;
      fire.getWorldPosition(u.uFire.value);
      u.uFireColor.value.copy(fire.color);
      u.uFireLevel.value = fire.intensity / 20;
      padHomes.forEach((p, i) => {
        q.setFromEuler(
          e.set(0, p.turn + Math.sin(time * 0.2 + p.phase) * 0.25, 0),
        );
        pos.set(
          p.x + Math.sin(time * 0.3 + p.phase) * 0.03,
          WATER_Y + 0.006,
          p.z + Math.cos(time * 0.24 + p.phase) * 0.03,
        );
        pads.setMatrixAt(i, m.compose(pos, q, scl.set(p.size, 1, p.size)));
      });
      pads.instanceMatrix.needsUpdate = true;
    },
  };
}
