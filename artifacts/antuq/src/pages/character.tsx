import { useEffect, useState } from "react";
import { useAuth } from "@clerk/react";
import { useLocation } from "wouter";
import {
  useGetStudentProfile,
  useUpdateStudentAvatar,
} from "@workspace/api-client-react";
import { ArrowRight, Check, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar3D } from "@/components/Avatar3D";
import {
  AVATAR_BG_COLORS,
  AVATAR_GENDERS,
  AVATAR_ACCESSORIES,
  AVATAR_PETS,
  avatarBgStyle,
  levelForPoints,
  isAccessoryUnlocked,
  isPetUnlocked,
} from "@/lib/avatarPresets";

export default function CharacterEdit() {
  const { isSignedIn, isLoaded } = useAuth();
  const [, setLocation] = useLocation();
  const isGuest = localStorage.getItem("antuq-guest") === "true";

  const { data: profile, isLoading: isProfileLoading } = useGetStudentProfile({
    query: { enabled: !!isSignedIn } as never,
  });

  const [bgColor, setBgColor] = useState("orange");
  const [gender, setGender] = useState("male");
  const [accessory, setAccessory] = useState("none");
  const [pet, setPet] = useState("none");
  const [saved, setSaved] = useState(false);

  // Guests have no account, so there's nowhere to persist points yet — they always start at 0.
  const points = isGuest ? 0 : profile?.points ?? 0;
  const level = levelForPoints(points);

  useEffect(() => {
    if (profile?.avatarConfig) {
      setBgColor(profile.avatarConfig.bgColor);
      setGender(profile.avatarConfig.gender);
      setAccessory(profile.avatarConfig.accessory);
      setPet(profile.avatarConfig.pet);
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
      { data: { bgColor, gender: gender as "male" | "female", accessory, pet } },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setLocation("/portal"), 700);
        },
      },
    );
  };

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
            سجّل الدخول لحفظ شكل شخصيتك ولفتح إكسسوارات وحيوانات أليفة مع تقدمك.
          </div>
        )}

        {/* Preview */}
        <section className="flex flex-col items-center gap-4">
          <Avatar3D
            bgColor={bgColor}
            gender={gender}
            accessory={accessory}
            pet={pet}
            interactive
            className="w-56 h-56 md:w-64 md:h-64 rounded-3xl border-4 border-white shadow-lg"
          />
          <p className="text-muted-foreground font-medium text-sm">اسحب لتدوير شخصيتك — هكذا ستظهر في الصفحة الرئيسية</p>
        </section>

        {/* Gender picker */}
        <section className="bg-white rounded-3xl shadow-sm border border-border p-6">
          <h3 className="font-black text-foreground mb-4">شخصيتك</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(AVATAR_GENDERS).map(([key, preset]) => (
              <button
                key={key}
                type="button"
                onClick={() => setGender(key)}
                data-testid={`button-gender-${key}`}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl border-2 transition-all ${
                  gender === key ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <span className="text-2xl">{preset.emoji}</span>
                <span className={`text-sm font-bold ${gender === key ? "text-primary" : "text-muted-foreground"}`}>
                  {preset.label}
                </span>
              </button>
            ))}
          </div>
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
                className="flex flex-col items-center gap-2 group"
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
            {Object.entries(AVATAR_ACCESSORIES).map(([key, preset]) => {
              const unlocked = isAccessoryUnlocked(key, level);
              return (
                <button
                  key={key}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => unlocked && setAccessory(key)}
                  data-testid={`button-accessory-${key}`}
                  className={`relative flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl border-2 transition-all ${
                    !unlocked
                      ? "border-border opacity-50 cursor-not-allowed"
                      : accessory === key
                        ? "border-primary bg-primary/5"
                        : "border-border"
                  }`}
                >
                  {!unlocked && (
                    <span className="absolute -top-1.5 -left-1.5 bg-muted rounded-full p-1 border border-border">
                      <Lock className="w-3 h-3 text-muted-foreground" />
                    </span>
                  )}
                  <span className="text-2xl">{preset.emoji ?? "🚫"}</span>
                  <span
                    className={`text-xs font-bold ${
                      !unlocked ? "text-muted-foreground" : accessory === key ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {preset.label}
                  </span>
                  {!unlocked && (
                    <span className="text-[10px] font-bold text-muted-foreground">
                      يُفتح بالمستوى {preset.unlockLevel}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Pet picker */}
        <section className="bg-white rounded-3xl shadow-sm border border-border p-6">
          <h3 className="font-black text-foreground mb-4">الحيوان الأليف</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(AVATAR_PETS).map(([key, preset]) => {
              const unlocked = isPetUnlocked(key, level);
              return (
                <button
                  key={key}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => unlocked && setPet(key)}
                  data-testid={`button-pet-${key}`}
                  className={`relative flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl border-2 transition-all ${
                    !unlocked
                      ? "border-border opacity-50 cursor-not-allowed"
                      : pet === key
                        ? "border-primary bg-primary/5"
                        : "border-border"
                  }`}
                >
                  {!unlocked && (
                    <span className="absolute -top-1.5 -left-1.5 bg-muted rounded-full p-1 border border-border">
                      <Lock className="w-3 h-3 text-muted-foreground" />
                    </span>
                  )}
                  <span className="text-2xl">{preset.emoji ?? "🚫"}</span>
                  <span
                    className={`text-xs font-bold ${
                      !unlocked ? "text-muted-foreground" : pet === key ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {preset.label}
                  </span>
                  {!unlocked && (
                    <span className="text-[10px] font-bold text-muted-foreground">
                      يُفتح بالمستوى {preset.unlockLevel}
                    </span>
                  )}
                </button>
              );
            })}
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
