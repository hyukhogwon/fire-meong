import { afterEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { RAIN_FIRE_SCALE } from "../core/rain";
import { createCookfire } from "./cookfire";

afterEach(() => vi.unstubAllGlobals());

describe("작은 모닥불과 스튜 솥", () => {
  it("그림자 없는 약한 조명과 작은 불꽃 3장을 만든다", () => {
    vi.stubGlobal("document", {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => ({
          fillStyle: "",
          strokeStyle: "",
          lineWidth: 0,
          fillRect() {},
          beginPath() {},
          moveTo() {},
          lineTo() {},
          stroke() {},
        }),
      }),
    });
    const cookfire = createCookfire();
    const light = cookfire.group.children.find(
      (child): child is THREE.PointLight => child instanceof THREE.PointLight,
    );
    const flames = cookfire.group.children.filter(
      (child): child is THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> =>
        child instanceof THREE.Mesh &&
        child.geometry instanceof THREE.PlaneGeometry,
    );
    expect(light?.intensity).toBe(1.5);
    expect(light?.position.y).toBe(0.1);
    expect(light?.castShadow).toBe(false);
    expect(flames).toHaveLength(3);

    const before = flames[0].material.uniforms.uSize.value.y;
    cookfire.setRain(1);
    expect(flames[0].material.uniforms.uSize.value.y).toBeCloseTo(
      before * RAIN_FIRE_SCALE,
    );
  });
});
