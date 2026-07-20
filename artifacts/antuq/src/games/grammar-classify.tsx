import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, X, ArrowLeft } from "lucide-react";

interface ClassifyItem {
  text: string;
  category: string;
}

interface Item {
  items: ClassifyItem[];
  categories: string[];
}

interface Props {
  items: Item[];
  onComplete: (result: { score: number; mistakes: number; durationMs: number }) => void;
}

export default function GrammarClassify({ items, onComplete }: Props) {
  const start = Date.now();
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  const item = items[index];
  const current = item?.items[currentItemIndex];

  const handleCategory = (category: string) => {
    if (selectedCategory || showResult || !current) return;
    setSelectedCategory(category);
    const correct = category === current.category;
    if (correct) setScore((s) => s + 1);
    else setMistakes((m) => m + 1);
    setShowResult(true);
  };

  const handleNext = () => {
    if (!item) return;
    const nextItemIndex = currentItemIndex + 1;
    if (nextItemIndex >= item.items.length) {
      if (index + 1 >= items.length) {
        onComplete({ score, mistakes, durationMs: Date.now() - start });
      } else {
        setIndex((i) => i + 1);
        setCurrentItemIndex(0);
        setSelectedCategory(null);
        setShowResult(false);
      }
    } else {
      setCurrentItemIndex(nextItemIndex);
      setSelectedCategory(null);
      setShowResult(false);
    }
  };

  if (!item || !current) return null;

  const totalQuestions = items.reduce((sum, it) => sum + it.items.length, 0);
  const answered = items.slice(0, index).reduce((sum, it) => sum + it.items.length, 0) + currentItemIndex;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-muted-foreground">
          عنصر {answered + 1} من {totalQuestions}
        </span>
        <div className="flex gap-2 text-sm font-bold">
          <span className="text-[hsl(150,55%,45%)]">{score} صحيحة</span>
          <span className="text-destructive">{mistakes} خاطئة</span>
        </div>
      </div>

      <Card className="rounded-2xl border-border">
        <CardContent className="p-6 space-y-6">
          <p className="text-3xl font-black text-foreground text-center">{current.text}</p>
          <p className="text-sm font-bold text-muted-foreground text-center">اختر التصنيف الصحيح</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {item.categories.map((category) => {
              const isSelected = selectedCategory === category;
              const isCorrect = category === current.category;
              let btnClass = "rounded-xl font-bold h-14 border-border bg-white hover:bg-accent/5";
              if (showResult && isCorrect) btnClass = "rounded-xl font-bold h-14 bg-[hsl(150,55%,45%)] text-white border-[hsl(150,55%,45%)]";
              else if (showResult && isSelected && !isCorrect) btnClass = "rounded-xl font-bold h-14 bg-destructive text-white border-destructive";
              else if (isSelected) btnClass = "rounded-xl font-bold h-14 bg-primary text-white border-primary";

              return (
                <Button
                  key={category}
                  variant="outline"
                  className={btnClass}
                  onClick={() => handleCategory(category)}
                  disabled={showResult}
                >
                  <span className="truncate">{category}</span>
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
          {answered + 1 >= totalQuestions ? "إنهاء اللعبة" : "التالي"}
          <ArrowLeft className="w-4 h-4 mr-2" />
        </Button>
      </div>
    </div>
  );
}
