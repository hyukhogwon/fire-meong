import { afterEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { RUG_THICKNESS, createRug } from "./rug";

afterEach(() => vi.unstubAllGlobals());

describe("타프 아래 체크무늬 러그", () => {
  it("캠퍼와 개를 덮는 3.25 × 2.1 크기의 얇은 러그를 만든다", () => {
    vi.stubGlobal("document", {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => ({ fillStyle: "", fillRect: vi.fn() }),
      }),
    });

    const rug = createRug();
    const geometry = rug.geometry as THREE.BoxGeometry;
    expect(RUG_THICKNESS).toBe(0.02);
    expect(geometry.parameters).toMatchObject({ width: 3.25, height: 0.02, depth: 2.1 });
    expect(rug.position.x).toBeCloseTo(-0.875);
    expect(rug.position.y).toBeCloseTo(0.01);
    expect(rug.position.z).toBeCloseTo(-0.15);
    expect(rug.castShadow).toBe(false);
    expect(rug.receiveShadow).toBe(true);
  });
});
