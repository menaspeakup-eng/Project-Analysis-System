import { useEffect, useState } from "react";
import { useAuth, useUser, useClerk } from "@clerk/react";
import { useLocation } from "wouter";
import { LogOut, User as UserIcon, Star, Play, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Portal() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();

  const isGuest = localStorage.getItem("antuq-guest") === "true";
  const [avatarFailed, setAvatarFailed] = useState(false);

  // Google sometimes populates fullName without splitting it into first/last name,
  // so fall back through fullName before the generic placeholder.
  const displayName = isGuest
    ? "الزائر الصغير"
    : user?.firstName || user?.fullName || "صديقنا البطل";

  useEffect(() => {
    if (isLoaded && !isSignedIn && !isGuest) {
      setLocation("/");
    }
  }, [isLoaded, isSignedIn, isGuest, setLocation]);

  if (!isLoaded || (!isSignedIn && !isGuest)) {
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
      <header className="w-full p-4 md:px-8 flex justify-between items-center bg-white/80 backdrop-blur-md border-b border-border z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary overflow-hidden">
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
            <h2 className="font-bold text-foreground text-lg">
              {displayName}
            </h2>
            <div className="flex items-center gap-1 text-sm text-secondary-foreground font-bold">
              <Star className="w-4 h-4 fill-secondary text-secondary" />
              <span>0 نقطة</span>
            </div>
          </div>
        </div>

        <Button variant="ghost" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl" onClick={handleLogout}>
          <LogOut className="w-5 h-5 ml-2" />
          <span className="font-bold">خروج</span>
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="w-32 h-32 mx-auto bg-white rounded-full shadow-xl flex items-center justify-center mb-4 border-4 border-primary/20">
             <img src="/logo.svg" alt="انطق" className="w-20 h-20" />
          </div>
          
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-black text-foreground">
              مرحباً بك في انطق!
            </h1>
            <p className="text-xl text-muted-foreground font-medium">
              رحلتك التعليمية الممتعة ستبدأ قريباً. نحن نجهز لك ألعاباً رائعة لتعلم القراءة والنطق.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8">
             <div className="bg-white p-6 rounded-3xl shadow-sm border border-border flex flex-col items-center gap-3 opacity-60 cursor-not-allowed">
               <div className="w-16 h-16 rounded-2xl bg-accent/20 text-accent flex items-center justify-center">
                 <Play className="w-8 h-8 ml-1" />
               </div>
               <span className="font-bold text-foreground text-lg">ابدأ اللعب<br/><span className="text-sm text-muted-foreground">(قريباً)</span></span>
             </div>
             <div className="bg-white p-6 rounded-3xl shadow-sm border border-border flex flex-col items-center gap-3 opacity-60 cursor-not-allowed">
               <div className="w-16 h-16 rounded-2xl bg-secondary/20 text-secondary-foreground flex items-center justify-center">
                 <Trophy className="w-8 h-8" />
               </div>
               <span className="font-bold text-foreground text-lg">المكافآت<br/><span className="text-sm text-muted-foreground">(قريباً)</span></span>
             </div>
          </div>
        </div>
      </main>

      {/* Background decorations */}
      <div className="absolute top-[20%] right-[10%] w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[20%] left-[10%] w-80 h-80 bg-accent/10 rounded-full blur-3xl pointer-events-none"></div>
    </div>
  );
}