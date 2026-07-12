import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GameComponentProps, calculateScore, normalizeAnswer } from "./shared";
import { Check, RotateCcw } from "lucide-react";

interface ArrangeSentencesItem {
  sentence: string;
}

export default function ArrangeSentencesGame({ items, onComplete }: GameComponentProps) {
  const [startedAt] = useState(() => Date.now());
  const [mistakes, setMistakes] = useState(0);
  const [selectedSentences, setSelectedSentences] = useState<string[]>([]);
  const [pool, setPool] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  const validItems = useMemo(() => {
    return items
      .filter((it): it is ArrangeSentencesItem => typeof (it as Record<string, unknown>).sentence === "string")
      .map((it) => ({ sentence: it.sentence.trim() }))
      .filter((it) => it.sentence.length > 0);
  }, [items]);

  const correctOrder = useMemo(() => validItems.map((it) => it.sentence), [validItems]);

  const initPool = () => {
    let shuffled = [...correctOrder];
    let attempts = 0;
    while (shuffled.join("|") === correctOrder.join("|") && attempts < 10) {
      shuffled = [...correctOrder].sort(() => Math.random() - 0.5);
      attempts++;
    }
    setPool(shuffled);
    setSelectedSentences([]);
    setFeedback(null);
  };

  useEffect(() => {
    initPool();
  }, [validItems]);

  const handleSentence = (index: number, fromPool: boolean) => {
    if (feedback) return;
    if (fromPool) {
      setPool((p) => p.filter((_, i) => i !== index));
      setSelectedSentences((s) => [...s, pool[index]]);
    } else {
      setSelectedSentences((s) => s.filter((_, i) => i !== index));
      setPool((p) => [...p, selectedSentences[index]]);
    }
  };

  const handleCheck = () => {
    const answer = selectedSentences.join("|");
    const correct = answer === correctOrder.join("|");
    setFeedback(correct ? "correct" : "wrong");
    if (correct) {
      setTimeout(() => {
        onComplete({
          score: calculateScore(1, mistakes),
          mistakes,
          durationMs: Date.now() - startedAt,
        });
      }, 500);
    } else {
      setMistakes((m) => m + 1);
      setTimeout(() => setFeedback(null), 800);
    }
  };

  const handleReset = () => {
    initPool();
  };

  if (validItems.length === 0) {
    return <div className="text-center text-muted-foreground font-medium">لا توجد جمل في هذه اللعبة.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-muted-foreground">رتب جمل القصة بالترتيب الصحيح:</p>
        <Button variant="ghost" size="sm" onClick={handleReset} className="font-bold gap-1">
          <RotateCcw className="w-4 h-4" />
          إعادة
        </Button>
      </div>

      <Card className="rounded-3xl p-4 bg-muted/30 border-border min-h-[160px] flex flex-col gap-2">
        {selectedSentences.length === 0 ? (
          <span className="text-muted-foreground font-medium text-center my-auto">ضع الجمل هنا بالترتيب</span>
        ) : (
          selectedSentences.map((sentence, idx) => (
            <Button
              key={idx}
              variant="outline"
              onClick={() => handleSentence(idx, false)}
              className="rounded-xl font-bold text-sm h-auto py-3 px-4 justify-start text-right whitespace-normal border-primary/30"
            >
              {idx + 1}. {sentence}
            </Button>
          ))
        )}
      </Card>

      <div className="flex flex-col gap-2">
        {pool.map((sentence, idx) => (
          <Button
            key={idx}
            onClick={() => handleSentence(idx, true)}
            className="rounded-xl font-bold text-sm h-auto py-3 px-4 justify-start text-right whitespace-normal"
          >
            {sentence}
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
          {feedback === "correct" ? "أحسنت!" : "الترتيب غير صحيح، حاول مرة أخرى"}
        </div>
      )}

      <Button
        className="w-full rounded-xl font-bold h-11"
        onClick={handleCheck}
        disabled={selectedSentences.length === 0 || feedback === "correct"}
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
