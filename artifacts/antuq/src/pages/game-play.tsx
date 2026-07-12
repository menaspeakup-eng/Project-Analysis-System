import { useLocation, useParams } from "wouter";
import { useEffect, useState, lazy, Suspense } from "react";
import { useGetGameById, useCompleteGame } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Star, Gamepad2, Check, Trophy } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { GameType } from "@/lib/gameTypes";

const gameComponents: Record<GameType, () => Promise<{ default: React.ComponentType<{ items: unknown[]; onComplete: (result: { score?: number; mistakes?: number; durationMs?: number }) => void }> }>> = {
  "match-sentence-picture": () => import("@/games/match-sentence-picture"),
  "arrange-sentence": () => import("@/games/arrange-sentence"),
  "choose-picture": () => import("@/games/choose-picture"),
  "choose-sentence": () => import("@/games/choose-sentence"),
  "complete-sentence": () => import("@/games/complete-sentence"),
  "arrange-sentences": () => import("@/games/arrange-sentences"),
};

export default function GamePlay() {
  const { id } = useParams<{ id: string }>();
  const gameId = Number(id);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useGetGameById(gameId, {
    query: { enabled: !Number.isNaN(gameId) } as never,
  });
  const { mutate: complete, isPending } = useCompleteGame();
  const [finished, setFinished] = useState(false);
  const [GameComponent, setGameComponent] = useState<React.ComponentType<{ items: unknown[]; onComplete: (result: { score?: number; mistakes?: number; durationMs?: number }) => void }> | null>(null);

  useEffect(() => {
    if (data?.isCompleted) {
      setFinished(true);
    }
  }, [data]);

  useEffect(() => {
    if (!data?.type) return;
    const load = gameComponents[data.type as GameType];
    if (!load) return;
    let cancelled = false;
    load().then((mod) => {
      if (!cancelled) setGameComponent(() => mod.default);
    });
    return () => {
      cancelled = true;
    };
  }, [data?.type]);

  const handleComplete = (result: { score?: number; mistakes?: number; durationMs?: number }) => {
    complete(
      { id: gameId, data: result },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/games"] });
          queryClient.invalidateQueries({ queryKey: ["/api/student/me"] });
          queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"] });
          setFinished(true);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center p-4" dir="rtl">
        <Card className="rounded-3xl border-border shadow-sm max-w-md w-full">
          <CardContent className="p-8 text-center text-muted-foreground font-medium">
            تعذر تحميل اللعبة أو أنها غير متاحة.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background p-4 md:p-8" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-accent text-white flex items-center justify-center">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-black text-xl text-foreground">{data.name}</h1>
              <p className="text-sm text-muted-foreground font-medium">
                {data.description || "لعبة تعليمية لتعلم القراءة"}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="rounded-xl font-bold h-10 border-border"
            onClick={() => setLocation("/games")}
          >
            <ArrowRight className="w-4 h-4 ml-1" />
            رجوع
          </Button>
        </div>

        <Card className="rounded-3xl border-border shadow-sm">
          <CardContent className="p-6 md:p-8">
            {finished ? (
              <div className="text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-[hsl(150,55%,45%)]/20 text-[hsl(150,55%,45%)] flex items-center justify-center mx-auto">
                  <Trophy className="w-10 h-10" />
                </div>
                <h2 className="font-black text-2xl text-foreground">أحسنت!</h2>
                <p className="text-muted-foreground font-medium">
                  أنهيت اللعبة وحصلت على {data.pointsReward} نقطة.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Badge className="rounded-full font-bold bg-accent text-white px-4 py-1.5">
                    <Star className="w-4 h-4 ml-1" />
                    {data.pointsReward} نقطة
                  </Badge>
                </div>
                <Button
                  className="rounded-xl font-bold h-11"
                  onClick={() => setLocation("/games")}
                >
                  <ArrowRight className="w-4 h-4 ml-1" />
                  العودة إلى الألعاب
                </Button>
              </div>
            ) : data.isCompleted ? (
              <div className="text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-[hsl(150,55%,45%)]/20 text-[hsl(150,55%,45%)] flex items-center justify-center mx-auto">
                  <Check className="w-10 h-10" />
                </div>
                <h2 className="font-black text-2xl text-foreground">تم إنهاء هذه اللعبة</h2>
                <p className="text-muted-foreground font-medium">
                  انتظر حتى يقوم المعلم بتحديث المحتوى وإعادة نشر اللعبة.
                </p>
                <Button
                  variant="outline"
                  className="rounded-xl font-bold h-11 border-border"
                  onClick={() => setLocation("/games")}
                >
                  <ArrowRight className="w-4 h-4 ml-1" />
                  العودة إلى الألعاب
                </Button>
              </div>
            ) : GameComponent ? (
              <Suspense
                fallback={
                  <div className="h-40 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  </div>
                }
              >
                <GameComponent items={data.items ?? []} onComplete={handleComplete} />
              </Suspense>
            ) : (
              <div className="h-40 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
