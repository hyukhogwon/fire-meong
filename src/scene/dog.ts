import * as THREE from "three";
import { type Actor, blob, mat, tube } from "./parts";

const FUR = new THREE.Color("#c98f45");
const BACK = new THREE.Color("#a8702f");
const CREAM = new THREE.Color("#ecd3a2");

/** Fine streaks running along the body, used as a bump map so the coat reads as fur. */
function furTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const g = canvas.getContext("2d")!;
  g.fillStyle = "#808080";
  g.fillRect(0, 0, size, size);
  let seed = 29;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 900; i++) {
    const v = 70 + Math.floor(rand() * 130);
    g.strokeStyle = `rgba(${v},${v},${v},0.55)`;
    g.lineWidth = 0.6 + rand() * 1.2;
    const x = rand() * size;
    const y = rand() * size;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + 8 + rand() * 16, y + (rand() - 0.5) * 3);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 4);
  return tex;
}

/** Golden on top shading to cream underneath, like a retriever's coat. */
const coat = (_t: number, up: number) => {
  const c = CREAM.clone().lerp(FUR, THREE.MathUtils.smoothstep(up, -0.9, -0.1));
  return c.lerp(BACK, THREE.MathUtils.smoothstep(up, 0.35, 1) * 0.7);
};

/**
 * A big golden dog lying on its belly with its chin on its paws, dozing by
 * the fire. It breathes slowly, flicks an ear now and then, and thumps its
 * tail once in a while. Local +z is where the nose points; the origin is on
 * the ground under its belly.
 */
export function createDog(): Actor {
  const root = new THREE.Group();
  const bump = furTexture();
  const fur = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
    bumpMap: bump,
    bumpScale: 1.6,
  });
  const plain = new THREE.MeshStandardMaterial({
    color: FUR,
    roughness: 0.95,
    bumpMap: bump,
    bumpScale: 1.6,
  });
  const light = new THREE.MeshStandardMaterial({
    color: CREAM,
    roughness: 0.95,
    bumpMap: bump,
    bumpScale: 1.6,
  });
  const shade = new THREE.MeshStandardMaterial({
    color: BACK,
    roughness: 0.95,
    bumpMap: bump,
    bumpScale: 1.6,
  });
  const dark = mat("#17120f", 0.45);
  const lerp = THREE.MathUtils.lerp;

  // Trunk: one skin from rump to shoulders — full hips, a tucked waist, a deep chest.
  const trunk = new THREE.Group();
  const profile: Array<[number, number, number]> = [
    [0, 0.2, 0.17],
    [0.2, 0.275, 0.215],
    [0.5, 0.235, 0.19],
    [0.8, 0.285, 0.245],
    [1, 0.21, 0.2],
  ];
  const trunkRadius = (t: number): [number, number] => {
    const i = Math.min(
      profile.length - 2,
      profile.findIndex((p, k) => k > 0 && t <= p[0]) - 1,
    );
    const [t0, x0, y0] = profile[Math.max(0, i)];
    const [t1, x1, y1] = profile[Math.max(0, i) + 1];
    const k = THREE.MathUtils.smoothstep(t, t0, t1);
    return [lerp(x0, x1, k), lerp(y0, y1, k)];
  };
  trunk.add(
    tube(
      [
        [0, 0.19, -0.68],
        [0, 0.225, -0.4],
        [0, 0.2, -0.05],
        [0, 0.255, 0.3],
        [0, 0.27, 0.58],
      ],
      trunkRadius,
      fur,
      { color: coat, segments: 48, radial: 24, cap: 0.14 },
    ),
  );
  // A soft ruff of paler fur under the neck.
  trunk.add(blob(0.17, [0, 0.17, 0.5], light, [1.15, 0.8, 0.9]));
  root.add(trunk);

  for (const side of [-1, 1]) {
    // Haunch folded against the flank, with the hind foot lying forward along the belly.
    root.add(blob(0.2, [0.215 * side, 0.19, -0.33], plain, [0.72, 0.95, 1.3]));
    root.add(
      tube(
        [
          [0.27 * side, 0.1, -0.5],
          [0.31 * side, 0.065, -0.3],
          [0.325 * side, 0.055, -0.02],
        ],
        (t) => [lerp(0.075, 0.055, t), lerp(0.07, 0.05, t)],
        fur,
        { color: coat, segments: 14, radial: 12, cap: 0.2 },
      ),
    );
    // Front leg: elbow tucked at the chest, forearm stretched out ahead.
    root.add(
      tube(
        [
          [0.2 * side, 0.2, 0.36],
          [0.215 * side, 0.1, 0.5],
          [0.19 * side, 0.075, 0.78],
          [0.165 * side, 0.065, 1.0],
        ],
        (t) => [lerp(0.1, 0.062, t), lerp(0.095, 0.058, t)],
        fur,
        { color: coat, segments: 20, radial: 12, cap: 0.16 },
      ),
    );
    // Paws: a pad with three toes.
    for (const [x, z, s] of [
      [0.325 * side, 0.03, 0.85],
      [0.165 * side, 1.04, 1],
    ]) {
      root.add(blob(0.075 * s, [x, 0.05, z], light, [1.05, 0.72, 1.3]));
      for (const toe of [-1, 0, 1])
        root.add(
          blob(
            0.03 * s,
            [x + toe * 0.04 * s, 0.04, z + 0.075 * s],
            light,
            [1, 0.9, 1.3],
          ),
        );
    }
  }

  // Neck flows down from the shoulders to the head on the paws.
  root.add(
    tube(
      [
        [0, 0.28, 0.42],
        [0.005, 0.27, 0.62],
        [0.02, 0.22, 0.86],
      ],
      (t) => [lerp(0.2, 0.15, t), lerp(0.185, 0.14, t)],
      fur,
      { color: coat, segments: 16, radial: 18, cap: 0.2 },
    ),
  );
  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(0.172, 0.024, 8, 28),
    mat("#b3362c", 0.7),
  );
  collar.position.set(0.008, 0.262, 0.66);
  collar.rotation.x = 0.2;
  root.add(
    collar,
    blob(0.028, [0.008, 0.1, 0.7], mat("#d9b24a", 0.4), [1, 1, 0.5]),
  );

  // Head rests on the paws, tipped a little to one side.
  const head = new THREE.Group();
  head.position.set(0.02, 0.21, 0.93);
  head.rotation.set(0.06, 0.16, 0.1);
  head.add(blob(0.175, [0, 0.005, 0], plain, [1.08, 0.9, 1.05]));
  // Brow and cheeks give the skull some shape before it narrows into the muzzle.
  head.add(blob(0.1, [0, 0.07, 0.07], plain, [1.25, 0.6, 0.9]));
  head.add(
    tube(
      [
        [0, -0.02, 0.06],
        [0, -0.045, 0.22],
        [0, -0.06, 0.37],
      ],
      (t) => [lerp(0.12, 0.078, t), lerp(0.095, 0.062, t)],
      fur,
      {
        color: (_t, up) =>
          CREAM.clone().lerp(FUR, THREE.MathUtils.smoothstep(up, 0.2, 1) * 0.6),
        segments: 14,
        radial: 14,
        cap: 0.22,
      },
    ),
  );
  head.add(blob(0.04, [0, -0.035, 0.37], dark, [1.2, 0.85, 0.8]));
  const ears: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    head.add(blob(0.055, [0.06 * side, -0.075, 0.26], light, [1, 0.8, 1.25]));
    // Closed, content eyes: a small downward arc under a soft brow.
    const lid = new THREE.Mesh(
      new THREE.TorusGeometry(0.03, 0.0075, 6, 12, Math.PI),
      dark,
    );
    lid.position.set(0.09 * side, 0.04, 0.15);
    lid.rotation.set(-0.25, 0.5 * side, Math.PI);
    head.add(lid);
    // Long soft ears hanging down past the jaw.
    const ear = blob(
      0.12,
      [0.185 * side, -0.035, -0.035],
      shade,
      [0.3, 1.25, 0.95],
    );
    ear.rotation.set(0.15, 0, 0.3 * side);
    ears.push(ear);
    head.add(ear);
  }
  root.add(head);

  // A feathered tail lying curled on the ground.
  const tail = new THREE.Group();
  tail.position.set(0, 0.17, -0.62);
  tail.add(
    tube(
      [
        [0, 0, 0.06],
        [0.03, -0.07, -0.2],
        [0.14, -0.1, -0.42],
        [0.32, -0.1, -0.56],
      ],
      (t) => {
        const r =
          lerp(0.07, 0.1, Math.sin(Math.min(1, t * 1.5) * Math.PI * 0.5)) *
          (1 - 0.55 * t * t);
        return [r, r * 0.75];
      },
      fur,
      { color: coat, segments: 22, radial: 12, cap: 0.25 },
    ),
  );
  root.add(tail);

  return {
    group: root,
    update(t) {
      const breath = Math.sin(t * 1.05);
      trunk.scale.set(1 + breath * 0.018, 1 + breath * 0.03, 1);
      head.position.y = 0.21 + breath * 0.004;
      // One ear flick every ~9 s, alternating sides.
      const cycle = t / 9;
      const flick =
        cycle % 1 < 0.04 ? Math.sin(((cycle % 1) / 0.04) * Math.PI) : 0;
      const which = Math.floor(cycle) % 2;
      ears.forEach(
        (ear, i) =>
          (ear.rotation.z =
            0.3 * (i === 0 ? -1 : 1) * (1 + (i === which ? flick * 1.3 : 0))),
      );
      // A lazy tail thump for ~1.5 s out of every 14.
      const lap = t % 14;
      tail.rotation.y =
        lap < 1.5
          ? Math.sin(lap * 9) * 0.28 * Math.sin((lap / 1.5) * Math.PI)
          : 0;
    },
  };
}
