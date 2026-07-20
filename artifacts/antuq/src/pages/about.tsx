import StaticPageLayout from "@/components/static-page-layout";

export default function About() {
  return (
    <StaticPageLayout
      eyebrow="عن المنصة"
      title="منصة انطق: تعليم القراءة والنطق بالذكاء الاصطناعي"
    >
      <p>
        انطق منصة تعليمية عربية تستخدم الذكاء الاصطناعي لمساعدة الطلبة على تعلم
        القراءة والنطق الصحيح للغة العربية. نؤمن بأن كل طالب يستحق تجربة تعليمية
        ممتعة، آمنة، ومصممة خصيصاً لمستواه.
      </p>

      <h2 className="text-2xl font-bold text-foreground">مهمتنا</h2>
      <p>
        تمكين الطلبة من اكتساب مهارات القراءة والنطق بثقة من خلال محتوى تفاعلي،
        ألعاب تعليمية، قصص ذكية، وتقارم تقدم واضحة للمعلمين والأهل.
      </p>

      <h2 className="text-2xl font-bold text-foreground">لماذا انطق؟</h2>
      <ul className="list-disc pr-6 space-y-3">
        <li>تجربة تعليمية شخصية تناسب كل طالب.</li>
        <li>مدرب نطق ذكي يعطي الطالب ملاحظات فورية.</li>
        <li>محتوى آمن خالٍ من الإعلانات وغير المناسب.</li>
        <li>أدوات للمعلمين لمتابعة تقدم الطلبة بسهولة.</li>
      </ul>
    </StaticPageLayout>
  );
}
