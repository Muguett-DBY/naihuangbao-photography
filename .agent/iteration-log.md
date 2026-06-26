# 持续迭代记录

## Campaign 011 Stage 1 — Booking Deposit Status Closure

### 承接的上一轮方向
- 承接“支付与预约后续闭环”，把预约确认、定金状态和个人中心下一步整合起来。

### 本轮旗舰级主改动
- 预约列表 API 返回每个预约最新的定金 intent、状态、provider、金额和币种。
- placeholder 支付不再展示不可输入的假卡号，也不再无效轮询等待永远不会出现的成功状态。
- 用户可明确选择“记录为待处理”或“稍后处理”，预约成功页和个人中心均展示真实结果。

### 新增增量与真实问题修复
- 离线预约不会再为尚未同步的本地预约 ID 创建服务器付款记录。
- 移动端预约弹窗打开时隐藏底部导航和聊天入口，修复操作按钮被覆盖。
- 新增付款契约、预约付款投影和两条真实浏览器 E2E 回归。

### 已验证内容
- `npm run lint`：通过
- `npm test`：220/220 通过
- `npm run build:full`：通过，性能预算通过
- `BASE_URL=http://127.0.0.1:4174 npx playwright test e2e/booking.spec.ts --config=e2e/playwright.config.ts --workers=1 --reporter=line`：5/5 通过
- 390×844 移动场景：无横向溢出，预约弹窗与全局浮层不重叠

### GitHub Actions / CI 状态
- Stage 1 commit `ca7d99f` 已 push 到 `main`，GitHub Actions CI run `28201299996` 通过。

### 遗留风险
- 线上真实扣款仍需要正式支付 provider、客户端 SDK 和生产密钥；本轮明确呈现真实 placeholder 状态，没有伪造扣款。
- 字体与 face-api vendor chunk 仍较大，但性能预算通过。

### 下一阶段
- UI/UX 专项升级：围绕首次进入个人中心的空状态、关键路径引导和移动端标签导航做完整体验提升。

---

## Campaign 010 Stage 1 — Booking Self-Service Reliability

### 本轮目标
- 承接上一轮最终打磨后的核心业务闭环方向，把客户预约自助取消/改期从“能点按钮”升级为容量安全、反馈明确、状态一致的可靠流程。

### 完成内容
- 新增共享预约规则：每日容量、真实日期校验、营业日期、`cancelled` 标准状态与历史 `canceled` 兼容。
- 改期 API 现在会拒绝格式错误、过去日期和已约满日期，并排除当前被移动的预约后再计算容量。
- 取消 API 写入标准 `cancelled`，列表读取会规范化历史 `canceled` 状态。
- 个人中心预约卡片复用可用性日历，已约满日期不可选，取消/改期成功用 Toast 反馈，失败用内联 `role="alert"` 告知。

### 已验证内容
- `npm test -- functions/booking-rules.test.ts functions/api.test.ts src/lib/audit-regressions.test.ts`：49/49 通过
- `npm run lint`：通过
- `npm test`：216/216 通过
- `npm run build:full`：通过，性能预算通过
- `npx playwright test e2e/booking.spec.ts --config=e2e/playwright.config.ts --workers=1 --reporter=line`：3/3 通过

### GitHub Actions / CI 状态
- Stage 1 commit `83154b6` 已 push 到 `main`，GitHub Actions CI run `28194736603` 通过。

### 遗留风险
- `.agent/orchestrator-state.json` 是进入本轮前已有的 prior-campaign metadata 变更，本阶段未纳入 commit。
- 支付仍为 placeholder，仍是后续产品闭环风险。

### 下一轮建议方向
1. 个人中心预约区做 UI/UX 专项升级：让预约状态、下一步行动、改期日历和空状态更像成熟产品。
2. 支付 placeholder 的真实支付/付款状态闭环。
3. 编辑器大体积模型资源继续优化加载和可见反馈。

### 推荐下一轮优先执行的旗舰级主改动
个人中心预约体验升级：围绕预约卡片、状态反馈、空状态和移动端日历交互做完整 UI/UX 提升。

---

## Campaign 010 Stage 2 — Dashboard Booking UI/UX Upgrade

### 本轮 UI/UX 主改动
- 个人中心预约区从普通列表升级为更清晰的预约管理面板：顶部概览、预约时间/提交时间标签、状态说明、可用性日历改期和移动端底部导航避让形成一套完整体验。

### 完成内容
- 新增活跃、已完成、已取消三项预约概览，提升用户第一眼可读性。
- 预约卡片增加结构化时间信息和每种状态的下一步说明，减少用户对“还能做什么”的不确定。
- 改期面板在移动端按钮纵向排列，日历宽度自适应，内容底部避让固定底部导航。
- 修复 390px 移动端已登录头部用户按钮与菜单按钮拥挤的问题。
- 新增审计回归，锁定预约概览、状态说明、响应式按钮、移动端底部避让和已登录头部压缩规则。

### 已验证内容
- `npm test -- src/lib/audit-regressions.test.ts`：38/38 通过
- `npm run lint`：通过
- `npm test`：217/217 通过
- `npm run build:full`：通过，性能预算通过
- 桌面 1366x900 和移动 390x844 mocked browser 检查：无横向溢出、无控制台错误、预约概览/状态说明/改期面板均渲染
- `BASE_URL=http://127.0.0.1:4174 npx playwright test e2e/booking.spec.ts --config=e2e/playwright.config.ts --workers=1 --reporter=line`：3/3 通过

### GitHub Actions / CI 状态
- Stage 2 commit `4f17b16` 已 push 到 `main`，GitHub Actions CI run `28195736252` 通过。

### 遗留风险
- 支付仍为 placeholder。
- 全站字体与 face-api vendor chunk 仍较大，本轮仅确认性能预算通过，未继续拆分资源。

### 下一轮建议方向
1. 支付 placeholder 到真实付款状态闭环，避免预约后商业流程断点。
2. 个人中心空状态继续升级，让新用户首次进入时有更明确的预约、作品、收藏引导。
3. 编辑器模型资源加载继续优化，减少首次进入编辑器的体感等待。

### 推荐下一轮优先执行的旗舰级主改动
支付与预约后续闭环：把预约确认、付款状态和用户可见下一步整合到个人中心，补齐从预约到交付的商业链路。

---

## Cycle 3 (9d21dca → 5c51f4f) — 6 阶段连续迭代

### Stage 13: Gallery 筛选平滑滚动 ✅
- **Commit**: `3601376` — `feat: smooth scroll to gallery grid when clicking filter tabs`
- 点击筛选标签页时自动滚动到画廊网格区域
- CI: ✅ 通过

### Stage 14: 日历键盘导航 ✅
- **Commit**: `cc0cb57` — `feat: add arrow key navigation to booking calendar days`
- 日历支持方向键选择日期，Enter/Space 确认选择
- CI: ✅ 通过

### Stage 15: 错误边界视觉升级 ✅
- **Commit**: `a77234e` — `feat: upgrade error boundary with icon, home link, and CSS design`
- 新增错误图标、返回首页链接、CSS 设计系统
- CI: ✅ 通过

### Stage 16: Gallery 结果摘要动画 ✅
- **Commit**: `5c51f4f` — `feat: add result summary animation when filter/search changes`
- 筛选/搜索变化时结果摘要添加淡入动画
- CI: ✅ 通过

### Stage 17: 系统健康检查 ✅
- 无代码变更 — 全面审计通过
- CI: ✅ 通过

### Stage 18: Cycle 3 最终打磨 ✅
- **Commit**: `5c51f4f` — 最终状态更新
- CI: ✅ 通过

---

## Cycle 2 (e71151c → 70873b8) — 6 阶段连续迭代

### Stage 7: Gallery 空状态建议筛选 ✅
- **Commit**: `e0dd030` — `feat: upgrade gallery empty state with suggested style filters`
- 空搜索结果时显示可点击的风格建议按钮
- CI: ✅ 通过

### Stage 8: 预约表单实时验证指示 ✅
- **Commit**: `8d2ed64` — `feat: add real-time validation indicators to booking form`
- 表单字段验证通过时显示绿色边框和 ✓ 标记
- CI: ✅ 通过

### Stage 9: 移动端底部导航触控动画 ✅
- **Commit**: `766648e` — `feat: add tap animation to mobile bottom nav items`
- 底部导航项添加点击缩放动画
- CI: ✅ 通过

### Stage 10: PhotoEditor FrameId 类型安全 ✅
- **Commit**: `70873b8` — `refactor: add FrameId type to PhotoEditor for type safety`
- 新增 FrameId 联合类型，收紧 frameId 状态类型
- CI: ✅ 通过

### Stage 11: 系统健康检查 ✅
- 无代码变更 — 全面审计通过
- CI: ✅ 通过

### Stage 12: Cycle 2 最终打磨 ✅
- **Commit**: `70873b8` — 最终状态更新
- CI: ✅ 通过

---

## Cycle 1 (292d572 → 6fdefa4) — 6 阶段连续迭代

### Stage 1: 预约弹窗多步骤表单 ✅
- **Commit**: `2582917` — `feat: split booking modal into multi-step form for mobile density`
- 预约弹窗拆分为 2 步：选择套餐/日期/时间 → 填写姓名/联系方式/备注
- 新增步骤指示器、返回按钮、步骤切换动画
- CI: ✅ 通过

### Stage 2: Gallery 滚动位置恢复 ✅
- **Commit**: `fb0208f` — `feat: restore gallery scroll position on back navigation`
- 离开 Gallery 页面时保存滚动位置，返回时自动恢复
- CI: ✅ 通过

### Stage 3: Gallery 微交互 ✅
- **Commit**: `e71151c` — `feat: add micro-interactions to gallery filter tabs and view toggle`
- 筛选标签页添加缩放动画，视图切换按钮添加悬停/点击反馈
- CI: ✅ 通过

### Stage 4: 日历骨架屏加载 ✅
- **Commit**: `a46dc92` — `feat: replace calendar text loading with skeleton shimmer grid`
- 日历加载状态从文字替换为骨架屏闪烁网格
- CI: ✅ 通过

### Stage 5: 系统健康检查 ✅
- 无代码变更 — 全面审计通过
- Lint/Test/Build 全部通过
- CI: ✅ 通过

### Stage 6: 最终打磨 ✅
- **Commit**: `6fdefa4` — `docs: update orchestrator log after cycle 1 health check`
- CI: ✅ 通过

---

## 遗留风险
- `useAdminSession` hook 仍为死代码（低优先级）
- 支付仍为 placeholder

### 下一轮建议方向
1. **预约弹窗步骤动画增强** — 添加更流畅的步骤切换过渡效果
2. **Gallery 空状态优化** — 当无搜索结果时显示更有引导性的空状态
3. **PhotoEditor 剩余类型优化** — 进一步收紧 BeautySettings 索引签名

---

## 上一轮完整循环 (5932161 → 1729d80) — 6 阶段连续迭代

### Stage 1: Gallery 搜索状态持久化 ✅
- **Commit**: `3c5ef23` — `feat: persist gallery search state across navigation sessions`
- Gallery filter/search/view 状态完整持久化到 localStorage
- 页面导航返回时自动恢复上次浏览上下文
- 新增"已恢复上次浏览状态"横幅提示
- CI: ✅ 通过

### Stage 2: PhotoEditor 类型化拆分 ✅
- **Commit**: `ab597c8` — `refactor: remove @ts-nocheck from PhotoEditor and add proper types`
- 移除 957 行 PhotoEditorPage 的 @ts-nocheck
- 新增 TextOverlay/StickerOverlay 类型定义
- 实现 detectFaceLandmarks 函数
- CI: ✅ 通过

### Stage 3: 骨架屏加载状态 ✅
- **Commit**: `d76bb9b` — `feat: add skeleton loading states for all lazy-loaded sections`
- 新增 SectionSkeleton 通用骨架屏组件
- BookingPage/GalleryPage/HomePage/MapPage 全部使用骨架屏
- CI: ✅ 通过

### Stage 4: 预约弹窗移动端压缩 ✅
- **Commit**: `e809cd0` — `feat: compress booking modal density on mobile`
- 移动端弹窗内边距从 48px 压缩到 24px
- 日历网格间隙从 4px 压缩到 2px
- 表单字段间距减少
- 修复日历触摸目标溢出问题
- CI: ✅ 通过

### Stage 5: 系统健康检查 ✅
- 无代码变更 — 全面审计通过
- Lint/Test/Build 全部通过
- 无 console.log/debugger
- 无敏感信息泄露
- CI: ✅ 通过

### Stage 6: 最终打磨 ✅
- **Commit**: `1729d80` — `chore: clean up hardcoded fallbacks and update iteration logs`
- 清理 BookingPage 硬编码中文回退值
- 更新迭代记录
- CI: ✅ 通过

---

## 遗留风险
- `PhotoEditorPage.tsx` 已移除 @ts-nocheck，类型安全提升
- `useAdminSession` hook 仍为死代码（低优先级）
- 支付仍为 placeholder

### 下一轮建议方向
1. **Gallery 视图模式持久化增强** — 支持滚动位置恢复
2. **预约弹窗多步骤表单** — 将长表单拆分为分步向导
3. **PhotoEditor 剩余类型优化** — 进一步收紧 BeautySettings 索引签名

### 推荐下一轮优先执行的旗舰级主改动
预约弹窗多步骤表单：将长表单拆分为分步向导，减少移动端首次滚动距离。

---

## 本轮 (34632af → a58e755) — 移动端核心导航与编辑器发现路径

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

---

## Campaign 011 Stage 2 — Dashboard Workspace UI/UX

### 完成的旗舰级主改动
- 用原生可访问工作区导航替换拥挤的 Dashboard 标签组件
- 桌面端使用左侧导航栏，移动端使用横向滚动标签栏
- 支持方向键、Home、End 键盘导航和标准 tab/tabpanel 语义
- 为零数据概览增加预约、作品和修图三个明确起点
- 为预约、照片、收藏、浏览、购买、课程和活动空状态增加具体 CTA
- 增加加载骨架，并避免移动端聊天与返回顶部控件遮挡 Dashboard

### 已通过的验证
- TypeScript / lint：通过
- Vitest：221/221 通过
- `build:full` + performance budget：通过
- Playwright booking/dashboard：6/6 通过
- 1440px 桌面渲染：左侧纵向导航、3 个起点动作、无横向溢出
- 390×844 移动端渲染：横向可滚动导航、无横向溢出、无悬浮控件遮挡
- 浏览器控制台：无错误
- Stage 2 commit `641804d` 已 push 到 `main`，GitHub Actions CI run `28205009786` 通过。

### 遗留风险
- 真实扣款仍需接入生产支付服务商与密钥
- 编辑器模型 vendor chunk 和字体 chunk 仍较大，但均为延迟加载

### 下一轮建议方向
1. 接入真实支付服务商并实现支付确认、失败恢复和退款状态
2. 为人像编辑器增加模型加载进度、失败重试和弱网降级
3. 优化移动端个人中心顶部视觉区的首屏高度

### 推荐下一轮优先执行的旗舰级主改动
真实支付闭环：接入生产支付服务商，并在预约、个人中心和后台统一展示可追踪的支付状态。

---

## Campaign 012 Stage 1 — Payment Readiness And Deposit Traceability

### 承接的上一轮方向
- 上一轮推荐旗舰：真实支付闭环。
- 本阶段推进其中可安全落地的前置闭环：支付就绪度、缺失配置提示、预约定金状态追踪。

### 完成内容
- 创建支付意图时返回 `readiness`，明确当前仍为 placeholder 和下一步人工跟进。
- 预约定金支付面板显示支付就绪度和缺失配置，不伪装真实扣款。
- 后台预约列表展示最新定金状态、渠道和金额，方便运营追踪。
- 即使未来配置了 Stripe secret，也不会在缺少完整确认流时误报真实 provider 已接入。

### 已通过的验证
- Red/green：支付 readiness 与后台定金追踪回归测试先失败后通过。
- TypeScript / lint：通过。
- Vitest：222/222 通过。
- `build:full` + performance budget：通过。
- Playwright booking/dashboard：6/6 通过。
- GitHub Actions：CI run `28205721670` 通过（main / `60552a2`）。

### 遗留风险
- 真实扣款仍需完整接入 Stripe/支付服务商的客户端确认、webhook、失败恢复和退款状态。

### 下一轮建议方向
1. 为人像编辑器增加模型加载进度、失败重试和弱网降级。
2. 继续推进真实支付确认流，但必须在具备真实密钥和完整客户端确认方案后执行。
3. 优化移动端个人中心顶部视觉区的首屏高度。

### 推荐下一轮优先执行的旗舰级主改动
人像编辑器韧性升级：增加模型加载进度、失败重试、弱网降级和清晰的本地处理状态。

---

## Campaign 012 Stage 2 — Portrait Editor Resilience

### 承接的上一轮方向
- 上一轮推荐旗舰：人像编辑器韧性升级。
- 本阶段聚焦模型加载失败后的用户可恢复路径，不把临时弱网或模型文件错误变成整页重载。

### 完成内容
- 模型加载失败时改为页面内重试，不再要求刷新整页。
- 增加降级模式提示，说明滤镜、文字、边框和导出仍可继续使用。
- 初始加载和手动重试复用同一模型加载路径，并在重试前清理错误状态。
- 新增 zh-CN、en、ja、ko 四语言文案。
- 增加编辑器回归测试锁定重试入口、降级提示和样式挂点。

### 已通过的验证
- Red/green：编辑器重试与降级模式回归测试先失败后通过。
- TypeScript / lint：通过。
- Vitest：223/223 通过。
- `build:full` + performance budget：通过。
- Playwright smoke：13/13 通过。
- GitHub Actions：CI run `28206154909` 通过（main / `3a5523e`）。

### 遗留风险
- 人脸美颜、重塑等 face-api 相关能力仍依赖模型文件成功加载；降级模式保证非人脸编辑能力可继续使用。

### 下一轮建议方向
1. 优化移动端个人中心顶部视觉区首屏高度和信息密度。
2. 为编辑器增加移动端工具栏分组和更清晰的导出状态。
3. 继续推进真实支付确认流，但必须等完整客户端确认、webhook 和退款状态方案具备后再落地。

### 推荐下一轮优先执行的旗舰级 UI/UX 主改动
移动端个人中心首屏优化：降低顶部视觉区高度，突出预约、作品、收藏和修图入口，减少首屏滚动成本。

---

## Campaign 012 Stage 3 — Mobile Dashboard First Viewport UI/UX

### 承接的上一轮方向
- 上一轮推荐旗舰：移动端个人中心首屏优化。
- 本阶段聚焦个人中心首屏占用和核心入口可达性。

### 完成内容
- 为个人中心 hero 增加专用紧凑样式，避免沿用首页 100svh 营销 hero。
- 在头像账户卡内新增预约、图库、编辑器三个快捷入口。
- 移动端将快捷入口压缩为三列，控制文字溢出并保持触控尺寸。
- 为快捷入口组新增 zh-CN、en、ja、ko 的 aria label。
- 增加源码回归测试锁定紧凑 hero、快捷入口和移动端样式约束。

### 已通过的验证
- Red/green：移动端首屏 UI/UX 回归测试先失败后通过。
- TypeScript / lint：通过。
- Vitest：224/224 通过。
- `build:full` + performance budget：通过。
- Playwright booking/dashboard：6/6 通过。
- 移动端 390×844 实测：hero 206px，3 个快捷入口在首屏内，无横向溢出，tablist 为水平模式。
- GitHub Actions：CI run `28206548831` 通过（main / `613652d`）。

### 遗留风险
- Dashboard 仍是登录后页面；移动端视觉验证使用 mock 登录态，和现有 E2E 保持一致。
- `_redirects` 在 Pages preview 中仍有 3 条 infinite loop 警告，建议作为 CHECK 阶段优先处理。

### 下一轮建议方向
1. 修复 `_redirects` 的 Pages infinite-loop 警告，并确认 SPA 路由仍可直达。
2. 为 Gallery 搜索增加结果数量、筛选状态持久化和清除入口。
3. 为编辑器移动工具栏增加更清晰的分组与导出状态。

### 推荐下一轮优先执行的旗舰级主改动
Pages 路由健康修复：清理 `_redirects` infinite-loop 警告，确保 `/admin`、`/dashboard`、`/editor` 等 SPA 路由在 Cloudflare Pages preview 和生产环境都直达可用。

---

## Campaign 012 Stage 4 — Advanced Gallery Discovery Persistence

### 承接的上一轮方向
- 上一轮建议之一：Gallery 搜索增强与筛选状态持久化。
- 本阶段补齐已有 Gallery 筛选体系里的缺口：相册、时间范围和排序不应在分享链接、恢复会话或保存搜索时丢失。

### 完成内容
- Gallery URL 参数新增 `album`、`date`、`sort`。
- `nhb-gallery-discovery-state` 新增相册、时间范围和排序状态。
- 保存搜索新增 album/dateRange/sort 字段，ID 也包含完整筛选状态。
- 回放保存搜索时恢复完整状态，而不只恢复风格、关键词和视图。
- 兼容旧保存搜索，缺失字段默认回落到 all/default。
- 补齐四语言的相册、时间范围和日期标签文案。

### 已通过的验证
- Red/green：Gallery 高级筛选持久化测试先失败后通过。
- TypeScript / lint：通过。
- Vitest：225/225 通过。
- `build:full` + performance budget：通过。
- Playwright 浏览器验证：URL、localStorage、保存搜索和回放都保留 album/date/search/view/sort，保存标签显示本地化日期与排序文案。
- GitHub Actions：CI run `28208899378` 通过（main / `86760d0`）。

### 遗留风险
- 旧保存搜索会以默认 album/dateRange/sort 迁移，不会自动推断历史筛选语义。
- `_redirects` infinite-loop 警告仍待 CHECK 阶段处理。

### 下一轮建议方向
1. 修复 `_redirects` infinite-loop 警告并验证 SPA 路由。
2. 更新 GitHub Actions 到非 Node 20 弃用路径。
3. 为编辑器移动工具栏增加分组与导出状态。

### 推荐下一轮优先执行的 CHECK 项
Pages 路由配置检查：移除或替换会触发 infinite-loop 的 SPA rewrite 规则，并用 `wrangler pages dev dist` 验证不再警告、核心路由仍可直达。
