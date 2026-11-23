import * as THREE from 'three';

/** How thick the rug is; the seat and the dog are raised by this much so they sit on it. */
export const RUG_THICKNESS = 0.02;

/**
 * Footprint in seat-local space (+z points at the fire, which is at z 2.2):
 * under the tarp, covering the camper and the dog, with the fire-side edge
 * well back from the stone ring.
 */
const MIN_X = -2.5;
const MAX_X = 0.75;
const MIN_Z = -1.2;
const MAX_Z = 0.9;

/** A warm tartan, drawn darker than it looks: this close to the fire light colours wash out. */
function tartan(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#5e2620';
  g.fillRect(0, 0, size, size);
  // Wide dark bands and thin gold lines, both ways; where they cross the overlap reads as weave.
  const bands: Array<[number, number, string]> = [
    [24, 40, 'rgba(28, 44, 34, 0.75)'],
    [150, 40, 'rgba(28, 44, 34, 0.75)'],
    [98, 6, 'rgba(160, 122, 58, 0.8)'],
    [224, 6, 'rgba(160, 122, 58, 0.8)'],
  ];
  for (const [at, width, color] of bands) {
    g.fillStyle = color;
    g.fillRect(at, 0, width, size);
    g.fillRect(0, at, size, width);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  // Two repeats across, so the checks stay a sensible size on a rug this long.
  tex.repeat.set(2, (2 * (MAX_Z - MIN_Z)) / (MAX_X - MIN_X));
  return tex;
}

/** A plaid rug for the seat-local frame (add it to something with the seat's transform). */
export function createRug(): THREE.Mesh {
  const top = new THREE.MeshStandardMaterial({ map: tartan(), roughness: 1 });
  const edge = new THREE.MeshStandardMaterial({ color: 0x3a1714, roughness: 1 });
  // BoxGeometry faces: +x, −x, +y (top), −y, +z, −z.
  const rug = new THREE.Mesh(
    new THREE.BoxGeometry(MAX_X - MIN_X, RUG_THICKNESS, MAX_Z - MIN_Z),
    [edge, edge, top, edge, edge, edge],
  );
  rug.position.set((MIN_X + MAX_X) / 2, RUG_THICKNESS / 2, (MIN_Z + MAX_Z) / 2);
  // Takes the camper's and the dog's shadows; too flat to cast one of its own.
  rug.receiveShadow = true;
  return rug;
}
