// Shared avatar preset system: a background color plus one accessory emoji
// overlay on the mascot image. Used by both the portal hero and the
// character-edit page so their previews stay in sync.
export const AVATAR_BG_COLORS: Record<string, { label: string; from: string; to: string }> = {
  orange: { label: "برتقالي", from: "hsl(15,85%,88%)", to: "hsl(15,85%,70%)" },
  blue: { label: "أزرق", from: "hsl(200,80%,90%)", to: "hsl(200,80%,72%)" },
  green: { label: "أخضر", from: "hsl(150,55%,88%)", to: "hsl(150,55%,68%)" },
  purple: { label: "بنفسجي", from: "hsl(265,60%,90%)", to: "hsl(265,60%,74%)" },
  pink: { label: "وردي", from: "hsl(335,75%,92%)", to: "hsl(335,75%,76%)" },
  yellow: { label: "أصفر", from: "hsl(45,90%,90%)", to: "hsl(45,90%,70%)" },
};

export const AVATAR_ACCESSORIES: Record<string, { label: string; emoji: string | null }> = {
  none: { label: "بدون", emoji: null },
  glasses: { label: "نظارة", emoji: "🕶️" },
  crown: { label: "تاج", emoji: "👑" },
  bow: { label: "فيونكة", emoji: "🎀" },
  star: { label: "نجمة", emoji: "🌟" },
  cap: { label: "قبعة", emoji: "🧢" },
};

export function avatarBgStyle(bgColor: string): { backgroundImage: string } {
  const preset = AVATAR_BG_COLORS[bgColor] ?? AVATAR_BG_COLORS.orange;
  return { backgroundImage: `linear-gradient(to bottom, ${preset.from}, ${preset.to})` };
}

export function avatarAccessoryEmoji(accessory: string): string | null {
  return AVATAR_ACCESSORIES[accessory]?.emoji ?? null;
}
