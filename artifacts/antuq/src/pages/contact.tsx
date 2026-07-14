import StaticPageLayout from "@/components/static-page-layout";
import { Button } from "@/components/ui/button";
import { Mail, School } from "lucide-react";

export default function Contact() {
  return (
    <StaticPageLayout
      eyebrow="تواصل معنا"
      title="نحن هنا لمساعدتك"
    >
      <p>
        هل لديك سؤال أو اقتراح؟ تواصل مع فريق انطق وسنرد عليك في أقرب وقت.
      </p>

      <div className="grid sm:grid-cols-2 gap-6 not-prose">
        <div className="bg-white rounded-3xl p-6 border border-border shadow-sm text-center space-y-4">
          <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto">
            <Mail className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-foreground">البريد الإلكتروني</h3>
          <p className="text-muted-foreground">support@antuq.app</p>
          <Button asChild className="rounded-xl bg-primary hover:bg-primary/90 text-white font-bold">
            <a href="mailto:support@antuq.app">راسلنا</a>
          </Button>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-border shadow-sm text-center space-y-4">
          <div className="w-14 h-14 bg-accent/10 text-accent rounded-2xl flex items-center justify-center mx-auto">
            <School className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-foreground">للمدارس والمراكز</h3>
          <p className="text-muted-foreground">schools@antuq.app</p>
          <Button asChild className="rounded-xl bg-accent hover:bg-accent/90 text-white font-bold">
            <a href="mailto:schools@antuq.app">تواصل بخصوص مدرستك</a>
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        ساعات العمل: من الأحد إلى الخميس، من 9:00 صباحاً حتى 5:00 مساءً بتوقيت مكة المكرمة.
      </p>
    </StaticPageLayout>
  );
}
