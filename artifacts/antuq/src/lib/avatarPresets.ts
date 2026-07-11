// Shared avatar preset system: a background color, a gender-based 3D
// character, a set of simultaneously-worn accessories, and one pet
// companion. Used by the portal hero and the character-edit page so their
// previews and gating stay in sync.
//
// Unlock levels here must be kept in sync with
// `artifacts/api-server/src/lib/avatarUnlocks.ts`, which enforces the same
// rules server-side so a student can't unlock something early by editing
// requests directly.
export const POINTS_PER_LEVEL = 100;

export function levelForPoints(points: number): number {
  return Math.floor(points / POINTS_PER_LEVEL) + 1;
}

export const AVATAR_BG_COLORS: Record<string, { label: string; from: string; to: string }> = {
  orange: { label: "برتقالي", from: "hsl(15,85%,88%)", to: "hsl(15,85%,70%)" },
  blue: { label: "أزرق", from: "hsl(200,80%,90%)", to: "hsl(200,80%,72%)" },
  green: { label: "أخضر", from: "hsl(150,55%,88%)", to: "hsl(150,55%,68%)" },
  purple: { label: "بنفسجي", from: "hsl(265,60%,90%)", to: "hsl(265,60%,74%)" },
  pink: { label: "وردي", from: "hsl(335,75%,92%)", to: "hsl(335,75%,76%)" },
  yellow: { label: "أصفر", from: "hsl(45,90%,90%)", to: "hsl(45,90%,70%)" },
};

export const AVATAR_GENDERS: Record<string, { label: string; emoji: string }> = {
  male: { label: "ولد", emoji: "👦" },
  female: { label: "بنت", emoji: "👧" },
};

// Each accessory occupies a "slot" so a kid can combine pieces into a full
// outfit (e.g. glasses + crown + bow) while pieces that would visually
// collide on the model (crown and cap both sit on the head) stay mutually
// exclusive within their slot.
export type AccessorySlot = "face" | "head" | "accent";

export const AVATAR_ACCESSORIES: Record<
  string,
  { label: string; emoji: string | null; unlockLevel: number; slot: AccessorySlot }
> = {
  glasses: { label: "نظارة", emoji: "🕶️", unlockLevel: 1, slot: "face" },
  bow: { label: "فيونكة", emoji: "🎀", unlockLevel: 2, slot: "accent" },
  star: { label: "نجمة", emoji: "🌟", unlockLevel: 3, slot: "accent" },
  crown: { label: "تاج", emoji: "👑", unlockLevel: 4, slot: "head" },
  cap: { label: "قبعة", emoji: "🧢", unlockLevel: 5, slot: "head" },
};

export const AVATAR_PETS: Record<
  string,
  { label: string; emoji: string | null; unlockLevel: number }
> = {
  none: { label: "بدون", emoji: null, unlockLevel: 1 },
  cat: { label: "قطة", emoji: "🐱", unlockLevel: 6 },
  dog: { label: "كلب", emoji: "🐶", unlockLevel: 7 },
  rabbit: { label: "أرنب", emoji: "🐰", unlockLevel: 8 },
  bird: { label: "ببغاء", emoji: "🦜", unlockLevel: 9 },
  turtle: { label: "سلحفاة", emoji: "🐢", unlockLevel: 10 },
};

export function avatarBgStyle(bgColor: string): { backgroundImage: string } {
  const preset = AVATAR_BG_COLORS[bgColor] ?? AVATAR_BG_COLORS.orange;
  return { backgroundImage: `linear-gradient(to bottom, ${preset.from}, ${preset.to})` };
}

export function avatarAccessoryEmojis(accessories: string[]): string[] {
  return accessories
    .map((accessory) => AVATAR_ACCESSORIES[accessory]?.emoji)
    .filter((emoji): emoji is string => !!emoji);
}

// Toggles one accessory on/off within `current`, enforcing at most one
// accessory per slot (see AVATAR_ACCESSORIES) so newly-added pieces don't
// visually collide with whatever already occupies that slot.
export function toggleAccessory(current: string[], accessory: string): string[] {
  const preset = AVATAR_ACCESSORIES[accessory];
  if (!preset) return current;
  if (current.includes(accessory)) {
    return current.filter((a) => a !== accessory);
  }
  const withoutSameSlot = current.filter((a) => AVATAR_ACCESSORIES[a]?.slot !== preset.slot);
  return [...withoutSameSlot, accessory];
}

export function avatarPetEmoji(pet: string): string | null {
  return AVATAR_PETS[pet]?.emoji ?? null;
}

export function isAccessoryUnlocked(accessory: string, level: number): boolean {
  const preset = AVATAR_ACCESSORIES[accessory];
  return !!preset && level >= preset.unlockLevel;
}

export function areAccessoriesUnlocked(accessories: string[], level: number): boolean {
  return accessories.every((accessory) => isAccessoryUnlocked(accessory, level));
}

export function isPetUnlocked(pet: string, level: number): boolean {
  const preset = AVATAR_PETS[pet];
  return !!preset && level >= preset.unlockLevel;
}
