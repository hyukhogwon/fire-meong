import * as THREE from "three";

/** Round soft points with per-particle size and colour (rgb premultiplied by fade). */
function pointsMaterial(blending: THREE.Blending): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uPx: { value: 400 } },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute vec4 aColor;
      uniform float uPx;
      varying vec4 vColor;
      void main() {
        vColor = aColor;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uPx / -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec4 vColor;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = (1.0 - smoothstep(0.0, 1.0, d));
        gl_FragColor = vec4(vColor.rgb, vColor.a * a * a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending,
    fog: false,
  });
}

export function softPoints(count: number, blending: THREE.Blending) {
  const pos = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const color = new Float32Array(count * 4);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute(
    "position",
    new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage),
  );
  geo.setAttribute(
    "aSize",
    new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage),
  );
  geo.setAttribute(
    "aColor",
    new THREE.BufferAttribute(color, 4).setUsage(THREE.DynamicDrawUsage),
  );
  const points = new THREE.Points(geo, pointsMaterial(blending));
  points.frustumCulled = false;
  return { points, pos, size, color, geo };
}
