import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { GameComponentProps, calculateScore, normalizeAnswer } from "./shared";
import { Check, X, ImageIcon } from "lucide-react";

interface ChoosePictureItem {
  sentence: string;
  correctImageUrl: string;
  wrongImageUrls: string[];
}

export default function ChoosePictureGame({ items, onComplete }: GameComponentProps) {
  const [startedAt] = useState(() => Date.now());
  const [mistakes, setMistakes] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  const validItems = useMemo(() => {
    return items.filter((it): it is ChoosePictureItem => {
      const sentence = (it as Record<string, unknown>).sentence;
      const correctImageUrl = (it as Record<string, unknown>).correctImageUrl;
      const wrongImageUrls = (it as Record<string, unknown>).wrongImageUrls;
      return (
        typeof sentence === "string" &&
        typeof correctImageUrl === "string" &&
        Array.isArray(wrongImageUrls) &&
        wrongImageUrls.length === 3 &&
        wrongImageUrls.every((url) => typeof url === "string")
      );
    });
  }, [items]);

  const current = validItems[currentIndex];
  const options = useMemo(() => {
    if (!current) return [];
    return [current.correctImageUrl, ...current.wrongImageUrls].sort(() => Math.random() - 0.5);
  }, [current]);

  const handleSelect = (imageUrl: string) => {
    if (!current || feedback) return;
    setSelected(imageUrl);
    const isCorrect = imageUrl === current.correctImageUrl;
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
        <p className="font-black text-xl text-foreground mt-2">{current.sentence}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {options.map((imageUrl, idx) => (
          <Card
            key={idx}
            onClick={() => handleSelect(imageUrl)}
            className={`relative aspect-square rounded-3xl overflow-hidden cursor-pointer border-2 transition-all ${
              selected === imageUrl
                ? feedback === "correct"
                  ? "border-[hsl(150,55%,45%)] ring-4 ring-[hsl(150,55%,45%)]/20"
                  : "border-destructive ring-4 ring-destructive/20"
                : "border-border hover:border-primary"
            }`}
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt=""
                className="w-full h-full object-contain p-4"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  (e.target as HTMLImageElement).parentElement?.classList.add("flex", "items-center", "justify-center");
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-12 h-12 text-muted-foreground" />
              </div>
            )}
            {selected === imageUrl && (
              <div
                className={`absolute inset-0 flex items-center justify-center bg-background/70 ${
                  feedback === "correct" ? "text-[hsl(150,55%,45%)]" : "text-destructive"
                }`}
              >
                {feedback === "correct" ? <Check className="w-12 h-12" /> : <X className="w-12 h-12" />}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
