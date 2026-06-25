import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { publicMutationHeaders } from "../lib/admin-helpers";
import { getApiError, readJsonResponse } from "../lib/http";
import { useToast } from "./shared/Toast";
import { Mail, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

type Status = "idle" | "loading" | "success" | "error" | "duplicate";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function NewsletterForm() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [emailError, setEmailError] = useState<string | null>(null);
  const lastSubmitTime = useRef(0);

  const validateEmail = (value: string): boolean => {
    if (!value.trim()) {
      setEmailError(t("newsletter.errorEmailRequired", "Please enter your email"));
      return false;
    }
    if (!EMAIL_REGEX.test(value)) {
      setEmailError(t("newsletter.errorEmailInvalid", "Please enter a valid email address"));
      return false;
    }
    setEmailError(null);
    return true;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (emailError) {
      validateEmail(value);
    }
  };

  const handleBlur = () => {
    if (email) {
      validateEmail(email);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();

    if (!validateEmail(trimmed)) return;

    const now = Date.now();
    if (now - lastSubmitTime.current < 3000) return;
    lastSubmitTime.current = now;

    setStatus("loading");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...publicMutationHeaders },
        body: JSON.stringify({ email: trimmed }),
      });

      if (res.ok) {
        setStatus("success");
        setEmail("");
        showToast(t("newsletter.success"), "success");
        return;
      }

      const data = await readJsonResponse(res);

      if (res.status === 409 || getApiError(data, "") === "duplicate") {
        setStatus("duplicate");
        showToast(t("newsletter.duplicate"), "info");
      } else {
        setStatus("error");
        showToast(t("newsletter.error"), "error");
      }
    } catch {
      setStatus("error");
      showToast(t("newsletter.error"), "error");
    }
  }

  const handleReset = () => {
    setStatus("idle");
    setEmail("");
    setEmailError(null);
  };

  return (
    <form className="newsletter-form" onSubmit={handleSubmit} noValidate>
      {status === "success" ? (
        <div className="newsletter-success-wrap">
          <CheckCircle size={20} className="newsletter-success-icon" />
          <p className="newsletter-success">{t("newsletter.successMessage", "Thanks for subscribing! You'll receive our latest updates.")}</p>
          <button type="button" className="newsletter-reset" onClick={handleReset}>
            {t("newsletter.subscribeAnother", "Subscribe another email")}
          </button>
        </div>
      ) : (
        <>
          <div className="newsletter-input-wrap">
            <Mail size={16} className="newsletter-input-icon" />
            <input
              type="email"
              className={`newsletter-input ${emailError ? "has-error" : ""}`}
              value={email}
              onChange={handleEmailChange}
              onBlur={handleBlur}
              placeholder={t("newsletter.placeholder")}
              disabled={status === "loading"}
              aria-label={t("newsletter.placeholder")}
              aria-invalid={!!emailError}
              aria-describedby={emailError ? "newsletter-email-error" : undefined}
            />
          </div>
          {emailError && (
            <p id="newsletter-email-error" className="newsletter-field-error">
              <AlertCircle size={12} />
              {emailError}
            </p>
          )}
          <button
            type="submit"
            className="newsletter-button"
            disabled={status === "loading"}
          >
            {status === "loading" ? (
              <Loader2 size={16} className="newsletter-spinner" />
            ) : (
              t("newsletter.submit")
            )}
          </button>
        </>
      )}
      {status === "error" && (
        <p className="newsletter-error">{t("newsletter.error")}</p>
      )}
      {status === "duplicate" && (
        <p className="newsletter-info">{t("newsletter.duplicate")}</p>
      )}
    </form>
  );
}
