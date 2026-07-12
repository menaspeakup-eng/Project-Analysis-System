export type GameType =
  | "match-sentence-picture"
  | "arrange-sentence"
  | "choose-picture"
  | "choose-sentence"
  | "complete-sentence"
  | "arrange-sentences";

export const GAME_TYPES: GameType[] = [
  "match-sentence-picture",
  "arrange-sentence",
  "choose-picture",
  "choose-sentence",
  "complete-sentence",
  "arrange-sentences",
];

export const GAME_TYPE_LABELS: Record<GameType, string> = {
  "match-sentence-picture": "طابق الجملة بالصورة",
  "arrange-sentence": "رتب الجملة",
  "choose-picture": "اختر الصورة الصحيحة",
  "choose-sentence": "اختر الجملة الصحيحة",
  "complete-sentence": "أكمل الجملة",
  "arrange-sentences": "ترتيب الجمل",
};

export interface GameItemPayload {
  [key: string]: unknown;
}
