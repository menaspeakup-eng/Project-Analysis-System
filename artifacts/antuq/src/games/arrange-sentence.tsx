import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GameComponentProps, splitSentence, calculateScore, normalizeAnswer } from "./shared";
import { ArrowRight, Check, RotateCcw } from "lucide-react";

interface ArrangeItem {
  sentence: string;
}

export default function ArrangeSentenceGame({ items, onComplete }: GameComponentProps) {
  const [startedAt] = useState(() => Date.now());
  const [mistakes, setMistakes] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [pool, setPool] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  const validItems = useMemo(() => {
    return items
      .filter((it): it is ArrangeItem => typeof (it as Record<string, unknown>).sentence === "string")
      .map((it) => ({ sentence: it.sentence.trim() }))
      .filter((it) => it.sentence.length > 0);
  }, [items]);

  const current = validItems[currentIndex];

  useEffect(() => {
    if (!current) return;
    const words = splitSentence(current.sentence);
    setPool(shuffleWords(words));
    setSelectedWords([]);
    setFeedback(null);
  }, [currentIndex, current]);

  const shuffleWords = (words: string[]) => {
    let shuffled = [...words];
    let attempts = 0;
    while (shuffled.join(" ") === words.join(" ") && attempts < 10) {
      shuffled = [...words].sort(() => Math.random() - 0.5);
      attempts++;
    }
    return shuffled;
  };

  const handleWord = (index: number, fromPool: boolean) => {
    if (fromPool) {
      setPool((p) => {
        const word = p[index];
        return p.filter((_, i) => i !== index);
      });
      setSelectedWords((s) => [...s, pool[index]]);
    } else {
      setSelectedWords((s) => s.filter((_, i) => i !== index));
      setPool((p) => [...p, selectedWords[index]]);
    }
  };

  const handleCheck = () => {
    const answer = selectedWords.join(" ");
    const correct = normalizeAnswer(answer) === normalizeAnswer(current.sentence);
    setFeedback(correct ? "correct" : "wrong");
    if (correct) {
      setTimeout(() => {
        if (currentIndex + 1 < validItems.length) {
          setCurrentIndex((i) => i + 1);
        } else {
          onComplete({
            score: calculateScore(validItems.length, mistakes),
            mistakes,
            durationMs: Date.now() - startedAt,
          });
        }
      }, 500);
    } else {
      setMistakes((m) => m + 1);
      setTimeout(() => setFeedback(null), 800);
    }
  };

  const handleReset = () => {
    if (!current) return;
    setPool(shuffleWords(splitSentence(current.sentence)));
    setSelectedWords([]);
    setFeedback(null);
  };

  if (validItems.length === 0) {
    return <div className="text-center text-muted-foreground font-medium">لا توجد جمل في هذه اللعبة.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-muted-foreground">
          جملة {currentIndex + 1} من {validItems.length}
        </span>
        <Button variant="ghost" size="sm" onClick={handleReset} className="font-bold gap-1">
          <RotateCcw className="w-4 h-4" />
          إعادة
        </Button>
      </div>

      <Card className="rounded-3xl p-6 bg-muted/30 border-border min-h-[120px] flex flex-wrap gap-2 items-center justify-center">
        {selectedWords.length === 0 ? (
          <span className="text-muted-foreground font-medium">رتب الكلمات هنا</span>
        ) : (
          selectedWords.map((word, idx) => (
            <Button
              key={`${word}-${idx}`}
              variant="outline"
              onClick={() => handleWord(idx, false)}
              className="rounded-xl font-bold text-lg h-auto py-2 px-4 border-primary/30"
            >
              {word}
            </Button>
          ))
        )}
      </Card>

      <div className="flex flex-wrap gap-2 justify-center">
        {pool.map((word, idx) => (
          <Button
            key={`${word}-${idx}`}
            onClick={() => handleWord(idx, true)}
            className="rounded-xl font-bold text-lg h-auto py-2 px-4"
          >
            {word}
          </Button>
        ))}
      </div>

      {feedback && (
        <div
          className={`text-center font-black text-xl flex items-center justify-center gap-2 ${
            feedback === "correct" ? "text-[hsl(150,55%,45%)]" : "text-destructive"
          }`}
        >
          {feedback === "correct" ? <Check className="w-6 h-6" /> : <XIcon />}
          {feedback === "correct" ? "أحسنت!" : "حاول مرة أخرى"}
        </div>
      )}

      <Button
        className="w-full rounded-xl font-bold h-11"
        onClick={handleCheck}
        disabled={selectedWords.length === 0 || feedback === "correct"}
      >
        <Check className="w-4 h-4 ml-1" />
        تحقق
      </Button>
    </div>
  );
}

function XIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
