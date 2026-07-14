import { Link } from "wouter";
import { motion, type Variants } from "framer-motion";
import { BookOpen, Sparkles, ArrowRight, Wand2, Home, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AIStatusIndicator } from "@/components/ai-status";

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const tools = [
  {
    id: "ai-story",
    title: "📖 قصتي الذكية",
    description: "أنشئ قصة قصيرة يكون اسمك هو بطلها واختر نوع المغامرة، وسيكتب الذكاء الاصطناعي قصة جديدة وممتعة خصيصاً لك.",
    icon: BookOpen,
    href: "/ai-story",
    color: "bg-[hsl(265,60%,92%)] text-[hsl(265,60%,45%)]",
    available: true,
  },
  {
    id: "reading-coach",
    title: "🎙️ مدرب القراءة الذكي",
    description: "تدرب على قراءة جملة عربية مشكولة يختارها لك الذكاء الاصطناعي، سجّل صوتك واحصل على تحليل فوري ونتيجة.",
    icon: Mic,
    href: "/reading-coach",
    color: "bg-[hsl(15,85%,95%)] text-[hsl(15,85%,55%)]",
    available: true,
  },
];

export default function AIAssistant() {
  return (
    <div className="min-h-[100dvh] bg-background relative overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/portal" className="w-10 h-10 rounded-xl bg-[hsl(265,60%,92%)] text-[hsl(265,60%,45%)] flex items-center justify-center hover:bg-[hsl(265,60%,88%)] transition-colors" aria-label="رجوع">
              <ArrowRight className="w-5 h-5 rotate-180" />
            </Link>
            <div className="w-10 h-10 rounded-xl bg-[hsl(265,60%,92%)] text-[hsl(265,60%,45%)] flex items-center justify-center">
              <Wand2 className="w-5 h-5" />
            </div>
            <h1 className="text-lg font-black text-foreground">مساعد القراءة الذكي</h1>
          </div>
          <AIStatusIndicator />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 relative z-10">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-8"
        >
          {/* Hero */}
          <motion.section variants={item} className="text-center space-y-4 py-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[hsl(265,60%,92%)] text-[hsl(265,60%,45%)] text-sm font-bold">
              <Sparkles className="w-4 h-4" />
              مدعوم بالذكاء الاصطناعي
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-foreground">
              اكتشف أدوات الذكاء الاصطناعي في تعلّم القراءة
            </h2>
            <p className="text-muted-foreground font-medium max-w-2xl mx-auto text-lg">
              أدوات ذكية تساعدك على التدرب على القراءة بأسلوب ممتع وشخصي.
            </p>
          </motion.section>

          {/* Tools grid */}
          <motion.section variants={item}>
            <h3 className="font-black text-foreground text-lg mb-4">الأدوات المتاحة</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {tools.map((tool) => (
                <Link key={tool.id} href={tool.href}>
                  <Card className="group cursor-pointer h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-border bg-white rounded-3xl overflow-hidden">
                    <CardContent className="p-6 flex flex-col h-full gap-4">
                      <div className="flex items-start justify-between">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${tool.color}`}>
                          <tool.icon className="w-8 h-8" />
                        </div>
                        <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors">
                          <ArrowRight className="w-5 h-5 rotate-180" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xl font-black text-foreground mb-2">{tool.title}</h4>
                        <p className="text-muted-foreground font-medium leading-relaxed">{tool.description}</p>
                      </div>
                      <Button className="w-full rounded-xl h-12 text-base font-bold" disabled={!tool.available}>
                        {tool.available ? "ابدأ الآن" : "قريباً"}
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </motion.section>
        </motion.div>
      </main>

      {/* Background decorations */}
      <div className="absolute top-[15%] right-[5%] w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[15%] left-[5%] w-96 h-96 bg-[hsl(265,60%,60%)]/10 rounded-full blur-3xl pointer-events-none"></div>
    </div>
  );
}
