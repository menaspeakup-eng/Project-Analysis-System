import { useGetStoriesHealth, getGetStoriesHealthQueryKey } from "@workspace/api-client-react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function AIStatusIndicator({ className }: { className?: string }) {
  const { data, isLoading, error } = useGetStoriesHealth({
    query: { queryKey: getGetStoriesHealthQueryKey(), refetchInterval: 30_000, retry: 1 },
  });

  const status = data?.status ?? (error ? "error" : undefined);

  if (isLoading && !status) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground", className)}>
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        جاري التحقق من الذكاء الاصطناعي
      </span>
    );
  }

  if (status === "ok") {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600", className)}>
        <CheckCircle2 className="w-3.5 h-3.5" />
        متصل بالذكاء الاصطناعي
      </span>
    );
  }

  const message = data?.message ?? (error instanceof Error ? error.message : "غير متصل");

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-xs font-bold text-amber-600", className)}
      title={message}
    >
      <AlertCircle className="w-3.5 h-3.5" />
      خدمة الذكاء الاصطناعي غير متوفرة
    </span>
  );
}
