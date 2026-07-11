import { useState } from "react";
import { useAuth, useUser, useClerk } from "@clerk/react";
import { useLocation, Link } from "wouter";
import { useEffect } from "react";
import {
  useGetStudentProfile,
  useGetDailyChallenge,
  useCompleteDailyChallenge,
  useGetLeaderboard,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  LogOut,
  User as UserIcon,
  Star,
  Play,
  Trophy,
  Flame,
  BookOpen,
  Users,
  MessageCircle,
  Sparkles,
  Check,
  Loader2,
  Crown,
  Wand2,
  Settings,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar3D } from "@/components/Avatar3D";
import { avatarBgStyle, avatarAccessoryEmojis, AVATAR_GENDERS } from "@/lib/avatarPresets";

const POINTS_PER_LEVEL = 100;

function ComingSoonCard({
  icon: Icon,
  label,
  colorClass,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  colorClass: string;
}) {
  return (
    <div className="bg-white p-5 rounded-3xl shadow-sm border border-border flex flex-col items-center gap-3 text-center opacity-70 cursor-not-allowed relative">
      <span className="absolute top-3 left-3 text-[11px] font-bold text-muted-foreground bg-background px-2 py-0.5 rounded-full border border-border">
        قريباً
      </span>
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${colorClass}`}>
        <Icon className="w-7 h-7" />
      </div>
      <span className="font-bold text-foreground">{label}</span>
    </div>
  );
}

function LeaderboardRow({
  rank,
  name,
  points,
  avatarConfig,
  isMe,
  detached,
}: {
  rank: number;
  name: string;
  points: number;
  avatarConfig: { bgColor: string; accessories: string[]; gender: string };
  isMe: boolean;
  detached?: boolean;
}) {
  const emojis = avatarAccessoryEmojis(avatarConfig.accessories);
  const personEmoji = AVATAR_GENDERS[avatarConfig.gender]?.emoji ?? AVATAR_GENDERS.male.emoji;
  const medalColors: Record<number, string> = {
    1: "text-secondary-foreground bg-secondary/30",
    2: "text-[hsl(200,15%,45%)] bg-[hsl(200,15%,90%)]",
    3: "text-[hsl(25,60%,45%)] bg-[hsl(25,60%,90%)]",
  };

  return (
    <div
      className={`flex items-center gap-3 p-2.5 rounded-2xl ${
        isMe ? "bg-primary/10 border border-primary/30" : ""
      } ${detached ? "mt-2 border-t border-border pt-3" : ""}`}
      data-testid={`row-leaderboard-${rank}`}
    >
      <span
        className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-black ${
          medalColors[rank] ?? "text-muted-foreground bg-muted"
        }`}
      >
        {rank <= 3 ? <Crown className="w-4 h-4" /> : rank}
      </span>
      <div
        className="w-9 h-9 rounded-xl shrink-0 border-2 border-white shadow-sm relative flex items-center justify-center"
        style={avatarBgStyle(avatarConfig.bgColor)}
      >
        <span className="text-lg" aria-hidden="true">
          {personEmoji}
        </span>
        {emojis.length > 0 && (
          <div className="absolute -top-1.5 -right-1.5 h-3.5" aria-hidden="true">
            {emojis.slice(0, 3).map((emoji, i) => (
              <span
                key={i}
                className="absolute top-0 w-3.5 h-3.5 rounded-full bg-white border border-white shadow-sm flex items-center justify-center text-[8px] leading-none"
                style={{ right: `${i * 6}px`, zIndex: 3 - i }}
              >
                {emoji}
              </span>
            ))}
            {emojis.length > 3 && (
              <span
                className="absolute top-0 w-3.5 h-3.5 rounded-full bg-muted border border-white shadow-sm flex items-center justify-center text-[7px] leading-none font-black text-muted-foreground"
                style={{ right: "18px", zIndex: 0 }}
              >
                +{emojis.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
      <span className={`flex-1 font-bold truncate ${isMe ? "text-primary" : "text-foreground"}`}>
        {name} {isMe && "(أنت)"}
      </span>
      <span className="flex items-center gap-1 text-sm font-black text-secondary-foreground shrink-0">
        <Star className="w-3.5 h-3.5 fill-secondary text-secondary" />
        {points}
      </span>
    </div>
  );
}

export default function Portal() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const isGuest = localStorage.getItem("antuq-guest") === "true";
  const [avatarFailed, setAvatarFailed] = useState(false);

  const { data: profile, isLoading: isProfileLoading } = useGetStudentProfile({
    query: { enabled: !!isSignedIn } as never,
  });

  const { data: challenge, isLoading: isChallengeLoading } = useGetDailyChallenge({
    query: { enabled: !!isSignedIn } as never,
  });

  const { mutate: completeChallenge, isPending: isCompletingChallenge } =
    useCompleteDailyChallenge();

  const { data: leaderboard, isLoading: isLeaderboardLoading } = useGetLeaderboard();

  // Google sometimes populates fullName without splitting it into first/last name,
  // so fall back through fullName before the generic placeholder.
  const displayName = isGuest
    ? "الزائر الصغير"
    : profile?.name || user?.firstName || user?.fullName || "صديقنا البطل";

  // Guests have no account, so there's nowhere to persist points yet — they always start at 0.
  const points = isGuest ? 0 : profile?.points ?? 0;
  const levelProgress = points % POINTS_PER_LEVEL;
  const level = Math.floor(points / POINTS_PER_LEVEL) + 1;
  const progressPercent = (levelProgress / POINTS_PER_LEVEL) * 100;
  const avatarConfig = profile?.avatarConfig ?? {
    bgColor: "orange",
    accessories: [],
    gender: "male",
    pet: "none",
  };

  useEffect(() => {
    if (isLoaded && !isSignedIn && !isGuest) {
      setLocation("/");
    }
  }, [isLoaded, isSignedIn, isGuest, setLocation]);

  if (!isLoaded || (!isSignedIn && !isGuest) || (isSignedIn && isProfileLoading)) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
      </div>
    );
  }

  const handleLogout = async () => {
    if (isGuest) {
      localStorage.removeItem("antuq-guest");
      setLocation("/");
    } else {
      await signOut({ redirectUrl: "/" });
    }
  };

  const handleCompleteChallenge = () => {
    if (isGuest || !challenge || challenge.completed) return;
    completeChallenge(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/student/daily-challenge"] });
        queryClient.invalidateQueries({ queryKey: ["/api/student/me"] });
        queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"] });
      },
    });
  };

  return (
    <div className="min-h-[100dvh] bg-background relative overflow-hidden flex flex-col selection:bg-primary/20">
      {/* Top Nav */}
      <header className="w-full p-4 md:px-8 flex justify-between items-center bg-white/80 backdrop-blur-md border-b border-border z-10 sticky top-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary overflow-hidden shrink-0">
            {isSignedIn && user?.imageUrl && !avatarFailed ? (
              <img
                src={user.imageUrl}
                alt={displayName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={() => setAvatarFailed(true)}
              />
            ) : (
              <UserIcon className="w-6 h-6" />
            )}
          </div>
          <div>
            <h2 className="font-bold text-foreground text-lg leading-tight">{displayName}</h2>
            <div className="flex items-center gap-1 text-sm text-secondary-foreground font-bold">
              <Star className="w-4 h-4 fill-secondary text-secondary" />
              <span>{points} نقطة</span>
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5 ml-2" />
          <span className="font-bold hidden sm:inline">خروج</span>
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-8 relative z-10 space-y-8">
        {/* Hero: avatar + points progress + continue learning */}
        <section className="bg-white rounded-3xl shadow-sm border border-border p-6 md:p-8 flex flex-col md:flex-row items-center gap-8">
          <Link
            href="/character"
            data-testid="link-edit-character"
            aria-label="تعديل الشخصية"
            className="relative shrink-0 group cursor-pointer block"
          >
            <Avatar3D
              bgColor={avatarConfig.bgColor}
              gender={avatarConfig.gender}
              accessory={avatarConfig.accessories[0] ?? "none"}
              pet={avatarConfig.pet}
              className="w-32 h-32 md:w-36 md:h-36 rounded-2xl border-4 border-white shadow-lg transition-transform group-hover:scale-105"
            />
            <span className="absolute -bottom-1 -left-1 bg-accent text-white text-xs font-black px-2.5 py-1 rounded-full shadow-md border-2 border-white">
              المستوى {level}
            </span>
            <span className="absolute -top-1 -right-1 bg-white text-primary rounded-full p-1.5 shadow-md border-2 border-primary/20 opacity-0 group-hover:opacity-100 transition-opacity">
              <Wand2 className="w-3.5 h-3.5" />
            </span>
          </Link>

          <div className="flex-1 w-full text-center md:text-right space-y-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-foreground">
                أهلاً {displayName}! 👋
              </h1>
              <p className="text-muted-foreground font-medium mt-1">
                واصل جمع النقاط لترقية شخصيتك وفتح مكافآت جديدة.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-sm font-bold text-muted-foreground">
                <span>{levelProgress} / {POINTS_PER_LEVEL} نقطة للمستوى التالي</span>
                <Link
                  href="/character"
                  className="text-secondary-foreground flex items-center gap-1 hover:underline"
                  data-testid="link-customize-character"
                >
                  <Sparkles className="w-4 h-4" /> تخصيص الشخصية
                </Link>
              </div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-l from-primary to-accent rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <Button
              size="lg"
              disabled
              className="w-full sm:w-auto h-13 px-8 rounded-xl bg-primary/40 text-white font-bold cursor-not-allowed"
            >
              <Play className="w-5 h-5 ml-2" />
              متابعة التعلم
              <span className="mr-2 text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">قريباً</span>
            </Button>
          </div>
        </section>

        {/* Daily challenge + Leaderboard side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Daily challenge */}
          <section className="bg-gradient-to-l from-accent/10 to-primary/10 rounded-3xl border border-accent/20 p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-accent text-white flex items-center justify-center shrink-0">
                <Flame className="w-6 h-6" />
              </div>
              <h3 className="font-black text-foreground text-lg">التحدي اليومي</h3>
              {challenge?.completed && (
                <span className="mr-auto flex items-center gap-1 text-xs font-bold text-white bg-[hsl(150,55%,45%)] px-3 py-1 rounded-full">
                  <Check className="w-3.5 h-3.5" /> مكتمل
                </span>
              )}
            </div>

            {isGuest ? (
              <p className="text-muted-foreground font-medium text-sm">
                سجّل الدخول لخوض التحدي اليومي وكسب النقاط.
              </p>
            ) : isChallengeLoading || !challenge ? (
              <div className="h-16 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div>
                  <h4 className="font-bold text-foreground">{challenge.title}</h4>
                  <p className="text-muted-foreground font-medium text-sm mt-1">
                    {challenge.description}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 mt-auto">
                  <span className="text-xs font-bold text-accent bg-white px-3 py-1.5 rounded-full border border-accent/20 shrink-0 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-secondary text-secondary" />
                    {challenge.pointsReward} نقطة
                  </span>
                  <Button
                    size="sm"
                    disabled={challenge.completed || isCompletingChallenge}
                    onClick={handleCompleteChallenge}
                    data-testid="button-complete-challenge"
                    className="rounded-xl bg-accent hover:bg-accent/90 text-white font-bold disabled:opacity-60"
                  >
                    {isCompletingChallenge ? (
                      <Loader2 className="w-4 h-4 ml-1.5 animate-spin" />
                    ) : challenge.completed ? (
                      <Check className="w-4 h-4 ml-1.5" />
                    ) : null}
                    {challenge.completed ? "أنجزت التحدي" : "أكملت التحدي"}
                  </Button>
                </div>
              </>
            )}
          </section>

          {/* Leaderboard */}
          <section className="bg-white rounded-3xl shadow-sm border border-border p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-secondary/20 text-secondary-foreground flex items-center justify-center shrink-0">
                <Trophy className="w-6 h-6" />
              </div>
              <h3 className="font-black text-foreground text-lg">لوحة المتصدرين</h3>
            </div>

            {isLeaderboardLoading || !leaderboard ? (
              <div className="h-24 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : leaderboard.top.length === 0 ? (
              <p className="text-muted-foreground font-medium text-sm">
                لا يوجد طلاب حتى الآن — كن أول المتصدرين!
              </p>
            ) : (
              <div className="space-y-1">
                {leaderboard.top.map((entry) => (
                  <LeaderboardRow key={entry.rank} {...entry} />
                ))}
                {leaderboard.me && <LeaderboardRow {...leaderboard.me} detached />}
              </div>
            )}
          </section>
        </div>

        {/* Latest achievements */}
        <section className="bg-white rounded-3xl shadow-sm border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-foreground text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-secondary-foreground" />
              أحدث الإنجازات
            </h3>
            <span className="text-xs font-bold text-muted-foreground bg-background px-3 py-1 rounded-full border border-border">
              قريباً
            </span>
          </div>
          <p className="text-muted-foreground font-medium text-sm">
            أنجز دروسك وألعابك الأولى لتبدأ بجمع الإنجازات هنا.
          </p>
        </section>

        {/* Shortcuts grid */}
        <section>
          <h3 className="font-black text-foreground text-lg mb-4">استكشف انطق</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ComingSoonCard icon={Play} label="الألعاب التعليمية" colorClass="bg-accent/15 text-accent" />
            <ComingSoonCard icon={BookOpen} label="المكتبة" colorClass="bg-primary/15 text-primary" />
            <ComingSoonCard icon={Award} label="جميع الإنجازات" colorClass="bg-secondary/20 text-secondary-foreground" />
            <ComingSoonCard icon={MessageCircle} label="الشات العام" colorClass="bg-[hsl(180,60%,90%)] text-[hsl(180,60%,35%)]" />
            <ComingSoonCard icon={Sparkles} label="ورشة القصص بالذكاء الاصطناعي" colorClass="bg-[hsl(265,60%,92%)] text-[hsl(265,60%,45%)]" />
            <ComingSoonCard icon={Users} label="الأصدقاء" colorClass="bg-[hsl(335,75%,94%)] text-[hsl(335,75%,50%)]" />
            <ComingSoonCard icon={Settings} label="الإعدادات" colorClass="bg-muted text-muted-foreground" />
          </div>
        </section>
      </main>

      {/* Background decorations */}
      <div className="absolute top-[10%] right-[5%] w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[10%] left-[5%] w-80 h-80 bg-accent/10 rounded-full blur-3xl pointer-events-none"></div>
    </div>
  );
}
