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

后台应通过 Cloudflare Access 或等价登录保护，只给摄影师使用。
建议 Access 同时保护：

- `/admin*`
- `/api/admin/*`

上传接口会检查 `cf-access-authenticated-user-email` 请求头；没有通过 Cloudflare Access 的请求会被拒绝。

Cloudflare Access suggested policy:

- Application domain: `shoot.custard.top`
- Path: `/admin*`
- Add another protected path/application for `/api/admin/*`
- Policy: allow only the photographer's email address

## Local Verification

```bash
npm run test
npm run lint
npm run build
```
