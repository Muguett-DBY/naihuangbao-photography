export type PublicChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const CHAT_HISTORY_KEY = "chat-history";
const MAX_HISTORY_MESSAGES = 20;

export function loadPublicChatHistory(welcome: string): PublicChatMessage[] {
  try {
    const saved = localStorage.getItem(CHAT_HISTORY_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as PublicChatMessage[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // Storage can be unavailable in private or embedded browser contexts.
  }
  return [{ id: "assistant-welcome", role: "assistant", content: welcome }];
}

export function savePublicChatHistory(messages: PublicChatMessage[]) {
  if (messages.length <= 1 && messages[0]?.id === "assistant-welcome") return;
  try {
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages.slice(-MAX_HISTORY_MESSAGES)));
  } catch {
    // Chat remains usable when persistence is unavailable.
  }
}
