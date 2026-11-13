import * as THREE from "three";
import {
  type Meteor,
  meteorFrame,
  planShower,
  showerElapsed,
} from "../core/meteors";
import type { Rng } from "../core/rng";

const MAX = 40;
const DISTANCE = 80;
/** Streak width at the head, in pixels. */
const HEAD_PX = 2.2;
const HEAD = new THREE.Color("#e8f0ff");

/**
 * Meteor streaks drawn as thin triangles (bright head, fading tail) placed on
 * the sky behind the trees. Paths are planned in view coordinates so every
 * meteor lands where the camera is looking.
 */
export class MeteorShower {
  readonly mesh: THREE.Mesh;
  private readonly positions = new Float32Array(MAX * 3 * 3);
  private readonly colors = new Float32Array(MAX * 3 * 3);
  private plan: Meteor[] = [];
  private startedAt: number | null = null;
  private readonly v = new THREE.Vector3();

  constructor() {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(this.positions, 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    geo.setAttribute(
      "color",
      new THREE.BufferAttribute(this.colors, 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    this.mesh = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        fog: false,
        toneMapped: false,
      }),
    );
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
  }

  start(startedAt: number, rand: Rng): void {
    this.startedAt = startedAt;
    this.plan = planShower(rand).slice(0, MAX);
  }

  update(
    now: number,
    camera: THREE.PerspectiveCamera,
    viewportHeight: number,
  ): void {
    const elapsed = showerElapsed(this.startedAt, now);
    if (elapsed === null) {
      this.startedAt = null;
      this.mesh.visible = false;
      return;
    }
    this.mesh.visible = true;
    this.colors.fill(0);
    const halfW = HEAD_PX / Math.max(1, viewportHeight);
    this.plan.forEach((m, i) => {
      const f = meteorFrame(m, elapsed);
      const base = i * 9;
      if (!f) {
        this.positions.fill(0, base, base + 9);
        return;
      }
      const [fx, fy] = m.from;
      const dx = m.to[0] - fx;
      const dy = m.to[1] - fy;
      // Perpendicular measured in pixels so the streak is even on wide screens.
      const px = -dy;
      const py = dx * camera.aspect;
      const pl = Math.hypot(px, py) || 1;
      const ox = ((px / pl) * halfW) / camera.aspect;
      const oy = (py / pl) * halfW;
      const hx = fx + dx * f.head;
      const hy = fy + dy * f.head;
      this.put(base, fx + dx * f.tail, fy + dy * f.tail, camera);
      this.put(base + 3, hx + ox, hy + oy, camera);
      this.put(base + 6, hx - ox, hy - oy, camera);
      for (const k of [3, 6]) {
        this.colors[base + k] = HEAD.r * f.alpha;
        this.colors[base + k + 1] = HEAD.g * f.alpha;
        this.colors[base + k + 2] = HEAD.b * f.alpha;
      }
    });
    const geo = this.mesh.geometry;
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }

  /** View coordinates → a point on the sky DISTANCE away along that ray. */
  private put(
    offset: number,
    x: number,
    y: number,
    camera: THREE.PerspectiveCamera,
  ) {
    this.v.set(x, y, 0.5).unproject(camera).sub(camera.position).normalize();
    this.v.multiplyScalar(DISTANCE).add(camera.position);
    this.positions[offset] = this.v.x;
    this.positions[offset + 1] = this.v.y;
    this.positions[offset + 2] = this.v.z;
  }
}
