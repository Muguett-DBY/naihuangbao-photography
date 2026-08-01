# 奶黄包摄影

南京女生写真、情侣约拍与摄影服务网站。项目包含公开作品与预约流程、客户账户、课程与活动、浏览器端修图工具、后台管理，以及 Cloudflare Pages Functions API。

## 技术栈

- React 19 + React Router 8 + TypeScript 7
- Vite 8 + Vitest + Playwright
- Cloudflare Pages Functions + D1 + R2
- Three.js 单画布沉浸式视觉层
- PWA、响应式图片、离线预约恢复和多语言内容

## 快速开始

要求 Node.js 22.22 或更高版本。

```bash
npm install
npm run dev
```

常用验证命令：

```bash
npm run lint            # 类型检查 + 架构边界检查
npm run test            # Vitest 单元与回归测试
npm run build           # 生产构建
npm run verify          # lint + test + 完整构建与性能预算
npm run verify:release  # verify + 完整 Playwright E2E
```

## 项目结构

```text
src/
  routing/      路由清单与预加载基础设施
  features/     跨组件业务流程与 Provider
  pages/        路由级页面组合和 SEO
  layouts/      全局应用壳层
  components/   可复用 UI
  hooks/        不渲染 UI 的复用状态逻辑
  experience/   隔离的 Three.js 运行时
  lib, utils/   UI 无关算法与基础设施
  data, types/  静态模型、默认内容和契约
functions/      Cloudflare Pages Functions
scripts/        构建、SEO、性能和架构工具
```

完整依赖方向和大文件治理规则见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)，开发与发布约定见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## Cloudflare 配置

Pages 构建设置：

- Build command: `npm run build`
- Build output: `dist`
- Production domain: `shoot.custard.top`

主要绑定：

- `DB`: Cloudflare D1
- `PHOTO_BUCKET`: Cloudflare R2

生产环境至少需要以下 secrets：

```bash
npx wrangler pages secret put ADMIN_PASSWORD --project-name naihuangbao-photography
npx wrangler pages secret put AUTH_SECRET --project-name naihuangbao-photography
npx wrangler pages secret put RATE_LIMIT_SECRET --project-name naihuangbao-photography
```

可选配置包括 `RESEND_API_KEY`、`RESET_EMAIL_FROM`、`EMAIL_FROM`、`STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`、`OPENCODE_GO_API_KEY` 和 `COURSE_PASSWORDS`。

首次创建或更新数据库：

```bash
npx wrangler d1 execute naihuangbao-photography --file=./db/schema.sql --remote
npx wrangler d1 execute naihuangbao-photography --file=./scripts/seed-static-gallery.sql --remote
```

seed 使用 `insert or ignore`，不会覆盖后台已经编辑的内容。

## 发布

项目从 `main` 触发 GitHub Actions 和 Cloudflare Pages 部署。发布前执行：

```bash
npm run verify:release
npm audit --omit=dev --audit-level=high
```

推送后必须确认 GitHub Actions 成功，并检查自定义域名、核心页面和 Service Worker 响应。不要提交 `.env`、`.dev.vars`、Cloudflare token、真实私密联系方式、Playwright 输出或无关生成文件。
