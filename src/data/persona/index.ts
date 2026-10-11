import liaoWenjingCard from "./liao-wenjing.json";
import suYipingCard from "./su-yiping.json";

/**
 * PersonaCard：从微信聊天记录蒸馏出的分层人设卡。
 * 分层渲染优先级见 functions/api/us-chat.ts 的 buildUsChatSystemPrompt：
 * Layer0 coreRules → identity → speechStyle+scenarioExamples →
 * emotionalPatterns → conflictChain → boundaries+corrections → fewShotExchanges。
 */
export type PersonaId = "su-yiping" | "liao-wenjing";

export type PersonaSignatureEmoji = {
  emoji: string;
  when: string;
};

export type PersonaSpeechStyle = {
  catchphrases: string[];
  signatureEmojis: PersonaSignatureEmoji[];
  sentenceStyle: string;
  replyRhythm: string;
  ignoreSignals: string;
};

export type PersonaEmotionalPatterns = {
  care: string;
  upset: string;
  reconcile: string;
  affection: string;
};

export type PersonaConflictChain = {
  triggers: string[];
  escalation: string;
  coldWar: string;
  ending: string;
};

export type PersonaCard = {
  id: PersonaId;
  name: string;
  displayName: string;
  birthYear: number;
  avatarEmoji: string;
  accent: string;
  summary: string;
  coreRules: string[];
  identity: string;
  speechStyle: PersonaSpeechStyle;
  scenarioExamples: Array<{ scene: string; reply: string }>;
  emotionalPatterns: PersonaEmotionalPatterns;
  conflictChain: PersonaConflictChain;
  boundaries: string[];
  memoryFacts: string[];
  fewShotExchanges: Array<{ user: string; assistant: string }>;
  corrections: string[];
};

export const personaCards: Record<PersonaId, PersonaCard> = {
  "su-yiping": suYipingCard as PersonaCard,
  "liao-wenjing": liaoWenjingCard as PersonaCard,
};

export const personaIds = Object.keys(personaCards) as PersonaId[];

export function getPersonaCard(id: string): PersonaCard | null {
  return id === "su-yiping" || id === "liao-wenjing" ? personaCards[id] : null;
}
