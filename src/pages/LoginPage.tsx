import "../styles/pages.css";
import { useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarCheck, LogIn, UserPlus, Mail, Lock, User, KeyRound, ArrowLeft, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { PageTransition } from "../components/shared/PageTransition";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { useAuth } from "../hooks/useAuth";
import { publicMutationHeaders } from "../lib/admin-helpers";
import { useToast } from "../components/shared/Toast";
import { useSEO } from "../hooks/useSEO";

type ResetStep = "forgot" | "token" | "done";

export function LoginPage() {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useAuth();
  const { showToast } = useToast();
  const loginRedirectTarget = new URLSearchParams(location.search).get("from") === "dashboard" ? "/dashboard" : "/";
  const shouldShowDashboardNotice = loginRedirectTarget === "/dashboard";

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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

  const pageTitle = resetMode
    ? t("auth.resetTitle")
    : mode === "login"
      ? t("auth.loginTitle")
      : t("auth.registerTitle");

  useSEO({
    title: pageTitle,
    descKey: "auth.visualDescription",
    image: "/images/gallery/gallery-daily-01.webp",
    imageAlt: t("auth.visualImageAlt"),
    path: "/login",
  });
  useGsapPageEffects(rootRef);

  const renderAuthMedia = () => (
    <aside className="auth-page-media" aria-label={t("auth.visualLabel")}>
      <picture>
        <source srcSet="/images/gallery/gallery-daily-01.avif" type="image/avif" />
        <source srcSet="/images/gallery/gallery-daily-01.webp" type="image/webp" />
        <img
          src="/images/gallery/gallery-daily-01.webp"
          alt={t("auth.visualImageAlt")}
          width={1200}
          height={1600}
          fetchPriority="high"
        />
      </picture>
      <div className="auth-page-media-copy">
        <span>{t("auth.visualEyebrow")}</span>
        <h2>{t("auth.visualTitle")}</h2>
        <p>{t("auth.visualDescription")}</p>
      </div>
    </aside>
  );

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
        navigate(loginRedirectTarget, { replace: true });
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
        setResetError(
          data.error === "email_delivery_unavailable"
            ? t("auth.resetEmailUnavailable")
            : data.error || t("auth.resetRequestFailed"),
        );
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
      showToast(t("auth.resetSuccess"), "success");
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
      <ErrorBoundary>
        <PageTransition ref={rootRef} className="auth-page auth-page--reset">
          <div className="auth-page-layout" id="top">
            {renderAuthMedia()}
            <section className="auth-page-panel" aria-labelledby="auth-page-title">
              <div className="login-box">
            <div className="login-card">
              <header className="login-heading">
                <span>{t("auth.accountAccessEyebrow")}</span>
                <h1 id="auth-page-title">{t("auth.resetTitle")}</h1>
                <p>{t("auth.resetDesc")}</p>
              </header>
              {/* Step 1: Enter email */}
              {resetStep === "forgot" && (
                <form onSubmit={handleForgotPassword}>
                  <div className="login-field">
                    <label htmlFor="reset-email" className="login-label">
                      {t("auth.email")}
                    </label>
                    <div className="login-input-wrap">
                      <Mail size={16} className="login-input-icon" aria-hidden="true" />
                      <input
                        id="reset-email"
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                        placeholder={t("auth.emailPlaceholder")}
                        className="login-input"
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  {resetError && (
                    <p className="login-error" role="alert">{resetError}</p>
                  )}

                  <button type="submit" disabled={resetLoading} className="login-button">
                    {resetLoading ? "..." : <><KeyRound size={16} aria-hidden="true" /> {t("auth.resetRequestButton")}</>}
                  </button>
                </form>
              )}

              {/* Step 2: Enter token + new password */}
              {resetStep === "token" && (
                <form onSubmit={handleResetPassword}>
                  {demoToken ? (
                    <div className="login-reset-demo">
                      <p className="login-reset-demo-label">{t("auth.resetDemoToken")}</p>
                      <button
                        type="button"
                        className="login-reset-demo-code"
                        onClick={() => {
                          navigator.clipboard.writeText(demoToken).then(
                            () => showToast(t("auth.resetTokenCopied", "Token copied"), "success"),
                            () => showToast(t("auth.resetTokenCopyFailed", "Copy failed"), "error"),
                          );
                        }}
                        aria-label={t("auth.copyResetToken")}
                      >
                        <code>{demoToken}</code>
                      </button>
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
                      <KeyRound size={16} className="login-input-icon" aria-hidden="true" />
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
                      <Lock size={16} className="login-input-icon" aria-hidden="true" />
                      <input
                        id="reset-new-password"
                        type="password"
                        value={resetNewPassword}
                        onChange={(e) => setResetNewPassword(e.target.value)}
                        required
                        minLength={8}
                        placeholder={t("auth.passwordPlaceholder")}
                        className="login-input"
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  {resetError && (
                    <p className="login-error" role="alert">{resetError}</p>
                  )}

                  <button type="submit" disabled={resetLoading} className="login-button">
                    {resetLoading ? "..." : <><CheckCircle2 size={16} aria-hidden="true" /> {t("auth.resetSubmitButton")}</>}
                  </button>
                </form>
              )}

              {/* Step 3: Done */}
              {resetStep === "done" && (
                <div className="login-reset-done">
                  <CheckCircle2 size={48} className="login-reset-done-icon" aria-hidden="true" />
                  <p>{t("auth.resetSuccess")}</p>
                  <button type="button" className="login-button" onClick={handleBackToLogin}>
                    <LogIn size={16} aria-hidden="true" /> {t("auth.loginButton")}
                  </button>
                </div>
              )}

              <div className="login-footer">
                <button type="button" onClick={handleBackToLogin} className="login-toggle">
                  <ArrowLeft size={14} aria-hidden="true" /> {t("auth.backToLogin")}
                </button>
              </div>

              <div className="login-back">
                <Link to="/">{t("auth.backToHome")}</Link>
              </div>
            </div>
          </div>
            </section>
          </div>
        </PageTransition>
      </ErrorBoundary>
    );
  }

  // ── Login / Register Flow ──
  return (
    <ErrorBoundary>
      <PageTransition ref={rootRef} className="auth-page">
        <div className="auth-page-layout" id="top">
          {renderAuthMedia()}
          <section className="auth-page-panel" aria-labelledby="auth-page-title">
            <div className="login-box">
          <div className="login-card">
            <header className="login-heading">
              <span>{t("auth.accountAccessEyebrow")}</span>
              <h1 id="auth-page-title">{mode === "login" ? t("auth.loginTitle") : t("auth.registerTitle")}</h1>
              <p>{mode === "login" ? t("auth.loginDescription") : t("auth.registerDescription")}</p>
            </header>

            <div className="login-mode-switch" role="group" aria-label={t("auth.modeLabel")}>
              <button
                type="button"
                className={mode === "login" ? "is-active" : ""}
                aria-pressed={mode === "login"}
                onClick={() => { setMode("login"); setError(""); setShowPassword(false); }}
              >
                <LogIn size={16} aria-hidden="true" />
                {t("auth.loginButton")}
              </button>
              <button
                type="button"
                className={mode === "register" ? "is-active" : ""}
                aria-pressed={mode === "register"}
                onClick={() => { setMode("register"); setError(""); setShowPassword(false); }}
              >
                <UserPlus size={16} aria-hidden="true" />
                {t("auth.registerButton")}
              </button>
            </div>

            {shouldShowDashboardNotice && (
              <div className="login-context-notice" role="status">
                <CalendarCheck size={18} aria-hidden="true" />
                <span>
                  <strong>{t("auth.dashboardLoginNoticeTitle", "Log in to view your booking status")}</strong>
                  <small>{t("auth.dashboardLoginNoticeDescription", "After login, you will return to your dashboard to check booking updates and deposit status.")}</small>
                </span>
              </div>
            )}
            <form onSubmit={handleSubmit}>
              {mode === "register" && (
                <div className="login-field">
                  <label htmlFor="displayName" className="login-label">
                    {t("auth.displayName")}
                  </label>
                  <div className="login-input-wrap">
                    <User size={16} className="login-input-icon" aria-hidden="true" />
                    <input
                      id="displayName"
                      name="displayName"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={t("auth.displayNamePlaceholder")}
                      className="login-input"
                      autoComplete="name"
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
                    <Mail size={16} className="login-input-icon" aria-hidden="true" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder={t("auth.emailPlaceholder")}
                      className="login-input"
                      autoComplete="email"
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
                    <Lock size={16} className="login-input-icon" aria-hidden="true" />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={mode === "register" ? 8 : undefined}
                      placeholder={mode === "register" ? t("auth.passwordPlaceholder") : t("auth.password")}
                      className="login-input"
                      autoComplete={mode === "register" ? "new-password" : "current-password"}
                      aria-invalid={!!error || undefined}
                      aria-describedby={error ? errorId : undefined}
                    />
                    <button
                      type="button"
                      className="login-password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                    </button>
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
                {loading ? "..." : mode === "login" ? <><LogIn size={16} aria-hidden="true" /> {t("auth.loginButton")}</> : <><UserPlus size={16} aria-hidden="true" /> {t("auth.registerButton")}</>}
              </button>
            </form>

            <div className="login-footer">
              {mode === "login" ? (
                <>
                  {t("auth.noAccount")}{" "}
                  <button
                    type="button"
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
                    type="button"
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
        </div>
      </PageTransition>
    </ErrorBoundary>
  );
}
