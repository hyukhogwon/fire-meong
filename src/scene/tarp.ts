import * as THREE from 'three';

/**
 * Footprint in seat-local space (+z points at the fire): the camper at the origin,
 * the dog around x −1.45. The cloth's back edge sits above the name tag (top ≈ 2.35)
 * and the fire side is higher, so the camera looks up under it at the camper.
 */
const MIN_X = -2.45;
const MAX_X = 0.85;
const HALF_Z = 1.05;
const BACK_Y = 2.5;
const FRONT_Y = 3.0;
/** How far above its place the tarp starts when the rain begins. */
const DROP = 1.2;

export interface Tarp {
  group: THREE.Group;
  /** The dry space under the cloth, in the tarp group's local space. */
  shelter: THREE.Box3;
  /** 0: put away, 1: pitched. */
  setLevel(level: number): void;
}

export function createTarp(): Tarp {
  const group = new THREE.Group();
  const poles = new THREE.Group();
  group.add(poles);

  const depth = HALF_Z * 2;
  const tilt = Math.atan2(FRONT_Y - BACK_Y, depth);
  const cloth = new THREE.Mesh(
    new THREE.BoxGeometry(MAX_X - MIN_X, 0.025, Math.hypot(depth, FRONT_Y - BACK_Y)),
    new THREE.MeshStandardMaterial({ color: 0x3f5a46, roughness: 0.85 }),
  );
  const clothY = (BACK_Y + FRONT_Y) / 2;
  cloth.position.set((MIN_X + MAX_X) / 2, clothY, 0);
  // Negative turn about x lifts the +z (fire) edge.
  cloth.rotation.x = -tilt;
  cloth.castShadow = true;
  cloth.receiveShadow = true;
  group.add(cloth);

  const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3524, roughness: 1 });
  for (const x of [MIN_X + 0.05, MAX_X - 0.05]) {
    for (const z of [-HALF_Z + 0.05, HALF_Z - 0.05]) {
      const h = z > 0 ? FRONT_Y : BACK_Y;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, h, 8).translate(0, h / 2, 0), poleMaterial);
      pole.position.set(x, 0, z);
      // Only the cloth casts: the fire's point-light shadow redraws every caster six times.
      pole.receiveShadow = true;
      poles.add(pole);
    }
  }

  group.visible = false;
  return {
    group,
    shelter: new THREE.Box3(new THREE.Vector3(MIN_X, -1, -HALF_Z), new THREE.Vector3(MAX_X, FRONT_Y, HALF_Z)),
    setLevel(level) {
      group.visible = level > 0;
      if (!group.visible) return;
      // Poles grow up from the ground; the cloth drops in from above and spreads out.
      poles.scale.y = level;
      cloth.position.y = clothY + (1 - level) * DROP;
      cloth.scale.x = 0.15 + 0.85 * level;
    },
  };
}
