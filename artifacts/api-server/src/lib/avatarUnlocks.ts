// Level-gating rules for avatar customization. Keep these constants in sync
// with `artifacts/antuq/src/lib/avatarPresets.ts` — the client uses them to
// show locked/unlocked state, the server uses them to reject cheated updates.
export const POINTS_PER_LEVEL = 100;

export function levelForPoints(points: number): number {
  return Math.floor(points / POINTS_PER_LEVEL) + 1;
}

// Accessory unlock levels. "none" has no lock (always available).
export const ACCESSORY_UNLOCK_LEVEL: Record<string, number> = {
  none: 1,
  glasses: 1,
  bow: 2,
  star: 3,
  crown: 4,
  cap: 5,
};

// Pet unlock levels. "none" has no lock (always available).
export const PET_UNLOCK_LEVEL: Record<string, number> = {
  none: 1,
  cat: 6,
  dog: 7,
  rabbit: 8,
  bird: 9,
  turtle: 10,
};

export function isAccessoryUnlocked(accessory: string, points: number): boolean {
  const required = ACCESSORY_UNLOCK_LEVEL[accessory];
  if (required === undefined) return false;
  return levelForPoints(points) >= required;
}

export function isPetUnlocked(pet: string, points: number): boolean {
  const required = PET_UNLOCK_LEVEL[pet];
  if (required === undefined) return false;
  return levelForPoints(points) >= required;
}
