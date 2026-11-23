import * as THREE from 'three';

/** Drop count; halved from 2000 by eye, which looked too heavy. */
const DROPS = 1000;
/** The box the rain falls through: wide enough to fill the view, from the far ridge to the camera. */
const AREA = { minX: -8, maxX: 8, minZ: -8, maxZ: 6, top: 8 } as const;
const FALL_SPEED = 8;
const STREAK = 0.28;
/** Sideways drift per unit of fall, so the streaks lean a little. */
const WIND = 0.12;

export interface Rain {
  mesh: THREE.LineSegments;
  /** `level` 0..1; `fire` lights the streaks near it. */
  update(time: number, level: number, fire: THREE.PointLight): void;
  /** No streaks inside `box`, given in the space `toLocal` maps world points into (the tarp's). */
  setShelter(toLocal: THREE.Matrix4, box: THREE.Box3): void;
}

export function createRain(): Rain {
  let seed = 9001;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // Each drop is a line segment: two vertices sharing a seed, `aEnd` 0 at the head, 1 at the tail.
  const seedAttr = new Float32Array(DROPS * 2 * 3);
  const endAttr = new Float32Array(DROPS * 2);
  for (let i = 0; i < DROPS; i++) {
    const x = AREA.minX + rand() * (AREA.maxX - AREA.minX);
    const z = AREA.minZ + rand() * (AREA.maxZ - AREA.minZ);
    const phase = rand() * AREA.top;
    for (let e = 0; e < 2; e++) {
      seedAttr.set([x, z, phase], (i * 2 + e) * 3);
      endAttr[i * 2 + e] = e;
    }
  }
  const geo = new THREE.BufferGeometry();
  // `position` is required by three; the shader builds the real position from the seed.
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DROPS * 2 * 3), 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seedAttr, 3));
  geo.setAttribute('aEnd', new THREE.BufferAttribute(endAttr, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uLevel: { value: 0 },
      uFire: { value: new THREE.Vector3() },
      uFireColor: { value: new THREE.Color() },
      uFireLevel: { value: 1 },
      uShelterInv: { value: new THREE.Matrix4() },
      uShelterMin: { value: new THREE.Vector3(1, 1, 1) },
      uShelterMax: { value: new THREE.Vector3(-1, -1, -1) },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aSeed;
      attribute float aEnd;
      uniform float uTime;
      uniform vec3 uFire, uShelterMin, uShelterMax;
      uniform mat4 uShelterInv;
      varying float vFire;
      varying float vDry;
      varying float vEnd;
      void main() {
        float fall = mod(aSeed.z + uTime * ${FALL_SPEED.toFixed(1)}, ${AREA.top.toFixed(1)});
        float y = ${AREA.top.toFixed(1)} - fall + aEnd * ${STREAK.toFixed(2)};
        vec3 p = vec3(aSeed.x - (fall - aEnd * ${STREAK.toFixed(2)}) * ${WIND.toFixed(2)}, y, aSeed.y);
        // Drops under the tarp never reach the camper: hide the whole streak there.
        vec3 q = (uShelterInv * vec4(p, 1.0)).xyz;
        vec3 inMin = step(uShelterMin, q);
        vec3 inMax = step(q, uShelterMax);
        vDry = inMin.x * inMin.y * inMin.z * inMax.x * inMax.y * inMax.z;
        vec3 l = uFire - p;
        vFire = 1.0 / (1.0 + 0.35 * dot(l, l));
        vEnd = aEnd;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uLevel, uFireLevel;
      uniform vec3 uFireColor;
      varying float vFire;
      varying float vDry;
      varying float vEnd;
      void main() {
        if (vDry > 0.5) discard;
        vec3 base = vec3(0.55, 0.62, 0.75);
        vec3 col = base * 0.35 + uFireColor * uFireLevel * vFire * 2.2;
        // Brighter head, fading tail.
        float a = uLevel * (0.12 + 0.28 * (1.0 - vEnd)) + uLevel * vFire * 0.5;
        gl_FragColor = vec4(col, min(a, 0.9));
      }
    `,
    transparent: true,
    depthWrite: false,
    fog: false,
  });

  const mesh = new THREE.LineSegments(geo, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  mesh.visible = false;
  const u = material.uniforms;

  return {
    mesh,
    update(time, level, fire) {
      mesh.visible = level > 0;
      if (!mesh.visible) return;
      u.uTime.value = time;
      u.uLevel.value = level;
      fire.getWorldPosition(u.uFire.value);
      u.uFireColor.value.copy(fire.color);
      u.uFireLevel.value = fire.intensity / 20;
    },
    setShelter(toLocal, box) {
      u.uShelterInv.value.copy(toLocal);
      u.uShelterMin.value.copy(box.min);
      u.uShelterMax.value.copy(box.max);
    },
  };
}
