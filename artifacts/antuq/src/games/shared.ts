export interface GameResult {
  score?: number;
  mistakes?: number;
  durationMs?: number;
}

export interface GameComponentProps {
  items: unknown[];
  onComplete: (result: GameResult) => void;
}

export function shuffle<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function splitSentence(sentence: string): string[] {
  return sentence.trim().split(/\s+/).filter(Boolean);
}

export function normalizeAnswer(value: string): string {
  return value.trim().replace(/[\.،,!؟?\s]+$/g, "").trim();
}

export function calculateScore(totalItems: number, mistakes: number): number {
  const perItem = 100 / Math.max(totalItems, 1);
  const score = Math.max(0, Math.round(100 - mistakes * perItem));
  return score;
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
