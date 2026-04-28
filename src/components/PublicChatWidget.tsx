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

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const starterPrompts = [
  "套餐有哪些？",
  "我适合拍什么风格？",
  "预约流程是什么？",
  "我是男生可以拍吗？",
];

const welcomeMessage: ChatMessage = {
  id: "assistant-welcome",
  role: "assistant",
  content: "你好，我是奶黄包摄影的咨询助手。可以问我套餐、风格、预约流程和拍摄边界。",
};

export function PublicChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const revealTimerRef = useRef<number | null>(null);
  const composingRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 120);
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, loading, typing, open]);

  useEffect(() => {
    return () => {
      if (revealTimerRef.current !== null) {
        window.clearInterval(revealTimerRef.current);
      }
    };
  }, []);

  function clearRevealTimer() {
    if (revealTimerRef.current !== null) {
      window.clearInterval(revealTimerRef.current);
      revealTimerRef.current = null;
    }
    setTyping(false);
  }

  function revealAssistantReply(messageId: string, reply: string) {
    clearRevealTimer();

    if (prefersReducedMotion()) {
      setMessages((prev) => prev.map((message) => (
        message.id === messageId ? { ...message, content: reply } : message
      )));
      return;
    }

    setTyping(true);
    let index = 0;
    const step = Math.max(1, Math.ceil(reply.length / 150));

    function update() {
      index = Math.min(reply.length, index + step);
      setMessages((prev) => prev.map((message) => (
        message.id === messageId ? { ...message, content: reply.slice(0, index) } : message
      )));

      if (index >= reply.length) {
        clearRevealTimer();
      }
    }

    update();
    revealTimerRef.current = window.setInterval(update, 18);
  }

  async function sendMessage(rawText = input) {
    const question = rawText.trim();
    if (!question || loading || typing) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: question,
    };
    const nextMessages = [
      ...messages.filter((message) => message.id !== welcomeMessage.id),
      userMessage,
    ].slice(-6);

    setOpen(true);
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { reply?: string; error?: string };
      if (!response.ok || !data.reply) {
        throw new Error(data.error ?? "聊天助手暂时不可用，请稍后再试。");
      }

      const assistantId = `assistant-${Date.now()}`;
      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);
      revealAssistantReply(assistantId, data.reply);
    } catch (err) {
      setError(err instanceof Error ? err.message : "聊天助手暂时不可用，请稍后再试。");
    } finally {
      setLoading(false);
    }
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || composingRef.current) return;
    event.preventDefault();
    void sendMessage();
  }

  return (
    <div className={`public-chat-widget${open ? " is-open" : ""}`}>
      <button
        className="public-chat-launcher"
        type="button"
        aria-expanded={open}
        aria-controls="public-chat-panel"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X size={22} /> : <Bot size={22} />}
        <span>AI问答</span>
      </button>

      {open ? (
        <section
          className="public-chat-panel"
          id="public-chat-panel"
          aria-label="奶黄包摄影咨询助手"
        >
          <header className="public-chat-head">
            <div className="public-chat-mark">
              <Bot size={18} />
            </div>
            <div>
              <span><Sparkles size={14} /> 奶黄包摄影</span>
              <h2>预约咨询助手</h2>
            </div>
            <button type="button" className="public-chat-close" onClick={() => setOpen(false)} aria-label="关闭咨询窗口">
              <X size={18} />
            </button>
          </header>

          <div className="public-chat-log" aria-live="polite">
            {messages.map((message, index) => (
              <div className={`public-chat-message public-chat-message-${message.role}`} key={message.id}>
                <div className="public-chat-avatar">{message.role === "assistant" ? <Bot size={15} /> : "我"}</div>
                <div className="public-chat-bubble">
                  <p>{message.content}</p>
                  {typing && index === messages.length - 1 && message.role === "assistant" ? (
                    <span className="public-chat-cursor" aria-hidden="true" />
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

          <div className="public-chat-prompts" aria-label="快捷问题">
            {starterPrompts.map((prompt) => (
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
              placeholder="问问套餐、风格、预约流程..."
              aria-label="输入问题，Enter 发送，Shift+Enter 换行"
              maxLength={400}
              disabled={loading || typing}
            />
            <button
              type="button"
              onClick={() => void sendMessage()}
              disabled={!input.trim() || loading || typing}
              aria-label="发送咨询"
            >
              <Send size={18} />
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
