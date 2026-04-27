import { type FormEvent, useEffect, useState } from "react";
import { Eye, ImagePlus, LockKeyhole, LogOut, Upload } from "lucide-react";
import { galleryItems } from "../data/gallery";
import { styleLabels } from "../data/site";
import { getPublicPhotos } from "../lib/gallery";

export function AdminDashboard() {
  const publicPhotos = getPublicPhotos(galleryItems);
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [loginMessage, setLoginMessage] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");

  useEffect(() => {
    async function checkSession() {
      try {
        const response = await fetch("/api/admin/session", { credentials: "include" });
        const data = (await response.json()) as { authenticated?: boolean };
        setAuthenticated(Boolean(data.authenticated));
      } catch {
        setAuthenticated(false);
      } finally {
        setChecking(false);
      }
    }

    void checkSession();
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginMessage("正在登录...");
    const response = await fetch("/api/admin/login", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      setLoginMessage("密码不正确，或后台密码还没有配置。");
      return;
    }

    setAuthenticated(true);
    setPassword("");
    setLoginMessage("");
  }

  async function handleLogout() {
    await fetch("/api/admin/session", {
      method: "DELETE",
      credentials: "include",
    });
    setAuthenticated(false);
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploadMessage("正在上传...");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const response = await fetch("/api/admin/photos", {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setUploadMessage(data.error ?? "上传失败，请稍后再试。");
      return;
    }

    form.reset();
    setUploadMessage("上传成功，刷新官网后可在作品区看到新照片。");
  }

  if (checking) {
    return (
      <main className="admin-page">
        <section className="admin-hero">
          <div>
            <p>
              <LockKeyhole size={16} />
              私有后台
            </p>
            <h1>正在检查登录状态</h1>
          </div>
        </section>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="admin-page">
        <section className="admin-hero">
          <div>
            <p>
              <LockKeyhole size={16} />
              私有后台
            </p>
            <h1>作品控制台登录</h1>
            <span>输入后台密码后，可以上传和管理已授权公开展示的照片。</span>
          </div>
          <a href="/">返回官网</a>
        </section>
        <section className="admin-grid admin-grid-single">
          <form className="admin-card upload-form" onSubmit={handleLogin}>
            <h2>后台密码</h2>
            <label>
              密码
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            <button type="submit">登录后台</button>
            {loginMessage ? <p>{loginMessage}</p> : null}
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <section className="admin-hero">
        <div>
          <p>
            <LockKeyhole size={16} />
            私有后台
          </p>
          <h1>作品控制台</h1>
          <span>
            给摄影师上传和管理已授权作品。部署时建议使用 Cloudflare Access 保护 `/admin`，公开访客不会看到上传入口。
          </span>
        </div>
        <div className="admin-actions">
          <button type="button" onClick={handleLogout}>
            <LogOut size={16} />
            退出登录
          </button>
          <a href="/">返回官网</a>
        </div>
      </section>

      <section className="admin-grid">
        <form className="admin-card upload-form" onSubmit={handleUpload}>
          <ImagePlus size={24} />
          <h2>上传授权作品</h2>
          <label>
            照片文件
            <input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required />
          </label>
          <label>
            作品标题
            <input name="title" placeholder="例如：绿色旗袍与烟雨江南" required />
          </label>
          <label>
            风格分类
            <select name="style" defaultValue="jiangnan">
              {Object.entries(styleLabels)
                .filter(([key]) => key !== "all")
                .map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
            </select>
          </label>
          <label>
            拍摄地点
            <input name="location" placeholder="南京" required />
          </label>
          <label className="check-row">
            <input name="clientAuthorized" type="checkbox" value="true" required />
            客人已授权公开展示
          </label>
          <label className="check-row">
            <input name="featured" type="checkbox" value="true" />
            设为精选作品
          </label>
          <button type="submit">
            <Upload size={16} />
            上传到 Cloudflare
          </button>
          {uploadMessage ? <p>{uploadMessage}</p> : null}
          <p>只上传已经获得客人明确授权公开展示的照片。</p>
        </form>

        <div className="admin-card">
          <Eye size={24} />
          <h2>当前公开作品</h2>
          <div className="admin-list">
            {publicPhotos.map((photo) => (
              <article key={photo.id}>
                <strong>{photo.title}</strong>
                <span>
                  {styleLabels[photo.style]} · {photo.location}
                </span>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
