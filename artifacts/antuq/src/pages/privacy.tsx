import StaticPageLayout from "@/components/static-page-layout";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-2xl font-bold text-foreground mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export default function Privacy() {
  return (
    <StaticPageLayout eyebrow="آخر تحديث: يوليو 2026" title="سياسة الخصوصية">
      <p>
        خصوصية طفلك وبياناته أمانة نأخذها على محمل الجد. توضّح هذه السياسة ما هي البيانات التي
        نجمعها، وكيف نستخدمها، ومن يمكنه الوصول إليها.
      </p>

      <Section title="١. البيانات التي نجمعها">
        <ul className="list-disc pr-6 space-y-2">
          <li>
            <span className="font-bold text-foreground">بيانات الحساب:</span> عند تسجيل الدخول
            بحساب Google، نستقبل الاسم والبريد الإلكتروني وصورة الملف الشخصي المرتبطة بالحساب.
          </li>
          <li>
            <span className="font-bold text-foreground">بيانات الاستخدام كزائر:</span> في وضع
            الزائر، لا نطلب أي معلومات شخصية؛ يُحفظ فقط مؤشر محلي في المتصفح لتذكر حالة الدخول.
          </li>
          <li>
            <span className="font-bold text-foreground">بيانات الصوت:</span> عند استخدام ميزة
            تحليل النطق، يتم تسجيل صوت الطفل مؤقتاً لغرض التحليل الفوري، وتحسين دقة النموذج.
          </li>
          <li>
            <span className="font-bold text-foreground">بيانات الاستخدام:</span> إحصاءات عامة
            حول التقدّم التعليمي، النقاط، والألعاب المُستخدمة، لغرض تحسين تجربة التعلم.
          </li>
        </ul>
      </Section>

      <Section title="٢. كيف نستخدم البيانات">
        <ul className="list-disc pr-6 space-y-2">
          <li>تقديم تجربة تعليمية مخصّصة لكل طفل ومتابعة تقدّمه.</li>
          <li>تحليل النطق وتقديم تغذية راجعة تعليمية فورية.</li>
          <li>تفعيل نظام النقاط والمكافآت وتخصيص الشخصية الافتراضية (الأفاتار).</li>
          <li>تحسين المنصة وإصلاح الأعطال التقنية.</li>
        </ul>
        <p>لا نبيع بيانات المستخدمين أو الأطفال لأي طرف ثالث لأغراض تسويقية.</p>
      </Section>

      <Section title="٣. خصوصية الأطفال">
        <p>
          ندرك حساسية جمع بيانات الأطفال. نلتزم بعدم جمع أي بيانات شخصية تتجاوز ما هو ضروري
          لتقديم الخدمة التعليمية، ونوصي بأن يشرف ولي الأمر أو المعلم على إنشاء الحساب لأي طفل
          دون سن الثالثة عشرة. يحق لولي الأمر طلب مراجعة أو حذف بيانات طفله في أي وقت.
        </p>
      </Section>

      <Section title="٤. مشاركة البيانات مع أطراف ثالثة">
        <p>
          نستخدم مزوّدين موثوقين لتشغيل المنصة، مثل خدمة Clerk لإدارة تسجيل الدخول، وGoogle لخدمة
          "تسجيل الدخول عبر Google". تخضع هذه الخدمات لسياسات الخصوصية الخاصة بها، وتتم مشاركة
          الحد الأدنى من البيانات اللازمة لتشغيل الخدمة فقط.
        </p>
      </Section>

      <Section title="٥. أمان البيانات">
        <p>
          نستخدم إجراءات تقنية وتنظيمية معقولة لحماية بيانات المستخدمين من الوصول أو الاستخدام
          غير المصرح به، مع مراجعة دورية لهذه الإجراءات.
        </p>
      </Section>

      <Section title="٦. حقوقك">
        <p>
          يمكنك في أي وقت طلب الاطلاع على بياناتك، تصحيحها، أو حذف حسابك وكافة البيانات المرتبطة
          به، عبر التواصل معنا على البريد الإلكتروني أدناه.
        </p>
      </Section>

      <Section title="٧. التواصل معنا">
        <p>
          لأي استفسار متعلق بالخصوصية، راسلنا على:{" "}
          <a href="mailto:privacy@antuq.app" className="text-primary font-bold hover:underline">
            privacy@antuq.app
          </a>
        </p>
      </Section>
    </StaticPageLayout>
  );
}
