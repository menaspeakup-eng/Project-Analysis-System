import { useEffect, useState } from "react";
import { useAuth, useUser, useClerk } from "@clerk/react";
import { useLocation } from "wouter";
import { useGetStudentProfile } from "@workspace/api-client-react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import avatarMascot from "@assets/generated_images/avatar-mascot.png";

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

export default function Portal() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();

  const isGuest = localStorage.getItem("antuq-guest") === "true";
  const [avatarFailed, setAvatarFailed] = useState(false);

  const { data: profile, isLoading: isProfileLoading } = useGetStudentProfile({
    query: { enabled: !!isSignedIn } as never,
  });

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
          <div className="relative shrink-0">
            <div className="w-32 h-32 md:w-36 md:h-36 rounded-full bg-gradient-to-b from-primary/10 to-accent/10 flex items-center justify-center border-4 border-white shadow-lg overflow-hidden">
              <img src={avatarMascot} alt="شخصية الطالب" className="w-full h-full object-cover" />
            </div>
            <span className="absolute -bottom-1 -left-1 bg-accent text-white text-xs font-black px-2.5 py-1 rounded-full shadow-md border-2 border-white">
              المستوى {level}
            </span>
          </div>

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
                <span className="text-secondary-foreground flex items-center gap-1">
                  <Sparkles className="w-4 h-4" /> تخصيص الشخصية (قريباً)
                </span>
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

        {/* Daily challenge */}
        <section className="bg-gradient-to-l from-accent/10 to-primary/10 rounded-3xl border border-accent/20 p-6 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-accent text-white flex items-center justify-center shrink-0">
            <Flame className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <h3 className="font-black text-foreground text-lg">التحدي اليومي</h3>
            <p className="text-muted-foreground font-medium text-sm">
              نجهز لك تحدياً جديداً كل يوم لكسب نقاط ومكافآت إضافية.
            </p>
          </div>
          <span className="text-xs font-bold text-accent bg-white px-3 py-1.5 rounded-full border border-accent/20 shrink-0">
            قريباً
          </span>
        </section>

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
            <ComingSoonCard icon={Users} label="لوحة المتصدرين" colorClass="bg-secondary/20 text-secondary-foreground" />
            <ComingSoonCard icon={MessageCircle} label="الشات العام" colorClass="bg-[hsl(180,60%,90%)] text-[hsl(180,60%,35%)]" />
          </div>
        </section>
      </main>

      {/* Background decorations */}
      <div className="absolute top-[10%] right-[5%] w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[10%] left-[5%] w-80 h-80 bg-accent/10 rounded-full blur-3xl pointer-events-none"></div>
    </div>
  );
}
