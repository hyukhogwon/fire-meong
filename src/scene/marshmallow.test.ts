import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createMarshmallowSkewers } from "./marshmallow";

describe("고정 마시멜로 꼬치", () => {
  it("바닥에서 불 쪽으로 기울어진 꼬치 4개를 카메라 앞쪽을 비워 배치한다", () => {
    const group = createMarshmallowSkewers();
    expect(group.position.toArray()).toEqual([0, 0, 0]);
    expect(group.visible).toBe(true);
    expect(group.children).toHaveLength(4);
    for (const skewer of group.children) {
      expect(skewer.children).toHaveLength(2);
      const [stick, puff] = skewer.children as THREE.Mesh<
        THREE.CylinderGeometry,
        THREE.MeshStandardMaterial
      >[];
      const direction = new THREE.Vector3(0, 1, 0).applyQuaternion(stick.quaternion);
      const halfLength = stick.geometry.parameters.height / 2;
      const base = stick.position.clone().addScaledVector(direction, -halfLength);
      const tip = stick.position.clone().addScaledVector(direction, halfLength);
      expect(base.y).toBeCloseTo(0);
      expect(Math.hypot(base.x, base.z)).toBeCloseTo(0.9);
      expect(tip.y).toBeCloseTo(0.6);
      expect(Math.hypot(tip.x, tip.z)).toBeCloseTo(0.52);
      const angle = (Math.atan2(base.z, base.x) + Math.PI * 2) % (Math.PI * 2);
      expect(angle < 0.5 || angle > 2.6).toBe(true);
      expect(puff.position.distanceTo(tip)).toBeCloseTo(0.1);
      expect(puff.quaternion.equals(stick.quaternion)).toBe(true);
    }
  });

  it("마시멜로는 노릇한 색이며 꼬치와 함께 그림자를 만들지 않는다", () => {
    const group = createMarshmallowSkewers();
    for (const skewer of group.children) {
      for (const mesh of skewer.children) expect(mesh.castShadow).toBe(false);
      const puff = skewer.children[1] as THREE.Mesh<
        THREE.CylinderGeometry,
        THREE.MeshStandardMaterial
      >;
      expect(puff.geometry.parameters.height).toBe(0.14);
      expect(puff.geometry.parameters.radiusTop).toBe(0.075);
      expect(puff.material.color.getHexString()).toBe("b8782f");
      expect(puff.material.roughness).toBe(0.6);
      expect(puff.visible).toBe(true);
    }
  });
});
