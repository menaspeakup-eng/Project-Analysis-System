import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetChatRooms,
  useGetChatMessages,
  useSendChatMessage,
  useDeleteChatMessage,
  useDeleteChatMessagePermanent,
  useToggleChatClass,
  useMuteChatStudent,
  useUnmuteChatStudent,
  useGetChatMutes,
  useGetIdentityMe,
} from "@workspace/api-client-react";
import type { ChatMessage } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Send,
  MoreVertical,
  Trash2,
  VolumeX,
  Volume2,
  Users,
  MessageCircle,
  GraduationCap,
  Crown,
  Shield,
  Power,
  AlertTriangle,
} from "lucide-react";

const MUTE_DURATIONS = [
  { label: "15 دقيقة", minutes: 15 },
  { label: "ساعة", minutes: 60 },
  { label: "6 ساعات", minutes: 360 },
  { label: "24 ساعة", minutes: 1440 },
  { label: "دائم", minutes: null as number | null },
];

function avatarBgStyleFor(bgColor?: string): React.CSSProperties {
  const map: Record<string, string> = {
    orange: "hsl(15, 85%, 55%)",
    blue: "hsl(200, 80%, 55%)",
    green: "hsl(150, 55%, 45%)",
    purple: "hsl(265, 60%, 55%)",
    pink: "hsl(340, 75%, 60%)",
    yellow: "hsl(45, 90%, 55%)",
  };
  return { backgroundColor: map[bgColor || "orange"] || map.orange };
}

function formatTime(dateStr?: string | Date): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
}

function formatMuteRemaining(mutedUntil?: string | Date | null): string {
  if (mutedUntil == null) return "دائم";
  const diff = new Date(mutedUntil).getTime() - Date.now();
  if (diff <= 0) return "انتهى";
  const minutes = Math.ceil(diff / 60_000);
  if (minutes < 60) return `${minutes} دقيقة`;
  const hours = Math.ceil(minutes / 60);
  if (hours < 24) return `${hours} ساعة`;
  return `${Math.ceil(hours / 24)} يوم`;
}

function ProfileModal({
  student,
  open,
  onClose,
}: {
  student: ChatMessage | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!student) return null;
  const level = student.senderLevel;
  const title =
    level >= 10 ? "خبير" : level >= 5 ? "متمرس" : level >= 3 ? "متعلم" : "مبتدئ";

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-sm rounded-3xl text-center" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black">الملف الشخصي</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-2">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-black shadow-md"
            style={avatarBgStyleFor(student.senderAvatarConfig?.bgColor as string)}
          >
            {student.senderName.charAt(0)}
          </div>
          <div>
            <p className="font-black text-lg">{student.senderName}</p>
            <p className="text-sm text-muted-foreground font-medium">
              {title} · المستوى {level}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 w-full">
            <div className="bg-background rounded-2xl p-3 border border-border">
              <p className="text-xs text-muted-foreground font-medium">النقاط</p>
              <p className="font-black text-lg">{student.senderPoints}</p>
            </div>
            <div className="bg-background rounded-2xl p-3 border border-border">
              <p className="text-xs text-muted-foreground font-medium">المستوى</p>
              <p className="font-black text-lg">{level}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export interface ChatPanelProps {
  backUrl?: string;
}

export function ChatPanel({ backUrl }: ChatPanelProps) {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { data: identity } = useGetIdentityMe({ query: { enabled: true } as never });
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [profileStudent, setProfileStudent] = useState<ChatMessage | null>(null);
  const [muteStudent, setMuteStudent] = useState<{ id: number; name: string } | null>(null);
  const [muteDuration, setMuteDuration] = useState<number | null>(60);
  const [muteReason, setMuteReason] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: roomsData, isLoading: isRoomsLoading } = useGetChatRooms({
    query: { enabled: true } as never,
  });
  const { data: messagesData, isLoading: isMessagesLoading } = useGetChatMessages(
    selectedClassId ?? 0,
    { query: { enabled: selectedClassId != null, refetchInterval: 5000 } as never },
  );
  const { data: mutesData } = useGetChatMutes(
    selectedClassId ?? 0,
    {
      query: {
        enabled: selectedClassId != null && (identity?.isTeacher || identity?.isAdmin),
        refetchInterval: 5000,
      } as never,
    },
  );
  const { mutate: sendMessage, isPending: isSending } = useSendChatMessage();
  const { mutate: deleteMessage } = useDeleteChatMessage();
  const { mutate: deletePermanent } = useDeleteChatMessagePermanent();
  const { mutate: toggleChat } = useToggleChatClass();
  const { mutate: mute } = useMuteChatStudent();
  const { mutate: unmute } = useUnmuteChatStudent();

  const rooms = roomsData?.rooms ?? [];
  const messages = messagesData?.messages ?? [];
  const mutes = mutesData?.mutes ?? [];
  const isAdmin = identity?.isAdmin ?? false;
  const isTeacher = identity?.isTeacher ?? false;
  const isModerator = isTeacher || isAdmin;

  // Teachers can only see their first class; admins can switch between all classes.
  const canSwitchClass = isAdmin && rooms.length > 1;
  const visibleRooms = isTeacher ? rooms.slice(0, 1) : rooms;

  useEffect(() => {
    if (selectedClassId != null || visibleRooms.length === 0) return;
    setSelectedClassId(visibleRooms[0].classId);
  }, [visibleRooms, selectedClassId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectedRoom = rooms.find((r) => r.classId === selectedClassId);
  const selectedRoomName = selectedRoom?.name ?? "الشات";
  const isChatEnabled = selectedRoom?.isChatEnabled ?? true;

  const messagesQueryKey = ["/api/chat/rooms", selectedClassId, "messages"];
  const mutesQueryKey = ["/api/chat/rooms", selectedClassId, "mutes"];
  const roomsQueryKey = ["/api/chat/rooms"];

  const handleSend = () => {
    if (!input.trim() || selectedClassId == null) return;
    sendMessage(
      { classId: selectedClassId, data: { content: input.trim() } },
      {
        onSuccess: () => {
          setInput("");
          inputRef.current?.focus();
          queryClient.invalidateQueries({ queryKey: messagesQueryKey });
        },
        onError: (error) => {
          const err = error as { message?: string };
          alert(err?.message || "حدث خطأ أثناء إرسال الرسالة");
        },
      },
    );
  };

  const handleDelete = (id: number) => {
    if (!window.confirm("هل تريد حذف هذه الرسالة؟")) return;
    deleteMessage(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: messagesQueryKey });
        },
      },
    );
  };

  const handleDeletePermanent = (id: number) => {
    if (!window.confirm("هل تريد حذف هذه الرسالة بشكل نهائي؟ لا يمكن التراجع عن هذا الإجراء.")) return;
    deletePermanent(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: messagesQueryKey });
        },
      },
    );
  };

  const handleToggleChat = () => {
    if (selectedClassId == null) return;
    toggleChat(
      { classId: selectedClassId, data: { enabled: !isChatEnabled } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: roomsQueryKey });
          queryClient.invalidateQueries({ queryKey: messagesQueryKey });
        },
      },
    );
  };

  const handleMute = () => {
    if (!muteStudent || selectedClassId == null) return;
    mute(
      {
        classId: selectedClassId,
        data: { studentId: muteStudent.id, durationMinutes: muteDuration, reason: muteReason || undefined },
      },
      {
        onSuccess: () => {
          setMuteStudent(null);
          setMuteReason("");
          setMuteDuration(60);
          queryClient.invalidateQueries({ queryKey: mutesQueryKey });
        },
      },
    );
  };

  const handleUnmute = (studentId: number) => {
    if (selectedClassId == null) return;
    unmute(
      { classId: selectedClassId, studentId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: mutesQueryKey });
        },
      },
    );
  };

  const handleBack = () => {
    if (backUrl) {
      setLocation(backUrl);
    } else {
      setLocation(isModerator ? "/teacher" : "/portal");
    }
  };

  if (isRoomsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60dvh]">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60dvh] text-muted-foreground gap-3" dir="rtl">
        <MessageCircle className="w-12 h-12 opacity-30" />
        <p className="font-bold text-lg">لا يوجد شات متاح لك حالياً</p>
        <p className="text-sm font-medium">تواصل مع الأدمن إذا كنت تعتقد أن هذا خطأ.</p>
        {backUrl && (
          <Button variant="outline" className="rounded-xl font-bold mt-2" onClick={handleBack}>
            <ArrowRight className="w-4 h-4 ml-2" />
            رجوع
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[hsl(40,33%,98%)]" dir="rtl">
      <div className="bg-white border-b border-border px-4 py-3 flex items-center justify-between gap-3 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={handleBack}
          >
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            <h2 className="font-black text-lg">{selectedRoomName}</h2>
          </div>
          {isModerator && (
            <Badge variant="outline" className="rounded-full font-bold text-primary border-primary hidden sm:flex">
              {isAdmin ? (
                <>
                  <Shield className="w-3 h-3 ml-1" /> أدمن
                </>
              ) : (
                <>
                  <Crown className="w-3 h-3 ml-1" /> معلم
                </>
              )}
            </Badge>
          )}
          {!isChatEnabled && (
            <Badge variant="secondary" className="rounded-full font-bold text-destructive bg-destructive/10 hidden sm:flex">
              <Power className="w-3 h-3 ml-1" /> معطل
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isModerator && (
            <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-1.5">
              <span className="text-xs font-bold text-muted-foreground hidden sm:inline">
                {isChatEnabled ? "الشات مفعّل" : "الشات معطل"}
              </span>
              <Switch
                checked={isChatEnabled}
                onCheckedChange={handleToggleChat}
                aria-label="تفعيل/تعطيل الشات"
              />
            </div>
          )}
          {canSwitchClass ? (
            <Select
              value={selectedClassId?.toString() ?? ""}
              onValueChange={(v) => setSelectedClassId(Number(v))}
            >
              <SelectTrigger className="w-44 h-9 rounded-xl border-border bg-background font-bold text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {rooms.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-sm font-bold text-muted-foreground hidden sm:inline">
              {rooms[0]?.name}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0">
        <aside className={`${canSwitchClass ? "hidden md:flex w-64" : "hidden"} bg-white border-l border-border flex-col`}>
          <div className="p-4 border-b border-border">
            <h2 className="font-bold text-sm text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              الصفوف
            </h2>
          </div>
          <div className="p-2 space-y-1 overflow-y-auto">
            {rooms.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedClassId(r.classId)}
                className={`w-full text-right px-3 py-2 rounded-xl font-bold text-sm transition-colors ${
                  selectedClassId === r.classId
                    ? "bg-primary text-white"
                    : "hover:bg-muted text-foreground"
                }`}
              >
                <span className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  {r.name}
                </span>
              </button>
            ))}
          </div>

          {isModerator && mutes.length > 0 && (
            <div className="mt-auto border-t border-border p-3">
              <h3 className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1">
                <VolumeX className="w-3 h-3" />
                محظورون الآن
              </h3>
              <div className="space-y-2">
                {mutes.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between bg-muted rounded-xl px-2 py-1.5"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold truncate">{m.studentName}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatMuteRemaining(m.mutedUntil)}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs font-bold text-primary"
                      onClick={() => handleUnmute(m.studentId)}
                    >
                      <Volume2 className="w-3 h-3 ml-1" />
                      إلغاء
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        <section className="flex-1 flex flex-col bg-[hsl(40,33%,98%)] min-h-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isMessagesLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                <MessageCircle className="w-12 h-12 opacity-30" />
                <p className="font-medium">لا توجد رسائل بعد. ابدأ المحادثة!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === identity?.studentId;
                const canDelete = isMe || isModerator;
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isMe ? "flex-row" : "flex-row-reverse"}`}
                  >
                    <button
                      onClick={() => setProfileStudent(msg)}
                      className="shrink-0 focus:outline-none focus:ring-2 focus:ring-primary rounded-full"
                    >
                      <Avatar className="w-10 h-10 border-2 border-white shadow-sm">
                        <AvatarFallback
                          className="text-white font-black"
                          style={avatarBgStyleFor(msg.senderAvatarConfig?.bgColor as string)}
                        >
                          {msg.senderName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                    <div className={`flex-1 ${isMe ? "text-right" : "text-left"}`}>
                      <div className="flex items-center gap-2 mb-1 justify-end">
                        <span className="font-bold text-sm">{msg.senderName}</span>
                        <span className="text-xs text-muted-foreground">{formatTime(msg.createdAt)}</span>
                        {msg.isDeleted && (
                          <Badge variant="outline" className="rounded-full text-[10px] font-bold border-destructive text-destructive">
                            <AlertTriangle className="w-3 h-3 ml-1" /> محذوف
                          </Badge>
                        )}
                        {canDelete && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full">
                                <MoreVertical className="w-3 h-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl">
                              {isModerator && msg.senderId !== identity?.studentId && (
                                <DropdownMenuItem
                                  className="font-bold text-foreground rounded-lg cursor-pointer"
                                  onClick={() => setMuteStudent({ id: msg.senderId, name: msg.senderName })}
                                >
                                  <VolumeX className="w-4 h-4 ml-2" />
                                  حظر الطالب
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="font-bold text-destructive rounded-lg cursor-pointer"
                                onClick={() => handleDelete(msg.id)}
                              >
                                <Trash2 className="w-4 h-4 ml-2" />
                                حذف الرسالة
                              </DropdownMenuItem>
                              {isAdmin && (
                                <DropdownMenuItem
                                  className="font-bold text-destructive rounded-lg cursor-pointer"
                                  onClick={() => handleDeletePermanent(msg.id)}
                                >
                                  <Trash2 className="w-4 h-4 ml-2" />
                                  حذف نهائي
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                      <Card
                        className={`inline-block px-4 py-2 rounded-2xl border-0 shadow-sm ${
                          msg.isDeleted
                            ? "bg-muted text-foreground border border-destructive/30"
                            : isMe
                              ? "bg-primary text-white rounded-tr-none"
                              : "bg-white text-foreground rounded-tl-none"
                        }`}
                      >
                        <p className={`text-sm font-medium whitespace-pre-wrap ${msg.isDeleted ? "italic" : ""}`}>{msg.content}</p>
                      </Card>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 bg-white border-t border-border">
            {!isChatEnabled ? (
              <div className="flex items-center justify-center gap-2 text-destructive font-bold text-sm py-2">
                <Power className="w-4 h-4" />
                الشات معطل في هذا الصف
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
                  placeholder="اكتب رسالتك..."
                  className="flex-1 rounded-full border-border h-11 px-4"
                  disabled={isSending}
                  maxLength={1000}
                />
                <Button
                  size="icon"
                  className="rounded-full h-11 w-11"
                  onClick={handleSend}
                  disabled={!input.trim() || isSending}
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            )}
          </div>
        </section>
      </div>

      <ProfileModal
        student={profileStudent}
        open={!!profileStudent}
        onClose={() => setProfileStudent(null)}
      />

      {muteStudent && (
        <Dialog open onOpenChange={(open) => { if (!open) setMuteStudent(null); }}>
          <DialogContent className="sm:max-w-md rounded-3xl" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black flex items-center gap-2">
                <VolumeX className="w-6 h-6 text-destructive" />
                حظر {muteStudent.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="font-bold text-sm">مدة الحظر</label>
                <Select
                  value={muteDuration === null ? "null" : String(muteDuration)}
                  onValueChange={(v) => setMuteDuration(v === "null" ? null : Number(v))}
                >
                  <SelectTrigger className="rounded-xl border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {MUTE_DURATIONS.map((d) => (
                      <SelectItem key={d.minutes ?? "null"} value={d.minutes === null ? "null" : String(d.minutes)}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="font-bold text-sm">السبب (اختياري)</label>
                <Input
                  value={muteReason}
                  onChange={(e) => setMuteReason(e.target.value)}
                  placeholder="مثال: إرسال محتوى غير لائق"
                  className="rounded-xl border-border"
                  maxLength={500}
                />
              </div>
              <Button className="w-full rounded-xl font-bold h-11" onClick={handleMute}>
                <VolumeX className="w-4 h-4 ml-2" />
                تأكيد الحظر
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
