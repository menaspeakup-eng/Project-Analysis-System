import { Link } from "wouter";
import StaticPageLayout from "@/components/static-page-layout";
import { Button } from "@/components/ui/button";
import { GraduationCap, Users, BarChart3, ShieldCheck } from "lucide-react";

const features = [
  {
    icon: Users,
    title: "إدارة الفصول والطلاب",
    description: "أضف فصولك الدراسية وطلابك بسهولة، وتابع كل طفل على حدة أو الفصل بأكمله.",
  },
  {
    icon: BarChart3,
    title: "تقارير تقدّم مفصّلة",
    description: "تعرّف على مستوى نطق كل طالب وتقدّمه في القراءة، مع تقارير أسبوعية واضحة.",
  },
  {
    icon: GraduationCap,
    title: "محتوى يناسب المنهج",
    description: "دروس وألعاب مصمّمة لتتكامل مع خطة تعليم القراءة والنطق داخل الفصل.",
  },
  {
    icon: ShieldCheck,
    title: "بيئة آمنة ومناسبة للأطفال",
    description: "لا إعلانات، لا محتوى خارجي غير مناسب، وضوابط خصوصية صارمة لبيانات الطلاب.",
  },
];

export default function Schools() {
  return (
    <StaticPageLayout eyebrow="انطق للمدارس ورياض الأطفال" title="منصّة انطق لمدرستك أو مركزك التعليمي">
      <p>
        نساعد المعلمين ورياض الأطفال ومراكز صعوبات التعلّم على تعليم القراءة والنطق العربي
        بطريقة ممتعة وقابلة للقياس، من خلال لوحة تحكم مخصّصة للمعلم إلى جانب تجربة الطفل
        التفاعلية على "انطق".
      </p>

      <div className="grid sm:grid-cols-2 gap-6 not-prose">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="bg-white rounded-3xl p-6 border border-border shadow-sm"
          >
            <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4">
              <feature.icon className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">{feature.title}</h3>
            <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
          </div>
        ))}
      </div>

      <div className="bg-accent/10 border border-accent/20 rounded-3xl p-8 text-center space-y-4 not-prose">
        <h2 className="text-2xl font-bold text-foreground">لوحة تحكم المعلم قيد الإعداد</h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          نعمل حالياً على إطلاق لوحة تحكم كاملة للمعلمين والمدارس. سجّل اهتمامك الآن وسنتواصل
          معك فور إتاحتها، مع أولوية تجربة مبكرة لمدرستك أو مركزك.
        </p>
        <Button
          size="lg"
          className="h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold"
          asChild
        >
          <a href="mailto:schools@antuq.app?subject=%D8%A7%D9%87%D8%AA%D9%85%D8%A7%D9%85%20%D9%85%D8%AF%D8%B1%D8%B3%D8%AA%D9%8A%20%D8%A8%D9%85%D9%86%D8%B5%D8%A9%20%D8%A7%D9%86%D8%B7%D9%82">
            تواصل معنا بخصوص مدرستك
          </a>
        </Button>
      </div>

      <p className="text-center not-prose">
        تريد تجربة المنصة أولاً؟{" "}
        <Link href="/sign-in" className="text-primary font-bold hover:underline">
          سجّل الدخول وابدأ الآن
        </Link>
      </p>
    </StaticPageLayout>
  );
}
