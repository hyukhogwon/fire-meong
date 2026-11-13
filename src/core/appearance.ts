import { pick, type Rng } from "./rng";
const hats = ["none", "beanie", "cap", "straw"] as const;
const shirts =
  "#6c8ef5 #e46b6b #7bc47f #c79bf2 #f2b84b #4fc1c9 #f28fb8 #a3a8b8".split(" ");
const skins = "#f6d2b0 #f2c9a0 #e8b98e #d49e74 #b07a52 #8a5a3b".split(" ");
const hatColors = "#3b4a6b #c0392b #e8d8b0 #2e7d4f #f5f0e6 #7a4e2d".split(" ");
export interface Appearance {
  shirt: string;
  skin: string;
  hat: (typeof hats)[number];
  hatColor: string;
}
export function randomAppearance(rng: Rng): Appearance {
  return {
    shirt: pick(rng, shirts),
    skin: pick(rng, skins),
    hat: pick(rng, hats),
    hatColor: pick(rng, hatColors),
  };
}
export function isValidAppearance(x: unknown): x is Appearance {
  if (!x || typeof x !== "object") return false;
  const a = x as Appearance;
  return (
    shirts.includes(a.shirt) &&
    skins.includes(a.skin) &&
    hats.includes(a.hat) &&
    hatColors.includes(a.hatColor)
  );
}
