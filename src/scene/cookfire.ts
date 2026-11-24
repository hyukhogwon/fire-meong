import * as THREE from "three";
import { RAIN_FIRE_SCALE } from "../core/rain";
import { charTexture, emberBed, flameMaterial } from "./fire";
import { softPoints } from "./soft-points";

/** Smaller sheets than the campfire's, low enough to lick the bottom of the pot. */
const FLAME_LAYERS = [
  { x: 0, z: 0, w: 0.6, h: 0.62, seed: 3.1 },
  { x: -0.06, z: 0.04, w: 0.45, h: 0.48, seed: 9.7 },
  { x: 0.06, z: -0.03, w: 0.4, h: 0.4, seed: 17.2 },
];
const STEAM = 14;
/**
 * The cooking fire's light: weak, and down among the logs rather than just under
 * the pot. At 5 and 0.35 high the pot's underside washed out to near white
 * (rendered 250,198,133) and the dog lit up 23%; at 1.5 and 0.1 high it is a deep
 * orange (209,119,59) and the dog 6.5%.
 */
const LIGHT = 1.5;
const LIGHT_Y = 0.1;
/** Where the pot hangs: its bottom and the stew's surface, above the flames. */
const POT_BOTTOM = 0.45;
const STEW_Y = POT_BOTTOM + 0.2;
/** Top of the tripod, where the pot's chain hangs from. */
const APEX = new THREE.Vector3(0, 1.2, 0);

/** A stick from `a` to `b`. */
function stick(
  a: THREE.Vector3,
  b: THREE.Vector3,
  radius: number,
  material: THREE.Material,
): THREE.Mesh {
  const dir = b.clone().sub(a);
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.8, radius, dir.length(), 6),
    material,
  );
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.normalize(),
  );
  return mesh;
}

/** An iron cauldron of stew hanging from a stick tripod. */
function cauldron(): THREE.Group {
  const group = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({
    color: 0x5a4128,
    roughness: 0.9,
  });
  for (let i = 0; i < 3; i++) {
    const a = Math.PI / 2 + (i / 3) * Math.PI * 2;
    const foot = new THREE.Vector3(Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5);
    // Run each leg a little past the apex, as lashed tripod poles do.
    group.add(stick(foot, foot.clone().lerp(APEX, 1.08), 0.022, wood));
  }
  const iron = new THREE.MeshStandardMaterial({
    color: 0x2b2a2a,
    roughness: 0.55,
    metalness: 0.5,
    side: THREE.DoubleSide,
  });
  // Round belly narrowing to a lipped rim.
  const profile = [
    [0.001, 0],
    [0.1, 0.005],
    [0.17, 0.05],
    [0.2, 0.12],
    [0.19, 0.19],
    [0.17, 0.23],
    [0.185, 0.245],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const pot = new THREE.Mesh(new THREE.LatheGeometry(profile, 24), iron);
  pot.position.y = POT_BOTTOM;
  group.add(pot);
  // The bail: a half ring over the rim, meeting the chain.
  const rimY = POT_BOTTOM + 0.245;
  const bail = new THREE.Mesh(
    new THREE.TorusGeometry(0.18, 0.008, 6, 24, Math.PI),
    iron,
  );
  bail.position.y = rimY;
  group.add(bail);
  group.add(stick(new THREE.Vector3(0, rimY + 0.18, 0), APEX, 0.007, iron));
  // Stew: warm brown, with a faint glow of its own since the fire lights the pot from below.
  const stew = new THREE.Mesh(
    new THREE.CircleGeometry(0.17, 24),
    new THREE.MeshStandardMaterial({
      color: 0x7a4420,
      roughness: 0.5,
      emissive: 0x3a1a08,
      emissiveIntensity: 0.5,
    }),
  );
  stew.rotation.x = -Math.PI / 2;
  stew.position.y = STEW_Y;
  group.add(stew);
  return group;
}

/** A ring of stones around a few small logs on bare earth; `bed` is the glowing coal bed. */
function pit(): { group: THREE.Group; bed: ReturnType<typeof emberBed> } {
  const group = new THREE.Group();
  const dirt = new THREE.Mesh(
    new THREE.CircleGeometry(0.62, 32),
    new THREE.MeshStandardMaterial({ color: 0x33261a, roughness: 1 }),
  );
  dirt.rotation.x = -Math.PI / 2;
  dirt.position.y = 0.007;
  group.add(dirt);
  const stone = new THREE.MeshStandardMaterial({
    color: 0x6f6a66,
    roughness: 1,
    flatShading: true,
  });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const s = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.07 + (i % 3) * 0.01, 0),
      stone,
    );
    s.position.set(Math.cos(a) * 0.34, 0.04, Math.sin(a) * 0.34);
    s.rotation.set(i, i * 2, 0);
    group.add(s);
  }
  const bark = new THREE.MeshStandardMaterial({
    color: 0x2b1b12,
    roughness: 0.95,
    emissive: 0xffffff,
    emissiveMap: charTexture(),
    emissiveIntensity: 1.4,
  });
  for (let i = 0; i < 3; i++) {
    const log = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.05, 0.5, 8),
      bark,
    );
    log.position.y = 0.05;
    log.rotation.set(0, (i / 3) * Math.PI, Math.PI / 2);
    group.add(log);
  }
  const bed = emberBed();
  bed.scale.setScalar(0.6);
  group.add(bed);
  return { group, bed };
}

export interface Cookfire {
  group: THREE.Group;
  update(dt: number): void;
  /** Rain shrinks the flames and dims the light, as on the campfire: 0 clear .. 1 full rain. */
  setRain(level: number): void;
  setPointScale(pxPerUnit: number): void;
}

/**
 * A small cooking fire with a stew pot hanging over it. Centred on its own
 * origin on the ground. Nothing here casts a shadow: its light doesn't, and
 * the campfire's shadow pass is costly enough already.
 */
export function createCookfire(): Cookfire {
  const group = new THREE.Group();
  const { group: ground, bed } = pit();
  group.add(ground, cauldron());

  const quad = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
  const flames = FLAME_LAYERS.map((l) => {
    const m = new THREE.Mesh(quad, flameMaterial(l.seed, l.w, l.h));
    m.position.set(l.x, 0.06, l.z);
    m.frustumCulled = false;
    group.add(m);
    return m.material;
  });

  const light = new THREE.PointLight(0xff7a2e, LIGHT, 0, 1.7);
  light.position.set(0, LIGHT_Y, 0);
  group.add(light);

  // Steam: faint pale puffs rising off the stew and thinning out.
  const steam = softPoints(STEAM, THREE.NormalBlending);
  steam.points.renderOrder = 1;
  group.add(steam.points);
  // Spread from the start (like the campfire's smoke), or the first puffs rise as one column.
  const spread = () => (Math.random() - 0.5) * 0.2;
  const puffs = Array.from({ length: STEAM }, (_, i) => ({
    life: i / STEAM,
    x: spread(),
    z: spread(),
    phase: i * 2.4,
  }));

  let time = 0;
  let rainScale = 1;

  return {
    group,
    update(dt) {
      time += dt;
      for (const m of flames) m.uniforms.uTime.value = time;
      bed.material.uniforms.uTime.value = time;
      const flicker =
        Math.sin(time * 10.3) * 0.6 +
        Math.sin(time * 15.7) * 0.4 +
        Math.sin(time * 4.3);
      light.intensity = LIGHT * (1 + flicker * 0.14) * rainScale;
      for (let i = 0; i < STEAM; i++) {
        const p = puffs[i];
        p.life += dt * 0.12;
        if (p.life >= 1) {
          p.life -= 1;
          p.x = spread();
          p.z = spread();
        }
        const l = p.life;
        steam.pos[i * 3] =
          p.x + Math.sin(time * 0.7 + p.phase) * 0.12 * l + l * 0.25;
        steam.pos[i * 3 + 1] = STEW_Y + 0.05 + l * 1.1;
        steam.pos[i * 3 + 2] = p.z + Math.cos(time * 0.6 + p.phase) * 0.12 * l;
        steam.size[i] = 0.18 + l * 0.6;
        const alpha = Math.sin(Math.PI * l) * 0.09;
        steam.color.set([0.55, 0.55, 0.58, alpha], i * 4);
      }
      steam.geo.attributes.position.needsUpdate = true;
      steam.geo.attributes.aSize.needsUpdate = true;
      steam.geo.attributes.aColor.needsUpdate = true;
    },
    setRain(level) {
      rainScale = THREE.MathUtils.lerp(1, RAIN_FIRE_SCALE, level);
      flames.forEach((m, i) =>
        m.uniforms.uSize.value.set(
          FLAME_LAYERS[i].w * rainScale,
          FLAME_LAYERS[i].h * rainScale,
        ),
      );
    },
    setPointScale(pxPerUnit) {
      steam.points.material.uniforms.uPx.value = pxPerUnit;
    },
  };
}
