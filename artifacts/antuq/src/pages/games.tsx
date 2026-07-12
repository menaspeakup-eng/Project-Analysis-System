import { useLocation } from "wouter";
import { useGetGames } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gamepad2, Lock, Star, ArrowRight, Check } from "lucide-react";
import type { GameType } from "@/lib/gameTypes";

const GAME_TYPE_LABELS: Record<GameType, string> = {
  "match-sentence-picture": "طابق الجملة بالصورة",
  "arrange-sentence": "رتب الجملة",
  "choose-picture": "اختر الصورة الصحيحة",
  "choose-sentence": "اختر الجملة الصحيحة",
  "complete-sentence": "أكمل الجملة",
  "arrange-sentences": "ترتيب الجمل",
};

const GAME_TYPE_IMAGES: Record<GameType, string> = {
  "match-sentence-picture": "https://cdn-icons-png.flaticon.com/512/3062/3062320.png",
  "arrange-sentence": "https://cdn-icons-png.flaticon.com/512/2922/2922506.png",
  "choose-picture": "https://cdn-icons-png.flaticon.com/512/3659/3659898.png",
  "choose-sentence": "https://cdn-icons-png.flaticon.com/512/2913/2913360.png",
  "complete-sentence": "https://cdn-icons-png.flaticon.com/512/3659/3659898.png",
  "arrange-sentences": "https://cdn-icons-png.flaticon.com/512/2922/2922506.png",
};

export default function Games() {
  const [, setLocation] = useLocation();
  const { data, isLoading } = useGetGames({ query: { enabled: true } as never });

  const games = data?.games ?? [];

  return (
    <div className="min-h-[100dvh] bg-background p-4 md:p-8" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-black text-2xl text-foreground flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-accent text-white flex items-center justify-center">
              <Gamepad2 className="w-6 h-6" />
            </div>
            الألعاب التعليمية
          </h1>
          <Button
            variant="outline"
            className="rounded-xl font-bold h-10 border-border"
            onClick={() => setLocation("/portal")}
          >
            <ArrowRight className="w-4 h-4 ml-1" />
            رجوع
          </Button>
        </div>

        {isLoading ? (
          <div className="h-32 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
        ) : games.length === 0 ? (
          <Card className="rounded-3xl border-border shadow-sm">
            <CardContent className="p-8 text-center text-muted-foreground font-medium">
              لا توجد ألعاب مفعلة حالياً.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {games.map((game) => (
              <Card
                key={game.id}
                className={`rounded-3xl border-border shadow-sm overflow-hidden transition-all ${
                  game.isLocked ? "opacity-70" : "hover:shadow-md"
                }`}
              >
                <div className="h-36 bg-gradient-to-l from-primary/10 to-accent/10 flex items-center justify-center overflow-hidden">
                  <img
                    src={game.imageUrl || GAME_TYPE_IMAGES[game.type as GameType] || "https://cdn-icons-png.flaticon.com/512/3062/3062320.png"}
                    alt={game.name}
                    className="h-24 w-24 object-contain drop-shadow-sm"
                  />
                </div>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-bold text-lg text-foreground">{game.name}</h2>
                    {game.isCompleted && (
                      <Badge className="rounded-full font-bold bg-[hsl(150,55%,45%)] text-white">
                        <Check className="w-3 h-3 ml-1" /> تم
                      </Badge>
                    )}
                    {game.isLocked && (
                      <Badge variant="outline" className="rounded-full font-bold border-border">
                        <Lock className="w-3 h-3 ml-1" /> مقفل
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground font-medium line-clamp-2">
                    {game.description || "لعبة تعليمية ممتعة لتعلم القراءة."}
                  </p>
                  <p className="text-xs font-bold text-primary/70">
                    {GAME_TYPE_LABELS[game.type as GameType] ?? game.type}
                  </p>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-accent bg-white px-3 py-1.5 rounded-full border border-accent/20 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-secondary text-secondary" />
                      {game.pointsReward} نقطة
                    </span>
                    <Button
                      size="sm"
                      className="rounded-xl font-bold h-9"
                      disabled={game.isLocked || game.isCompleted}
                      onClick={() => setLocation(`/games/${game.id}`)}
                    >
                      {game.isCompleted ? "أنجزتها" : game.isLocked ? "مقفل" : "العب"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
