import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";

type Status = "idle" | "loading" | "success" | "error" | "duplicate";

export function NewsletterForm() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const lastSubmitTime = useRef(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    const now = Date.now();
    if (now - lastSubmitTime.current < 3000) return;
    lastSubmitTime.current = now;

    setStatus("loading");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      if (res.ok) {
        setStatus("success");
        setEmail("");
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (res.status === 409 || (data as { error?: string }).error === "duplicate") {
        setStatus("duplicate");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <form className="newsletter-form" onSubmit={handleSubmit}>
      {status === "success" ? (
        <p className="newsletter-success">{t("newsletter.success")}</p>
      ) : (
        <>
          <input
            type="email"
            className="newsletter-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("newsletter.placeholder")}
            required
            disabled={status === "loading"}
            aria-label={t("newsletter.placeholder")}
          />
          <button
            type="submit"
            className="newsletter-button"
            disabled={status === "loading"}
          >
            {status === "loading" ? "..." : t("newsletter.submit")}
          </button>
        </>
      )}
      {status === "error" && (
        <p className="newsletter-error">{t("newsletter.error")}</p>
      )}
      {status === "duplicate" && (
        <p className="newsletter-error">{t("newsletter.duplicate")}</p>
      )}
    </form>
  );
}
