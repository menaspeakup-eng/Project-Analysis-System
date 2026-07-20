import StaticPageLayout from "@/components/static-page-layout";
import { Mic, Gamepad2, BookOpen, Trophy, ShieldCheck, Users, Brain, Sparkles } from "lucide-react";

const features = [
  {
    icon: Mic,
    title: "مدرب النطق الذكي",
    description: "يستمع الطالب ويصحح نطقه بالتشكيل والحركات، مع ملاحظات فورية لتحسين الأداء.",
  },
  {
    icon: Gamepad2,
    title: "ألعاب تعليمية متنوعة",
    description: "ألعاب تفاعلية مصممة لتعليم القراءة والنطق والفهم بأسلوب ممتع.",
  },
  {
    icon: BookOpen,
    title: "المكتبة التعليمية",
    description: "قصص ومواد تعليمية من المعلم، مع أسئلة فهم ونقاط تحفيزية للطلبة.",
  },
  {
    icon: Sparkles,
    title: "قصص الذكاء الاصطناعي",
    description: "قصص فريدة مولدة بالذكاء الاصطناعي تناسب اسم الطالب واهتماماته.",
  },
  {
    icon: Trophy,
    title: "نقاط ومكافآت",
    description: "نظام نقاط يحفز الطلبة على الممارسة اليومية والإنجاز المستمر.",
  },
  {
    icon: ShieldCheck,
    title: "بيئة آمنة",
    description: "لا إعلانات، لا محتوى خارجي، وضوابط خصوصية صارمة لبيانات الطلبة.",
  },
  {
    icon: Users,
    title: "لوحة المعلم",
    description: "إدارة الفصول، متابعة التقدم، وتقييم تسليمات الطلبة من لوحة واحدة.",
  },
  {
    icon: Brain,
    title: "تحليل ذكي للتقدم",
    description: "تقارير تفصيلية تساعد المعلم على فهم نقاط القوة والضعف لكل طالب.",
  },
];

export default function Features() {
  return (
    <StaticPageLayout
      eyebrow="المميزات"
      title="كل ما يحتاجه الطالب للتفوق في القراءة والنطق"
    >
      <p className="text-xl">
        تجمع إنطق بين أحدث تقنيات الذكاء الاصطناعي والتصميم التعليمي العربي لتقدم
        تجربة متكاملة للطلبة والمعلمين.
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
    </StaticPageLayout>
  );
}
