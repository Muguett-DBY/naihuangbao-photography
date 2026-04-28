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
npx wrangler d1 execute naihuangbao-photography --file=./schema.sql --remote
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
```

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
npx wrangler d1 execute naihuangbao-photography --file=./schema.sql --remote
npx wrangler d1 execute naihuangbao-photography --file=./scripts/seed-static-gallery.sql --remote
```

`schema.sql` creates the `cms_content` table. The seed script inserts the original six homepage gallery photos into D1 with `insert or ignore`, so it will not overwrite later admin edits.
