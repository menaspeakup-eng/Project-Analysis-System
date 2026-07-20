export type GameType =
  | "match-sentence-picture"
  | "arrange-sentence"
  | "choose-picture"
  | "choose-sentence"
  | "complete-sentence"
  | "arrange-sentences"
  | "grammar-multiple-choice"
  | "grammar-fill-blank"
  | "grammar-classify";

export const GAME_TYPES: GameType[] = [
  "match-sentence-picture",
  "arrange-sentence",
  "choose-picture",
  "choose-sentence",
  "complete-sentence",
  "arrange-sentences",
  "grammar-multiple-choice",
  "grammar-fill-blank",
  "grammar-classify",
];

export const GAME_TYPE_LABELS: Record<GameType, string> = {
  "match-sentence-picture": "طابق الجملة بالصورة",
  "arrange-sentence": "رتب الجملة",
  "choose-picture": "اختر الصورة الصحيحة",
  "choose-sentence": "اختر الجملة الصحيحة",
  "complete-sentence": "أكمل الجملة",
  "arrange-sentences": "ترتيب الجمل",
  "grammar-multiple-choice": "اختر الإجابة النحوية الصحيحة",
  "grammar-fill-blank": "أكمل الفراغ النحوي",
  "grammar-classify": "صنّف الكلمات النحوية",
};

export type GrammarTopic =
  | "nominal-sentence"
  | "verbal-sentence"
  | "inna-and-sisters"
  | "kana-and-sisters"
  | "mudaaf-ilayh"
  | "harf-jarr"
  | "present-tense-verb"
  | "transitive-intransitive-verb"
  | "base-augmented-verb"
  | "faail"
  | "mafuul-bih"
  | "mafuul-mutlaq"
  | "mafuul-liajlih"
  | "mafuul-fihi"
  | "al-asmaaul-khamsah";

export const GRAMMAR_TOPICS: GrammarTopic[] = [
  "nominal-sentence",
  "verbal-sentence",
  "inna-and-sisters",
  "kana-and-sisters",
  "mudaaf-ilayh",
  "harf-jarr",
  "present-tense-verb",
  "transitive-intransitive-verb",
  "base-augmented-verb",
  "faail",
  "mafuul-bih",
  "mafuul-mutlaq",
  "mafuul-liajlih",
  "mafuul-fihi",
  "al-asmaaul-khamsah",
];

export const GRAMMAR_TOPIC_LABELS: Record<GrammarTopic, string> = {
  "nominal-sentence": "الجملة الاسمية",
  "verbal-sentence": "الجملة الفعلية",
  "inna-and-sisters": "إن وأخواتها",
  "kana-and-sisters": "كان وأخواتها",
  "mudaaf-ilayh": "المضاف إليه",
  "harf-jarr": "حروف الجر",
  "present-tense-verb": "الفعل المضارع",
  "transitive-intransitive-verb": "الفعل المتعدي واللازم",
  "base-augmented-verb": "الفعل المجرد والمزيد",
  "faail": "الفاعل",
  "mafuul-bih": "المفعول به",
  "mafuul-mutlaq": "المفعول المطلق",
  "mafuul-liajlih": "المفعول لأجله",
  "mafuul-fihi": "المفعول فيه",
  "al-asmaaul-khamsah": "الأسماء الخمسة",
};

export interface GameItemPayload {
  [key: string]: unknown;
}
