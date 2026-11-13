import * as THREE from "three";

/** Something in the scene that moves a little on its own (breathing, blinking…). */
export interface Actor {
  group: THREE.Group;
  update(time: number): void;
}

export const mat = (color: THREE.ColorRepresentation, roughness = 0.8) =>
  new THREE.MeshStandardMaterial({ color, roughness });

type V3 = [number, number, number];

const UP = new THREE.Vector3(0, 1, 0);

/** A rounded limb segment running from `a` to `b`. */
export function limb(
  a: V3,
  b: V3,
  radius: number,
  material: THREE.Material,
): THREE.Mesh {
  const from = new THREE.Vector3(...a);
  const dir = new THREE.Vector3(...b).sub(from);
  const mesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(radius, dir.length(), 4, 12),
    material,
  );
  mesh.position.copy(from).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(UP, dir.normalize());
  return mesh;
}

/** A sphere, optionally squashed, at a position. */
export function blob(
  radius: number,
  at: V3,
  material: THREE.Material,
  scale: V3 = [1, 1, 1],
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 20, 14),
    material,
  );
  mesh.position.set(...at);
  mesh.scale.set(...scale);
  return mesh;
}

export interface TubeOptions {
  /** Vertex colour by position along the path (0..1) and height on the ring (-1 bottom .. 1 top). */
  color?: (t: number, up: number) => THREE.Color;
  segments?: number;
  radial?: number;
  /** Fraction of the length at each end that rounds off to a point. */
  cap?: number;
}

/**
 * A smooth organic shape swept along a curve through `points`, with an
 * elliptical cross-section `[halfWidth, halfHeight]` that can change along
 * the way and rounded ends. Used for bodies, necks, legs and tails.
 */
export function tube(
  points: V3[],
  radius: (t: number) => [number, number],
  material: THREE.Material,
  { color, segments = 36, radial = 18, cap = 0.1 }: TubeOptions = {},
): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(...p)),
  );
  const pos: number[] = [];
  const uv: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const p = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const side = new THREE.Vector3();
  const up = new THREE.Vector3();
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    curve.getPoint(t, p);
    curve.getTangent(t, tan);
    side.crossVectors(UP, tan);
    if (side.lengthSq() < 1e-4) side.set(1, 0, 0);
    side.normalize();
    up.crossVectors(tan, side).normalize();
    // Round the ends off like half an ellipsoid.
    const edge = Math.min(t, 1 - t) / cap;
    const round = edge >= 1 ? 1 : Math.sqrt(1 - (1 - edge) * (1 - edge));
    const [rx, ry] = radius(t);
    for (let k = 0; k < radial; k++) {
      // Start underneath so the texture seam is out of sight.
      const a = (k / radial) * Math.PI * 2 - Math.PI / 2;
      const cx = Math.cos(a) * rx * round;
      const cy = Math.sin(a) * ry * round;
      pos.push(
        p.x + side.x * cx + up.x * cy,
        p.y + side.y * cx + up.y * cy,
        p.z + side.z * cx + up.z * cy,
      );
      uv.push(t, k / radial);
      if (color) {
        const c = color(t, Math.sin(a));
        col.push(c.r, c.g, c.b);
      }
      if (i < segments) {
        const a0 = i * radial + k;
        const a1 = i * radial + ((k + 1) % radial);
        idx.push(a0, a1, a0 + radial, a1, a1 + radial, a0 + radial);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  if (color)
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, material);
}
