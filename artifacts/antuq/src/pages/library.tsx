import { useEffect } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { useLocation, Link } from "wouter";
import { BookOpen, Headphones, Paperclip, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const sections = [
  {
    key: "read",
    title: "قراءة القصص",
    description: "اقرأ قصصاً عربية جميلة مع أسئلة فهم",
    icon: BookOpen,
    color: "bg-primary/15 text-primary",
  },
  {
    key: "audio",
    title: "القصص المسموعة",
    description: "استمع إلى قصص شيقة و أجب على الأسئلة",
    icon: Headphones,
    color: "bg-accent/15 text-accent",
  },
  {
    key: "attachment",
    title: "الملحقات التعليمية",
    description: "اختصارات و ملفات تعليمية مفيدة",
    icon: Paperclip,
    color: "bg-secondary/20 text-secondary-foreground",
  },
];

export default function Library() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) return;
    if (!isAuthenticated) setLocation("/");
  }, [isLoading, isAuthenticated, setLocation]);

  if (!isLoading || !isAuthenticated) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background p-4 md:p-8" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setLocation("/portal")}>
            ← العودة
          </Button>
          <h1 className="text-2xl md:text-3xl font-black text-foreground">مكتبة القراءة</h1>
        </div>

        <p className="text-muted-foreground font-medium">
          اختر نوع المحتوى الذي تريد استكشافه اليوم.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Link key={section.key} href={`/library/${section.key}`}>
                <Card className="cursor-pointer transition-transform hover:scale-[1.02] hover:shadow-md h-full">
                  <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${section.color}`}>
                      <Icon className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="font-black text-foreground text-lg">{section.title}</h2>
                      <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-sm font-bold text-primary mt-auto">
                      ابدأ <ArrowRight className="w-4 h-4" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
