import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GameComponentProps, calculateScore, normalizeAnswer } from "./shared";

interface CompleteItem {
  sentence: string;
  hiddenWord: string;
  wrongWords: string[];
}

export default function CompleteSentenceGame({ items, onComplete }: GameComponentProps) {
  const [startedAt] = useState(() => Date.now());
  const [mistakes, setMistakes] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  const validItems = useMemo(() => {
    return items.filter((it): it is CompleteItem => {
      const sentence = (it as Record<string, unknown>).sentence;
      const hiddenWord = (it as Record<string, unknown>).hiddenWord;
      const wrongWords = (it as Record<string, unknown>).wrongWords;
      return (
        typeof sentence === "string" &&
        typeof hiddenWord === "string" &&
        Array.isArray(wrongWords) &&
        wrongWords.length === 3 &&
        wrongWords.every((w) => typeof w === "string")
      );
    });
  }, [items]);

  const current = validItems[currentIndex];
  const options = useMemo(() => {
    if (!current) return [];
    return [current.hiddenWord, ...current.wrongWords].sort(() => Math.random() - 0.5);
  }, [current]);

  const maskedSentence = useMemo(() => {
    if (!current) return "";
    return current.sentence.replace(current.hiddenWord, "_____");
  }, [current]);

  const handleSelect = (word: string) => {
    if (!current || feedback) return;
    setSelected(word);
    const isCorrect = normalizeAnswer(word) === normalizeAnswer(current.hiddenWord);
    setFeedback(isCorrect ? "correct" : "wrong");
    if (isCorrect) {
      setTimeout(() => {
        if (currentIndex + 1 < validItems.length) {
          setCurrentIndex((i) => i + 1);
          setSelected(null);
          setFeedback(null);
        } else {
          onComplete({
            score: calculateScore(validItems.length, mistakes),
            mistakes,
            durationMs: Date.now() - startedAt,
          });
        }
      }, 600);
    } else {
      setMistakes((m) => m + 1);
      setTimeout(() => {
        setSelected(null);
        setFeedback(null);
      }, 800);
    }
  };

  if (validItems.length === 0) {
    return <div className="text-center text-muted-foreground font-medium">لا توجد عناصر كافية في هذه اللعبة.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <span className="text-sm font-bold text-muted-foreground">
          سؤال {currentIndex + 1} من {validItems.length}
        </span>
      </div>

      <Card className="rounded-3xl p-8 bg-muted/30 border-border text-center">
        <p className="font-black text-2xl text-foreground leading-relaxed">{maskedSentence}</p>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {options.map((word, idx) => (
          <Button
            key={idx}
            variant={selected === word ? "default" : "outline"}
            onClick={() => handleSelect(word)}
            disabled={feedback === "correct"}
            className={`rounded-xl font-bold text-lg h-14 ${
              selected === word
                ? feedback === "correct"
                  ? "bg-[hsl(150,55%,45%)] hover:bg-[hsl(150,55%,45%)]"
                  : "bg-destructive hover:bg-destructive"
                : ""
            }`}
          >
            {word}
          </Button>
        ))}
      </div>

      {feedback === "wrong" && (
        <p className="text-center font-bold text-destructive">حاول مرة أخرى</p>
      )}
    </div>
  );
}
