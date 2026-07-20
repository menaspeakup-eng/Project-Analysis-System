import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, X, ArrowLeft } from "lucide-react";

interface Item {
  question: string;
  correctAnswer: string;
  wrongAnswers: string[];
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  items: Item[];
  onComplete: (result: { score: number; mistakes: number; durationMs: number }) => void;
}

export default function GrammarMultipleChoice({ items, onComplete }: Props) {
  const start = Date.now();
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  const item = items[index];
  const options = item ? shuffle([item.correctAnswer, ...item.wrongAnswers]) : [];

  const handleAnswer = (answer: string) => {
    if (selected || showResult) return;
    setSelected(answer);
    const correct = answer === item.correctAnswer;
    if (correct) setScore((s) => s + 1);
    else setMistakes((m) => m + 1);
    setShowResult(true);
  };

  const handleNext = () => {
    if (index + 1 >= items.length) {
      onComplete({ score, mistakes, durationMs: Date.now() - start });
    } else {
      setIndex((i) => i + 1);
      setSelected(null);
      setShowResult(false);
    }
  };

  if (!item) return null;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-muted-foreground">
          سؤال {index + 1} من {items.length}
        </span>
        <div className="flex gap-2 text-sm font-bold">
          <span className="text-[hsl(150,55%,45%)]">{score} صحيحة</span>
          <span className="text-destructive">{mistakes} خاطئة</span>
        </div>
      </div>

      <Card className="rounded-2xl border-border">
        <CardContent className="p-6">
          <p className="text-xl font-black text-foreground mb-6 leading-relaxed">{item.question}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {options.map((option) => {
              const isSelected = selected === option;
              const isCorrect = option === item.correctAnswer;
              let btnClass = "rounded-xl font-bold h-14 border-border bg-white hover:bg-accent/5";
              if (showResult && isCorrect) btnClass = "rounded-xl font-bold h-14 bg-[hsl(150,55%,45%)] text-white border-[hsl(150,55%,45%)]";
              else if (showResult && isSelected && !isCorrect) btnClass = "rounded-xl font-bold h-14 bg-destructive text-white border-destructive";
              else if (isSelected) btnClass = "rounded-xl font-bold h-14 bg-primary text-white border-primary";

              return (
                <Button
                  key={option}
                  variant="outline"
                  className={btnClass}
                  onClick={() => handleAnswer(option)}
                  disabled={showResult}
                >
                  <span className="truncate">{option}</span>
                  {showResult && isCorrect && <Check className="w-4 h-4 mr-2" />}
                  {showResult && isSelected && !isCorrect && <X className="w-4 h-4 mr-2" />}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          className="rounded-xl font-bold h-11"
          onClick={handleNext}
          disabled={!showResult}
        >
          {index + 1 >= items.length ? "إنهاء اللعبة" : "السؤال التالي"}
          <ArrowLeft className="w-4 h-4 mr-2" />
        </Button>
      </div>
    </div>
  );
}
