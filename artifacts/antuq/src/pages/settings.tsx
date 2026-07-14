import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { useTheme } from "next-themes";
import {
  useGetStudentProfile,
  useUpdateStudentName,
  getGetStudentProfileQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  User,
  Mail,
  Lock,
  Palette,
  Bell,
  Moon,
  Sun,
  LogOut,
  Trash2,
  Wand2,
  Languages,
  ChevronLeft,
  Loader2,
} from "lucide-react";

export default function Settings() {
  const { isAuthenticated, user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  const { data: profile, isLoading } = useGetStudentProfile({
    query: { enabled: !!isAuthenticated } as never,
  });
  const { mutate: updateName, isPending: isUpdatingName } = useUpdateStudentName();

  const [name, setName] = useState(profile?.name ?? "");
  const [language, setLanguage] = useState(() => localStorage.getItem("antuq-language") || "ar");
  const [notifications, setNotifications] = useState(() => localStorage.getItem("antuq-notifications") !== "false");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleNameSave = () => {
    if (!name.trim()) return;
    updateName(
      { data: { name: name.trim() } },
      {
        onSuccess: () => {
          toast({ title: "تم تحديث الاسم" });
          queryClient.invalidateQueries({ queryKey: getGetStudentProfileQueryKey() });
        },
        onError: (err) => {
          toast({ title: "تعذر تحديث الاسم", description: err instanceof Error ? err.message : "", variant: "destructive" });
        },
      },
    );
  };

  const handleLanguageChange = (value: string) => {
    setLanguage(value);
    localStorage.setItem("antuq-language", value);
    toast({ title: value === "ar" ? "تم تغيير اللغة إلى العربية" : "Language changed to English" });
  };

  const handleNotificationsChange = (value: boolean) => {
    setNotifications(value);
    localStorage.setItem("antuq-notifications", value ? "true" : "false");
    toast({ title: value ? "تم تفعيل الإشعارات" : "تم تعطيل الإشعارات" });
  };

  const handleLogout = () => {
    logout();
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/student/me`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "فشل حذف الحساب");
      }
      logout();
    } catch (err) {
      toast({
        title: "تعذر حذف الحساب",
        description: err instanceof Error ? err.message : "",
        variant: "destructive",
      });
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-20 bg-white/80 dark:bg-black/60 backdrop-blur-md border-b border-border">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/portal" className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors">
              <ArrowRight className="w-5 h-5 rotate-180" />
            </Link>
            <h1 className="text-lg font-black text-foreground">الإعدادات</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Profile */}
        <Card className="rounded-3xl border-border shadow-sm overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              الملف الشخصي
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary overflow-hidden">
                {user?.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <User className="w-8 h-8" />
                )}
              </div>
              <div>
                <p className="font-bold text-foreground">{profile?.name}</p>
                <p className="text-sm text-muted-foreground font-medium">{user?.email}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-bold">الاسم</Label>
              <div className="flex gap-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 rounded-xl"
                  maxLength={120}
                />
                <Button onClick={handleNameSave} disabled={isUpdatingName || !name.trim()} className="h-12 rounded-xl font-bold px-6">
                  {isUpdatingName ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ"}
                </Button>
              </div>
            </div>

            <Link href="/character">
              <Button variant="outline" className="w-full h-12 rounded-xl font-bold mt-2">
                <Wand2 className="w-4 h-4 ml-2" />
                تعديل الشخصية الكرتونية
                <ChevronLeft className="w-4 h-4 mr-auto" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="rounded-3xl border-border shadow-sm overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <Palette className="w-5 h-5 text-accent" />
              المظهر واللغة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center text-foreground border border-border">
                  {theme === "dark" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </div>
                <div>
                  <p className="font-bold text-foreground">الوضع {theme === "dark" ? "الداكن" : "الفاتح"}</p>
                </div>
              </div>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center text-foreground border border-border">
                  <Languages className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-foreground">اللغة</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant={language === "ar" ? "default" : "outline"} className="rounded-lg font-bold" onClick={() => handleLanguageChange("ar")}>
                  العربية
                </Button>
                <Button size="sm" variant={language === "en" ? "default" : "outline"} className="rounded-lg font-bold" onClick={() => handleLanguageChange("en")}>
                  English
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="rounded-3xl border-border shadow-sm overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <Bell className="w-5 h-5 text-secondary-foreground" />
              الإشعارات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center text-foreground border border-border">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-foreground">تفعيل الإشعارات</p>
                  <p className="text-xs text-muted-foreground">الإشعارات داخل التطبيق</p>
                </div>
              </div>
              <Switch checked={notifications} onCheckedChange={handleNotificationsChange} />
            </div>
          </CardContent>
        </Card>

        {/* Account actions */}
        <Card className="rounded-3xl border-border shadow-sm overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              الحساب
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full h-12 rounded-xl font-bold" onClick={handleLogout}>
              <LogOut className="w-4 h-4 ml-2" />
              تسجيل الخروج
            </Button>
            {!showDeleteConfirm ? (
              <Button variant="outline" className="w-full h-12 rounded-xl font-bold border-destructive text-destructive hover:bg-destructive/10" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="w-4 h-4 ml-2" />
                حذف الحساب
              </Button>
            ) : (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 space-y-3">
                <p className="text-sm font-bold text-destructive">هل أنت متأكد؟ لا يمكن التراجع عن حذف الحساب.</p>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 h-11 rounded-xl font-bold" onClick={() => setShowDeleteConfirm(false)}>
                    إلغاء
                  </Button>
                  <Button className="flex-1 h-11 rounded-xl font-bold bg-destructive hover:bg-destructive/90" onClick={handleDeleteAccount} disabled={isDeleting}>
                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "تأكيد الحذف"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
