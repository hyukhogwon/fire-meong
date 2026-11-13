import {
  randomAppearance,
  isValidAppearance,
  type Appearance,
} from "./appearance";
import { randomName } from "./names";
import type { Rng } from "./rng";
import type { Store } from "./storage";
export interface Identity {
  id: string;
  name: string;
  appearance: Appearance;
}
const save = (s: Store, i: Identity) => (
  s.set("fire-mung:identity", JSON.stringify(i)),
  i
);
export function loadOrCreateIdentity(
  store: Store,
  rng: Rng,
  newId: () => string,
): Identity {
  try {
    const x = JSON.parse(store.get("fire-mung:identity") ?? "null");
    if (
      x &&
      typeof x.id === "string" &&
      x.id &&
      typeof x.name === "string" &&
      x.name.trim() &&
      isValidAppearance(x.appearance)
    )
      return x;
  } catch {}
  return save(store, {
    id: newId(),
    name: randomName(rng),
    appearance: randomAppearance(rng),
  });
}
export function rerollIdentity(store: Store, current: Identity, rng: Rng) {
  return save(store, {
    id: current.id,
    name: randomName(rng),
    appearance: randomAppearance(rng),
  });
}
