import { useMemo, useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GameComponentProps, calculateScore, normalizeAnswer } from "./shared";
import { ImageIcon, Check, X } from "lucide-react";

interface MatchItem {
  imageUrl: string;
  sentence: string;
}

export default function MatchSentencePictureGame({ items, onComplete }: GameComponentProps) {
  const [startedAt] = useState(() => Date.now());
  const [mistakes, setMistakes] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [selectedSentence, setSelectedSentence] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ index: number; ok: boolean } | null>(null);

  const validItems = useMemo(() => {
    return items
      .map((it, idx) => ({ ...(it as Record<string, unknown>), idx }))
      .filter((it): it is MatchItem & { idx: number } => {
        const rec = it as Record<string, unknown>;
        const imageUrl = rec.imageUrl;
        const sentence = rec.sentence;
        return typeof imageUrl === "string" && typeof sentence === "string";
      });
  }, [items]);

  const sentences = useMemo(
    () => validItems.map((it) => it.sentence).sort(() => Math.random() - 0.5),
    [validItems],
  );

  const handleMatch = (itemIndex: number) => {
    if (!selectedSentence || completed.has(itemIndex)) return;
    const item = validItems[itemIndex];
    const isCorrect = normalizeAnswer(selectedSentence) === normalizeAnswer(item.sentence);
    setFeedback({ index: itemIndex, ok: isCorrect });
    setTimeout(() => setFeedback(null), 600);
    if (isCorrect) {
      const next = new Set(completed);
      next.add(itemIndex);
      setCompleted(next);
      setSelectedSentence(null);
      if (next.size === validItems.length) {
        onComplete({
          score: calculateScore(validItems.length, mistakes),
          mistakes,
          durationMs: Date.now() - startedAt,
        });
      }
    } else {
      setMistakes((m) => m + 1);
    }
  };

  if (validItems.length === 0) {
    return (
      <div className="text-center text-muted-foreground font-medium">
        لا يوجد عناصر كافية في هذه اللعبة.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {validItems.map((item, idx) => (
          <Card
            key={idx}
            onClick={() => handleMatch(idx)}
            className={`relative overflow-hidden rounded-3xl border-2 cursor-pointer transition-all ${
              completed.has(idx)
                ? "border-[hsl(150,55%,45%)] bg-[hsl(150,55%,45%)]/10"
                : selectedSentence
                  ? "border-primary hover:bg-primary/5"
                  : "border-border"
            }`}
          >
            <div className="aspect-video flex items-center justify-center bg-muted/50">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt=""
                  className="w-full h-full object-contain p-4"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <ImageIcon className="w-12 h-12 text-muted-foreground" />
              )}
            </div>
            <div className="p-4 text-center font-bold text-foreground">
              {completed.has(idx) ? (
                <span className="text-[hsl(150,55%,45%)] flex items-center justify-center gap-1">
                  <Check className="w-4 h-4" /> تم
                </span>
              ) : selectedSentence ? (
                "اضغط هنا"
              ) : (
                "اختر جملة"
              )}
            </div>
            {feedback?.index === idx && (
              <div
                className={`absolute inset-0 flex items-center justify-center bg-background/80 font-black text-2xl ${
                  feedback.ok ? "text-[hsl(150,55%,45%)]" : "text-destructive"
                }`}
              >
                {feedback.ok ? <Check className="w-12 h-12" /> : <X className="w-12 h-12" />}
              </div>
            )}
          </Card>
        ))}
      </div>

      <div className="space-y-3">
        <p className="text-sm font-bold text-muted-foreground">اختر الجملة ثم اضغط على الصورة:</p>
        <div className="flex flex-wrap gap-2">
          {sentences.map((sentence) => {
            const isSelected = selectedSentence === sentence;
            const isUsed = validItems.some(
              (it, idx) => completed.has(idx) && normalizeAnswer(it.sentence) === normalizeAnswer(sentence),
            );
            return (
              <Button
                key={sentence}
                variant={isSelected ? "default" : "outline"}
                disabled={isUsed}
                onClick={() => setSelectedSentence(isSelected ? null : sentence)}
                className={`rounded-xl font-bold text-sm h-auto py-2 px-3 ${
                  isUsed ? "opacity-40 line-through" : ""
                }`}
              >
                {sentence}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
