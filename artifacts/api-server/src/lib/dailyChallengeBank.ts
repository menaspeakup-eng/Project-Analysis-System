// A small fixed bank of reading/pronunciation prompts. "Today's challenge" is
// derived deterministically from the date (see getOrCreateTodayChallenge),
// since there is no teacher-authoring tool yet to create challenges manually.
export const dailyChallengeBank: Array<{
  title: string;
  description: string;
  pointsReward: number;
}> = [
  {
    title: "تحدي الحروف المتشابهة",
    description: "اقرأ بصوت عالٍ الكلمات التالية وميّز بين حرفي (س) و(ص): سيف، صيف، سر، صر.",
    pointsReward: 20,
  },
  {
    title: "تحدي القافية",
    description: "اختر ثلاث كلمات تنتهي بنفس صوت كلمة (كتاب) وانطقها بوضوح.",
    pointsReward: 15,
  },
  {
    title: "تحدي الجملة الطويلة",
    description: "اقرأ الجملة كاملة بنفس واحد دون توقف: \"ذهب الطفل إلى الحديقة ليلعب مع أصدقائه في الصباح\".",
    pointsReward: 25,
  },
  {
    title: "تحدي الحروف الشمسية",
    description: "انطق الكلمات التالية مع نطق اللام بوضوح: الشمس، الرجل، الطريق، النهر.",
    pointsReward: 15,
  },
  {
    title: "تحدي القراءة السريعة",
    description: "اقرأ الأرقام التالية بالعربية دون توقف: واحد، اثنان، ثلاثة، أربعة، خمسة.",
    pointsReward: 20,
  },
  {
    title: "تحدي الحوار",
    description: "اقرأ هذا الحوار بصوتين مختلفين: \"- كيف حالك؟ - أنا بخير، شكراً لك.\"",
    pointsReward: 20,
  },
  {
    title: "تحدي الأصوات الطويلة",
    description: "انطق هذه الكلمات مع تطويل الحركة بوضوح: نور، سور، دار، بار.",
    pointsReward: 15,
  },
  {
    title: "تحدي القصة القصيرة",
    description: "اقرأ هذه القصة القصيرة بصوت واضح ومعبّر: \"كان هناك عصفور صغير يحب الطيران في السماء كل صباح.\"",
    pointsReward: 25,
  },
  {
    title: "تحدي الأسئلة",
    description: "اقرأ هذه الأسئلة بنغمة استفهام صحيحة: هل أكلت؟ متى ستأتي؟ أين ذهبت؟",
    pointsReward: 15,
  },
  {
    title: "تحدي التشكيل",
    description: "اقرأ الكلمات مع الانتباه للتشكيل: كَتَبَ، كُتِبَ، كِتاب.",
    pointsReward: 20,
  },
];

// Deterministic day-of-year index, stable regardless of timezone drift within a day.
export function bankIndexForDate(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return dayOfYear % dailyChallengeBank.length;
}
