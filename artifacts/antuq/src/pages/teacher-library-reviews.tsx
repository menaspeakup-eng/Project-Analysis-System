import { useEffect } from "react";
import { useAuth } from "@clerk/react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useListLibraryReviews, useReviewLibraryAnswer } from "@workspace/api-client-react";
import { Check, X, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function TeacherLibraryReviews() {
  const { isSignedIn, isLoaded } = useAuth();
  const [, setLocation] = useLocation();
  const { data, isLoading, refetch } = useListLibraryReviews({ query: { enabled: isLoaded && isSignedIn } as never });
  const review = useReviewLibraryAnswer();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) setLocation("/");
  }, [isLoaded, isSignedIn, setLocation]);

  const handleReview = async (answerId: number, status: "accepted" | "rejected") => {
    try {
      await review.mutateAsync({ id: answerId, data: { status } });
      toast.success(status === "accepted" ? "تم قبول الإجابة" : "تم رفض الإجابة");
      refetch();
    } catch (e) {
      toast.error("حدث خطأ أثناء التصحيح");
    }
  };

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const reviews = data?.reviews ?? [];

  return (
    <div className="min-h-[100dvh] bg-background p-4 md:p-8" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setLocation("/teacher/library")}>
              ← العودة
            </Button>
            <h1 className="text-2xl md:text-3xl font-black text-foreground">مراجعة الإجابات المقالية</h1>
          </div>
        </div>

        {isLoading ? (
          <div className="h-40 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
        ) : reviews.length === 0 ? (
          <p className="text-muted-foreground font-medium">لا توجد إجابات بانتظار المراجعة.</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => (
              <Card key={r.answerId}>
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="font-bold">{r.className}</Badge>
                      <span className="font-bold text-foreground">{r.studentName}</span>
                    </div>
                    <span className="text-sm text-muted-foreground font-medium">{r.itemTitle}</span>
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{r.question} <span className="text-sm text-muted-foreground">({r.points} نقطة)</span></p>
                    <p className="text-foreground mt-1 p-3 bg-muted/40 rounded-xl font-medium">{r.textAnswer}</p>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <Button variant="destructive" className="rounded-xl font-bold" onClick={() => handleReview(r.answerId, "rejected")} disabled={review.isPending}>
                      <X className="w-4 h-4 ml-1" /> رفض
                    </Button>
                    <Button className="rounded-xl font-bold" onClick={() => handleReview(r.answerId, "accepted")} disabled={review.isPending}>
                      <Check className="w-4 h-4 ml-1" /> قبول
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
