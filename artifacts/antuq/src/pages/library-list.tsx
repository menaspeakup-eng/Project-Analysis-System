import { useEffect, useState } from "react";
import { useAuth } from "@clerk/react";
import { useLocation, Link } from "wouter";
import { BookOpen, Headphones, Paperclip, ArrowRight, Star, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useListClassLibraryItems } from "@workspace/api-client-react";

const typeLabels: Record<string, string> = {
  read: "قراءة القصص",
  audio: "القصص المسموعة",
  attachment: "الملحقات التعليمية",
};

export default function LibraryList() {
  const { isSignedIn, isLoaded } = useAuth();
  const [location, setLocation] = useLocation();
  const type = location.split("/").pop() || "read";
  const { data, isLoading } = useListClassLibraryItems({ type }, { query: { enabled: isLoaded && isSignedIn } as never });

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) setLocation("/");
  }, [isLoaded, isSignedIn, setLocation]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const items = data?.items ?? [];

  return (
    <div className="min-h-[100dvh] bg-background p-4 md:p-8" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setLocation("/library")}>
            ← العودة
          </Button>
          <h1 className="text-2xl md:text-3xl font-black text-foreground">{typeLabels[type] || type}</h1>
        </div>

        {isLoading ? (
          <div className="h-40 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground font-medium">لا يوجد محتوى متاح حالياً.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((item) => (
              <Link key={item.id} href={`/library-item/${item.id}`}>
                <Card className="cursor-pointer transition-transform hover:scale-[1.02] hover:shadow-md h-full overflow-hidden">
                  <div className="flex h-full">
                    {item.coverUrl ? (
                      <div className="w-32 shrink-0 bg-muted">
                        <img src={item.coverUrl} alt={item.title} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-32 shrink-0 bg-muted flex items-center justify-center">
                        {type === "read" && <BookOpen className="w-8 h-8 text-muted-foreground" />}
                        {type === "audio" && <Headphones className="w-8 h-8 text-muted-foreground" />}
                        {type === "attachment" && <Paperclip className="w-8 h-8 text-muted-foreground" />}
                      </div>
                    )}
                    <CardContent className="p-4 flex-1 flex flex-col">
                      <div className="flex-1">
                        <h2 className="font-black text-foreground text-lg">{item.title}</h2>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {item.questionCount ? (
                          <Badge variant="secondary" className="font-bold">
                            <Star className="w-3 h-3 ml-1" />
                            {item.totalPoints} نقطة
                          </Badge>
                        ) : null}
                        <span className="inline-flex items-center gap-1 text-sm font-bold text-primary">
                          ابدأ <ArrowRight className="w-4 h-4" />
                        </span>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
