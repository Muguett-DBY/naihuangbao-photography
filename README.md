# 奶黄包摄影

一个以南京人像约拍为主题的个人产品与工程练习项目，不构成真实商业服务承诺。主站聚焦真实授权作品、套餐说明、预约流程与拍摄方式；Living Archive、浏览器创作工具、课程和商店等概念功能统一归入 `/practice` 实验区，不参与主站的服务承诺。

## 技术栈

- React 19 + React Router 8 + TypeScript 7
- Vite 8 + Vitest + Playwright
- 目录化内容清单 + 构建期图片/关系校验
- 按需加载的 IndexedDB 实验工作区（Composer、Story Builder、暗房）
- Cloudflare Pages Functions + D1 + R2 约拍与实验后端
- Three.js 单画布沉浸式视觉层
- PWA、响应式图片、离线预约恢复和多语言内容

## 快速开始

要求 Node.js 22.22 或更高版本。

```bash
npm ci
npm run dev
```

常用验证命令：

```bash
npm run lint            # 类型检查 + 架构边界检查
npm run test            # Vitest 单元与回归测试
npm run build           # 生产构建
npm run verify          # lint + test + 完整构建与性能预算
npm run verify:release  # verify + 完整 Playwright E2E
npm run db:migrate:check # 在本地 D1 副本验证全部增量迁移
```

依赖以 `package-lock.json` 和 `npm@12.0.2` 为唯一安装基线。`@vitejs/plugin-react` 暂时精确固定为 `6.0.3`；`6.0.5` 会在当前 Babel 8 可选 peer 组合下触发 `ERESOLVE`，不要使用 `--force` 或 `--legacy-peer-deps` 绕过。

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
content/        可独立编辑的 Archive 与 Story 内容源
source-assets/  版本化概念源图，不直接发送给浏览器
scripts/        构建、SEO、性能和架构工具
```

内容与素材更新：

```bash
npm run assets:concept   # 从 source-assets 生成 AVIF/WebP 响应式版本
npm run archive:build   # 校验并生成 Archive 清单
npm run stories:build   # 校验并生成 Story 清单
```

不要直接编辑 `src/data/*.generated.json`、`public/archive-manifest.json` 或 `public/story-manifest.json`。

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

创建新的本地数据库可以使用 `db/schema.sql`。任何已有环境，包括预览与生产环境，都必须按顺序应用 `db/migrations`，不能使用 schema 文件代替升级：

```bash
npx wrangler d1 migrations apply naihuangbao-photography --local
npx wrangler d1 migrations apply naihuangbao-photography --remote
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
