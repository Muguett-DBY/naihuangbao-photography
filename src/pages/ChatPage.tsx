import "../styles/us-chat.css";
import { ArrowLeft, KeyRound, RotateCcw, Send } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { PageTransition } from "../components/shared/PageTransition";
import { useChatReveal } from "../hooks/useChatReveal";
import { useSEO } from "../hooks/useSEO";
import {
  COMPOSER_MAX_HEIGHT, HISTORY_LIMIT, MESSAGE_MAX_LENGTH, PERSONA_DIGESTS, PERSONA_SALTS, PERSONAS, SESSION_STORAGE_KEY,
  RateLimitError, ReplyServerError, UnauthorizedError, createMessageId, isAbortError, loadSession, readErrorMessage, sha256Hex,
  type ChatMessage, type ChatSession, type PersonaId,
} from "../lib/us-chat-client";

type Stage = "pick" | "gate" | "chat";

type ChatMessageRowProps = {
  message: ChatMessage;
  avatar: string | undefined;
  waitingLabel: string;
  errorFallback: string;
  retryLabel: string;
  retryDisabled: boolean;
  onRetry: () => void;
};

/**
 * 单条消息行：memo 化后，打字机每 24ms 的 tick 只重绘正在流式输出的那一行，
 * 其余行与页头/侧栏/输入区不参与 diff。
 * 读屏策略：流式逐 tick 重写的部分文本挂 aria-hidden，等揭示完成才进入无障碍树，
 * 避免 aria-live 区域被同一句话切碎播报几十次。
 */
const ChatMessageRow = memo(function ChatMessageRow({
  message, avatar, waitingLabel, errorFallback, retryLabel, retryDisabled, onRetry,
}: ChatMessageRowProps) {
  if (message.error) {
    return (
      <div className="us-chat-row us-chat-row--error">
        <div className="us-chat-bubble us-chat-bubble--error">
          <p>{message.content || errorFallback}</p>
          <button type="button" className="us-chat-retry" onClick={onRetry} disabled={retryDisabled}>
            <RotateCcw size={14} aria-hidden="true" />
            {retryLabel}
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className={`us-chat-row us-chat-row--${message.role}`}>
      {message.role === "assistant" ? (
        <span className="us-chat-row__avatar" aria-hidden="true">{avatar}</span>
      ) : null}
      <div className={`us-chat-bubble us-chat-bubble--${message.role}${message.pending ? " is-typing" : ""}`}>
        {message.pending
          ? message.content
            ? <span aria-hidden="true">{message.content}</span>
            : (
              <span className="us-chat-typing" aria-label={waitingLabel}>
                <i /><i /><i />
              </span>
            )
          : message.content}
      </div>
    </div>
  );
});

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
  const [cooldownLeft, setCooldownLeft] = useState(0);

  const sessionRef = useRef<ChatSession | null>(null);
  const busyRef = useRef(false);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const shakeTimerRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cooldownEndRef = useRef(0);
  const cooldownTimerRef = useRef<number | null>(null);
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
    if (cooldownTimerRef.current !== null) window.clearInterval(cooldownTimerRef.current);
    // 卸载时取消进行中的请求：流读取与限流计数不再白白消耗。
    abortRef.current?.abort();
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

  /** 429 冷却：按服务端 Retry-After 倒计时，期间重试/发送按钮禁用，避免反复重试续窗。 */
  const startCooldown = useCallback((seconds: number) => {
    cooldownEndRef.current = Date.now() + seconds * 1000;
    setCooldownLeft(seconds);
    if (cooldownTimerRef.current !== null) window.clearInterval(cooldownTimerRef.current);
    cooldownTimerRef.current = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((cooldownEndRef.current - Date.now()) / 1000));
      setCooldownLeft(left);
      if (left <= 0 && cooldownTimerRef.current !== null) {
        window.clearInterval(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
    }, 1000);
  }, []);

  /** 输入框随内容自增高，封顶后在框内滚动（COMPOSER_MAX_HEIGHT 与 CSS 上限一致）。 */
  const resizeComposer = useCallback(() => {
    const node = chatInputRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, COMPOSER_MAX_HEIGHT)}px`;
  }, []);

  useEffect(() => {
    resizeComposer();
  }, [input, resizeComposer]);

  const requestReply = useCallback(async (history: ChatMessage[], session: ChatSession) => {
    const assistantId = createMessageId();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", pending: true }]);
    // 顶替旧请求（正常流程 busy 不会并发，这里兜底取消残留的流读取）。
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const response = await fetch("/api/us-chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
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
      if (response.status === 429) {
        const header = Number(response.headers.get("retry-after"));
        const retryAfter = Number.isFinite(header) && header > 0 ? Math.min(Math.ceil(header), 7200) : 0;
        throw new RateLimitError(retryAfter, await readErrorMessage(response));
      }
      if (!response.ok || !response.body) throw new ReplyServerError(await readErrorMessage(response));
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
      if (isAbortError(error)) {
        // 用户主动离开（返回重选/卸载）：安静撤掉占位气泡，不算错误。
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        return;
      }
      if (error instanceof RateLimitError) {
        const wait = error.retryAfterSeconds;
        if (wait > 0) startCooldown(wait);
        const text = wait > 0
          ? t("usChat.chat.rateLimited", { minutes: Math.max(1, Math.ceil(wait / 60)) })
          : error.serverText || t("usChat.chat.errorBubble");
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: text, pending: undefined, error: true } : m)));
        return;
      }
      if (error instanceof UnauthorizedError) {
        // 会话中途暗号失效：回暗号门，文案与“密码输错”区分开，并说明记录不再保留。
        sessionRef.current = null;
        try {
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
        } catch {
          /* 存储被禁用时静默降级 */
        }
        setMessages([]);
        setStage("gate");
        setGateError(t("usChat.gate.expired"));
        shakeGate();
        return;
      }
      // 网络层异常（fetch 直接 reject，如断网的 "Failed to fetch"）没有服务端文案，走本地化兜底。
      const serverText = error instanceof ReplyServerError ? error.message : "";
      const fallback = serverText.length > 0 ? serverText : t("usChat.chat.errorBubble");
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: fallback, pending: undefined, error: true } : m)));
    }
  }, [finishReveal, pushReveal, shakeGate, startCooldown, startReveal, stopReveal, t]);

  const runSend = useCallback((text: string) => {
    const content = text.trim();
    const session = sessionRef.current;
    if (!content || busyRef.current || cooldownLeft > 0 || !session) return;
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
  }, [cooldownLeft, requestReply]);

  const retryLast = useCallback(() => {
    const session = sessionRef.current;
    if (busyRef.current || cooldownLeft > 0 || !session) return;
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
  }, [cooldownLeft, requestReply]);

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
    // 先停打字机，再中断进行中的网络请求与流读取（不再消耗带宽和限流配额）。
    stopReveal();
    abortRef.current?.abort();
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
  const waitingLabel = t("usChat.chat.waiting");
  const retryLabel = cooldownLeft > 0
    ? t("usChat.chat.retryCooldown", { seconds: cooldownLeft })
    : t("usChat.chat.retry");
  const retryDisabled = busy || cooldownLeft > 0;
  const nearLimit = input.length >= MESSAGE_MAX_LENGTH - 100;
  const personaAvatar = persona?.avatar;

  return (
    <PageTransition className="us-chat-page" data-persona={personaId ?? undefined} data-stage={stage}>
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
              {messages.length === 0 ? <p className="us-chat-log__empty">{t("usChat.chat.emptyState")}</p> : null}
              {messages.map((message) => (
                <ChatMessageRow
                  key={message.id}
                  message={message}
                  avatar={message.role === "assistant" ? personaAvatar : undefined}
                  waitingLabel={waitingLabel}
                  errorFallback={errorText}
                  retryLabel={retryLabel}
                  retryDisabled={retryDisabled}
                  onRetry={retryLast}
                />
              ))}
              <div ref={logEndRef} aria-hidden="true" />
            </div>

            <form className="us-chat-composer" onSubmit={(event) => { event.preventDefault(); runSend(input); }}>
              <label className="sr-only" htmlFor="us-chat-input">{t("usChat.chat.inputLabel")}</label>
              <div className="us-chat-composer__field">
                <textarea
                  id="us-chat-input" ref={chatInputRef} className="us-chat-composer__input" rows={1}
                  maxLength={MESSAGE_MAX_LENGTH}
                  placeholder={t("usChat.chat.placeholder")} value={input}
                  onChange={(event) => setInput(event.target.value)} onKeyDown={onChatKeyDown}
                  onFocus={(event) => event.currentTarget.scrollIntoView({ block: "nearest" })}
                />
                {nearLimit ? (
                  <p className="us-chat-composer__count">
                    {t("usChat.chat.charCount", { used: input.length, max: MESSAGE_MAX_LENGTH })}
                  </p>
                ) : null}
              </div>
              <button
                className="us-chat-composer__send" type="submit"
                disabled={retryDisabled || input.trim().length === 0} aria-label={t("usChat.chat.send")}
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
