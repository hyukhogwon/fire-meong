import * as THREE from 'three';

/** Golden brown, darker than it looks: this close to the fire the lit side washes out toward white. */
const GOLDEN = '#b8782f';

/**
 * Where each skewer stands, as an angle around the fire (radians, 0 = +x,
 * PI/2 = +z toward the camera). Kept off the camera side so none hides the
 * flames, and spread so they read as separate sticks.
 */
const SKEWER_ANGLES = [0.26, 2.88, 3.75, 4.97];
/** Stuck in the ground just outside the stone ring (radius 0.66), leaning in over the flames. */
const BASE_R = 0.9;
const TIP_R = 0.52;
const TIP_Y = 0.6;

function skewer(base: THREE.Vector3, tip: THREE.Vector3, stickMat: THREE.Material, puffMat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const dir = tip.clone().sub(base);
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, dir.length(), 6), stickMat);
  stick.position.copy(base).addScaledVector(dir, 0.5);
  stick.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  const puff = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.14, 16), puffMat);
  puff.position.copy(tip).addScaledVector(dir.clone().normalize(), -0.1);
  puff.quaternion.copy(stick.quaternion);
  g.add(stick, puff);
  return g;
}

/**
 * A few skewers stuck in the ground around the fire, each with one golden
 * marshmallow over the flames. Fixed colour; no toasting. Centred on the
 * fire (the origin). Nothing here casts a shadow: right beside the fire's
 * point light even a small marshmallow throws a huge shadow across the camp.
 */
export function createMarshmallowSkewers(): THREE.Group {
  const group = new THREE.Group();
  const stickMat = new THREE.MeshStandardMaterial({ color: 0xc9a46a, roughness: 0.85 });
  const puffMat = new THREE.MeshStandardMaterial({ color: GOLDEN, roughness: 0.6 });
  for (const a of SKEWER_ANGLES) {
    const out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const base = out.clone().multiplyScalar(BASE_R);
    const tip = out.clone().multiplyScalar(TIP_R).setY(TIP_Y);
    group.add(skewer(base, tip, stickMat, puffMat));
  }
  return group;
}
