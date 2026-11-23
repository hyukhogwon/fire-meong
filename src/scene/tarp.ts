import * as THREE from 'three';
import { SNOW } from './environment';

/**
 * Footprint in seat-local space (+z points at the fire, roughly toward the
 * camera): the camper at the origin, the dog around x −1.45. An A-frame seen
 * from the front: the ridge runs along z, so its triangular end faces the
 * camera and the two slopes come down to the left and right. Under the camper
 * (x 0) the roof is still above the name tag (top ≈ 2.35).
 */
const MIN_X = -2.45;
const MAX_X = 0.85;
const HALF_Z = 1.05;
const EAVE_Y = 2.0;
const RIDGE_Y = 3.3;

export interface Tarp {
  group: THREE.Group;
  /** The dry space under the cloth, in the tarp group's local space. */
  shelter: THREE.Box3;
}

/** Always pitched over the seat, rain or not, with a little snow on both slopes. */
export function createTarp(): Tarp {
  const group = new THREE.Group();
  const ridgeX = (MIN_X + MAX_X) / 2;
  const half = (MAX_X - MIN_X) / 2;
  const length = Math.hypot(half, RIDGE_Y - EAVE_Y);
  const tilt = Math.atan2(RIDGE_Y - EAVE_Y, half);
  const clothMaterial = new THREE.MeshStandardMaterial({ color: 0x3f5a46, roughness: 0.85 });
  // The firelight never reaches the top of the cloth; a faint glow stands in for moonlit snow.
  const snowMaterial = new THREE.MeshStandardMaterial({ color: SNOW, roughness: 1, emissive: SNOW, emissiveIntensity: 0.12 });

  // One slope per side of the ridge; `s` is +1 for the slope coming down toward +x.
  for (const s of [1, -1]) {
    const cloth = new THREE.Mesh(new THREE.BoxGeometry(length, 0.025, HALF_Z * 2), clothMaterial);
    cloth.position.set(ridgeX + (s * half) / 2, (RIDGE_Y + EAVE_Y) / 2, 0);
    // Local +x runs down the slope for s = 1; mirrored for s = −1.
    cloth.rotation.z = -s * tilt;
    cloth.castShadow = true;
    cloth.receiveShadow = true;
    // A thin layer lying on the cloth, all the way to its edges.
    const snow = new THREE.Mesh(new THREE.BoxGeometry(length, 0.03, HALF_Z * 2), snowMaterial);
    snow.position.y = 0.027;
    snow.receiveShadow = true;
    cloth.add(snow);
    group.add(cloth);
  }

  const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3524, roughness: 1 });
  /** A pole at (x, z) reaching up to the middle of the cloth, so its top always meets the roof. */
  const pole = (x: number, z: number) => {
    const h = RIDGE_Y - (Math.abs(x - ridgeX) / half) * (RIDGE_Y - EAVE_Y);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, h, 8).translate(0, h / 2, 0), poleMaterial);
    mesh.position.set(x, 0, z);
    // Only the cloth casts: the fire's point-light shadow redraws every caster six times.
    mesh.receiveShadow = true;
    group.add(mesh);
  };
  // One at each corner, holding up the eaves.
  for (const x of [MIN_X + 0.05, MAX_X - 0.05]) {
    for (const z of [-HALF_Z + 0.05, HALF_Z - 0.05]) pole(x, z);
  }
  // And one up to the ridge at its back end, between the dog and the camper as the
  // camera sees it: standing behind the dog it never covers it (checked by raycasting
  // from the camera), and the name tag draws over it.
  pole(ridgeX, -HALF_Z + 0.05);

  return {
    group,
    shelter: new THREE.Box3(new THREE.Vector3(MIN_X, -1, -HALF_Z), new THREE.Vector3(MAX_X, RIDGE_Y, HALF_Z)),
  };
}
