// Shared avatar preset system: a background color, a gender-based 3D
// character, and one pet companion. Used by the portal hero and the
// character-edit page so their previews and gating stay in sync.
//
// Accessories are rendered as a single fully pre-modeled 3D character
// (character + accessory sculpted together in one GLB, generated per
// gender+accessory combo -- see Avatar3D.tsx's CHARACTER_URLS), not as a
// separate piece composited on top of a generic body at runtime. That
// runtime-compositing approach couldn't reliably size/place generated
// accessory props on the character, so a kid can only wear one accessory
// at a time now (no mixing pieces into an outfit), in exchange for it
// always looking correct.
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

export const AVATAR_ACCESSORIES: Record<
  string,
  { label: string; emoji: string | null; unlockLevel: number }
> = {
  glasses: { label: "نظارة", emoji: "🕶️", unlockLevel: 1 },
  bow: { label: "فيونكة", emoji: "🎀", unlockLevel: 2 },
  star: { label: "نجمة", emoji: "🌟", unlockLevel: 3 },
  crown: { label: "تاج", emoji: "👑", unlockLevel: 4 },
  cap: { label: "قبعة", emoji: "🧢", unlockLevel: 5 },
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

// A student can only wear one accessory at a time (see the note above
// AVATAR_ACCESSORIES): each accessory is its own fully pre-modeled 3D
// character, so there's nothing to "combine". Tapping the already-selected
// accessory clears it back to "none"; tapping a different one replaces it.
export function selectAccessory(current: string, accessory: string): string {
  if (!AVATAR_ACCESSORIES[accessory]) return current;
  return current === accessory ? "none" : accessory;
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

export function avatarFrameClass(frame: string): string {
  switch (frame) {
    case "gold":
      return "border-4 border-yellow-400 shadow-[0_0_0_4px_rgba(250,204,21,0.25)]";
    case "silver":
      return "border-4 border-slate-300 shadow-[0_0_0_4px_rgba(203,213,225,0.25)]";
    case "rainbow":
      return "border-4 border-transparent bg-gradient-to-r from-pink-300 via-yellow-300 to-blue-300 p-1";
    case "none":
    default:
      return "";
  }
}
