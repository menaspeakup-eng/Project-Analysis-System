import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetTeacherGames,
  useUpdateTeacherGame,
  useGetTeacherGameWords,
  useUpdateTeacherGameWords,
  useCreateTeacherGame,
} from "@workspace/api-client-react";
import type { TeacherGame, TeacherClass } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ImageUpload from "@/components/ImageUpload";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Gamepad2, Pencil, Plus, Save, Star, Users, RotateCcw, Trash2, BarChart3, GraduationCap } from "lucide-react";
import type { GameType } from "@/lib/gameTypes";

const GAME_TYPE_LABELS: Record<GameType, string> = {
  "match-sentence-picture": "طابق الجملة بالصورة",
  "arrange-sentence": "رتب الجملة",
  "choose-picture": "اختر الصورة الصحيحة",
  "choose-sentence": "اختر الجملة الصحيحة",
  "complete-sentence": "أكمل الجملة",
  "arrange-sentences": "ترتيب الجمل",
};

const GAME_TYPES: GameType[] = [
  "match-sentence-picture",
  "arrange-sentence",
  "choose-picture",
  "choose-sentence",
  "complete-sentence",
  "arrange-sentences",
];

interface BaseItem {
  id?: number;
  order?: number;
}

interface MatchItem extends BaseItem {
  imageUrl: string;
  sentence: string;
}

interface ArrangeSentenceItem extends BaseItem {
  sentence: string;
}

interface ChoosePictureItem extends BaseItem {
  sentence: string;
  correctImageUrl: string;
  wrongImageUrls: [string, string, string];
}

interface ChooseSentenceItem extends BaseItem {
  imageUrl: string;
  correctSentence: string;
  wrongSentences: [string, string, string];
}

interface CompleteSentenceItem extends BaseItem {
  sentence: string;
  hiddenWord: string;
  wrongWords: [string, string, string];
}

interface ArrangeSentencesItem extends BaseItem {
  sentence: string;
}

type GameItem = MatchItem | ArrangeSentenceItem | ChoosePictureItem | ChooseSentenceItem | CompleteSentenceItem | ArrangeSentencesItem;

const emptyItemFor = (type: GameType): GameItem => {
  switch (type) {
    case "match-sentence-picture":
      return { imageUrl: "", sentence: "" };
    case "arrange-sentence":
      return { sentence: "" };
    case "choose-picture":
      return { sentence: "", correctImageUrl: "", wrongImageUrls: ["", "", ""] };
    case "choose-sentence":
      return { imageUrl: "", correctSentence: "", wrongSentences: ["", "", ""] };
    case "complete-sentence":
      return { sentence: "", hiddenWord: "", wrongWords: ["", "", ""] };
    case "arrange-sentences":
      return { sentence: "" };
    default:
      return { sentence: "" };
  }
};

function generateSlug(name: string) {
  const base = name.trim().replace(/\s+/g, "-").slice(0, 30);
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

interface TeacherGamesProps {
  classes: TeacherClass[];
}

export default function TeacherGames({ classes }: TeacherGamesProps) {
  const queryClient = useQueryClient();
  const [itemsGame, setItemsGame] = useState<TeacherGame | null>(null);
  const [metaGame, setMetaGame] = useState<TeacherGame | null>(null);
  const [statsGame, setStatsGame] = useState<TeacherGame | null>(null);
  const [items, setItems] = useState<GameItem[]>([]);
  const [metaForm, setMetaForm] = useState({
    name: "",
    description: "",
    imageUrl: "",
    pointsReward: 15,
    classId: null as number | null,
  });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<{
    name: string;
    type: GameType;
    classId: number | null;
  }>({
    name: "",
    type: GAME_TYPES[0] as GameType,
    classId: classes[0]?.id ?? null,
  });

  const { data, isLoading } = useGetTeacherGames(undefined, { query: { enabled: true } as never });
  const { data: itemsData } = useGetTeacherGameWords(
    itemsGame?.id ?? 0,
    undefined,
    { query: { enabled: !!itemsGame } as never },
  );
  const { mutate: updateGame } = useUpdateTeacherGame();
  const { mutate: updateItems } = useUpdateTeacherGameWords();
  const { mutate: createGame } = useCreateTeacherGame();
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  useEffect(() => {
    if (itemsData && itemsGame) {
      const payloads = (itemsData.items ?? []).map((it) => it.payload as unknown as GameItem);
      setItems(payloads.length > 0 ? payloads : [emptyItemFor(itemsGame.type as GameType)]);
    }
  }, [itemsData, itemsGame]);

  const openItems = (game: TeacherGame) => {
    setItemsGame(game);
    setItems([emptyItemFor(game.type as GameType)]);
  };

  const openMeta = (game: TeacherGame) => {
    setMetaGame(game);
    setMetaForm({
      name: game.name,
      description: game.description ?? "",
      imageUrl: game.imageUrl ?? "",
      pointsReward: game.pointsReward,
      classId: game.classId ?? null,
    });
  };

  const openStats = (game: TeacherGame) => {
    setStatsGame(game);
  };

  const handleSaveItems = () => {
    if (!itemsGame) return;
    const cleaned = items.map((it) => {
      const { id, order, ...rest } = it as GameItem & { id?: number; order?: number };
      return rest;
    });
    updateItems(
      { id: itemsGame.id, data: { items: cleaned } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/teacher/games"] });
          queryClient.invalidateQueries({
            queryKey: [`/api/teacher/games/${itemsGame.id}/words`],
          });
          setItemsGame(null);
        },
      },
    );
  };

  const handleSaveMeta = () => {
    if (!metaGame) return;
    updateGame(
      {
        id: metaGame.id,
        data: {
          name: metaForm.name.trim() || undefined,
          description: metaForm.description.trim() || undefined,
          imageUrl: metaForm.imageUrl.trim() || undefined,
          pointsReward: Number(metaForm.pointsReward) || undefined,
          classId: metaForm.classId,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/teacher/games"] });
          setMetaGame(null);
        },
      },
    );
  };

  const handleToggleActive = (game: TeacherGame) => {
    updateGame(
      { id: game.id, data: { isActive: !game.isActive } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/teacher/games"] });
          queryClient.invalidateQueries({ queryKey: ["/api/games"] });
        },
      },
    );
  };

  const handleCreate = () => {
    if (!createForm.name.trim()) return;
    const classId = createForm.classId ?? classes[0]?.id ?? null;
    if (classId == null) {
      alert("يجب أن يكون لديك صف واحد على الأقل لإنشاء لعبة.");
      return;
    }
    createGame(
      {
        data: {
          slug: generateSlug(createForm.name),
          name: createForm.name.trim(),
          type: createForm.type,
          classId,
        },
      },
      {
        onSuccess: () => {
          setCreateForm({
            name: "",
            type: GAME_TYPES[0] as GameType,
            classId: classes[0]?.id ?? null,
          });
          setIsCreateOpen(false);
          queryClient.invalidateQueries({ queryKey: ["/api/teacher/games"] });
        },
      },
    );
  };

  const updateItem = (index: number, patch: Partial<GameItem>) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch } as GameItem;
      return next;
    });
  };

  const updateWrong = (index: number, key: "wrongImageUrls" | "wrongSentences" | "wrongWords", slot: number, value: string) => {
    setItems((prev) => {
      const next = [...prev];
      const item = { ...next[index] } as Record<string, unknown>;
      const arr = [...(item[key] as string[])];
      arr[slot] = value;
      item[key] = arr as [string, string, string];
      next[index] = item as unknown as GameItem;
      return next;
    });
  };

  const games = data?.games ?? [];

  const handleDeleteGame = async (game: TeacherGame) => {
    const confirmed = window.confirm(`هل تريد حذف اللعبة "${game.name}"؟ لا يمكن التراجع عن هذا الإجراء.`);
    if (!confirmed) return;
    setIsDeleting(game.id);
    try {
      const res = await fetch(`/api/teacher/games/${game.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("فشل الحذف");
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/games"] });
      queryClient.invalidateQueries({ queryKey: ["/api/games"] });
    } catch (err) {
      alert("تعذر حذف اللعبة، حاول مرة أخرى.");
    } finally {
      setIsDeleting(null);
    }
  };

  const selectedType = (itemsGame?.type ?? createForm.type) as GameType;

  const renderItemFields = (item: GameItem, idx: number): React.ReactNode => {
    switch (selectedType) {
      case "match-sentence-picture": {
        const i = item as MatchItem;
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ImageUpload
              label="صورة العنصر"
              value={i.imageUrl}
              onChange={(value) => updateItem(idx, { imageUrl: value })}
            />
            <Input
              placeholder="الجملة"
              value={i.sentence}
              onChange={(e) => updateItem(idx, { sentence: e.target.value })}
              className="rounded-xl border-border"
            />
          </div>
        );
      }
      case "arrange-sentence":
      case "arrange-sentences": {
        const i = item as ArrangeSentenceItem | ArrangeSentencesItem;
        return (
          <Input
            placeholder="الجملة"
            value={i.sentence}
            onChange={(e) => updateItem(idx, { sentence: e.target.value })}
            className="rounded-xl border-border"
          />
        );
      }
      case "choose-picture": {
        const i = item as ChoosePictureItem;
        return (
          <div className="space-y-3">
            <Input
              placeholder="الجملة"
              value={i.sentence}
              onChange={(e) => updateItem(idx, { sentence: e.target.value })}
              className="rounded-xl border-border"
            />
            <ImageUpload
              label="الصورة الصحيحة"
              value={i.correctImageUrl}
              onChange={(value) => updateItem(idx, { correctImageUrl: value })}
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {i.wrongImageUrls.map((url, slot) => (
                <ImageUpload
                  key={slot}
                  label={`صورة خاطئة ${slot + 1}`}
                  value={url}
                  onChange={(value) => updateWrong(idx, "wrongImageUrls", slot, value)}
                />
              ))}
            </div>
          </div>
        );
      }
      case "choose-sentence": {
        const i = item as ChooseSentenceItem;
        return (
          <div className="space-y-3">
            <ImageUpload
              label="صورة السؤال"
              value={i.imageUrl}
              onChange={(value) => updateItem(idx, { imageUrl: value })}
            />
            <Input
              placeholder="الجملة الصحيحة"
              value={i.correctSentence}
              onChange={(e) => updateItem(idx, { correctSentence: e.target.value })}
              className="rounded-xl border-border"
            />
            <div className="space-y-2">
              {i.wrongSentences.map((sentence, slot) => (
                <Input
                  key={slot}
                  placeholder={`جملة خاطئة ${slot + 1}`}
                  value={sentence}
                  onChange={(e) => updateWrong(idx, "wrongSentences", slot, e.target.value)}
                  className="rounded-xl border-border"
                />
              ))}
            </div>
          </div>
        );
      }
      case "complete-sentence": {
        const i = item as CompleteSentenceItem;
        return (
          <div className="space-y-3">
            <Input
              placeholder="الجملة الكاملة"
              value={i.sentence}
              onChange={(e) => updateItem(idx, { sentence: e.target.value })}
              className="rounded-xl border-border"
            />
            <Input
              placeholder="الكلمة المخفية"
              value={i.hiddenWord}
              onChange={(e) => updateItem(idx, { hiddenWord: e.target.value })}
              className="rounded-xl border-border"
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {i.wrongWords.map((word, slot) => (
                <Input
                  key={slot}
                  placeholder={`كلمة خاطئة ${slot + 1}`}
                  value={word}
                  onChange={(e) => updateWrong(idx, "wrongWords", slot, e.target.value)}
                  className="rounded-xl border-border"
                />
              ))}
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-black text-foreground text-lg flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-accent" />
          الألعاب التعليمية
        </h2>
        <Button className="rounded-xl font-bold h-9" onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 ml-1" />
          إضافة لعبة
        </Button>
      </div>

      {isLoading ? (
        <div className="h-24 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      ) : games.length === 0 ? (
        <Card className="rounded-3xl border-border shadow-sm">
          <CardContent className="p-6 text-center text-muted-foreground font-medium">
            لا توجد ألعاب. ابدأ بإضافة لعبة جديدة.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {games.map((g) => (
            <Card key={g.id} className="rounded-3xl border-border shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base font-black truncate">{g.name}</CardTitle>
                    <p className="text-sm text-muted-foreground font-medium mt-1">
                      v{g.version} · {GAME_TYPE_LABELS[g.type as GameType]} · {g.stats.plays} محاولات
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={g.isActive}
                      onCheckedChange={() => handleToggleActive(g)}
                    />
                    <Badge className={`rounded-full font-bold ${g.isActive ? "bg-[hsl(150,55%,45%)] text-white" : "bg-muted text-muted-foreground"}`}>
                      {g.isActive ? "مفعلة" : "متوقفة"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground font-medium line-clamp-2">
                  {g.description || "لا يوجد وصف"}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="rounded-full font-bold border-border">
                    <Star className="w-3 h-3 ml-1" />
                    {g.pointsReward} نقطة
                  </Badge>
                  <Badge variant="outline" className="rounded-full font-bold border-border">
                    <Users className="w-3 h-3 ml-1" />
                    متوسط الأخطاء: {g.stats.avgMistakes}
                  </Badge>
                  {g.classId != null && (
                    <Badge variant="outline" className="rounded-full font-bold border-border">
                      <GraduationCap className="w-3 h-3 ml-1" />
                      {classes.find((c) => c.id === g.classId)?.name ?? "صف"}
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    className="rounded-xl h-9 font-bold"
                    onClick={() => openItems(g)}
                  >
                    <Pencil className="w-4 h-4 ml-1" />
                    المحتوى
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl h-9 font-bold border-border"
                    onClick={() => openMeta(g)}
                  >
                    <RotateCcw className="w-4 h-4 ml-1" />
                    الإعدادات
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl h-9 font-bold border-border"
                    onClick={() => openStats(g)}
                  >
                    <BarChart3 className="w-4 h-4 ml-1" />
                    الإحصائيات
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl h-9 font-bold border-border text-destructive hover:text-destructive hover:bg-destructive/5"
                    onClick={() => handleDeleteGame(g)}
                    disabled={isDeleting === g.id}
                  >
                    <Trash2 className="w-4 h-4 ml-1" />
                    حذف
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {itemsGame && (
        <Dialog open onOpenChange={(open) => { if (!open) setItemsGame(null); }}>
          <DialogContent className="sm:max-w-2xl rounded-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader className="text-right">
              <DialogTitle className="text-xl font-black flex items-center gap-2">
                <Pencil className="w-6 h-6 text-accent" />
                تعديل محتوى: {itemsGame.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground font-medium">
                حفظ التعديلات سينشر نسخة جديدة (v{itemsGame.version + 1}) ويسمح للطلاب بلعبها مرة أخرى.
              </p>
              <div className="space-y-4">
                {items.map((item, idx) => (
                  <div key={idx} className="border border-border rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-muted-foreground">عنصر {idx + 1}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive font-bold h-8"
                        onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    {renderItemFields(item, idx)}
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                className="w-full rounded-xl font-bold h-10 border-dashed border-border"
                onClick={() => setItems((prev) => [...prev, emptyItemFor(selectedType)])}
              >
                <Plus className="w-4 h-4 ml-1" />
                إضافة عنصر
              </Button>
              <Button className="w-full rounded-xl font-bold h-11" onClick={handleSaveItems}>
                <Save className="w-4 h-4 ml-1" />
                حفظ وإعادة النشر
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {metaGame && (
        <Dialog open onOpenChange={(open) => { if (!open) setMetaGame(null); }}>
          <DialogContent className="sm:max-w-md rounded-3xl" dir="rtl">
            <DialogHeader className="text-right">
              <DialogTitle className="text-xl font-black flex items-center gap-2">
                <RotateCcw className="w-6 h-6 text-primary" />
                إعدادات اللعبة: {metaGame.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-bold">الاسم</Label>
                <Input
                  value={metaForm.name}
                  onChange={(e) => setMetaForm((f) => ({ ...f, name: e.target.value }))}
                  className="rounded-xl border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">الوصف</Label>
                <Textarea
                  value={metaForm.description}
                  onChange={(e) => setMetaForm((f) => ({ ...f, description: e.target.value }))}
                  className="rounded-xl border-border min-h-[80px]"
                />
              </div>
              <ImageUpload
                label="صورة بطاقة اللعبة"
                value={metaForm.imageUrl}
                onChange={(value) => setMetaForm((f) => ({ ...f, imageUrl: value }))}
              />
              <div className="space-y-2">
                <Label className="font-bold">النقاط</Label>
                <Input
                  type="number"
                  value={metaForm.pointsReward}
                  onChange={(e) => setMetaForm((f) => ({ ...f, pointsReward: Number(e.target.value) }))}
                  className="rounded-xl border-border"
                  min={0}
                  max={1000}
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">الصف</Label>
                <Select
                  value={metaForm.classId?.toString() ?? "none"}
                  onValueChange={(value) => setMetaForm((f) => ({ ...f, classId: value === "none" ? null : Number(value) }))}
                >
                  <SelectTrigger className="rounded-xl border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">عامة</SelectItem>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full rounded-xl font-bold h-11" onClick={handleSaveMeta}>
                <Save className="w-4 h-4 ml-1" />
                حفظ الإعدادات
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {isCreateOpen && (
        <Dialog open onOpenChange={(open) => { if (!open) setIsCreateOpen(false); }}>
          <DialogContent className="sm:max-w-md rounded-3xl" dir="rtl">
            <DialogHeader className="text-right">
              <DialogTitle className="text-xl font-black">إضافة لعبة جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-bold">نوع اللعبة</Label>
                <Select
                  value={createForm.type}
                  onValueChange={(value) => setCreateForm((f) => ({ ...f, type: value as GameType }))}
                >
                  <SelectTrigger className="rounded-xl border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GAME_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {GAME_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-bold">اسم اللعبة</Label>
                <Input
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="مثال: طابق الجملة بالصورة"
                  className="rounded-xl border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">الصف</Label>
                <Select
                  value={createForm.classId?.toString() ?? "none"}
                  onValueChange={(value) => setCreateForm((f) => ({ ...f, classId: value === "none" ? null : Number(value) }))}
                >
                  <SelectTrigger className="rounded-xl border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">عامة</SelectItem>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full rounded-xl font-bold h-11"
                onClick={handleCreate}
                disabled={!createForm.name.trim()}
              >
                <Plus className="w-4 h-4 ml-1" />
                إنشاء
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {statsGame && (
        <Dialog open onOpenChange={(open) => { if (!open) setStatsGame(null); }}>
          <DialogContent className="sm:max-w-md rounded-3xl" dir="rtl">
            <DialogHeader className="text-right">
              <DialogTitle className="text-xl font-black flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-primary" />
                إحصائيات اللعبة: {statsGame.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="bg-background rounded-2xl p-4 border border-border flex items-center justify-between">
                <span className="font-bold text-muted-foreground">عدد المحاولات</span>
                <span className="font-black text-foreground text-lg">{statsGame.stats.plays}</span>
              </div>
              <div className="bg-background rounded-2xl p-4 border border-border flex items-center justify-between">
                <span className="font-bold text-muted-foreground">متوسط الأخطاء</span>
                <span className="font-black text-foreground text-lg">{statsGame.stats.avgMistakes}</span>
              </div>
              <div className="bg-background rounded-2xl p-4 border border-border flex items-center justify-between">
                <span className="font-bold text-muted-foreground">متوسط المدة</span>
                <span className="font-black text-foreground text-lg">{statsGame.stats.avgDuration ? `${Math.round(statsGame.stats.avgDuration / 1000)} ث` : "—"}</span>
              </div>
              <div className="bg-background rounded-2xl p-4 border border-border flex items-center justify-between">
                <span className="font-bold text-muted-foreground">النسخة الحالية</span>
                <span className="font-black text-foreground text-lg">v{statsGame.version}</span>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}
