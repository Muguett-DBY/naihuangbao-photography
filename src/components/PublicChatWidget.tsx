import {
  Bot,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import {
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type PublicChatWidgetProps = {
  open: boolean;
  onClose: () => void;
};

const chatRequestTimeoutMs = 16_000;
const chatRevealDelayMs = 40;

export default function PublicChatWidget({ open, onClose }: PublicChatWidgetProps) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: "assistant-welcome",
    role: "assistant",
    content: t("chat.welcome"),
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const revealTimerRef = useRef<number | null>(null);
  const composingRef = useRef(false);
  const sendingRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 120);
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, loading, typing, open]);

  useEffect(() => {
    return () => {
      if (revealTimerRef.current !== null) {
        window.clearTimeout(revealTimerRef.current);
      }
    };
  }, []);

  function clearRevealTimer() {
    if (revealTimerRef.current !== null) {
      window.clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
    setTyping(false);
  }

  function revealAssistantReply(messageId: string, rawReply: unknown) {
    clearRevealTimer();
    const reply = normalizeAssistantReplyText(rawReply, t("chat.emptyReply"));
    const characters = Array.from(reply);

    setMessages((prev) => prev.map((message) => (
      message.id === messageId ? { ...message, content: "" } : message
    )));
    setTyping(true);
    let index = 0;

    return new Promise<void>((resolve) => {
      function finishReveal() {
        clearRevealTimer();
        resolve();
      }

      function revealNextCharacter() {
        index = Math.min(characters.length, index + 1);
        const visibleReply = characters.slice(0, index).join("");
        setMessages((prev) => prev.map((message) => (
          message.id === messageId ? { ...message, content: visibleReply } : message
        )));

        if (index < characters.length) {
          revealTimerRef.current = window.setTimeout(revealNextCharacter, chatRevealDelayMs);
          return;
        }

        revealTimerRef.current = window.setTimeout(finishReveal, chatRevealDelayMs);
      }

      revealTimerRef.current = window.setTimeout(revealNextCharacter, chatRevealDelayMs);
    });
  }

  async function revealAssistantStream(messageId: string, body: ReadableStream<Uint8Array>) {
    clearRevealTimer();

    const reader = body.getReader();
    const decoder = new TextDecoder();

    setTyping(true);
    let displayed = "";
    let pendingCharacters: string[] = [];
    let streamDone = false;
    let streamError: unknown = null;
    let fallbackQueued = false;

    const revealDone = new Promise<void>((resolve, reject) => {
      function finishReveal() {
        revealTimerRef.current = window.setTimeout(() => {
          clearRevealTimer();
          if (streamError) {
            reject(streamError);
          } else {
            resolve();
          }
        }, chatRevealDelayMs);
      }

      function tick() {
        if (pendingCharacters.length > 0) {
          displayed += pendingCharacters.shift() ?? "";
          setMessages((prev) => prev.map((message) => (
            message.id === messageId ? { ...message, content: displayed } : message
          )));
          revealTimerRef.current = window.setTimeout(tick, chatRevealDelayMs);
          return;
        }

        if (streamDone) {
          if (!streamError && !displayed.trim() && !fallbackQueued) {
            pendingCharacters = Array.from(t("chat.emptyReply"));
            fallbackQueued = true;
            revealTimerRef.current = window.setTimeout(tick, chatRevealDelayMs);
            return;
          }
          finishReveal();
          return;
        }

        revealTimerRef.current = window.setTimeout(tick, chatRevealDelayMs);
      }

      revealTimerRef.current = window.setTimeout(tick, chatRevealDelayMs);
    });

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk) {
          pendingCharacters.push(...Array.from(chunk));
        }
      }
      const finalChunk = decoder.decode();
      if (finalChunk) {
        pendingCharacters.push(...Array.from(finalChunk));
      }
    } catch (err) {
      streamError = err;
    } finally {
      streamDone = true;
    }

    await revealDone;
  }

  async function sendMessage(rawText = input) {
    const question = rawText.trim();
    if (!question || loading || typing || sendingRef.current) return;
    sendingRef.current = true;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: question,
    };
    const nextMessages = [
      ...messages.filter((message) => message.id !== "assistant-welcome"),
      userMessage,
    ].slice(-6);

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const response = await fetchChatResponse(nextMessages);

      const assistantId = `assistant-${Date.now()}`;
      setLoading(false);
      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);
      const contentType = response.headers.get("content-type") ?? "";
      if (response.body && !contentType.includes("application/json")) {
        await revealAssistantStream(assistantId, response.body);
      } else {
        const data = (await response.json().catch(() => ({}))) as { reply?: unknown };
        await revealAssistantReply(assistantId, data.reply);
      }
    } catch (err) {
      setError(err instanceof Error && err.message !== "unavailable" ? err.message : t("chat.unavailable"));
      setLoading(false);
    } finally {
      sendingRef.current = false;
    }
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || composingRef.current) return;
    event.preventDefault();
    void sendMessage();
  }

  if (!open) return null;

  return (
    <section
          className="public-chat-panel"
          id="public-chat-panel"
          aria-label={t("chat.ariaLabel")}
        >
          <header className="public-chat-head">
            <div className="public-chat-mark">
              <Bot size={18} />
            </div>
            <div>
              <span><Sparkles size={14} /> {t("chat.brandName")}</span>
              <h2>{t("chat.title")}</h2>
            </div>
            <button type="button" className="public-chat-close" onClick={onClose} aria-label={t("chat.closeLabel")}>
              <X size={18} />
            </button>
          </header>

          <div className="public-chat-log" aria-live="polite">
            {messages.map((message, index) => (
              <div className={`public-chat-message public-chat-message-${message.role}`} key={message.id}>
                <div className="public-chat-avatar">{message.role === "assistant" ? <Bot size={15} /> : t("chat.avatarLabel")}</div>
                <div className="public-chat-bubble">
                  <p>{message.content}</p>
                  {typing && index === messages.length - 1 && message.role === "assistant" ? (
                    <span className="public-chat-typing-label" aria-live="polite">
                      typing...
                      <span className="public-chat-cursor" aria-hidden="true" />
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
            {loading ? (
              <div className="public-chat-message public-chat-message-assistant">
                <div className="public-chat-avatar"><Bot size={15} /></div>
                <div className="public-chat-bubble public-chat-thinking">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            ) : null}
            <div ref={endRef} />
          </div>

          <div className="public-chat-prompts" aria-label={t("chat.promptsLabel")}>
            {t("chat.prompts", { returnObjects: true }).map((prompt: string) => (
              <button
                type="button"
                key={prompt}
                onClick={() => void sendMessage(prompt)}
                disabled={loading || typing}
              >
                {prompt}
              </button>
            ))}
          </div>

          {error ? <p className="public-chat-error">{error}</p> : null}

          <div className="public-chat-form">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleInputKeyDown}
              onCompositionStart={() => { composingRef.current = true; }}
              onCompositionEnd={() => { composingRef.current = false; }}
              placeholder={t("chat.placeholder")}
              aria-label={t("chat.inputLabel")}
              maxLength={400}
              disabled={loading || typing}
            />
            <button
              type="button"
              onClick={() => void sendMessage()}
              disabled={!input.trim() || loading || typing}
              aria-label={t("chat.sendLabel")}
            >
              <Send size={18} />
            </button>
          </div>
        </section>
  );
}

async function fetchChatResponse(messages: ChatMessage[]) {
  const body = JSON.stringify({
    messages: messages.map(({ role, content }) => ({ role, content })),
  });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const timeout = createTimeoutController(chatRequestTimeoutMs);
    let response: Response;

    try {
      response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
        signal: timeout.controller.signal,
      });
    } catch (err) {
      timeout.clear();
      const canRetry = err instanceof DOMException && err.name === "AbortError" && attempt === 0;
      if (canRetry) {
        await wait(650);
        continue;
      }
      throw new Error("unavailable");
    }

    timeout.clear();

    if (response.ok) return response;

    const data = (await response.json().catch(() => ({}))) as { error?: string };
    const canRetry = (response.status === 502 || response.status === 503 || response.status === 504) && attempt === 0;
    if (!canRetry) {
      throw new Error(data.error ?? "unavailable");
    }

    await wait(650);
  }

  throw new Error("unavailable");
}

function createTimeoutController(ms: number) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), ms);

  return {
    controller,
    clear: () => window.clearTimeout(timeout),
  };
}

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function normalizeAssistantReplyText(reply: unknown, fallback: string) {
  if (typeof reply !== "string") return fallback;
  return reply.trim() || fallback;
}
