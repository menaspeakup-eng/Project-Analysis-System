// Shared avatar preset system: a background color, a gender-based 3D
// character, one accessory, and one pet companion. Used by the portal hero
// and the character-edit page so their previews and gating stay in sync.
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
  none: { label: "بدون", emoji: null, unlockLevel: 1 },
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

export function avatarAccessoryEmoji(accessory: string): string | null {
  return AVATAR_ACCESSORIES[accessory]?.emoji ?? null;
}

export function avatarPetEmoji(pet: string): string | null {
  return AVATAR_PETS[pet]?.emoji ?? null;
}

export function isAccessoryUnlocked(accessory: string, level: number): boolean {
  const preset = AVATAR_ACCESSORIES[accessory];
  return !!preset && level >= preset.unlockLevel;
}

export function isPetUnlocked(pet: string, level: number): boolean {
  const preset = AVATAR_PETS[pet];
  return !!preset && level >= preset.unlockLevel;
}
