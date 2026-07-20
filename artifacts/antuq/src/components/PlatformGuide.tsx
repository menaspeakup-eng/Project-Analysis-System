import { BookOpen, UserPlus, Users, School, Gamepad2, FileQuestion, ClipboardList, LineChart, FileText, CheckCircle2, Coins, Sparkles, LogIn, ClipboardCheck, Trophy, Target, type LucideIcon } from "lucide-react";

const teacherSteps = [
  {
    icon: UserPlus,
    color: "bg-primary/10 text-primary",
    title: "إنشاء حساب",
    description: "أنشئ حسابك كمعلم بخطوات بسيطة عبر صفحة التسجيل.",
    note: "يمكنك تسجيل الدخول لاحقاً بنفس البريد وكلمة المرور.",
  },
  {
    icon: School,
    color: "bg-accent/10 text-accent",
    title: "إنشاء صف",
    description: "أنشئ صفاً جديداً وحدد اسمه ومرحلته الدراسية.",
    note: "كل صف يحصل على رمز خاص لدعوة الطلبة للانضمام.",
  },
  {
    icon: Users,
    color: "bg-secondary/20 text-secondary-foreground",
    title: "إضافة الطلبة",
    description: "أضف الطلبة يدوياً أو ارسل لهم رمز الانضمام.",
    note: "بمجرد قبول الدعوة يظهر الطالب في قائمة الصف.",
  },
  {
    icon: BookOpen,
    color: "bg-primary/10 text-primary",
    title: "إنشاء الدروس",
    description: "صمّم دروس قراءة واضحة ومقسمة بشكل تدريجي.",
    note: "يمكنك ربط الدرس بأنشطة وألعاب لاحقاً.",
  },
  {
    icon: Gamepad2,
    color: "bg-accent/10 text-accent",
    title: "إنشاء الألعاب",
    description: "حوّل أي درس إلى لعبة تفاعلية مليئة بالتحديات.",
    note: "الألعاب تساعد الطلبة على التعزيز والمراجعة بمتعة.",
  },
  {
    icon: FileQuestion,
    color: "bg-secondary/20 text-secondary-foreground",
    title: "إنشاء الاختبارات",
    description: "ابنِ اختبارات متنوعة: اختيار من متعدد، صح/خطأ، وأكثر.",
    note: "الاختبارات التلقائية تُصحّح ذاتياً، والمفتوحة تنتظر مراجعتك.",
  },
  {
    icon: ClipboardList,
    color: "bg-primary/10 text-primary",
    title: "إنشاء الواجبات",
    description: "اسند واجبات تفاعلية مع موعد تسليم واضح.",
    note: "تتابع إنجاز الواجبات من لوحة التحكم.",
  },
  {
    icon: LineChart,
    color: "bg-accent/10 text-accent",
    title: "متابعة الطلبة",
    description: "راقب تقدم كل طالب وأنشطته اليومية.",
    note: "الإحصائيات تُظهر نقاط القوة والضعف لكل طالب.",
  },
  {
    icon: FileText,
    color: "bg-secondary/20 text-secondary-foreground",
    title: "عرض التقارير",
    description: "احصل على تقارير تفصيلية عن أداء الصف والطالب.",
    note: "التقارير تساعدك في تخطيط الدروس القادمة.",
  },
  {
    icon: CheckCircle2,
    color: "bg-primary/10 text-primary",
    title: "تصحيح الإجابات",
    description: "راجع الإجابات المفتوحة واعطِ النقاط والملاحظات.",
    note: "النظام يسلّم النتيجة للطالب بعد مراجعتك.",
  },
  {
    icon: Coins,
    color: "bg-accent/10 text-accent",
    title: "إدارة النقاط",
    description: "كافئ الطلبة بالنقاط والنجوم مقابل إنجازاتهم.",
    note: "النقاط تفتح شخصيات وعوالم جديدة للطالب.",
  },
  {
    icon: Sparkles,
    color: "bg-secondary/20 text-secondary-foreground",
    title: "استخدام الذكاء الاصطناعي",
    description: "ولّد أسئلة، قصص، وتمارين ذكية بلمح البصر.",
    note: "أدخل الموضوع والمستوى، والذكاء الاصطناعي يُعدّ المحتوى.",
  },
];

const studentSteps = [
  {
    icon: LogIn,
    color: "bg-primary/10 text-primary",
    title: "تسجيل الدخول",
    description: "أدخل اسمك وكلمة المرور للوصول إلى حسابك.",
    note: "إذا نسيت كلمة المرور، اطلب المساعدة من معلمك.",
  },
  {
    icon: UserPlus,
    color: "bg-accent/10 text-accent",
    title: "الانضمام إلى الصف",
    description: "ادخل رمز الصف الذي يعطيك إياه المعلم.",
    note: "بعد الانضمام تظهر لك جميع دروس وألعاب الصف.",
  },
  {
    icon: BookOpen,
    color: "bg-secondary/20 text-secondary-foreground",
    title: "حل الأنشطة",
    description: "اقرأ الدرس ثم أكمل الأنشطة التفاعلية المرتبطة به.",
    note: "أنشطة القراءة الصوتية تساعدك على تحسين نطقك.",
  },
  {
    icon: Gamepad2,
    color: "bg-primary/10 text-primary",
    title: "حل الألعاب",
    description: "العب الألعاب التعليمية واجمع النقاط.",
    note: "كل لعبة تُقوّي مهارة قراءة أو إملاء أو نحو.",
  },
  {
    icon: ClipboardCheck,
    color: "bg-accent/10 text-accent",
    title: "أداء الاختبارات",
    description: "أجب عن الأسئلة بحسب التعليمات.",
    note: "بعض الاختبارات تُصحّح تلقائياً، وبعضها يراجعها المعلم.",
  },
  {
    icon: Trophy,
    color: "bg-secondary/20 text-secondary-foreground",
    title: "متابعة النقاط",
    description: "تفقد نقاطك وإنجازاتك وشخصيتك الافتراضية.",
    note: "أكمل المزيد من الأنشطة لترتقي إلى مستويات أعلى.",
  },
  {
    icon: Target,
    color: "bg-primary/10 text-primary",
    title: "مشاهدة التحديات",
    description: "شارك في التحديات اليومية والأسبوعية.",
    note: "تحديات إضافية تمنحك نقاطاً مضاعفة.",
  },
  {
    icon: Sparkles,
    color: "bg-accent/10 text-accent",
    title: "استخدام المساعد الذكي",
    description: "اسأل المساعد الذكي عن أي سؤال أو موضوع.",
    note: "المساعد يجيب بلغة بسيطة ويساعدك في فهم الدروس.",
  },
];

interface GuideCardProps {
  icon: LucideIcon;
  color: string;
  title: string;
  description: string;
  note: string;
}

function GuideCard({ icon: Icon, color, title, description, note }: GuideCardProps) {
  return (
    <div className="bg-white rounded-3xl p-6 border border-border hover:shadow-xl transition-all hover:-translate-y-1 group relative overflow-hidden">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform ${color}`}>
        <Icon className="w-7 h-7" />
      </div>
      <h4 className="text-xl font-bold mb-3 text-foreground">{title}</h4>
      <p className="text-muted-foreground leading-relaxed font-medium mb-4">{description}</p>
      <div className="flex items-start gap-2 text-sm font-medium text-accent/80">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent mt-2 shrink-0" />
        <span>{note}</span>
      </div>
      <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
    </div>
  );
}

export default function PlatformGuide() {
  return (
    <section className="py-24 bg-secondary/5 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-bold text-sm border border-primary/20 shadow-sm">
            <BookOpen className="w-4 h-4" />
            دليل استخدام المنصة
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-foreground">
            تعرّف على <span className="text-primary">إقرا</span> خطوة بخطوة
          </h2>
          <p className="text-xl text-muted-foreground font-medium max-w-2xl mx-auto">
            شرح بسيط لكل جزء من المنصة لمساعدة المعلم والطالب على استخدامها بسهولة، مع ملاحظات توضيحية في كل مكان.
          </p>
        </div>

        {/* Teacher Guide */}
        <div className="mb-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-sm">
              <School className="w-6 h-6" />
            </div>
            <h3 className="text-3xl font-black text-foreground">دليل المعلم</h3>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teacherSteps.map((step) => (
              <GuideCard key={step.title} {...step} />
            ))}
          </div>
        </div>

        {/* Student Guide */}
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 text-accent flex items-center justify-center shadow-sm">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-3xl font-black text-foreground">دليل الطالب</h3>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {studentSteps.map((step) => (
              <GuideCard key={step.title} {...step} />
            ))}
          </div>
        </div>

        <div className="mt-16 text-center">
          <p className="text-muted-foreground font-medium inline-flex items-center gap-2 bg-white px-6 py-3 rounded-2xl border border-border shadow-sm">
            <Sparkles className="w-5 h-5 text-primary" />
            هذا الدليل قابل للتطوير لاحقاً إلى شرح تفاعلي مصور خطوة بخطوة.
          </p>
        </div>
      </div>
    </section>
  );
}
