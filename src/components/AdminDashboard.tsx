import { Eye, ImagePlus, LockKeyhole, Upload } from "lucide-react";
import { galleryItems } from "../data/gallery";
import { styleLabels } from "../data/site";
import { getPublicPhotos } from "../lib/gallery";

export function AdminDashboard() {
  const publicPhotos = getPublicPhotos(galleryItems);

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
        <a href="/">返回官网</a>
      </section>

      <section className="admin-grid">
        <form className="admin-card upload-form" action="/api/admin/photos" method="post" encType="multipart/form-data">
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
          <p>本地预览时接口不会真正存储图片；部署后需要绑定 R2 和 D1。</p>
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
