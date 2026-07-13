# 奶黄包摄影

南京女生写真 / 情侣约拍官网。公开站优先保证视觉表现、移动端体验和预约转化；后台首版用于上传和管理已授权公开展示的作品。

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy to GitHub

Create a new GitHub repository first, for example:

- `portrait-booking-site`
- `naihuangbao-photography`

Then run from this folder:

```bash
git init
git add .
git commit -m "feat: launch naihuangbao photography site"
git branch -M main
git remote add origin https://github.com/YOUR_ACCOUNT/YOUR_REPO.git
git push -u origin main
```

Do not commit `.env`, `.dev.vars`, Cloudflare tokens, or real private contact details.

## Deploy to Cloudflare Pages

In Cloudflare Dashboard:

1. Open **Workers & Pages**.
2. Create a new **Pages** project.
3. Connect the GitHub repo.
4. Use these build settings:

- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/` if this repository only contains this project.

After the first deployment, add the custom domain:

- `shoot.custard.top`

Cloudflare will show the DNS target for the custom domain. In Tencent Cloud DNSPod, add:

- Host record: `shoot`
- Type: `CNAME`
- Value: the Cloudflare Pages target, usually like `PROJECT.pages.dev`
- Line: default
- TTL: default

## Cloudflare R2 + D1 Setup

The public site works with placeholders without these bindings. The admin upload flow needs them.

1. Create an R2 bucket:
   - Bucket name: `naihuangbao-photography`
   - Binding name in Pages project: `PHOTO_BUCKET`

2. Create a D1 database:
   - Database name: `naihuangbao-photography`
   - Binding name in Pages project: `DB`

3. Apply the schema:

```bash
npx wrangler d1 execute naihuangbao-photography --file=./db/schema.sql --remote
```

4. Update `wrangler.toml` with the real D1 `database_id` from Cloudflare.

## Admin Access

## Admin Storage Plan

`functions/api/admin/photos.ts` 预留 Cloudflare Pages Functions 接口。部署时绑定：

- `PHOTO_BUCKET`: Cloudflare R2 bucket
- `DB`: Cloudflare D1 database

后台默认使用站内密码登录，适合国内访问场景，避免依赖 `*.cloudflareaccess.com` 登录页。

部署后需要配置 Pages secret：

```bash
npx wrangler pages secret put ADMIN_PASSWORD --project-name naihuangbao-photography
npx wrangler pages secret put AUTH_SECRET --project-name naihuangbao-photography
npx wrangler pages secret put RATE_LIMIT_SECRET --project-name naihuangbao-photography
npx wrangler pages secret put RESEND_API_KEY --project-name naihuangbao-photography
```

必需和可选的 Cloudflare Pages 环境项：

- `ADMIN_PASSWORD`：后台登录密码，必须通过 Pages secret 配置。
- `AUTH_SECRET`：站内用户登录 session 签名密钥，至少 32 字符，必须通过 Pages secret 配置。
- `RATE_LIMIT_SECRET`：公开接口限流 key 哈希密钥，至少 32 个字符，生产环境必须通过 Pages secret 配置；限流请求会按小时清理超过 24 小时的伪匿名记录，旧部署可暂时使用 `CHAT_RATE_LIMIT_SECRET` 兼容。
- `RESEND_API_KEY`：密码重置邮件发送密钥；配置后 `/api/auth/forgot-password` 会通过 Resend 发送重置令牌。
- `RESET_EMAIL_FROM`：密码重置邮件发件人，例如 `Naihuangbao <reset@shoot.custard.top>`；可作为 Pages 变量配置。
- `EMAIL_FROM`：预约确认和付款回执等事务邮件发件人；可作为 Pages 变量配置。
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`：支付功能启用时需要配置。
- `OPENCODE_GO_API_KEY`：公开 AI 咨询启用时需要配置。
- `COURSE_PASSWORDS`：课程密码锁启用时可配置。

上传接口也兼容 Cloudflare Access：如果请求带有 `cf-access-authenticated-user-email`，也会被视为已登录。

## Local Verification

```bash
npm run test
npm run lint
npm run build
```

## CMS Content Setup

The admin page now edits photos and lightweight site content from Cloudflare D1.

After deploying this update, run both commands once:

```bash
npx wrangler d1 execute naihuangbao-photography --file=./db/schema.sql --remote
npx wrangler d1 execute naihuangbao-photography --file=./scripts/seed-static-gallery.sql --remote
```

`db/schema.sql` creates the `cms_content` table. The seed script inserts the original six homepage gallery photos into D1 with `insert or ignore`, so it will not overwrite later admin edits.


---

## 后台管理

# 后台管理说明

## 进入后台

- 访问 `https://shoot.custard.top/admin`
- 使用管理员密码登录
- 密码通过 `wrangler pages secret put ADMIN_PASSWORD` 配置

## 功能

- 照片：上传、编辑标题/风格/地点、设为精选、公开/隐藏、删除。
- 套餐价格：编辑套餐名、价格、时长、说明和包含内容。
- 服务规则：编辑设备、拍立得信息、预约规则。
- FAQ/流程：编辑预约流程和常见问题。
- 主页文案：编辑品牌、联系方式、首页简介、各区域标题、选择理由和页脚标语。

内容保存后立即发布到官网，不设草稿。

## 首次部署 CMS

执行 D1 schema 和静态作品 seed：

```bash
npx wrangler d1 execute naihuangbao-photography --file=./db/schema.sql --remote
npx wrangler d1 execute naihuangbao-photography --file=./scripts/seed-static-gallery.sql --remote
```

第二条命令会把原来首页的 6 张静态作品登记到 D1，让后台可以编辑、隐藏或删除这些主页照片。脚本使用 `insert or ignore`，重复执行不会覆盖后台已编辑内容。

## 技术说明

- 后台使用 HMAC-SHA256 cookie session 认证，有效期 30 天。
- 所有后台 API 都需要登录 cookie。
- 上传文件存于 Cloudflare R2，照片和 CMS 内容元数据存于 D1。
