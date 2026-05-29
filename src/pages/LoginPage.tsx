import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LogIn, UserPlus, Mail, Lock, User } from "lucide-react";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { PageTransition } from "../components/shared/PageTransition";
import { useAuth } from "../hooks/useAuth";

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

  return (
    <PageTransition ref={rootRef}>
      <section className="hero" id="top" style={{ paddingTop: "var(--nav-h, 64px)" }}>
        <div className="section-heading" style={{ position: "relative", zIndex: 1 }}>
          <h1>{mode === "login" ? t("auth.loginTitle", "登录") : t("auth.registerTitle", "注册")}</h1>
        </div>
      </section>

      <section className="section-shell is-visible">
        <div className="login-box">
          <div className="login-card">
            <form onSubmit={handleSubmit}>
              {mode === "register" && (
                <div className="login-field">
                  <label htmlFor="displayName" className="login-label">
                    {t("auth.displayName", "显示名称")}
                  </label>
                  <div className="login-input-wrap">
                    <User size={16} className="login-input-icon" />
                    <input
                      id="displayName"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={t("auth.displayNamePlaceholder", "可选")}
                      className="login-input"
                    />
                  </div>
                </div>
              )}

              <div className="login-field">
                <label htmlFor="email" className="login-label">
                  {t("auth.email", "邮箱")}
                </label>
                <div className="login-input-wrap">
                  <Mail size={16} className="login-input-icon" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder={t("auth.emailPlaceholder", "your@email.com")}
                    className="login-input"
                  />
                </div>
              </div>

              <div className="login-field login-field--last">
                <label htmlFor="password" className="login-label">
                  {t("auth.password", "密码")}
                </label>
                <div className="login-input-wrap">
                  <Lock size={16} className="login-input-icon" />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder={t("auth.passwordPlaceholder", "至少6个字符")}
                    className="login-input"
                  />
                </div>
              </div>

              {error && (
                <p className="login-error">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="login-button"
              >
                {loading ? "..." : mode === "login" ? <><LogIn size={16} /> {t("auth.loginButton", "登录")}</> : <><UserPlus size={16} /> {t("auth.registerButton", "注册")}</>}
              </button>
            </form>

            <div className="login-footer">
              {mode === "login" ? (
                <>
                  {t("auth.noAccount", "还没有账户？")}{" "}
                  <button
                    onClick={() => { setMode("register"); setError(""); }}
                    className="login-toggle"
                  >
                    {t("auth.registerLink", "注册")}
                  </button>
                </>
              ) : (
                <>
                  {t("auth.hasAccount", "已有账户？")}{" "}
                  <button
                    onClick={() => { setMode("login"); setError(""); }}
                    className="login-toggle"
                  >
                    {t("auth.loginLink", "登录")}
                  </button>
                </>
              )}
            </div>

            <div className="login-back">
              <Link to="/">
                {t("auth.backToHome", "返回首页")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
