import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LogIn, UserPlus, Mail, Lock, User, KeyRound, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { PageTransition } from "../components/shared/PageTransition";
import { useAuth } from "../hooks/useAuth";
import { publicMutationHeaders } from "../lib/admin-helpers";

type ResetStep = "forgot" | "token" | "done";

export function LoginPage() {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const errorId = "login-error";

  // Password reset state
  const [resetMode, setResetMode] = useState(false);
  const [resetStep, setResetStep] = useState<ResetStep>("forgot");
  const [resetEmail, setResetEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [demoToken, setDemoToken] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState("");

  useGsapPageEffects(rootRef);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let result;
      if (mode === "login") {
        result = await login(email, password);
      } else {
        result = await register(email, password, displayName);
      }

      if (result.error) {
        setError(result.error);
      } else {
        navigate("/");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    setResetLoading(true);

    try {
      const r = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...publicMutationHeaders },
        body: JSON.stringify({ email: resetEmail }),
      });
      const data = await r.json();

      if (!r.ok) {
        setResetError(data.error || t("auth.resetRequestFailed"));
        return;
      }

      setResetMessage(data.message || t("auth.resetEmailSent"));

      // Demo mode: capture token from response
      if (data.demo_token) {
        setDemoToken(data.demo_token);
      }

      setResetStep("token");
    } catch {
      setResetError(t("auth.resetRequestFailed"));
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    setResetLoading(true);

    try {
      const r = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...publicMutationHeaders },
        body: JSON.stringify({ token: resetToken, newPassword: resetNewPassword }),
      });
      const data = await r.json();

      if (!r.ok) {
        setResetError(data.error || t("auth.resetFailed"));
        return;
      }

      setResetStep("done");
    } catch {
      setResetError(t("auth.resetFailed"));
    } finally {
      setResetLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setResetMode(false);
    setResetStep("forgot");
    setResetEmail("");
    setResetToken("");
    setResetNewPassword("");
    setDemoToken("");
    setResetError("");
    setResetMessage("");
    setError("");
  };

  // ── Password Reset Flow ──
  if (resetMode) {
    return (
      <PageTransition ref={rootRef}>
        <section className="hero" id="top" style={{ paddingTop: "var(--nav-h, 64px)" }}>
          <div className="section-heading" style={{ position: "relative", zIndex: 1 }}>
            <h1>{t("auth.resetTitle")}</h1>
          </div>
        </section>

        <section className="section-shell is-visible">
          <div className="login-box">
            <div className="login-card">
              {/* Step 1: Enter email */}
              {resetStep === "forgot" && (
                <form onSubmit={handleForgotPassword}>
                  <p className="login-reset-desc">{t("auth.resetDesc")}</p>

                  <div className="login-field">
                    <label htmlFor="reset-email" className="login-label">
                      {t("auth.email")}
                    </label>
                    <div className="login-input-wrap">
                      <Mail size={16} className="login-input-icon" />
                      <input
                        id="reset-email"
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                        placeholder={t("auth.emailPlaceholder")}
                        className="login-input"
                      />
                    </div>
                  </div>

                  {resetError && (
                    <p className="login-error" role="alert">{resetError}</p>
                  )}

                  <button type="submit" disabled={resetLoading} className="login-button">
                    {resetLoading ? "..." : <><KeyRound size={16} /> {t("auth.resetRequestButton")}</>}
                  </button>
                </form>
              )}

              {/* Step 2: Enter token + new password */}
              {resetStep === "token" && (
                <form onSubmit={handleResetPassword}>
                  {demoToken ? (
                    <div className="login-reset-demo">
                      <p className="login-reset-demo-label">{t("auth.resetDemoToken")}</p>
                      <code className="login-reset-demo-code" onClick={() => {
                        navigator.clipboard.writeText(demoToken).catch(() => {});
                      }}>
                        {demoToken}
                      </code>
                      <p className="login-reset-demo-hint">{t("auth.resetDemoHint")}</p>
                    </div>
                  ) : (
                    <p className="login-reset-desc">{resetMessage}</p>
                  )}

                  <div className="login-field">
                    <label htmlFor="reset-token" className="login-label">
                      {t("auth.resetTokenLabel")}
                    </label>
                    <div className="login-input-wrap">
                      <KeyRound size={16} className="login-input-icon" />
                      <input
                        id="reset-token"
                        type="text"
                        value={resetToken}
                        onChange={(e) => setResetToken(e.target.value)}
                        required
                        placeholder={t("auth.resetTokenPlaceholder")}
                        className="login-input"
                        autoComplete="off"
                      />
                    </div>
                  </div>

                  <div className="login-field login-field--last">
                    <label htmlFor="reset-new-password" className="login-label">
                      {t("auth.newPassword")}
                    </label>
                    <div className="login-input-wrap">
                      <Lock size={16} className="login-input-icon" />
                      <input
                        id="reset-new-password"
                        type="password"
                        value={resetNewPassword}
                        onChange={(e) => setResetNewPassword(e.target.value)}
                        required
                        minLength={8}
                        placeholder={t("auth.passwordPlaceholder")}
                        className="login-input"
                      />
                    </div>
                  </div>

                  {resetError && (
                    <p className="login-error" role="alert">{resetError}</p>
                  )}

                  <button type="submit" disabled={resetLoading} className="login-button">
                    {resetLoading ? "..." : <><CheckCircle2 size={16} /> {t("auth.resetSubmitButton")}</>}
                  </button>
                </form>
              )}

              {/* Step 3: Done */}
              {resetStep === "done" && (
                <div className="login-reset-done">
                  <CheckCircle2 size={48} className="login-reset-done-icon" />
                  <p>{t("auth.resetSuccess")}</p>
                  <button type="button" className="login-button" onClick={handleBackToLogin}>
                    <LogIn size={16} /> {t("auth.loginButton")}
                  </button>
                </div>
              )}

              <div className="login-footer">
                <button onClick={handleBackToLogin} className="login-toggle">
                  <ArrowLeft size={14} /> {t("auth.backToLogin")}
                </button>
              </div>

              <div className="login-back">
                <Link to="/">{t("auth.backToHome")}</Link>
              </div>
            </div>
          </div>
        </section>
      </PageTransition>
    );
  }

  // ── Login / Register Flow ──
  return (
    <PageTransition ref={rootRef}>
      <section className="hero" id="top" style={{ paddingTop: "var(--nav-h, 64px)" }}>
        <div className="section-heading" style={{ position: "relative", zIndex: 1 }}>
          <h1>{mode === "login" ? t("auth.loginTitle") : t("auth.registerTitle")}</h1>
        </div>
      </section>

      <section className="section-shell is-visible">
        <div className="login-box">
          <div className="login-card">
            <form onSubmit={handleSubmit}>
              {mode === "register" && (
                <div className="login-field">
                  <label htmlFor="displayName" className="login-label">
                    {t("auth.displayName")}
                  </label>
                  <div className="login-input-wrap">
                    <User size={16} className="login-input-icon" />
                    <input
                      id="displayName"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={t("auth.displayNamePlaceholder")}
                      className="login-input"
                      aria-invalid={!!error || undefined}
                      aria-describedby={error ? errorId : undefined}
                    />
                  </div>
                </div>
              )}

              <div className="login-field">
                <label htmlFor="email" className="login-label">
                  {t("auth.email")}
                </label>
                  <div className="login-input-wrap">
                    <Mail size={16} className="login-input-icon" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder={t("auth.emailPlaceholder")}
                      className="login-input"
                      aria-invalid={!!error || undefined}
                      aria-describedby={error ? errorId : undefined}
                    />
                  </div>
              </div>

              <div className="login-field login-field--last">
                <label htmlFor="password" className="login-label">
                  {t("auth.password")}
                </label>
                  <div className="login-input-wrap">
                    <Lock size={16} className="login-input-icon" />
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={mode === "register" ? 8 : undefined}
                      placeholder={mode === "register" ? t("auth.passwordPlaceholder") : t("auth.password")}
                      className="login-input"
                      aria-invalid={!!error || undefined}
                      aria-describedby={error ? errorId : undefined}
                    />
                  </div>
              </div>

              {mode === "login" && (
                <button
                  type="button"
                  className="login-forgot-link"
                  onClick={() => { setResetMode(true); setResetEmail(email); }}
                >
                  {t("auth.forgotPassword")}
                </button>
              )}

              {error && (
                <p id={errorId} className="login-error" role="alert">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="login-button"
              >
                {loading ? "..." : mode === "login" ? <><LogIn size={16} /> {t("auth.loginButton")}</> : <><UserPlus size={16} /> {t("auth.registerButton")}</>}
              </button>
            </form>

            <div className="login-footer">
              {mode === "login" ? (
                <>
                  {t("auth.noAccount")}{" "}
                  <button
                    onClick={() => { setMode("register"); setError(""); }}
                    className="login-toggle"
                  >
                    {t("auth.registerLink")}
                  </button>
                </>
              ) : (
                <>
                  {t("auth.hasAccount")}{" "}
                  <button
                    onClick={() => { setMode("login"); setError(""); }}
                    className="login-toggle"
                  >
                    {t("auth.loginLink")}
                  </button>
                </>
              )}
            </div>

            <div className="login-back">
              <Link to="/">
                {t("auth.backToHome")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
