import { useEffect, useState } from "react";
import { useAuth } from "@clerk/react";
import { useLocation } from "wouter";
import {
  useGetStudentProfile,
  useUpdateStudentAvatar,
} from "@workspace/api-client-react";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import avatarMascot from "@assets/generated_images/avatar-mascot.png";
import {
  AVATAR_BG_COLORS,
  AVATAR_ACCESSORIES,
  avatarBgStyle,
  avatarAccessoryEmoji,
} from "@/lib/avatarPresets";

export default function CharacterEdit() {
  const { isSignedIn, isLoaded } = useAuth();
  const [, setLocation] = useLocation();
  const isGuest = localStorage.getItem("antuq-guest") === "true";

  const { data: profile, isLoading: isProfileLoading } = useGetStudentProfile({
    query: { enabled: !!isSignedIn } as never,
  });

  const [bgColor, setBgColor] = useState("orange");
  const [accessory, setAccessory] = useState("none");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile?.avatarConfig) {
      setBgColor(profile.avatarConfig.bgColor);
      setAccessory(profile.avatarConfig.accessory);
    }
  }, [profile?.avatarConfig]);

  const { mutate: updateAvatar, isPending: isSaving } = useUpdateStudentAvatar();

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

  const handleSave = () => {
    if (isGuest) {
      setLocation("/portal");
      return;
    }
    updateAvatar(
      { data: { bgColor, accessory } },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setLocation("/portal"), 700);
        },
      },
    );
  };

  const accessoryEmoji = avatarAccessoryEmoji(accessory);

  return (
    <div className="min-h-[100dvh] bg-background relative overflow-hidden flex flex-col selection:bg-primary/20">
      <header className="w-full p-4 md:px-8 flex items-center gap-3 bg-white/80 backdrop-blur-md border-b border-border z-10 sticky top-0">
        <Button
          variant="ghost"
          className="rounded-xl text-muted-foreground hover:text-foreground"
          onClick={() => setLocation("/portal")}
          data-testid="button-back-to-portal"
        >
          <ArrowRight className="w-5 h-5 ml-1" />
          رجوع
        </Button>
        <h1 className="font-black text-foreground text-lg">تعديل الشخصية</h1>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto p-4 md:p-8 relative z-10 space-y-8">
        {isGuest && (
          <div className="bg-secondary/10 border border-secondary/30 rounded-2xl p-4 text-sm font-bold text-secondary-foreground text-center">
            سجّل الدخول لحفظ شكل شخصيتك بشكل دائم.
          </div>
        )}

        {/* Preview */}
        <section className="flex flex-col items-center gap-4">
          <div
            className="w-40 h-40 md:w-48 md:h-48 rounded-full flex items-center justify-center border-4 border-white shadow-lg overflow-hidden relative"
            style={avatarBgStyle(bgColor)}
          >
            <img src={avatarMascot} alt="معاينة الشخصية" className="w-full h-full object-cover" />
            {accessoryEmoji && (
              <span className="absolute top-2 text-4xl md:text-5xl drop-shadow" aria-hidden="true">
                {accessoryEmoji}
              </span>
            )}
          </div>
          <p className="text-muted-foreground font-medium text-sm">هكذا ستبدو شخصيتك في الصفحة الرئيسية</p>
        </section>

        {/* Background color picker */}
        <section className="bg-white rounded-3xl shadow-sm border border-border p-6">
          <h3 className="font-black text-foreground mb-4">لون الخلفية</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(AVATAR_BG_COLORS).map(([key, preset]) => (
              <button
                key={key}
                type="button"
                onClick={() => setBgColor(key)}
                data-testid={`button-bgcolor-${key}`}
                className={`flex flex-col items-center gap-2 group ${bgColor === key ? "" : ""}`}
              >
                <span
                  className={`w-12 h-12 rounded-full border-4 transition-all ${
                    bgColor === key ? "border-primary scale-110" : "border-white"
                  } shadow-sm`}
                  style={avatarBgStyle(key)}
                />
                <span className={`text-xs font-bold ${bgColor === key ? "text-primary" : "text-muted-foreground"}`}>
                  {preset.label}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Accessory picker */}
        <section className="bg-white rounded-3xl shadow-sm border border-border p-6">
          <h3 className="font-black text-foreground mb-4">الإكسسوار</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(AVATAR_ACCESSORIES).map(([key, preset]) => (
              <button
                key={key}
                type="button"
                onClick={() => setAccessory(key)}
                data-testid={`button-accessory-${key}`}
                className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl border-2 transition-all ${
                  accessory === key ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <span className="text-2xl">{preset.emoji ?? "🚫"}</span>
                <span className={`text-xs font-bold ${accessory === key ? "text-primary" : "text-muted-foreground"}`}>
                  {preset.label}
                </span>
              </button>
            ))}
          </div>
        </section>

        <Button
          size="lg"
          onClick={handleSave}
          disabled={isSaving}
          className="w-full h-13 rounded-xl bg-primary text-white font-bold"
          data-testid="button-save-avatar"
        >
          {isSaving ? (
            <Loader2 className="w-5 h-5 ml-2 animate-spin" />
          ) : saved ? (
            <Check className="w-5 h-5 ml-2" />
          ) : null}
          {saved ? "تم الحفظ!" : "حفظ الشخصية"}
        </Button>
      </main>
    </div>
  );
}
