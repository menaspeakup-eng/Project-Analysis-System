import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { ImageIcon, Trash2, UploadCloud } from "lucide-react";

interface ImageUploadProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ImageUpload({ value, onChange, label }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("الرجاء اختيار ملف صورة فقط.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      alert("حجم الصورة يجب أن يكون أقل من 2 ميجابايت.");
      return;
    }
    try {
      const base64 = await fileToBase64(file);
      onChange(base64);
    } catch {
      alert("تعذر قراءة الصورة، حاول مرة أخرى.");
    }
  };

  return (
    <div className="space-y-2">
      {label && <label className="font-bold text-sm">{label}</label>}
      <div className="rounded-2xl border border-border bg-background p-3 flex flex-col sm:flex-row items-center gap-4">
        <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0 border border-border">
          {value ? (
            <img src={value} alt="preview" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-8 h-8 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 w-full flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="outline"
            className="rounded-xl font-bold h-10 border-border w-full"
            onClick={() => inputRef.current?.click()}
          >
            <UploadCloud className="w-4 h-4 ml-2" />
            {value ? "تغيير الصورة" : "رفع صورة"}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive font-bold h-8 hover:bg-destructive/5 w-full"
              onClick={() => onChange("")}
            >
              <Trash2 className="w-4 h-4 ml-2" />
              حذف الصورة
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
