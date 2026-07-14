import { useState, useEffect } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useGetIdentityMe, useUpdateStudentName } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, ArrowLeft } from "lucide-react";

export default function OnboardingName() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");

  const { data: identity, isLoading: isIdentityLoading } = useGetIdentityMe({
    query: { enabled: !!isAuthenticated } as never,
  });

  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { mutate: updateName, isPending: isSaving } = useUpdateStudentName();

  useEffect(() => {
    if (!isLoading) return;
    if (!isAuthenticated) {
      setLocation("/");
      return;
    }
    if (identity?.nameConfirmed) {
      routeToDashboard(identity);
    }
  }, [isLoading, isAuthenticated, identity, setLocation]);

  function routeToDashboard(identity: { isAdmin: boolean; isTeacher: boolean }) {
    // Admins and teachers both land on the teacher dashboard by default.
    if (identity.isAdmin || identity.isTeacher) setLocation("/teacher");
    else setLocation("/portal");
  }

  if (!isLoading || !isAuthenticated || isIdentityLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || isSaving) return;
    setError(null);

    updateName(
      { data: { name: trimmed } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/identity/me"] });
          routeToDashboard(identity ?? { isAdmin: false, isTeacher: false });
        },
        onError: (err) => {
          const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع";
          setError(message || "تعذر حفظ الاسم، حاول مرة أخرى.");
        },
      },
    );
  };

  return (
    <div className="min-h-[100dvh] bg-background relative overflow-hidden flex items-center justify-center p-4 selection:bg-primary/20">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-accent/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-xl border border-border p-6 md:p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-foreground">أهلاً بك في انطق!</h1>
          <p className="text-muted-foreground font-medium">
            للتأكد من ظهور اسمك بشكل صحيح في صفحة المعلم والأدمن، اكتب اسمك الكامل بالعربي أو الإنجليزي.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="font-bold text-foreground">
              الاسم الكامل
            </Label>
            <Input
              id="fullName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: أحمد محمد العلي"
              className="h-12 rounded-xl border-border bg-[hsl(40,33%,98%)] text-foreground text-lg"
              autoFocus
              dir="auto"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive font-bold text-center bg-destructive/10 rounded-xl p-3">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={isSaving || !name.trim()}
            className="w-full h-13 rounded-xl bg-primary text-white font-bold"
          >
            {isSaving ? (
              <span className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin ml-2"></span>
            ) : (
              <ArrowLeft className="w-5 h-5 ml-2" />
            )}
            المتابعة
          </Button>
        </form>
      </div>
    </div>
  );
}
