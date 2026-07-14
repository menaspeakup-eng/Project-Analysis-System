import { Link } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { useGetActivityLogs } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, Trophy, BookOpen, Gamepad2, Star, CheckCircle, Users, Settings, Crown, Sparkles, LogIn, GraduationCap } from "lucide-react";

const activityIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  login: LogIn,
  name_change: Settings,
  email_change: Settings,
  avatar_change: Sparkles,
  story_complete: BookOpen,
  game_complete: Gamepad2,
  challenge_complete: CheckCircle,
  points_earned: Star,
  level_up: Crown,
  quiz_complete: CheckCircle,
  friend_added: Users,
  friend_accepted: Users,
  settings_updated: Settings,
  account_deleted: Settings,
};

const activityColors: Record<string, string> = {
  login: "bg-blue-100 text-blue-600",
  name_change: "bg-purple-100 text-purple-600",
  email_change: "bg-purple-100 text-purple-600",
  avatar_change: "bg-pink-100 text-pink-600",
  story_complete: "bg-emerald-100 text-emerald-600",
  game_complete: "bg-orange-100 text-orange-600",
  challenge_complete: "bg-teal-100 text-teal-600",
  points_earned: "bg-yellow-100 text-yellow-600",
  level_up: "bg-amber-100 text-amber-600",
  quiz_complete: "bg-indigo-100 text-indigo-600",
  friend_added: "bg-rose-100 text-rose-600",
  friend_accepted: "bg-rose-100 text-rose-600",
  settings_updated: "bg-gray-100 text-gray-600",
  account_deleted: "bg-red-100 text-red-600",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ar-SA", { dateStyle: "medium", timeStyle: "short" });
}

export default function Achievements() {
  const { isAuthenticated } = useAuth();
  const { data, isLoading } = useGetActivityLogs({ query: { enabled: !!isAuthenticated } as never });
  const logs = data?.logs ?? [];

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-20 bg-white/80 dark:bg-black/60 backdrop-blur-md border-b border-border">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/portal" className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors">
              <ArrowRight className="w-5 h-5 rotate-180" />
            </Link>
            <h1 className="text-lg font-black text-foreground">الإنجازات والنشاط</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <Card className="rounded-3xl border-border shadow-sm overflow-hidden bg-gradient-to-l from-secondary/20 to-primary/10">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/80 flex items-center justify-center text-secondary-foreground shadow-sm">
              <Trophy className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground">سجل نشاطك</h2>
              <p className="text-sm text-muted-foreground font-medium">كل ما يحدث في حسابك من إنجازات وتغييرات.</p>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : logs.length === 0 ? (
          <Card className="rounded-3xl border-border shadow-sm">
            <CardContent className="p-8 text-center text-muted-foreground font-medium">
              <GraduationCap className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
              لا يوجد نشاط مسجل بعد. ابدأ التعلم لتملأ هذا السجل!
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => {
              const Icon = activityIcons[log.type] ?? Sparkles;
              const color = activityColors[log.type] ?? "bg-muted text-muted-foreground";
              return (
                <Card key={log.id} className="rounded-3xl border-border shadow-sm">
                  <CardContent className="p-4 flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-foreground">{log.title}</p>
                        <Badge variant="outline" className="rounded-full text-xs font-medium shrink-0">
                          {formatDate(log.createdAt)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground font-medium mt-1">{log.description}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
