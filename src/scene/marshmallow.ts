import * as THREE from "three";
import { marshmallowColor } from "../core/marshmallow";

// Seat-local coordinates (+z faces the fire, which is 2.2 ahead).
const HAND = new THREE.Vector3(-0.24, 0.6, 0.36);
const TIP = new THREE.Vector3(-0.44, 0.8, 2.0);

/** A stick held toward the fire with a marshmallow that browns as it toasts. */
export function createMarshmallowStick(): {
  group: THREE.Group;
  setProgress(p: number | null): void;
} {
  const group = new THREE.Group();
  const dir = TIP.clone().sub(HAND);
  const stick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.022, dir.length(), 6),
    new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 0.9 }),
  );
  stick.position.copy(HAND).addScaledVector(dir, 0.5);
  stick.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.clone().normalize(),
  );

  const puffMat = new THREE.MeshStandardMaterial({
    color: 0xfbf6ec,
    roughness: 0.6,
  });
  const puff = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.16, 16),
    puffMat,
  );
  puff.position.copy(TIP).addScaledVector(dir.clone().normalize(), -0.08);
  puff.quaternion.copy(stick.quaternion);

  group.add(stick, puff);
  group.visible = false;

  return {
    group,
    setProgress(p) {
      group.visible = p !== null;
      if (p !== null) puffMat.color.set(marshmallowColor(p));
    },
  };
}
