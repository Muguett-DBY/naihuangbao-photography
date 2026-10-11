import "../styles/us-chat.css";
import { ArrowLeft, KeyRound, RotateCcw, Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { PageTransition } from "../components/shared/PageTransition";
import { useChatReveal } from "../hooks/useChatReveal";
import { useSEO } from "../hooks/useSEO";

type PersonaId = "su-yiping" | "liao-wenjing";
type Stage = "pick" | "gate" | "chat";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
  error?: boolean;
};

type ChatSession = { persona: PersonaId; password: string };

/** 前端只放展示层信息 + 暗号摘要；人设提示词全部留在服务端。 */
const PERSONAS = [
  { id: "su-yiping", avatar: "🐻", nameKey: "usChat.personas.su.name", tagKey: "usChat.personas.su.tag", lineKey: "usChat.personas.su.line" },
  { id: "liao-wenjing", avatar: "💕", nameKey: "usChat.personas.liao.name", tagKey: "usChat.personas.liao.tag", lineKey: "usChat.personas.liao.line" },
] as const;

const PERSONA_SALTS: Record<PersonaId, string> = {
  "su-yiping": "salt-su-2025",
  "liao-wenjing": "salt-liao-2025",
};

/** SHA-256(盐 + 明文) 的十六进制摘要，服务端会按同一规则二次校验。 */
const PERSONA_DIGESTS: Record<PersonaId, string> = {
  "su-yiping": "802b6255a20a557ebfa47d0b763f78ba64a9a04af395cc2a43b928b70e36d58b",
  "liao-wenjing": "6d29e02d873f17ae24a24281c3bc5c9ad21a6e475a424bad9b1787afe1fa2458",
};

const SESSION_STORAGE_KEY = "us-chat-session";
const HISTORY_LIMIT = 12;
const MESSAGE_MAX_LENGTH = 500;

class UnauthorizedError extends Error {
  constructor() {
    super("unauthorized");
    this.name = "UnauthorizedError";
  }
}

function isPersonaId(value: unknown): value is PersonaId {
  return value === "su-yiping" || value === "liao-wenjing";
}

function createMessageId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadSession(): ChatSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ChatSession>;
    if (isPersonaId(parsed.persona) && typeof parsed.password === "string" && parsed.password.length > 0) {
      return { persona: parsed.persona, password: parsed.password };
    }
  } catch {
    /* 关掉标签页或解析失败都视为未登录 */
  }
  return null;
}

async function sha256Hex(text: string): Promise<string | null> {
  try {
    if (typeof crypto === "undefined" || !crypto.subtle) return null;
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    if (data && typeof data.error === "string" && data.error.length > 0) return data.error;
  } catch {
    /* 非 JSON 响应按通用错误处理 */
  }
  return "";
}

export function ChatPage() {
  const { t } = useTranslation();
  const [stage, setStage] = useState<Stage>("pick");
  const [personaId, setPersonaId] = useState<PersonaId | null>(null);
  const [password, setPassword] = useState("");
  const [gateError, setGateError] = useState("");
  const [gateShake, setGateShake] = useState(false);
  const [checking, setChecking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const sessionRef = useRef<ChatSession | null>(null);
  const busyRef = useRef(false);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const shakeTimerRef = useRef<number | null>(null);
  const gateInputRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  useSEO({ titleKey: "seo.chatTitle", descKey: "seo.chatDesc", path: "/chat" });

  // 标签页内保持会话；关掉标签页 sessionStorage 自动清空。
  useEffect(() => {
    const session = loadSession();
    if (!session) return;
    sessionRef.current = session;
    setPersonaId(session.persona);
    setStage("chat");
  }, []);

  useEffect(() => {
    if (stage === "gate") gateInputRef.current?.focus();
    if (stage === "chat") chatInputRef.current?.focus();
  }, [stage]);

  useEffect(() => () => {
    if (shakeTimerRef.current !== null) window.clearTimeout(shakeTimerRef.current);
  }, []);

  // 对话流自动吸底：用户往上翻时不抢滚动。
  useEffect(() => {
    if (!stickToBottomRef.current) return;
    logEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const persona = PERSONAS.find((item) => item.id === personaId) ?? null;

  const writeReveal = useCallback((messageId: string, content: string, done: boolean) => {
    const pending = done ? undefined : true;
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, content, pending } : m)));
  }, []);

  const { startReveal, pushReveal, finishReveal, stopReveal } = useChatReveal(writeReveal);

  const shakeGate = useCallback(() => {
    setGateShake(true);
    if (shakeTimerRef.current !== null) window.clearTimeout(shakeTimerRef.current);
    shakeTimerRef.current = window.setTimeout(() => setGateShake(false), 520);
  }, []);

  const requestReply = useCallback(async (history: ChatMessage[], session: ChatSession) => {
    const assistantId = createMessageId();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", pending: true }]);
    try {
      const response = await fetch("/api/us-chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          persona: session.persona,
          password: session.password,
          messages: history.slice(-HISTORY_LIMIT).map((message) => ({
            role: message.role,
            content: message.content.slice(0, MESSAGE_MAX_LENGTH),
          })),
        }),
      });
      if (response.status === 401) throw new UnauthorizedError();
      if (!response.ok || !response.body) throw new Error(await readErrorMessage(response));
      startReveal(assistantId);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let received = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        received += decoder.decode(value, { stream: true });
        pushReveal(received);
      }
      received += decoder.decode();
      finishReveal(assistantId, received.trim().length > 0 ? received : t("usChat.chat.empty"));
    } catch (error) {
      stopReveal();
      const fallback = error instanceof UnauthorizedError ? "" : error instanceof Error ? error.message : "";
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: fallback, pending: undefined, error: true } : m)));
      if (error instanceof UnauthorizedError) {
        // 暗号失效：回到暗号门等下一次输入，不自动重发（无死循环）。
        sessionRef.current = null;
        try {
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
        } catch {
          /* 存储被禁用时静默降级 */
        }
        setMessages([]);
        setStage("gate");
        setGateError(t("usChat.gate.error"));
        shakeGate();
      }
    }
  }, [finishReveal, pushReveal, shakeGate, startReveal, stopReveal, t]);

  const runSend = useCallback((text: string) => {
    const content = text.trim();
    const session = sessionRef.current;
    if (!content || busyRef.current || !session) return;
    busyRef.current = true;
    setBusy(true);
    stickToBottomRef.current = true;
    const userMessage: ChatMessage = { id: createMessageId(), role: "user", content };
    const history = [...messagesRef.current.filter((message) => !message.pending && !message.error), userMessage];
    setMessages((prev) => [...prev.filter((message) => !message.error), userMessage]);
    setInput("");
    void requestReply(history, session).finally(() => {
      busyRef.current = false;
      setBusy(false);
    });
  }, [requestReply]);

  const retryLast = useCallback(() => {
    const session = sessionRef.current;
    if (busyRef.current || !session) return;
    const current = messagesRef.current;
    const lastUserIndex = current.map((message) => message.role).lastIndexOf("user");
    if (lastUserIndex === -1) return;
    const history = current.slice(0, lastUserIndex + 1).filter((message) => !message.pending && !message.error);
    busyRef.current = true;
    setBusy(true);
    stickToBottomRef.current = true;
    setMessages(history);
    void requestReply(history, session).finally(() => {
      busyRef.current = false;
      setBusy(false);
    });
  }, [requestReply]);

  const choosePersona = (id: PersonaId) => {
    setPersonaId(id);
    setPassword("");
    setGateError("");
    setStage("gate");
  };

  const submitGate = async () => {
    if (checking || !persona) return;
    if (password.length === 0) {
      setGateError(t("usChat.gate.error"));
      shakeGate();
      return;
    }
    setChecking(true);
    const digest = await sha256Hex(PERSONA_SALTS[persona.id] + password);
    setChecking(false);
    if (digest !== null && digest !== PERSONA_DIGESTS[persona.id]) {
      setGateError(t("usChat.gate.error"));
      shakeGate();
      return;
    }
    // digest 为 null（非安全上下文）时先放行，服务端仍会二次校验。
    const session: ChatSession = { persona: persona.id, password };
    sessionRef.current = session;
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch {
      /* 存储被禁用时只保留内存会话 */
    }
    setGateError("");
    setMessages([]);
    setStage("chat");
  };

  const backToPick = () => {
    sessionRef.current = null;
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      /* 同上 */
    }
    stopReveal();
    setMessages([]);
    setPassword("");
    setGateError("");
    setPersonaId(null);
    setStage("pick");
  };

  const onGateKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    void submitGate();
  };

  const onChatKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    runSend(input);
  };

  const onLogScroll = () => {
    const log = logRef.current;
    if (!log) return;
    stickToBottomRef.current = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
  };

  const errorText = t("usChat.chat.errorBubble");
  const rowAvatar = <span className="us-chat-row__avatar" aria-hidden="true">{persona?.avatar}</span>;

  return (
    <PageTransition className="us-chat-page" data-persona={personaId ?? undefined}>
      <header className="us-chat-head">
        <p className="us-chat-eyebrow" aria-hidden="true">{t("nav.chat")}</p>
        <h1 className="us-chat-title">{t("usChat.title")}</h1>
        <p className="us-chat-note">{t("usChat.note")}</p>
      </header>

      {stage === "pick" ? (
        <section className="us-chat-pick" aria-labelledby="us-chat-pick-heading">
          <h2 id="us-chat-pick-heading" className="us-chat-pick__heading">{t("usChat.pick.heading")}</h2>
          <p className="us-chat-pick__hint">{t("usChat.pick.hint")}</p>
          <div className="us-chat-pick__cards">
            {PERSONAS.map((item) => (
              <button
                key={item.id} type="button" className="us-chat-persona-card"
                data-persona={item.id} aria-label={t(item.nameKey)} onClick={() => choosePersona(item.id)}
              >
                <span className="us-chat-persona-card__avatar" aria-hidden="true">{item.avatar}</span>
                <span className="us-chat-persona-card__copy">
                  <strong className="us-chat-persona-card__name">{t(item.nameKey)}</strong>
                  <em className="us-chat-persona-card__tag">{t(item.tagKey)}</em>
                  <span className="us-chat-persona-card__line">{t(item.lineKey)}</span>
                </span>
                <span className="us-chat-persona-card__go" aria-hidden="true">→</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {stage === "gate" && persona ? (
        <section className={`us-chat-gate${gateShake ? " is-shaking" : ""}`} aria-labelledby="us-chat-gate-heading">
          <div className="us-chat-gate__card">
            <div className="us-chat-gate__persona" data-persona={persona.id}>
              <span className="us-chat-gate__avatar" aria-hidden="true">{persona.avatar}</span>
              <strong>{t(persona.nameKey)}</strong>
              <em>{t(persona.tagKey)}</em>
            </div>
            <h2 id="us-chat-gate-heading" className="us-chat-gate__heading">
              <KeyRound size={17} aria-hidden="true" />
              {t("usChat.gate.heading")}
            </h2>
            <p className="us-chat-gate__hint">{t("usChat.gate.hint")}</p>
            <form className="us-chat-gate__form" onSubmit={(event) => { event.preventDefault(); void submitGate(); }}>
              <label className="sr-only" htmlFor="us-chat-password">{t("usChat.gate.label")}</label>
              <input
                id="us-chat-password" ref={gateInputRef} className="us-chat-gate__input" type="password"
                autoComplete="off" inputMode="numeric" placeholder={t("usChat.gate.placeholder")} value={password}
                onChange={(event) => { setPassword(event.target.value); if (gateError) setGateError(""); }}
                onKeyDown={onGateKeyDown} aria-invalid={gateError ? true : undefined}
                aria-describedby={gateError ? "us-chat-gate-error" : undefined}
              />
              <button className="us-chat-gate__submit" type="submit" disabled={checking}>
                {checking ? t("usChat.gate.checking") : t("usChat.gate.submit")}
              </button>
            </form>
            {gateError ? (
              <p className="us-chat-gate__error" id="us-chat-gate-error" role="alert">{gateError}</p>
            ) : null}
            <button className="us-chat-ghost-button" type="button" onClick={backToPick}>
              <ArrowLeft size={15} aria-hidden="true" />
              {t("usChat.gate.back")}
            </button>
          </div>
        </section>
      ) : null}

      {stage === "chat" && persona ? (
        <div className="us-chat-layout">
          <aside className="us-chat-side">
            <div className="us-chat-side__card" data-persona={persona.id}>
              <span className="us-chat-side__avatar" aria-hidden="true">{persona.avatar}</span>
              <strong>{t(persona.nameKey)}</strong>
              <em>{t(persona.tagKey)}</em>
              <span>{t(persona.lineKey)}</span>
            </div>
            <p className="us-chat-side__note">{t("usChat.note")}</p>
            <button className="us-chat-ghost-button" type="button" onClick={backToPick}>
              <ArrowLeft size={15} aria-hidden="true" />
              {t("usChat.chat.switch")}
            </button>
          </aside>

          <section className="us-chat-main" aria-label={t("usChat.chat.logLabel")}>
            <div
              className="us-chat-log" role="log" aria-live="polite" aria-label={t("usChat.chat.logLabel")}
              ref={logRef} onScroll={onLogScroll}
            >
              {messages.length === 0 ? <p className="us-chat-log__empty">{t("usChat.chat.placeholder")}</p> : null}
              {messages.map((message) =>
                message.error ? (
                  <div key={message.id} className="us-chat-row us-chat-row--error">
                    <div className="us-chat-bubble us-chat-bubble--error">
                      <p>{message.content || errorText}</p>
                      <button type="button" className="us-chat-retry" onClick={retryLast} disabled={busy}>
                        <RotateCcw size={14} aria-hidden="true" />
                        {t("usChat.chat.retry")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div key={message.id} className={`us-chat-row us-chat-row--${message.role}`}>
                    {message.role === "assistant" ? rowAvatar : null}
                    <div className={`us-chat-bubble us-chat-bubble--${message.role}${message.pending ? " is-typing" : ""}`}>
                      {message.content ||
                        (message.pending ? (
                          <span className="us-chat-typing" aria-label={t("usChat.chat.waiting")}>
                            <i /><i /><i />
                          </span>
                        ) : null)}
                    </div>
                  </div>
                ),
              )}
              <div ref={logEndRef} aria-hidden="true" />
            </div>

            <form className="us-chat-composer" onSubmit={(event) => { event.preventDefault(); runSend(input); }}>
              <label className="sr-only" htmlFor="us-chat-input">{t("usChat.chat.inputLabel")}</label>
              <textarea
                id="us-chat-input" ref={chatInputRef} className="us-chat-composer__input" rows={1}
                placeholder={t("usChat.chat.placeholder")} value={input}
                onChange={(event) => setInput(event.target.value)} onKeyDown={onChatKeyDown}
              />
              <button
                className="us-chat-composer__send" type="submit"
                disabled={busy || input.trim().length === 0} aria-label={t("usChat.chat.send")}
              >
                <Send size={17} aria-hidden="true" />
                {t("usChat.chat.send")}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </PageTransition>
  );
}
