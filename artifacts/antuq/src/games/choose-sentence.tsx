import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GameComponentProps, calculateScore, normalizeAnswer } from "./shared";
import { Check, X, ImageIcon } from "lucide-react";

interface ChooseSentenceItem {
  imageUrl: string;
  correctSentence: string;
  wrongSentences: string[];
}

export default function ChooseSentenceGame({ items, onComplete }: GameComponentProps) {
  const [startedAt] = useState(() => Date.now());
  const [mistakes, setMistakes] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  const validItems = useMemo(() => {
    return items.filter((it): it is ChooseSentenceItem => {
      const imageUrl = (it as Record<string, unknown>).imageUrl;
      const correctSentence = (it as Record<string, unknown>).correctSentence;
      const wrongSentences = (it as Record<string, unknown>).wrongSentences;
      return (
        typeof imageUrl === "string" &&
        typeof correctSentence === "string" &&
        Array.isArray(wrongSentences) &&
        wrongSentences.length === 3 &&
        wrongSentences.every((s) => typeof s === "string")
      );
    });
  }, [items]);

  const current = validItems[currentIndex];
  const options = useMemo(() => {
    if (!current) return [];
    return [current.correctSentence, ...current.wrongSentences].sort(() => Math.random() - 0.5);
  }, [current]);

  const handleSelect = (sentence: string) => {
    if (!current || feedback) return;
    setSelected(sentence);
    const isCorrect = normalizeAnswer(sentence) === normalizeAnswer(current.correctSentence);
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

      <Card className="rounded-3xl overflow-hidden aspect-video flex items-center justify-center bg-muted/30 border-border">
        {current.imageUrl ? (
          <img
            src={current.imageUrl}
            alt=""
            className="w-full h-full object-contain p-6"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <ImageIcon className="w-16 h-16 text-muted-foreground" />
        )}
      </Card>

      <div className="grid grid-cols-1 gap-3">
        {options.map((sentence, idx) => (
          <Button
            key={idx}
            variant={selected === sentence ? "default" : "outline"}
            onClick={() => handleSelect(sentence)}
            disabled={feedback === "correct"}
            className={`rounded-xl font-bold h-auto py-3 px-4 justify-start text-right whitespace-normal ${
              selected === sentence
                ? feedback === "correct"
                  ? "bg-[hsl(150,55%,45%)] hover:bg-[hsl(150,55%,45%)]"
                  : "bg-destructive hover:bg-destructive"
                : ""
            }`}
          >
            <span className="ml-2 shrink-0">
              {selected === sentence ? (
                feedback === "correct" ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <X className="w-5 h-5" />
                )
              ) : null}
            </span>
            {sentence}
          </Button>
        ))}
      </div>
    </div>
  );
}
