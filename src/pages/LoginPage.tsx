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
        <div style={{ maxWidth: 400, margin: "0 auto" }}>
          <div style={{
            background: "var(--card-bg, rgba(255,255,255,0.7))",
            border: "1px solid var(--border-subtle)",
            borderRadius: 16,
            padding: 32,
          }}>
            <form onSubmit={handleSubmit}>
              {mode === "register" && (
                <div style={{ marginBottom: 16 }}>
                  <label htmlFor="displayName" style={{ display: "block", marginBottom: 6, fontSize: "0.9rem", fontWeight: 500 }}>
                    {t("auth.displayName", "显示名称")}
                  </label>
                  <div style={{ position: "relative" }}>
                    <User size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--caramel-muted)" }} />
                    <input
                      id="displayName"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={t("auth.displayNamePlaceholder", "可选")}
                      style={{
                        width: "100%",
                        padding: "10px 14px 10px 36px",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: 8,
                        fontSize: "0.9rem",
                        background: "transparent",
                      }}
                    />
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label htmlFor="email" style={{ display: "block", marginBottom: 6, fontSize: "0.9rem", fontWeight: 500 }}>
                  {t("auth.email", "邮箱")}
                </label>
                <div style={{ position: "relative" }}>
                  <Mail size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--caramel-muted)" }} />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder={t("auth.emailPlaceholder", "your@email.com")}
                    style={{
                      width: "100%",
                      padding: "10px 14px 10px 36px",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: 8,
                      fontSize: "0.9rem",
                      background: "transparent",
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label htmlFor="password" style={{ display: "block", marginBottom: 6, fontSize: "0.9rem", fontWeight: 500 }}>
                  {t("auth.password", "密码")}
                </label>
                <div style={{ position: "relative" }}>
                  <Lock size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--caramel-muted)" }} />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder={t("auth.passwordPlaceholder", "至少6个字符")}
                    style={{
                      width: "100%",
                      padding: "10px 14px 10px 36px",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: 8,
                      fontSize: "0.9rem",
                      background: "transparent",
                    }}
                  />
                </div>
              </div>

              {error && (
                <p style={{ color: "#ef4444", fontSize: "0.85rem", marginBottom: 16 }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px 20px",
                  background: "var(--accent)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {loading ? "..." : mode === "login" ? <><LogIn size={16} /> {t("auth.loginButton", "登录")}</> : <><UserPlus size={16} /> {t("auth.registerButton", "注册")}</>}
              </button>
            </form>

            <div style={{ marginTop: 24, textAlign: "center", fontSize: "0.9rem", color: "var(--caramel-muted)" }}>
              {mode === "login" ? (
                <>
                  {t("auth.noAccount", "还没有账户？")}{" "}
                  <button
                    onClick={() => { setMode("register"); setError(""); }}
                    style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", textDecoration: "underline" }}
                  >
                    {t("auth.registerLink", "注册")}
                  </button>
                </>
              ) : (
                <>
                  {t("auth.hasAccount", "已有账户？")}{" "}
                  <button
                    onClick={() => { setMode("login"); setError(""); }}
                    style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", textDecoration: "underline" }}
                  >
                    {t("auth.loginLink", "登录")}
                  </button>
                </>
              )}
            </div>

            <div style={{ marginTop: 16, textAlign: "center" }}>
              <Link to="/" style={{ fontSize: "0.85rem", color: "var(--caramel-muted)" }}>
                {t("auth.backToHome", "返回首页")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
