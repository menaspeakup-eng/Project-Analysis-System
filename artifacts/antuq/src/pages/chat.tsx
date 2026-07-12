import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetChatRooms,
  useGetChatMessages,
  useSendChatMessage,
  useDeleteChatMessage,
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
  Crown,
  Star,
  GraduationCap,
} from "lucide-react";

const MUTE_DURATIONS = [
  { label: "15 دقيقة", minutes: 15 },
  { label: "ساعة", minutes: 60 },
  { label: "6 ساعات", minutes: 360 },
  { label: "24 ساعة", minutes: 1440 },
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

export default function ChatPage() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { data: identity } = useGetIdentityMe({ query: { enabled: true } as never });
  const [selectedRoom, setSelectedRoom] = useState<string>("general");
  const [input, setInput] = useState("");
  const [profileStudent, setProfileStudent] = useState<ChatMessage | null>(null);
  const [muteStudent, setMuteStudent] = useState<{ id: number; name: string } | null>(null);
  const [muteDuration, setMuteDuration] = useState<number>(60);
  const [muteReason, setMuteReason] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: roomsData } = useGetChatRooms({ query: { enabled: true } as never });
  const { data: messagesData, isLoading: isMessagesLoading } = useGetChatMessages(
    selectedRoom,
    { query: { enabled: !!selectedRoom, refetchInterval: 5000 } as never },
  );
  const { data: mutesData } = useGetChatMutes(
    selectedRoom,
    { query: { enabled: !!selectedRoom && (identity?.isTeacher || identity?.isAdmin), refetchInterval: 5000 } as never },
  );
  const { mutate: sendMessage, isPending: isSending } = useSendChatMessage();
  const { mutate: deleteMessage } = useDeleteChatMessage();
  const { mutate: mute } = useMuteChatStudent();
  const { mutate: unmute } = useUnmuteChatStudent();

  const rooms = roomsData?.rooms ?? [];
  const messages = messagesData?.messages ?? [];
  const mutes = mutesData?.mutes ?? [];
  const isModerator = identity?.isTeacher || identity?.isAdmin;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || !selectedRoom) return;
    sendMessage(
      { classId: selectedRoom, data: { content: input.trim() } },
      {
        onSuccess: () => {
          setInput("");
          inputRef.current?.focus();
          queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms", selectedRoom, "messages"] });
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
          queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms", selectedRoom, "messages"] });
        },
      },
    );
  };

  const handleMute = () => {
    if (!muteStudent || !selectedRoom) return;
    mute(
      {
        classId: selectedRoom,
        data: { studentId: muteStudent.id, durationMinutes: muteDuration, reason: muteReason || undefined },
      },
      {
        onSuccess: () => {
          setMuteStudent(null);
          setMuteReason("");
          queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms", selectedRoom, "mutes"] });
        },
      },
    );
  };

  const handleUnmute = (studentId: number) => {
    unmute(
      { classId: selectedRoom, studentId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms", selectedRoom, "mutes"] });
        },
      },
    );
  };

  const selectedRoomName = rooms.find((r) => r.id === selectedRoom)?.name ?? "الشات";

  return (
    <div className="min-h-screen bg-[hsl(40,33%,98%)] flex flex-col" dir="rtl">
      <header className="bg-white border-b border-border px-4 py-3 flex items-center justify-between gap-3 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => setLocation(identity?.isTeacher || identity?.isAdmin ? "/teacher" : "/portal")}
          >
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            <h1 className="font-black text-lg">{selectedRoomName}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedRoom} onValueChange={setSelectedRoom}>
            <SelectTrigger className="w-40 h-9 rounded-xl border-border bg-background font-bold text-sm">
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
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col md:flex-row">
        <aside className="hidden md:flex w-64 bg-white border-l border-border flex-col">
          <div className="p-4 border-b border-border">
            <h2 className="font-bold text-sm text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              الغرف
            </h2>
          </div>
          <div className="p-2 space-y-1 overflow-y-auto">
            {rooms.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRoom(r.id)}
                className={`w-full text-right px-3 py-2 rounded-xl font-bold text-sm transition-colors ${
                  selectedRoom === r.id
                    ? "bg-primary text-white"
                    : "hover:bg-muted text-foreground"
                }`}
              >
                {r.id === "general" ? (
                  <span className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    {r.name}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" />
                    {r.name}
                  </span>
                )}
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
                    <span className="text-xs font-bold truncate">{m.studentName}</span>
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

        <section className="flex-1 flex flex-col bg-[hsl(40,33%,98%)]">
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
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                      <Card
                        className={`inline-block px-4 py-2 rounded-2xl border-0 shadow-sm ${
                          msg.isDeleted
                            ? "bg-muted text-muted-foreground italic"
                            : isMe
                              ? "bg-primary text-white rounded-tr-none"
                              : "bg-white text-foreground rounded-tl-none"
                        }`}
                      >
                        <p className="text-sm font-medium whitespace-pre-wrap">{msg.content}</p>
                      </Card>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 bg-white border-t border-border">
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
          </div>
        </section>
      </main>

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
                  value={String(muteDuration)}
                  onValueChange={(v) => setMuteDuration(Number(v))}
                >
                  <SelectTrigger className="rounded-xl border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {MUTE_DURATIONS.map((d) => (
                      <SelectItem key={d.minutes} value={String(d.minutes)}>
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
