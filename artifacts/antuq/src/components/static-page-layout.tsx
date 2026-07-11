import { ReactNode } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function StaticPageLayout({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] bg-background font-sans">
      {/* Header */}
      <header className="w-full p-4 md:px-8 lg:px-12 flex justify-between items-center bg-white border-b border-border">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.svg" alt="انطق" className="h-10 w-auto" />
        </Link>
        <Button variant="ghost" className="font-bold text-foreground hover:text-primary rounded-xl" asChild>
          <Link href="/">
            العودة للرئيسية
            <ArrowLeft className="w-4 h-4 mr-2" />
          </Link>
        </Button>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 md:px-8 py-16 md:py-20">
        {eyebrow ? (
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent font-bold text-sm border border-accent/20 mb-4">
            {eyebrow}
          </span>
        ) : null}
        <h1 className="text-4xl md:text-5xl font-black text-foreground mb-10">{title}</h1>
        <div className="prose-static space-y-10 text-lg leading-loose text-muted-foreground font-medium">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white py-10 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-right">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="انطق" className="h-8 grayscale opacity-50" />
            <span className="font-bold text-muted-foreground">© {new Date().getFullYear()} انطق. منصة تعليمية.</span>
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
