export const POND = { x: 4.5, z: -3.3, rx: 2.5, rz: 1.75 } as const;
export const pondDistance = (x: number, z: number) =>
  Math.hypot((x - POND.x) / POND.rx, (z - POND.z) / POND.rz);
