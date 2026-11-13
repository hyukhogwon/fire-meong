/** Where the sky is drawn from: 38°N, 127°E (central Korea). */
export const OBSERVER = { latDeg: 38, lonDeg: 127 } as const;

const DEG = Math.PI / 180;
const DAY_MS = 86_400_000;
const KST_OFFSET_MS = 9 * 3_600_000;
/** Before this local hour the previous midnight still counts as "tonight". */
const NIGHT_ENDS_HOUR = 6;

const mod360 = (x: number) => ((x % 360) + 360) % 360;

/** Greenwich mean sidereal time in degrees (IAU 1982 expression). */
export function greenwichSiderealDeg(date: Date): number {
  const jd = date.getTime() / DAY_MS + 2440587.5;
  const d = jd - 2451545.0;
  const t = d / 36525;
  return mod360(
    280.46061837 +
      360.98564736629 * d +
      0.000387933 * t * t -
      (t * t * t) / 38710000,
  );
}

/** Altitude and azimuth (from north, through east) in degrees. */
export function equatorialToHorizontal(
  raDeg: number,
  decDeg: number,
  lstDeg: number,
  latDeg: number,
): { alt: number; az: number } {
  const h = (lstDeg - raDeg) * DEG;
  const dec = decDeg * DEG;
  const lat = latDeg * DEG;
  const sinAlt =
    Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(h);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const az = Math.atan2(
    -Math.cos(dec) * Math.sin(h),
    Math.sin(dec) * Math.cos(lat) - Math.cos(dec) * Math.cos(h) * Math.sin(lat),
  );
  return { alt: alt / DEG, az: mod360(az / DEG) };
}

/**
 * Unit direction in scene space for a horizontal position, with due south
 * straight ahead (-z), west to the right (+x) and the zenith up (+y).
 */
export function horizontalToScene(
  altDeg: number,
  azDeg: number,
): [number, number, number] {
  const a = (azDeg - 180) * DEG;
  const alt = altDeg * DEG;
  return [
    Math.sin(a) * Math.cos(alt),
    Math.sin(alt),
    -Math.cos(a) * Math.cos(alt),
  ];
}

/** The 00:00 KST that belongs to tonight (the previous one until 06:00). */
export function tonightMidnightKst(now: Date): Date {
  const local = now.getTime() + KST_OFFSET_MS;
  const dayStart = Math.floor(local / DAY_MS) * DAY_MS;
  const hour = (local - dayStart) / 3_600_000;
  const midnight = hour < NIGHT_ENDS_HOUR ? dayStart : dayStart + DAY_MS;
  return new Date(midnight - KST_OFFSET_MS);
}

/** North galactic pole (J2000) and the galactic longitude of the celestial pole. */
const NGP = { ra: 192.85948, dec: 27.12825, lonOfNcp: 122.93192 } as const;

/** Galactic longitude/latitude (degrees) to right ascension/declination (degrees, J2000). */
export function galacticToEquatorial(
  lDeg: number,
  bDeg: number,
): { ra: number; dec: number } {
  const b = bDeg * DEG;
  const d = (NGP.lonOfNcp - lDeg) * DEG;
  const pole = NGP.dec * DEG;
  const sinDec =
    Math.sin(b) * Math.sin(pole) + Math.cos(b) * Math.cos(pole) * Math.cos(d);
  const dec = Math.asin(Math.max(-1, Math.min(1, sinDec)));
  const ra =
    NGP.ra +
    Math.atan2(
      Math.cos(b) * Math.sin(d),
      Math.sin(b) * Math.cos(pole) - Math.cos(b) * Math.sin(pole) * Math.cos(d),
    ) /
      DEG;
  return { ra: mod360(ra), dec: dec / DEG };
}
