import { describe, expect, it } from "vitest";
import * as THREE from "three";
import * as environment from "./environment";
import { createPond } from "./pond";
import { createRain } from "./rain";
import { createTarp } from "./tarp";

describe("겨울 장면", () => {
  it("공용 눈색과 항상 펼쳐진 A자 타프를 만든다", () => {
    expect("SNOW" in environment).toBe(true);
    const tarp = createTarp();
    expect(tarp.group.visible).toBe(true);
    expect("setLevel" in tarp).toBe(false);
    expect(tarp.group.children).toHaveLength(7);
    expect(tarp.shelter.max.y).toBe(3.3);

    const poles = tarp.group.children.filter(
      (child): child is THREE.Mesh<THREE.CylinderGeometry> =>
        child instanceof THREE.Mesh && child.geometry instanceof THREE.CylinderGeometry,
    );
    expect(poles).toHaveLength(5);
    expect(
      poles.some(
        (pole) => pole.position.x === -0.8 && pole.geometry.parameters.height === 3.3,
      ),
    ).toBe(true);
  });

  it("겨울 갈대 높이를 기존의 45%로 줄인다", () => {
    const pond = createPond(new THREE.Color(), new THREE.Color());
    const reeds = pond.group.children.find(
      (child): child is THREE.InstancedMesh =>
        child instanceof THREE.InstancedMesh && child.count === 150,
    );
    expect(reeds).toBeDefined();
    const matrix = new THREE.Matrix4();
    const scale = new THREE.Vector3();
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < 150; i++) {
      reeds!.getMatrixAt(i, matrix);
      matrix.decompose(new THREE.Vector3(), new THREE.Quaternion(), scale);
      min = Math.min(min, scale.y);
      max = Math.max(max, scale.y);
    }
    expect(min).toBeGreaterThanOrEqual(0.45 * 0.45);
    expect(max).toBeLessThanOrEqual(1 * 0.45);
  });

  it("빗줄기 선분을 1000개 만든다", () => {
    const rain = createRain();
    expect(rain.mesh.geometry.getAttribute("aSeed").count / 2).toBe(1000);
  });
});
