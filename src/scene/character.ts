import * as THREE from "three";
import type { Appearance } from "../core/appearance";
import { type Actor, blob, limb, mat } from "./parts";

function hat(kind: Appearance["hat"], color: string): THREE.Object3D | null {
  const m = mat(color, 0.9);
  const g = new THREE.Group();
  switch (kind) {
    case "none":
      return null;
    case "beanie": {
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.36, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        m,
      );
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.06, 8, 24), m);
      rim.rotation.x = Math.PI / 2;
      const pom = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 12, 8),
        mat("#f5f0e6", 1),
      );
      pom.position.y = 0.36;
      g.add(dome, rim, pom);
      g.position.y = 0.08;
      return g;
    }
    case "cap": {
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        m,
      );
      const brim = new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.22,
          0.22,
          0.03,
          20,
          1,
          false,
          -Math.PI / 2,
          Math.PI,
        ),
        m,
      );
      brim.position.set(0, 0.0, 0.3);
      brim.scale.set(1.1, 1, 1.3);
      g.add(dome, brim);
      g.position.y = 0.1;
      return g;
    }
    case "straw": {
      const brim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.62, 0.62, 0.03, 28),
        m,
      );
      const crown = new THREE.Mesh(
        new THREE.CylinderGeometry(0.27, 0.32, 0.22, 20),
        m,
      );
      crown.position.y = 0.12;
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(0.325, 0.325, 0.06, 20),
        mat("#7a4e2d"),
      );
      band.position.y = 0.04;
      g.add(brim, crown, band);
      g.position.y = 0.2;
      return g;
    }
  }
}

/**
 * A seated camper warming their hands: hoodie, scarf, boots, a face that
 * blinks, and a slow breath. Local +z is the face direction.
 */
export function createCharacter(a: Appearance): Actor {
  const root = new THREE.Group();
  const skin = mat(a.skin, 0.65);
  const shirt = mat(a.shirt, 0.9);
  const trim = mat(new THREE.Color(a.shirt).multiplyScalar(0.7), 0.9);
  const scarf = mat(a.hatColor, 0.95);
  const pants = mat("#343a4d", 0.9);
  const boot = mat("#4a3324", 0.7);
  const sole = mat("#16110d", 0.9);
  const hair = mat("#33241b", 0.95);
  const dark = mat("#141414", 0.35);

  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.95, 14), [
    mat("#5c3a22", 0.95),
    mat("#b08a5a", 0.9),
    mat("#b08a5a", 0.9),
  ]);
  seat.rotation.z = Math.PI / 2;
  seat.position.y = 0.2;
  root.add(seat);

  root.add(blob(0.25, [0, 0.5, 0.02], pants, [1.15, 0.72, 1]));

  // Torso breathes as one piece.
  const torso = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.27, 0.34, 6, 18),
    shirt,
  );
  body.position.y = 0.82;
  const hem = new THREE.Mesh(new THREE.TorusGeometry(0.255, 0.04, 8, 24), trim);
  hem.rotation.x = Math.PI / 2;
  hem.position.y = 0.58;
  const hood = blob(0.2, [0, 1.1, -0.2], shirt, [1.25, 0.8, 0.75]);
  const pocket = blob(0.13, [0, 0.72, 0.23], trim, [1.3, 0.7, 0.4]);
  const wrap = new THREE.Mesh(
    new THREE.TorusGeometry(0.17, 0.065, 10, 24),
    scarf,
  );
  wrap.rotation.x = Math.PI / 2;
  wrap.position.y = 1.13;
  const tail = limb([0.12, 1.1, 0.14], [0.15, 0.86, 0.25], 0.05, scarf);
  torso.add(body, hem, hood, pocket, wrap, tail);
  root.add(torso);

  for (const side of [-1, 1]) {
    // Arms reach forward, palms to the fire.
    torso.add(
      limb([0.3 * side, 1.0, 0.02], [0.35 * side, 0.76, 0.16], 0.085, shirt),
    );
    torso.add(
      limb([0.35 * side, 0.76, 0.16], [0.26 * side, 0.63, 0.32], 0.075, shirt),
    );
    const cuff = new THREE.Mesh(
      new THREE.TorusGeometry(0.07, 0.022, 6, 14),
      trim,
    );
    cuff.position.set(0.255 * side, 0.625, 0.325);
    cuff.rotation.set(0.9, 0.5 * side, 0);
    torso.add(
      cuff,
      blob(0.078, [0.24 * side, 0.6, 0.36], skin, [1, 1.05, 0.8]),
    );

    root.add(
      limb([0.13 * side, 0.5, 0.05], [0.15 * side, 0.5, 0.42], 0.105, pants),
    );
    root.add(
      limb([0.15 * side, 0.48, 0.44], [0.15 * side, 0.2, 0.52], 0.09, pants),
    );
    root.add(blob(0.115, [0.15 * side, 0.1, 0.57], boot, [1, 0.85, 1.45]));
    root.add(blob(0.115, [0.15 * side, 0.035, 0.575], sole, [1.05, 0.3, 1.5]));
  }

  const head = new THREE.Group();
  head.position.y = 1.42;
  head.add(blob(0.34, [0, 0, 0], skin, [1, 0.95, 0.97]));
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.352, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
    hair,
  );
  cap.rotation.x = -0.42;
  head.add(cap, blob(0.03, [0, -0.045, 0.335], skin, [1, 0.9, 1]));
  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.055, 0.011, 6, 14, Math.PI),
    dark,
  );
  smile.position.set(0, -0.115, 0.312);
  smile.rotation.set(-0.15, 0, Math.PI);
  head.add(smile);
  const eyes: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    head.add(blob(0.075, [0.325 * side, -0.01, 0], skin, [0.5, 1, 0.8]));
    const eye = blob(
      0.042,
      [0.115 * side, 0.025, 0.305],
      dark,
      [1, 1.25, 0.55],
    );
    eye.add(
      blob(
        0.012,
        [0.012, 0.014, 0.04],
        new THREE.MeshBasicMaterial({ color: "#fff" }),
      ),
    );
    eyes.push(eye);
    const cheek = new THREE.Mesh(
      new THREE.CircleGeometry(0.05, 12),
      new THREE.MeshBasicMaterial({
        color: "#f08a8a",
        transparent: true,
        opacity: 0.5,
      }),
    );
    cheek.position.set(0.19 * side, -0.075, 0.292);
    cheek.lookAt(cheek.position.clone().multiplyScalar(2));
    head.add(eye, cheek);
  }
  const h = hat(a.hat, a.hatColor);
  if (h) head.add(h);
  root.add(head);

  return {
    group: root,
    update(t) {
      const breath = Math.sin(t * 1.5);
      torso.scale.set(
        1 + breath * 0.012,
        1 + breath * 0.008,
        1 + breath * 0.02,
      );
      head.position.y = 1.42 + breath * 0.006;
      // Mostly watches the fire, drifting now and then.
      head.rotation.set(
        0.12 + Math.sin(t * 0.21) * 0.03,
        Math.sin(t * 0.13) * 0.14,
        Math.sin(t * 0.17) * 0.02,
      );
      const blink = t % 4.7 < 0.13 ? 0.12 : 1;
      for (const eye of eyes) eye.scale.y = 1.25 * blink;
    },
  };
}

/** Height above the character origin where the name tag sits. */
export const NAMETAG_Y = 2.2;
