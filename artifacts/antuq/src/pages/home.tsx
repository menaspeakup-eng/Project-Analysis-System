import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Mic, Star, Brain, Heart, GraduationCap, ShieldCheck, Play, ArrowLeft, School,
  BookOpen, UserPlus, Users, Gamepad2, FileQuestion, ClipboardList, LineChart,
  FileText, CheckCircle2, Coins, Sparkles, LogIn, ClipboardCheck, Trophy, Target,
} from "lucide-react";
import heroKids from "@assets/generated_images/hero-kids.webp";
import gamePreview from "@assets/generated_images/game-preview.webp";
import avatarMascot from "@assets/generated_images/avatar-mascot.webp";
import PlatformGuide from "@/components/PlatformGuide";

export default function Home() {
  const [, setLocation] = useLocation();

  const handleGuestContinue = () => {
    localStorage.setItem("antuq-guest", "true");
    setLocation("/portal");
  };

  return (
    <div className="min-h-[100dvh] bg-background font-sans overflow-x-hidden selection:bg-primary/20">
      {/* Header */}
      <header className="absolute top-0 w-full p-4 md:px-8 lg:px-12 flex justify-between items-center z-50">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="إنطق" className="h-10 md:h-12 w-auto" />
        </div>
        <div className="flex items-center gap-3">
          <Button className="font-bold bg-primary hover:bg-primary/90 text-white rounded-xl px-6 h-11" asChild>
            <Link href="/sign-in">ابدأ الآن</Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 px-4 md:px-8 lg:px-12 max-w-7xl mx-auto flex flex-col-reverse lg:flex-row items-center gap-12 lg:gap-8">
        <div className="flex-1 text-center lg:text-right z-10 space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent font-bold text-sm md:text-base border border-accent/20 mb-4 shadow-sm">
            <Star className="w-4 h-4 fill-accent" />
            <span>المنصة الأولى لتعليم القراءة بالذكاء الاصطناعي</span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-foreground leading-[1.15] md:leading-[1.15]">
            اقرأ • تعلّم • <span className="text-primary relative inline-block">
              تطوّر
              <svg className="absolute -bottom-2 left-0 w-full h-4 text-secondary/50 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" strokeLinecap="round"/></svg>
            </span>
          </h1>
          <div className="flex flex-col items-center lg:items-start gap-2">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/5 text-primary font-bold text-sm md:text-base border border-primary/10 shadow-sm">
              <GraduationCap className="w-4 h-4" />
              <span>المنصة تحت إشراف الأستاذة هدى الناصري</span>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/5 text-accent font-bold text-sm md:text-base border border-accent/10 shadow-sm">
              <School className="w-4 h-4" />
              <span>المنصة تابعة لمدرسة خضراء عبري (٥-٨)</span>
            </div>
          </div>
          <p className="text-xl md:text-2xl text-muted-foreground font-medium leading-relaxed max-w-2xl mx-auto lg:mx-0">
            رحلة ممتعة للطلبة لاكتشاف عالم اللغة العربية، مع مدرب نطق ذكي، ألعاب تفاعلية، ومكافآت تصنع أبطالاً.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
            <Button size="lg" className="w-full sm:w-auto text-lg h-14 px-8 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all hover:-translate-y-1" asChild>
               <Link href="/sign-in">
                 سجل مجاناً
                 <ArrowLeft className="w-5 h-5 mr-2" />
               </Link>
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg h-14 px-8 rounded-xl font-bold border-2 border-border hover:bg-accent/5 hover:text-accent hover:border-accent/30 transition-all bg-white" onClick={handleGuestContinue}>
               المتابعة كزائر
            </Button>
          </div>
          
          <div className="pt-8 flex items-center justify-center lg:justify-start gap-6 opacity-70">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-accent" />
              <span className="text-sm font-bold">آمن للطلبة</span>
            </div>
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-accent" />
              <span className="text-sm font-bold">معتمد تعليمياً</span>
            </div>
          </div>
        </div>

        <div className="flex-1 relative w-full max-w-lg lg:max-w-none">
          <div className="relative w-full aspect-square md:aspect-[4/3] lg:aspect-square">
            <div className="absolute inset-0 bg-gradient-to-tr from-secondary/30 via-primary/10 to-accent/20 rounded-[3rem] rotate-3 scale-105 -z-10"></div>
            <div className="absolute inset-0 bg-white rounded-[3rem] shadow-2xl border-4 border-white overflow-hidden flex items-center justify-center">
              <img src={heroKids} alt="طلبة يتعلمون بسعادة" className="w-full h-full object-cover object-center" />
            </div>
            {/* Floating badges */}
            <div className="absolute -left-6 top-1/4 bg-white p-4 rounded-2xl shadow-xl border border-border animate-bounce text-secondary" style={{animationDuration: '3s'}}>
              <Star className="w-8 h-8 fill-secondary" />
            </div>
            <div className="absolute -right-4 bottom-1/3 bg-white p-4 rounded-2xl shadow-xl border border-border animate-bounce text-primary" style={{animationDuration: '4s'}}>
              <GraduationCap className="w-8 h-8" />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-black text-foreground">
              كيف يتعلم طلبةك مع <span className="text-primary">إنطق</span>؟
            </h2>
            <p className="text-xl text-muted-foreground font-medium max-w-2xl mx-auto">
              نجمع بين أحدث تقنيات الذكاء الاصطناعي وأساليب التعلم باللعب لنقدم تجربة لا تُنسى.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-background rounded-3xl p-8 border border-border hover:shadow-xl transition-shadow relative overflow-hidden group">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Mic className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-foreground">مدرب نطق ذكي</h3>
              <p className="text-muted-foreground leading-relaxed text-lg font-medium">
                يستمع النظام لقراءة الطالب ويحلل نطقه بدقة، ليقدم تصحيحاً فورياً ومشجعاً، تماماً كمعلم خاص يجلس بجواره.
              </p>
              <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-primary/5 rounded-full blur-2xl"></div>
            </div>

            {/* Feature 2 */}
            <div className="bg-background rounded-3xl p-8 border border-border hover:shadow-xl transition-shadow relative overflow-hidden group md:-translate-y-4">
              <div className="w-16 h-16 bg-accent/10 text-accent rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Play className="w-8 h-8 ml-1" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-foreground">ألعاب تفاعلية</h3>
              <p className="text-muted-foreground leading-relaxed text-lg font-medium">
                التعلم لا يجب أن يكون مملاً! عالم مليء بالألعاب الملونة والتحديات التي تجعل القراءة مغامرة ممتعة.
              </p>
              <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-accent/5 rounded-full blur-2xl"></div>
            </div>

            {/* Feature 3 */}
            <div className="bg-background rounded-3xl p-8 border border-border hover:shadow-xl transition-shadow relative overflow-hidden group">
              <div className="w-16 h-16 bg-secondary/20 text-secondary-foreground rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Star className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-foreground">مكافآت ونقاط</h3>
              <p className="text-muted-foreground leading-relaxed text-lg font-medium">
                يحصل طلبةك على نقاط ونجوم مع كل إنجاز، ليقوم بتخصيص شخصيته الافتراضية (الأفاتار) وفتح عوالم جديدة.
              </p>
              <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-secondary/10 rounded-full blur-2xl"></div>
            </div>
          </div>
        </div>
      </section>

      <PlatformGuide />

      {/* Show & Tell Section */}
      <section className="py-24 bg-background overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 relative">
              <div className="absolute inset-0 bg-primary/10 rounded-[3rem] -rotate-6 scale-105"></div>
              <div className="relative rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white">
                <img src={gamePreview} alt="واجهة اللعبة" className="w-full h-auto" />
              </div>
              <img src={avatarMascot} alt="شخصية مرحة" className="absolute -bottom-10 -right-10 w-48 h-48 drop-shadow-2xl animate-[bounce_4s_infinite]" />
            </div>
            
            <div className="flex-1 space-y-8">
              <h2 className="text-4xl md:text-5xl font-black text-foreground">
                عالم ينبض <span className="text-accent">بالمرح</span>
              </h2>
              <ul className="space-y-6">
                <li className="flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0 border border-border">
                    <Brain className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold mb-2 text-foreground">مصمم لعمر ١٠ سنوات فما فوق</h4>
                    <p className="text-muted-foreground text-lg font-medium">واجهة خالية من التشتيت، تعتمد على التوجيه الصوتي والرموز البصرية.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0 border border-border">
                    <Heart className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold mb-2 text-foreground">بيئة إيجابية داعمة</h4>
                    <p className="text-muted-foreground text-lg font-medium">لا يوجد "خطأ" محبط، بل "لنجرب مرة أخرى!" مع تشجيع مستمر.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0 border border-border">
                    <GraduationCap className="w-6 h-6 text-secondary-foreground" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold mb-2 text-foreground">للمدارس والمراكز (قريباً)</h4>
                    <p className="text-muted-foreground text-lg font-medium">لوحة تحكم للمعلم لمتابعة تقدم كل طالب بشكل فردي أو على مستوى الفصل.</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary relative overflow-hidden text-white">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
           <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
           <div className="absolute bottom-0 left-0 w-[30rem] h-[30rem] bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3"></div>
        </div>

        <div className="max-w-4xl mx-auto px-4 md:px-8 text-center relative z-10 space-y-8">
          <h2 className="text-4xl md:text-5xl font-black mb-6">
            مستعدون للبدء؟
          </h2>
          <p className="text-xl md:text-2xl font-medium text-white/90 mb-10 max-w-2xl mx-auto">
            انضموا إلى آلاف الطلبة الذين يستمتعون بتعلم القراءة العربية يومياً مع منصة إنطق.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 bg-white/10 p-4 rounded-3xl backdrop-blur-sm border border-white/20 max-w-fit mx-auto">
            <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg font-bold rounded-2xl bg-white text-primary hover:bg-background shadow-lg transition-all hover:scale-105" asChild>
               <Link href="/sign-in">
                 ابدأ الآن مجاناً
               </Link>
            </Button>
            <Button size="lg" variant="ghost" className="w-full sm:w-auto h-14 px-8 text-lg font-bold rounded-2xl text-white hover:bg-white/20 transition-all" onClick={handleGuestContinue}>
               جرب المنصة كزائر
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-12 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-right">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="إنطق" className="h-8 grayscale hover:grayscale-0 transition-all opacity-50 hover:opacity-100" />
            <span className="font-bold text-muted-foreground">© {new Date().getFullYear()} إنطق. منصة تعليمية.</span>
          </div>
          <div className="flex items-center gap-6 text-sm font-bold text-muted-foreground">
            <Link href="/terms" className="hover:text-primary transition-colors">شروط الاستخدام</Link>
            <Link href="/privacy" className="hover:text-primary transition-colors">سياسة الخصوصية</Link>
            <Link href="/schools" className="hover:text-primary transition-colors">للمدارس</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
