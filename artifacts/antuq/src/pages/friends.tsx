import { Link } from "wouter";
import { useAuth } from "@clerk/react";
import { useGetClassmates } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar3D } from "@/components/Avatar3D";
import { AVATAR_GENDERS, avatarAccessoryEmojis, avatarFrameClass } from "@/lib/avatarPresets";
import type { Classmate } from "@workspace/api-client-react";
import { ArrowRight, Users, Loader2 } from "lucide-react";

function ClassmateAvatar({ config }: { config: { bgColor: string; gender: string; accessories: string[]; pet: string; frame: string } }) {
  return (
    <div className="relative">
      <Avatar3D
        bgColor={config.bgColor}
        gender={config.gender}
        accessory={config.accessories[0] ?? "none"}
        pet={config.pet}
        frontView
        className={`w-16 h-16 rounded-2xl ${avatarFrameClass(config.frame)}`}
      />
      <span className="absolute -bottom-1 -right-1 text-lg" aria-hidden="true">
        {AVATAR_GENDERS[config.gender]?.emoji ?? AVATAR_GENDERS.male.emoji}
      </span>
    </div>
  );
}

function ClassmateCard({ student }: { student: Classmate }) {
  const config = {
    bgColor: (student.avatarConfig?.bgColor as string) || "orange",
    gender: (student.avatarConfig?.gender as string) || "male",
    accessories: (student.avatarConfig?.accessories as string[]) || [],
    pet: (student.avatarConfig?.pet as string) || "none",
    frame: (student.avatarConfig?.frame as string) || "none",
  };
  const emojis = avatarAccessoryEmojis(config.accessories);

  return (
    <Card className="rounded-3xl border-border shadow-sm overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0">
            <ClassmateAvatar config={config} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-foreground truncate">{student.name}</p>
            <p className="text-sm text-muted-foreground font-medium">{student.points} نقطة</p>
            {emojis.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">{emojis.join(" ")}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Friends() {
  const { isSignedIn } = useAuth();
  const { data: classmatesData, isLoading: isClassmatesLoading } = useGetClassmates({ query: { enabled: !!isSignedIn } as never });
  const classmates = classmatesData?.classmates ?? [];

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-20 bg-white/80 dark:bg-black/60 backdrop-blur-md border-b border-border">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/portal" className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors">
              <ArrowRight className="w-5 h-5 rotate-180" />
            </Link>
            <h1 className="text-lg font-black text-foreground">زملائي في الصف</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <Card className="rounded-3xl border-border shadow-sm overflow-hidden bg-gradient-to-l from-[hsl(335,75%,94%)] to-white">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/80 flex items-center justify-center text-[hsl(335,75%,50%)] shadow-sm">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground">زملاؤك في الصف</h2>
              <p className="text-sm text-muted-foreground font-medium">تعرف على زملائك وإنجازاتهم.</p>
            </div>
          </CardContent>
        </Card>

        {isClassmatesLoading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : classmates.length === 0 ? (
          <Card className="rounded-3xl border-border shadow-sm">
            <CardContent className="p-8 text-center text-muted-foreground font-medium">
              <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
              لا يوجد زملاء في الصف حالياً.
            </CardContent>
          </Card>
        ) : (
          <section className="space-y-3">
            <h3 className="font-black text-foreground text-lg">زملائي</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {classmates.map((classmate) => (
                <ClassmateCard key={classmate.id} student={classmate} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
