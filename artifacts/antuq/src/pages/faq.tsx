import StaticPageLayout from "@/components/static-page-layout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "ما هي منصة إنطق؟",
    answer:
      "إنطق منصة تعليمية عربية تستخدم الذكاء الاصطناعي لتعليم الطلبة القراءة والنطق الصحيح للغة العربية عبر ألعاب وقصص تفاعلية.",
  },
  {
    question: "من يمكنه استخدام إنطق؟",
    answer:
      "المنصة مصممة للطلبة من عمر ١٠ سنوات فما فوق، بالإضافة إلى المعلمين والأولياء الذين يرغبون في متابعة تقدم الطلبة.",
  },
  {
    question: "هل المنصة آمنة للطلبة؟",
    answer:
      "نعم، إنطق خالية من الإعلانات والمحتوى غير المناسب. جميع البيانات محمية ولا يمكن الوصول إليها إلا من قبل المستخدم المصرح له.",
  },
  {
    question: "هل تحتاج المدرسة إلى تدريب خاص؟",
    answer:
      "لا، واجهة المعلم سهلة وبديهية. نقدم أيضاً دليلاً تعليمياً ودعماً فنياً للفرق التعليمية.",
  },
  {
    question: "هل يمكن استخدام إنطق على الهاتف والكمبيوتر؟",
    answer:
      "نعم، المنصة متجاوبة وتعمل على المتصفحات في الهاتف والكمبيوتر والأجهزة اللوحية.",
  },
  {
    question: "كيف يتم حماية بيانات الطلبة؟",
    answer:
      "نستخدم تسجيل الدخول الآمن عبر Clerk، ونخزن البيانات في قواعد بيانات مشفرة. لا نشارك بيانات المستخدمين أو الطلبة مع أطراف ثالثة.",
  },
  {
    question: "هل يمكنني تجربة المنصة قبل الاشتراك؟",
    answer:
      "نعم، يمكنك الدخول كزائر أو التسجيل مجاناً لاستكشاف الميزات الأساسية. الخطط المدفوعة تفتح المزيد من الإمكانيات للمدارس والمراكز.",
  },
];

export default function FAQ() {
  return (
    <StaticPageLayout
      eyebrow="الأسئلة الشائعة"
      title="كل ما تريد معرفته عن إنطق"
    >
      <p>
        إذا لم تجد إجابة لسؤالك هنا، لا تتردد في التواصل معنا.
      </p>

      <Accordion type="single" collapsible className="not-prose space-y-4">
        {faqs.map((faq, index) => (
          <AccordionItem
            key={index}
            value={`item-${index}`}
            className="bg-white rounded-2xl border border-border px-6"
          >
            <AccordionTrigger className="text-right font-bold text-foreground hover:no-underline py-5">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </StaticPageLayout>
  );
}
