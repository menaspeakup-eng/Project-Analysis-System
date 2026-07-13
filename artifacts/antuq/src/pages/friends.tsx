import { Link } from "wouter";
import { useAuth } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar3D } from "@/components/Avatar3D";
import { avatarBgStyle, AVATAR_GENDERS, avatarAccessoryEmojis, avatarFrameClass } from "@/lib/avatarPresets";
import {
  useGetFriends,
  useGetClassmates,
  useSendFriendRequest,
  useAcceptFriendRequest,
  useRejectFriendRequest,
  useRemoveFriend,
  getGetFriendsQueryKey,
  getGetClassmatesQueryKey,
} from "@workspace/api-client-react";
import type { Friend, Classmate } from "@workspace/api-client-react";
import { ArrowRight, Users, Loader2, UserPlus, Check, X, UserCheck, UserX } from "lucide-react";

function FriendAvatar({ config }: { config: { bgColor: string; gender: string; accessories: string[]; pet: string; frame: string } }) {
  return (
    <div className="relative">
      <Avatar3D
        bgColor={config.bgColor}
        gender={config.gender}
        accessory={config.accessories[0] ?? "none"}
        pet={config.pet}
        frontView
        className={`w-16 h-16 rounded-2xl ${avatarFrameClass(config.frame)}`}
      />
      <span className="absolute -bottom-1 -right-1 text-lg" aria-hidden="true">
        {AVATAR_GENDERS[config.gender]?.emoji ?? AVATAR_GENDERS.male.emoji}
      </span>
    </div>
  );
}

function FriendCard({
  student,
  friendship,
  onAction,
}: {
  student: Friend & { avatarConfig?: Friend["avatarConfig"] };
  friendship?: { id: number; status: string; requesterId: number } | null;
  onAction: (action: string, friendshipId?: number, addresseeId?: number) => void;
}) {
  const config = {
    bgColor: (student.avatarConfig?.bgColor as string) || "orange",
    gender: (student.avatarConfig?.gender as string) || "male",
    accessories: (student.avatarConfig?.accessories as string[]) || [],
    pet: (student.avatarConfig?.pet as string) || "none",
    frame: (student.avatarConfig?.frame as string) || "none",
  };
  const emojis = avatarAccessoryEmojis(config.accessories);
  const isPending = friendship?.status === "pending";
  const isAccepted = friendship?.status === "accepted";
  const isIncoming = isPending && friendship?.requesterId !== student.id;

  return (
    <Card className="rounded-3xl border-border shadow-sm overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0">
            <FriendAvatar config={config} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-black text-foreground truncate">{student.name}</p>
              {isAccepted && (
                <Badge variant="default" className="rounded-full text-xs font-bold">
                  صديق
                </Badge>
              )}
              {isPending && (
                <Badge variant="outline" className="rounded-full text-xs font-bold">
                  طلب معلق
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground font-medium">{student.points} نقطة</p>
            {emojis.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">{emojis.join(" ")}</p>
            )}
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          {isAccepted ? (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 rounded-lg font-bold border-destructive text-destructive hover:bg-destructive/10"
              onClick={() => onAction("remove", friendship?.id)}
            >
              <UserX className="w-4 h-4 ml-1" />
              إزالة
            </Button>
          ) : isIncoming ? (
            <>
              <Button size="sm" className="flex-1 rounded-lg font-bold" onClick={() => onAction("accept", friendship?.id)}>
                <Check className="w-4 h-4 ml-1" />
                قبول
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 rounded-lg font-bold border-destructive text-destructive hover:bg-destructive/10"
                onClick={() => onAction("reject", friendship?.id)}
              >
                <X className="w-4 h-4 ml-1" />
                رفض
              </Button>
            </>
          ) : isPending ? (
            <Button variant="outline" size="sm" className="flex-1 rounded-lg font-bold" disabled>
              <UserCheck className="w-4 h-4 ml-1" />
              تم الإرسال
            </Button>
          ) : (
            <Button size="sm" className="flex-1 rounded-lg font-bold" onClick={() => onAction("request", undefined, student.id)}>
              <UserPlus className="w-4 h-4 ml-1" />
              إضافة صديق
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Friends() {
  const { isSignedIn } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: friendsData, isLoading: isFriendsLoading } = useGetFriends({ query: { enabled: !!isSignedIn } as never });
  const { data: classmatesData, isLoading: isClassmatesLoading } = useGetClassmates({ query: { enabled: !!isSignedIn } as never });
  const { mutate: sendRequest } = useSendFriendRequest();
  const { mutate: accept } = useAcceptFriendRequest();
  const { mutate: reject } = useRejectFriendRequest();
  const { mutate: remove } = useRemoveFriend();

  const friends = friendsData?.friends ?? [];
  const classmates = classmatesData?.classmates ?? [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetFriendsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetClassmatesQueryKey() });
  };

  const handleAction = (action: string, friendshipId?: number, addresseeId?: number) => {
    const onSuccess = () => {
      toast({ title: "تم تحديث قائمة الأصدقاء" });
      invalidate();
    };
    const onError = (err: Error) => {
      toast({ title: "تعذر تنفيذ العملية", description: err.message, variant: "destructive" });
    };

    if (action === "request" && addresseeId) {
      sendRequest({ data: { addresseeId } }, { onSuccess, onError });
    } else if (action === "accept" && friendshipId) {
      accept({ id: friendshipId }, { onSuccess, onError });
    } else if (action === "reject" && friendshipId) {
      reject({ id: friendshipId }, { onSuccess, onError });
    } else if (action === "remove" && friendshipId) {
      remove({ id: friendshipId }, { onSuccess, onError });
    }
  };

  const isLoading = isFriendsLoading || isClassmatesLoading;

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-20 bg-white/80 dark:bg-black/60 backdrop-blur-md border-b border-border">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/portal" className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors">
              <ArrowRight className="w-5 h-5 rotate-180" />
            </Link>
            <h1 className="text-lg font-black text-foreground">الأصدقاء</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <Card className="rounded-3xl border-border shadow-sm overflow-hidden bg-gradient-to-l from-[hsl(335,75%,94%)] to-white">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/80 flex items-center justify-center text-[hsl(335,75%,50%)] shadow-sm">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground">أصدقاؤك في الصف</h2>
              <p className="text-sm text-muted-foreground font-medium">تعرف على زملائك وأضفهم كأصدقاء.</p>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {friends.length > 0 && (
              <section className="space-y-3">
                <h3 className="font-black text-foreground text-lg">أصدقائي</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {friends.map((friend) => (
                    <FriendCard
                      key={friend.id}
                      student={friend}
                      friendship={null}
                      onAction={handleAction}
                    />
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-3">
              <h3 className="font-black text-foreground text-lg">زملائي في الصف</h3>
              {classmates.length === 0 ? (
                <Card className="rounded-3xl border-border shadow-sm">
                  <CardContent className="p-8 text-center text-muted-foreground font-medium">
                    <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                    لا يوجد زملاء في الصف حالياً.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {classmates.map((classmate) => (
                    <FriendCard
                      key={classmate.id}
                      student={classmate}
                      friendship={classmate.friendship}
                      onAction={handleAction}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
