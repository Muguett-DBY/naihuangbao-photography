# 持续迭代记录

## 本轮 (5932161 → 3c5ef23) — Gallery 搜索状态持久化

### 承接的上一轮方向
- **Gallery 搜索状态持久化** — ✅ 已完成

### 完成的旗舰级主改动
- Gallery filter/search/view 状态完整持久化到 localStorage
- 页面导航返回时自动恢复上次浏览上下文（筛选、搜索词、视图模式）
- 新增"已恢复上次浏览状态"横幅提示，5 秒后自动消失
- "清除筛选"按钮同时清除 localStorage 缓存
- URL 参数优先级高于 localStorage（分享链接可覆盖本地状态）

### 已通过的验证
- TypeScript / lint：通过
- Vitest：97/97 通过
- Production build：通过
- GitHub Actions：CI run `27767944467` 通过

### 遗留风险
- `PhotoEditorPage.tsx` 仍有 `@ts-nocheck`，类型风险未完全消除
- 支付仍为 placeholder

### 下一轮建议方向
1. **PhotoEditor 类型化拆分** — 分阶段移除 `@ts-nocheck`，优先拆分状态与导出流程
2. **预约弹窗移动端压缩** — 优化小屏日历和首屏字段密度
3. **Gallery 视图模式持久化增强** — 支持滚动位置恢复

### 推荐下一轮优先执行的旗舰级主改动
PhotoEditor 类型化拆分：分阶段移除 `@ts-nocheck`，优先拆分状态与导出流程。

---

## 本轮 (34632af → a58e755) — 移动端核心导航与编辑器发现路径

### 承接的上一轮方向
- 推荐旗舰：**移动端底部导航** — ✅ 已完成
- 第二方向：**编辑器发现路径** — ✅ 已完成 Dashboard 入口

### 完成的旗舰级主改动
- 新增移动端五入口底部导航：首页、作品、预约、修图、我的
- 预约入口直接打开现有预约弹窗；“我的”根据登录状态进入个人中心或登录页
- 支持当前路由高亮、44px 触控区域、底部安全区、键盘焦点和减少动画偏好
- 编辑器工作区不显示底部导航，聊天和返回顶部控件自动避让

### 新增的用户可见增量
- 个人中心新增“打开人像修图工作室”卡片，明确本地浏览器处理与直接入口
- 修复编辑器因缺少 `ErrorBoundary` import 导致的线上运行时崩溃

### 性能、稳定性与代码质量
- `pages.css` 从首屏公共 CSS 拆为懒加载路由 CSS
- 主 CSS 从 231,305 bytes 降至 153,303 bytes，重新通过 200 KiB 性能预算
- 新增移动导航、路由样式拆分、编辑器运行时回归测试和移动端 E2E

### 已通过的验证
- TypeScript / lint：通过
- Vitest：94/94 通过
- `build:full` + performance budget：通过
- Playwright smoke：13/13 通过
- 390×844 移动端视觉检查：无横向溢出、预约弹窗层级正确、无控制台错误
- GitHub Actions：CI run `27761215627` 通过（main / a58e755）

### 遗留风险
- `PhotoEditorPage.tsx` 仍有 `@ts-nocheck`，类型风险未完全消除
- 支付仍为 placeholder
- 编辑器模型 vendor chunk 仍较大，但已按路由延迟加载

### 下一轮建议方向
1. **Gallery 搜索状态持久化** — 保留搜索词、筛选和视图模式，返回作品页时恢复浏览上下文
2. **PhotoEditor 类型化拆分** — 分阶段移除 `@ts-nocheck`，优先拆分状态与导出流程
3. **预约弹窗移动端压缩** — 优化小屏日历和首屏字段密度，减少首次滚动距离

### 推荐下一轮优先执行的旗舰级主改动
Gallery 浏览连续性升级：持久化搜索/筛选/视图状态，并增加结果摘要与一键清除状态。

---

## 本轮 (44ff518 → 34632af) — 全项目安全与稳定性审计修复

### 本轮性质
全项目系统性安全审计 + 问题修复（非功能新增）

### 审计发现的主要问题
| 优先级 | 问题 | 影响 |
|--------|------|------|
| P0 | 密码哈希非恒定时间比较（profile.ts 使用 `!==`） | 安全 |
| P0 | 密码重置令牌在 API 响应中泄露（无邮件时返回 token） | 安全 |
| P1 | StyleQuiz "Book Now" 链接到同一页面（循环链接） | 功能 |
| P1 | analytics/error 端点无载荷大小限制 | 安全 |
| P1 | presets/download 端点无 ID 校验 | 安全 |
| P1 | AdminShell 3 个未使用 Lucide 图标导入 | 代码质量 |

### 本轮修复的问题
| 修复 | 说明 |
|------|------|
| `profile.ts` | `!==` 替换为 `timingSafeEqual()`（恒定时间比较） |
| `forgot-password.ts` | 令牌返回受 `DEMO_MODE` 环境变量控制，生产环境永不泄露 |
| `StyleQuiz.tsx` | "Book Now" 从链接改为滚动到 packages 区域 |
| `analytics/error.ts` | context/message 截断为 500 字符防止日志放大 |
| `presets/[id]/download.ts` | 添加 `validateId()` 校验 |
| `AdminShell.tsx` | 移除 3 个未使用 Lucide 图标导入 |

### 已通过的验证
- TypeScript typecheck: 通过
- Vite production build: 通过
- 单元测试: 92/92 通过
- GitHub Actions: 通过

### 仍存在的风险
- `useAdminSession` hook 仍为死代码（低优先级）
- PhotoEditorPage 956 行 `@ts-nocheck`
- 支付仍为 placeholder

### 下一轮建议方向
1. **移动端底部导航** — 添加固定底部导航栏提升移动端体验
2. **编辑器发现路径** — 在 Dashboard 中添加编辑器入口
3. **Gallery 搜索增强** — 搜索结果数量统计和筛选状态持久化

### 推荐下一轮优先执行的旗舰级 UI/UX 主改动
移动端底部导航 — 添加固定底部导航栏，让移动端用户更容易访问核心功能。
