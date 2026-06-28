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
- GitHub Actions：CI run `28299055249` 通过（main / `3d2f3eb`）。
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

---

## Campaign 012 Stage 5 — Pages Redirect Health Check

### 承接的上一轮方向
- 上一轮推荐 CHECK 项：清理 `_redirects` infinite-loop 警告。
- 本阶段聚焦 Cloudflare Pages preview 中反复出现的 3 条无效 SPA rewrite 规则。

### 完成内容
- 移除 `public/_redirects` 中会触发 infinite-loop 的 `/index.html 200` rewrite。
- 移除不必要的 `/api/* /api/:splat 200` 规则，API 继续由 Pages Functions 处理。
- 保留 `/admin /admin/ 301` 作为后台路径规范化。
- 更新回归测试，防止未来重新加入 `/index.html 200` rewrite。

### 已通过的验证
- Targeted：`audit-regressions` 42/42 通过。
- TypeScript / lint：通过。
- Vitest：225/225 通过。
- `build:full` + performance budget：通过。
- `wrangler pages dev dist`：只解析 1 条 redirect rule，无 infinite-loop warning。
- 直达路由验证：`/admin` 301 到 `/admin/`，`/admin/`、`/dashboard`、`/editor`、`/gallery/gallery-garden-01`、`/booking` 均 200。
- Playwright smoke：13/13 通过。
- GitHub Actions：CI run `28209203704` 通过（main / `44aeb91`）。

### 遗留风险
- 该修复依赖 Cloudflare Pages 默认 SPA fallback；本地 Pages preview 已验证行为正确。

### 下一轮建议方向
1. 更新 GitHub Actions 运行环境，处理 Node 20 actions 弃用提示。
2. 为编辑器移动工具栏增加分组与导出状态。
3. 继续推进真实支付确认流，但必须具备完整 Stripe 客户端确认和 webhook 方案。

### 推荐下一轮优先执行的旗舰级主改动
CI 健康升级：将 GitHub Actions 的 Node/setup 路径更新到当前运行环境，消除 Node 20 actions 弃用提示，降低后续 CI 突然失败风险。

---

## Campaign 012 Stage 6 — CI Runtime Health Upgrade

### 承接的上一轮方向
- 上一轮推荐旗舰：CI 健康升级。
- 本阶段处理 GitHub Actions 持续提示的 Node 20 actions 弃用风险。

### 完成内容
- `actions/checkout@v4` 升级到 `actions/checkout@v5`。
- `actions/setup-node@v4` 升级到 `actions/setup-node@v6`。
- CI Node runtime 从 22 升到 24。
- 移除临时 `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` 环境变量。
- 增加回归测试，防止 workflow 回退到 Node 20-era actions。

### 已通过的验证
- Red/green：CI runtime 回归测试先失败后通过。
- TypeScript / lint：通过。
- Vitest：226/226 通过。
- `build:full` + performance budget：通过。
- `wrangler pages dev dist`：只解析 1 条 redirect rule，无 infinite-loop warning。
- Playwright smoke：13/13 通过。
- GitHub Actions：CI run `28210487623` 通过（main / `663d74b`），不再出现 Node 20 actions 弃用注解。

### 遗留风险
- 真实支付仍未启用，仍需完整 Stripe 客户端确认、webhook、失败恢复和退款状态闭环。
- 字体包与 `face-api-vendor` 仍是主要体积来源，但当前 performance budget 通过。
- PhotoEditorPage 仍有历史 `@ts-nocheck`。

### 下一轮建议方向
1. 为编辑器移动工具栏增加分组、导出状态和弱网提示。
2. 继续推进真实支付确认流，但必须先完成 Stripe 客户端确认和 webhook 方案。
3. 拆分或延迟加载更多字体/模型资产，进一步压低首屏体积。

### 推荐下一轮优先执行的旗舰级主改动
编辑器移动工作流增强：把移动端工具栏按调色、滤镜、文字、导出分组，并补充导出进度与失败恢复。

---

## Campaign 013 Stage 1 — Mobile Editor Workflow Upgrade

### 承接的上一轮方向
- 上一轮推荐旗舰：编辑器移动工作流增强。
- 本阶段已完成移动端工具分组、导出状态、失败恢复入口，并顺手修复真实检测器/工具文案问题。

### 完成内容
- 新增编辑器工作流分组：美颜、调色、装饰、导出。
- 上传照片后，移动端和桌面端都能通过任务分组快速切换调色/滤镜/文字贴纸边框/导出。
- 导出从同步 `toDataURL` 改为异步 `toBlob`，并显示生成中、成功和失败重试状态。
- 修复高级工具翻译 key，避免背景、局部调整、色彩保留、双重曝光显示未翻译 key。
- 修复 face-api 检测器不匹配：加载的是 Tiny Face Detector 时，检测也显式使用 `TinyFaceDetectorOptions`。

### 已通过的验证
- Red/green：编辑器分组、导出恢复、工具 label 和检测器模型回归测试先失败后通过。
- TypeScript / lint：通过。
- Vitest：228/228 通过。
- `build:full` + performance budget：通过。
- `wrangler pages dev dist` 浏览器验证：桌面与 390px 移动端编辑器上传、分组、导出、下载状态通过，无控制台 error，无横向溢出。
- Playwright smoke：13/13 通过。
- GitHub Actions：CI run `28211209844` 通过（main / `52951c4`）。

### 遗留风险
- 字体包与 `face-api-vendor` 仍是主要体积来源，但当前 performance budget 通过。
- 真实支付仍未启用，仍需要完整 Stripe 客户端确认、webhook、失败恢复和退款状态闭环。

### 下一轮建议方向
1. 推进真实支付确认流的低风险前置闭环：补齐客户端确认状态模型、失败/取消状态和 webhook 幂等测试，不接入真实密钥。
2. 优化编辑器资产加载：进一步延迟加载 face-api 或减少编辑器首屏模型压力。
3. 为导出结果增加“保存到个人中心/最近编辑”的轻量历史能力。

### 推荐下一轮优先执行的旗舰级主改动
支付确认状态闭环：在不触碰真实密钥的前提下，补齐客户端可见的确认/失败/取消状态、webhook 幂等处理和用户/管理员状态追踪。

---

## Campaign 013 Stage 2 — Payment Confirmation State Loop

### 承接的上一轮方向
- 上一轮推荐旗舰：支付确认状态闭环。
- 本阶段在不接入真实支付密钥的前提下，补齐客户端确认状态、失败/取消状态和 webhook 幂等处理。

### 完成内容
- 支付确认接口返回客户端安全状态：确认状态、存储支付状态、provider 和下一步动作。
- 标准化 pending、processing、succeeded、failed、cancelled 和旧式 `canceled` 状态。
- 预约支付表单支持 pending、failed、cancelled 结果，不再把所有非成功状态都压成通用失败。
- webhook 对重复的同状态支付事件做幂等短路，避免重复写库和后续副作用。
- 增加 API 与审计回归测试，覆盖确认状态模型和重复 webhook 行为。

### 已通过的验证
- Red/green：支付确认与重复 webhook 测试先失败后通过。
- Targeted：`functions/api.test.ts` + `audit-regressions` 56/56 通过。
- TypeScript / lint：通过。
- Vitest：231/231 通过。
- `build:full` + performance budget：通过。
- Playwright booking flow against Pages preview：6/6 通过。
- GitHub Actions：CI run `28218108321` 通过（main / `d5875e1`）。

### 遗留风险
- 真实 Stripe 客户端确认仍未启用；上线前仍需 Payment Element、真实 publishable key、webhook secret、失败恢复和退款状态闭环。
- placeholder provider 仍走人工 follow-up，不能视为真实收款完成。

### 下一轮建议方向
1. UIUX：让预约支付步骤清楚呈现待确认/已取消/失败等状态，减少用户误解。
2. 为管理员订单视图增加更清晰的支付状态筛选和状态说明。
3. 继续补齐真实 Stripe 客户端确认路径，但仅在密钥和 webhook 配置就绪后启用。

### 推荐下一轮优先执行的 UIUX 项
支付状态体验优化：在预约支付步骤和状态提示中显式区分待确认、失败、取消和人工跟进，确保移动端用户不会把 placeholder pending 误认为已支付完成。

---

## Campaign 013 Stage 3 — Payment Status UX Clarification

### 承接的上一轮方向
- 上一轮推荐 UIUX 项：支付状态体验优化。
- 本阶段聚焦预约支付步骤和状态提示的可理解性，尤其是 placeholder pending、取消和失败状态。

### 完成内容
- 在支付表单和结果态加入三步状态轨道：提交、确认、跟进。
- pending 结果增加人工跟进提示，明确“收取定金前会先确认支付方式”。
- cancelled/failed 结果增加下一步说明，并把继续动作改成“暂不支付并继续”。
- 移动端支付按钮改为窄屏纵向排列，失败态按钮允许换行，降低按钮挤压风险。
- 补齐中英日韩四语言文案，并增加审计回归和 booking e2e 覆盖。

### 已通过的验证
- Red/green：支付状态 UX 审计测试先失败后通过。
- Targeted：`audit-regressions` 45/45 通过。
- TypeScript / lint：通过。
- Vitest：232/232 通过。
- `build:full` + performance budget：通过。
- Playwright booking flow against Pages preview：6/6 通过。
- GitHub Actions：CI run `28218737128` 通过（main / `9fa7b64`）。

### 遗留风险
- 真实 Stripe 支付仍未启用；当前 UI 只解释 placeholder/manual follow-up 模式。
- 支付结果态仍依赖 BookingModal 立即进入预约成功页；独立商品/课程支付页可能还需要后续独立验收。

### 下一轮建议方向
1. IMPROVE：补强独立课程/工作坊/商品支付页对新状态模型的展示与回退路径。
2. CHECK：检查所有支付入口是否都能看到一致的 pending/manual follow-up 语义。
3. 为管理员订单筛选增加支付状态聚合，便于人工跟进 pending 定金。

### 推荐下一轮优先执行的旗舰级主改动
跨支付入口状态一致性：把课程、工作坊、预设和商品详情页的支付入口统一到新的状态轨道和 pending/failure/cancelled 语义，避免只有预约定金路径体验完整。

---

## Campaign 013 Stage 4 — Paid Entry Pending State Consistency

### 承接的上一轮方向
- 上一轮推荐旗舰：跨支付入口状态一致性。
- 本阶段检查并补齐实际使用 `PaymentForm` 的非预约入口：课程购买和工作坊报名。

### 完成内容
- 课程购买入口新增 `onPending` 处理，placeholder pending 后回到购买卡片并显示人工跟进说明。
- 工作坊付费报名新增 `onPending` 处理，在确认弹窗中显示支付待确认说明。
- 新增课程/工作坊 pending payment note 样式。
- 补齐中英日韩四语言课程/工作坊 pending 文案。
- 增加审计回归测试，要求课程和工作坊支付入口显式处理 `onPending`。

### 已通过的验证
- Red/green：课程/工作坊 pending 语义审计测试先失败后通过。
- Targeted：`audit-regressions` 46/46 通过。
- TypeScript / lint：通过。
- Vitest：233/233 通过。
- `build:full` + performance budget：通过。
- Playwright smoke against Pages preview：13/13 通过。
- GitHub Actions：CI run `28219073856` 通过（main / `0602ccd`）。

### 遗留风险
- 当前扫描到的直接 `PaymentForm` 入口只有预约、课程、工作坊；预设/商品未来接入直接支付时仍需套用同一状态合同。
- 真实 Stripe Payment Element 和退款状态仍未启用。

### 下一轮建议方向
1. CHECK：系统检查支付入口、状态文案、管理员/用户视图是否全部一致。
2. CHECK：检查 API 层 payment status 枚举、前端 i18n 和 dashboard/admin 状态展示是否存在遗漏。
3. IMPROVE：为管理员支付状态增加聚合筛选，支撑人工跟进。

### 推荐下一轮优先执行的 CHECK 项
支付状态一致性检查：从 API 枚举、PaymentForm、预约成功页、课程/工作坊入口、用户 dashboard 和管理员 booking 卡片逐项核对 pending/processing/succeeded/failed/cancelled 文案和行为是否一致。

---

## Campaign 013 Stage 5 — Payment Status Consistency Check

### 承接的上一轮方向
- 上一轮推荐 CHECK 项：支付状态一致性检查。
- 本阶段核对 API 枚举、PaymentForm、预约/课程/工作坊入口、用户 dashboard 和管理员 booking 卡片。

### 检查发现
- 用户 dashboard 已使用 `dashboard.paymentStatus.*` 多语言状态文案。
- 管理员 booking 卡片仍使用硬编码中文 payment status label，且 pending/processing 没有独立视觉样式。

### 完成内容
- 管理员 booking 支付状态改为复用 `dashboard.paymentStatus.*` 文案。
- 管理员 booking 金额格式化使用当前 locale。
- 新增 pending/processing 管理员支付状态样式。
- 增加审计回归，防止 admin payment status label 再次与 customer dashboard 分叉。

### 已通过的验证
- Red/green：管理员支付状态一致性审计测试先失败后通过。
- Targeted：`audit-regressions` 47/47 通过。
- TypeScript / lint：通过。
- Vitest：234/234 通过。
- `build:full` + performance budget：通过。
- Playwright smoke against Pages preview：13/13 通过。
- GitHub Actions：CI run `28219380047` 通过（main / `d4a0020`）。

### 遗留风险
- 管理员 booking 卡片中的非支付状态仍保留历史中文文案；本阶段只修复支付状态一致性。
- 管理员支付 provider/人工跟进文案仍可进一步 i18n 化。

### 下一轮建议方向
1. IMPROVE：补齐 admin payment provider/人工跟进文案的 i18n，完成支付块多语言闭环。
2. IMPROVE：增加管理员支付状态筛选或聚合计数，方便 pending 人工跟进。
3. CHECK：真实 Stripe 接入前再做一次 payment status matrix 验收。

### 推荐下一轮优先执行的旗舰级主改动
管理员支付跟进文案闭环：把 admin booking 支付块中的 provider、等待用户确认、金额待确认等剩余文案纳入 i18n，并增加回归测试保护。

---

## Campaign 013 Stage 6 — Admin Payment Follow-up Copy Localization

### 承接的上一轮方向
- 上一轮推荐旗舰：管理员支付跟进文案闭环。
- 本阶段完成 admin booking 支付块剩余文案的多语言闭环。

### 完成内容
- 管理员 booking 支付块的 provider label 改为 i18n。
- 管理员 booking 支付块的“等待用户确认”改为 i18n。
- 管理员 booking 支付块的“金额待确认”补齐中英日韩四语言文案。
- 增加审计回归，防止 provider/waiting/amount pending 文案回退为硬编码。

### 已通过的验证
- Red/green：管理员支付跟进文案审计测试先失败后通过。
- Targeted：`audit-regressions` 48/48 通过。
- TypeScript / lint：通过。
- Vitest：235/235 通过。
- `build:full` + performance budget：通过。
- Playwright smoke against Pages preview：13/13 通过。
- GitHub Actions：CI run `28219688368` 通过（main / `c0e5df4`）。

### 遗留风险
- 真实 Stripe 收款仍未启用；本轮完成的是 placeholder-safe 支付状态、用户体验和管理员跟进的一致性。
- 字体包与 `face-api-vendor` 仍是主要体积来源，但当前 performance budget 通过。
- 管理员 booking 卡片的非支付状态文案仍保留历史中文写法。

### 下一轮建议方向
1. 真实 Stripe Payment Element 接入前，先补全 live-secret 配置清单和 webhook runbook。
2. 为管理员增加 payment status 筛选/聚合计数，方便 pending 人工跟进。
3. 继续优化字体/face-api 资产体积，降低首屏传输压力。

### 推荐下一轮优先执行的旗舰级主改动
真实支付启用前置包：整理 Stripe live 配置清单、Payment Element 客户端路径、webhook secret 验证、退款/失败 runbook 和管理员 pending 队列筛选。

---

## Campaign 014 Stage 1 — Admin Payment Follow-up Queue

### 承接的上一轮方向
- 上一轮推荐旗舰：真实支付启用前置包。
- 本阶段先完成其中无需真实密钥、最可验证的运营闭环：管理员 pending/processing 支付跟进队列。

### 完成内容
- 管理员预约页新增 pending + processing 支付跟进队列计数。
- 新增按支付状态筛选的定金 filter chips，并显示每个状态计数。
- 管理员可以直接筛出待人工跟进的 deposit intent，不再逐张卡片肉眼扫描。
- 补齐中英日韩筛选与队列文案。
- 增加审计回归测试，保护筛选与聚合能力。

### 已通过的验证
- Red/green：管理员支付跟进队列审计测试先失败后通过。
- Targeted：`audit-regressions` 49/49 通过。
- TypeScript / lint：通过。
- Vitest：236/236 通过。
- `build:full` + performance budget：通过。
- Playwright smoke against Pages preview：13/13 通过。
- GitHub Actions：CI run `28220980897` 通过（main / `8aea9e3`）。

### 遗留风险
- 真实 Stripe 收款仍未启用；本阶段只提升 placeholder/manual follow-up 运营效率。
- 管理员筛选是前端本地筛选；当预约数据规模变大时可考虑 API 级筛选。

### 下一轮建议方向
1. 继续真实支付启用前置包：增加 Stripe live 配置清单和 webhook/退款 runbook。
2. 为管理员 pending 队列增加下一步操作提示或导出。
3. 继续优化字体/face-api 资产体积，降低首屏传输压力。

### 推荐下一轮优先执行的旗舰级主改动
真实支付上线前检查清单：在项目内提供 Stripe live 配置、Payment Element 客户端路径、webhook secret 验证、退款/失败处理和回滚步骤的可维护 runbook。

---

## Campaign 014 Stage 2 — Payment Live Readiness Runbook

### 承接的上一轮方向
- 上一阶段推荐旗舰：真实支付上线前检查清单。
- 本阶段完成 Stripe live-readiness runbook，并把关键上线前检查项直接呈现在管理员预约支付队列中。

### 完成内容
- 新增 `docs/payment-live-readiness.md`，覆盖 Stripe live keys、Payment Element 客户端路径、webhook event matrix、退款/失败处理、rollback 和验证清单。
- 管理员预约页新增真实支付上线检查面板，提醒 live keys、webhook secret/status matrix、退款/失败人工跟进前置条件。
- 补齐中英日韩四语言 readiness 文案。
- 增加审计回归，防止 runbook 缺失、管理端提示缺失或误提交 `sk_live_`/`whsec_` 形态密钥。

### 已通过的验证
- Red/green：live-readiness 审计测试先失败后通过。
- Targeted：`audit-regressions` 50/50 通过。
- TypeScript / lint：通过。
- Vitest：237/237 通过。
- `build:full` + performance budget：通过。
- Playwright smoke against Pages preview：13/13 通过。
- GitHub Actions：CI run `28221389348` 通过（main / `1026abe`）。

### 遗留风险
- 真实 Stripe 收款仍未启用；当前完成的是上线前置包和运营提示。
- 退款状态尚未持久化；启用 live refunds 前仍需数据模型和管理端状态闭环。
- 大字体包与 `face-api-vendor` 仍是主要体积来源，但当前 performance budget 通过。

### 下一轮建议方向
1. UIUX：让客户在预约提交后的支付/人工跟进状态更清楚，减少“是否已扣款”的误解。
2. IMPROVE：增加 signed webhook fixture 覆盖 processing/failed/cancelled/refund 状态矩阵。
3. IMPROVE：继续优化字体/face-api 资产体积，降低首屏传输压力。

### 推荐下一轮优先执行的旗舰级主改动
预约支付完成体验澄清：在 booking completion/dashboard 里强化 pending/manual follow-up、未扣款、下一步联系路径和重试/取消反馈，让客户不用猜当前支付状态。

---

## Campaign 014 Stage 3 — Booking Payment Completion Clarity

### 承接的上一轮方向
- 上一阶段推荐旗舰：预约支付完成体验澄清。
- 本阶段完成客户侧预约成功态的 payment clarity 面板，让 pending/manual follow-up 和“未扣款”状态在提交后立即可见。

### 完成内容
- 预约成功弹窗新增三步式 payment clarity：预约已保存、没有产生扣款、后续人工确认。
- 移动端成功态改为单列 clarity 步骤，避免小屏信息拥挤。
- 补齐中英日韩四语言完成态文案。
- booking E2E 增加真实可见断言，确认 pending deposit 成功态展示新面板。
- 增加审计回归，保护 completion clarity、移动端样式和 i18n。

### 已通过的验证
- Red/green：预约完成 payment clarity 审计测试先失败后通过。
- Targeted：`audit-regressions` 51/51 通过。
- TypeScript / lint：通过。
- Vitest：238/238 通过。
- `build:full` + performance budget：通过。
- Playwright smoke against Pages preview：13/13 通过。
- Playwright booking flow：6/6 通过。
- GitHub Actions：CI run `28221882096` 通过（main / `0546aed`）。

### 遗留风险
- 真实 Stripe 收款仍未启用；当前只澄清 placeholder/manual follow-up 用户体验。
- 退款状态尚未进入用户 dashboard 展示。
- 大字体包与 `face-api-vendor` 仍是主要体积来源，但当前 performance budget 通过。

### 下一轮建议方向
1. IMPROVE：增加 signed webhook fixture，覆盖 processing/failed/cancelled/refund 状态矩阵。
2. CHECK：做一次 payment status matrix 验收，确认 API、客户 dashboard、admin、E2E 文案一致。
3. IMPROVE：继续优化字体/face-api 资产体积，降低首屏传输压力。

### 推荐下一轮优先执行的旗舰级主改动
Webhook 状态矩阵加固：用签名 webhook fixture 覆盖 processing、failed、cancelled 和 refund 事件，补齐真实支付上线前最关键的后端状态安全网。

---

## Campaign 014 Stage 4 — Payment Webhook Status Matrix Hardening

### 承接的上一轮方向
- 上一阶段推荐旗舰：Webhook 状态矩阵加固。
- 本阶段完成 signed webhook fixture 覆盖，并把 `refunded` 状态贯通到客户和管理员可见状态。

### 完成内容
- 新增签名 webhook 矩阵测试，覆盖 `payment_intent.processing`、`payment_intent.payment_failed`、`payment_intent.canceled` 和 `charge.refunded`。
- webhook 状态归一化改为 event type 优先，修复 `payment_intent.payment_failed` 对象状态为 `requires_payment_method` 时会回落为 pending 的风险。
- 新增 `refunded` payment status，贯通 confirm API、共享类型、客户 dashboard、管理员 booking 筛选、样式和中英日韩文案。
- 审计回归增加 refund 状态 UI/i18n 保护。

### 已通过的验证
- Red/green：payment webhook/status matrix 目标测试先失败后通过。
- Targeted：`functions/api.test.ts + audit-regressions` 64/64 通过。
- TypeScript / lint：先发现 webhook nullable 类型问题，修复后通过。
- Vitest：239/239 通过。
- `build:full` + performance budget：通过。
- Playwright smoke against Pages preview：13/13 通过。
- Playwright booking flow：6/6 通过。
- GitHub Actions：CI run `28232976126` 通过（main / `4a46c2b`）。

### 遗留风险
- Refund 目前记录为 payment intent 的 `refunded` 状态；完整 live refund reconciliation 仍需要持久化 charge id、refund amount、actor 和 timestamp。
- 真实 Stripe Payment Element 仍未启用。
- 大字体包与 `face-api-vendor` 仍是主要体积来源，但当前 performance budget 通过。

### 下一轮建议方向
1. CHECK：做一次 payment status matrix 验收，确认 API、客户 dashboard、admin、i18n、E2E 和 runbook 一致。
2. IMPROVE：为 refund reconciliation 增加结构化记录字段或单独 refund audit log。
3. IMPROVE：继续优化字体/face-api 资产体积，降低首屏传输压力。

### 推荐下一轮优先执行的旗舰级主改动
支付状态矩阵验收：从 webhook、confirm API、客户 dashboard、管理员 booking 队列、i18n、文档和 E2E 逐项检查 pending/processing/succeeded/failed/cancelled/refunded 是否一致，并修复发现的问题。

---

## Campaign 014 Stage 5 — Payment Status Matrix Check

### 承接的上一轮方向
- 上一阶段推荐旗舰：支付状态矩阵验收。
- 本阶段检查 webhook、confirm API、客户 dashboard、管理员 booking 队列、i18n、runbook 和 E2E 的状态一致性。

### 完成内容
- 发现并修复真实漂移：runbook 仍遗漏 `refunded`，且 `charge.refunded` 行没有写明实际存储状态。
- 更新 `docs/payment-live-readiness.md`，补齐 `refunded` 状态、webhook matrix 和管理员筛选检查项。
- booking E2E 增加 refunded dashboard 可见断言，确认用户侧能看到退款状态。
- 审计回归增加 runbook `refunded` 保护。

### 已通过的验证
- Targeted：`audit-regressions` 51/51 通过。
- Playwright booking flow：6/6 通过，包含 refunded dashboard 断言。
- TypeScript / lint：通过。
- Vitest：239/239 通过。
- `build:full` + performance budget：通过。
- Playwright smoke against Pages preview：13/13 通过。
- GitHub Actions：CI run `28233345665` 通过（main / `772ad0c`）。

### 遗留风险
- Refund reconciliation 仍缺少 charge id、refund amount、actor、timestamp 等结构化记录。
- 真实 Stripe Payment Element 仍未启用。
- 大字体包与 `face-api-vendor` 仍是主要体积来源，但当前 performance budget 通过。

### 下一轮建议方向
1. IMPROVE：增加 refund reconciliation 基础记录，先记录 refund metadata，不启用真实退款。
2. IMPROVE：继续优化字体/face-api 资产体积，降低首屏传输压力。
3. CHECK：上线前对 live Stripe 环境变量、webhook secret 和 Payment Element 进行最后验收。

### 推荐下一轮优先执行的旗舰级主改动
退款对账基础：在不启用真实退款的前提下，为 `charge.refunded` 记录结构化 refund metadata 或 audit 事件，让后续 live refunds 有可追踪基础。

---

## Campaign 014 Stage 6 — Refund Webhook Metadata Foundation

### 承接的上一轮方向
- 上一阶段推荐旗舰：退款对账基础。
- 本阶段在不启用真实退款的前提下，让 `charge.refunded` webhook 记录可追踪 refund metadata。

### 完成内容
- `charge.refunded` webhook 更新 `payment_intents.status = refunded` 时同步写入 metadata。
- 新增 `buildRefundMetadata`，保留既有 metadata，并记录 charge id、退款金额、币种、状态和接收时间。
- 新增 API 回归测试，验证签名 refund webhook 会写入结构化 metadata。
- 审计回归保护 refund metadata helper 不被移除。

### 已通过的验证
- Red/green：refund metadata 目标测试先失败后通过。
- Targeted：`functions/api.test.ts + audit-regressions` 65/65 通过。
- TypeScript / lint：通过。
- Vitest：240/240 通过。
- `build:full` + performance budget：通过。
- Playwright smoke against Pages preview：13/13 通过。
- Playwright booking flow：6/6 通过。
- GitHub Actions：CI run `28234197487` 通过（main / `d65f04d`）。

### 遗留风险
- Refund metadata 当前复用 `payment_intents.metadata` JSON；live refunds 前仍建议增加专用 refund ledger/audit 表。
- 真实 Stripe Payment Element 和 live card collection 仍未启用。
- 大字体包与 `face-api-vendor` 仍是主要体积来源，但当前 performance budget 通过。

### 下一轮建议方向
1. IMPROVE：新增专用 refund ledger/audit 表并在 admin 侧展示退款对账详情。
2. IMPROVE：继续优化字体/face-api 资产体积，降低首屏传输压力。
3. CHECK：在真实 Stripe keys/webhook secret 配置完成后，执行 live-readiness 最终验收。

### 推荐下一轮优先执行的旗舰级主改动
退款对账台账：新增专用 refund ledger/audit 表和管理员可见退款详情，替代目前临时复用 `payment_intents.metadata` 的方式。

---

## Campaign 015 Stage 1 — Refund Reconciliation Ledger

### 承接的上一轮方向
- 上一轮推荐旗舰：退款对账台账。
- 本阶段新增专用 `payment_refunds` ledger，并让管理员在预约队列中直接查看退款对账详情。

### 完成内容
- 新增 `payment_refunds` 表和索引，使用 Stripe charge id 做幂等唯一键。
- `charge.refunded` webhook 在更新 payment intent 状态/metadata 的同时写入专用退款台账。
- 管理员预约 API 投影最新退款记录。
- 管理员预约卡片展示退款金额、退款状态、charge id 和接收时间。
- 更新 live-readiness 文档和审计回归，防止回退到只复用 `payment_intents.metadata`。

### 已通过的验证
- Red/green：退款台账与 admin 可见详情目标测试先失败后通过。
- Targeted：`functions/api.test.ts + audit-regressions` 66/66 通过。
- TypeScript / lint：通过。
- Vitest：241/241 通过。
- `build:full` + performance budget：通过。
- Playwright smoke against Pages preview：13/13 通过。
- Playwright booking flow：6/6 通过。
- GitHub Actions：CI run `28234924115` 通过（main / `bc00fd5`）。

### 遗留风险
- 真实 Stripe Payment Element 和 live card collection 仍未启用。
- 退款 actor/source attribution 仍需在真实退款操作上线时补齐。
- 大字体包与 `face-api-vendor` 仍是主要体积来源，但当前 performance budget 通过。

### 下一轮建议方向
1. IMPROVE：继续优化字体/face-api 资产体积，降低首屏和编辑器路径传输压力。
2. IMPROVE：为管理员支付跟进队列增加更清晰的退款/失败优先级分组。
3. CHECK：在真实 Stripe keys/webhook secret 配置完成后，执行 live-readiness 最终验收。

### 推荐下一轮优先执行的旗舰级主改动
支付路径加载优化：针对当前最大的字体与 `face-api-vendor` 体积热点，做一次不影响设计语言的加载拆分或延迟加载改进，让首页/预约路径更轻，编辑器能力按需加载。

---

## Campaign 015 Stage 2 — Deferred Editor AI Loading

### 承接的上一轮方向
- 上一阶段推荐旗舰：支付路径/编辑器加载优化。
- 本阶段针对 `face-api-vendor` 体积热点，把编辑器 AI 模型加载从进入页面即加载改为上传照片后按需加载。

### 完成内容
- 移除 `/editor` 挂载时自动加载 face-api 模型的行为。
- 上传照片或点击重试时才启动 AI 模型与 face-api lazy chunk 加载。
- 编辑器空状态新增提示，说明 AI 模型会在添加照片后加载，初始页面更轻。
- 新增编辑器回归测试，防止恢复 eager model loading。

### 已通过的验证
- Red/green：编辑器按需加载目标测试先失败后通过。
- Targeted：`editor-regressions` 14/14 通过。
- TypeScript / lint：通过。
- Vitest：242/242 通过。
- `build:full` + performance budget：通过。
- Playwright smoke against Pages preview：13/13 通过，包含编辑器上传/导出路径。
- Playwright booking flow：6/6 通过。
- GitHub Actions：CI run `28235442622` 通过（main / `aa8629b`）。

### 遗留风险
- `face-api-vendor` 仍是大 lazy chunk；本阶段降低请求时机，不降低 chunk 体积。
- 中日韩字体仍是最大总资产来源。
- 真实 Stripe Payment Element 和 live card collection 仍未启用。

### 下一轮建议方向
1. UIUX：围绕编辑器空状态、上传前说明、移动端首屏和模型加载反馈做一次明显体感升级。
2. IMPROVE：继续拆分或替代 `face-api-vendor` / 多语言字体体积热点。
3. CHECK：检查编辑器 degraded mode、模型缓存、离线/弱网路径和 PWA runtime cache 是否一致。

### 推荐下一轮优先执行的旗舰级主改动
编辑器首屏体验升级：在 deferred AI loading 基础上，重做编辑器空状态和上传前引导，让用户清楚知道“先上传、本地处理、AI 按需加载、无模型也可继续编辑”，并在移动端保持紧凑可操作。

---

## Campaign 015 Stage 3 — Editor First-Screen UI/UX Upgrade

### 承接的上一轮方向
- 上一阶段推荐旗舰：编辑器首屏体验升级。
- 本阶段围绕 deferred AI loading 后的上传前体验，重做 `/editor` 空状态与移动端首屏布局。

### 完成内容
- 将编辑器空状态从说明文字升级为操作优先的上传面板。
- 新增本地处理、AI 按需加载、基础工具可先用的可见说明 badge。
- 补齐空状态上传按钮的 hover/focus 样式和移动端 badge 堆叠布局。
- 修复未上传照片时默认 canvas 挤压移动端空状态面板的问题。
- 新增回归测试覆盖空状态结构和移动端 placeholder canvas 防挤压约束。

### 已通过的验证
- Red/green：空状态 UI 回归测试先失败后通过。
- Red/green：移动端空状态挤压回归测试先失败后通过。
- Targeted：`editor-regressions` 16/16 通过。
- TypeScript / lint：通过。
- Vitest：244/244 通过。
- `build:full` + performance budget：通过。
- Rendered QA：桌面与 390px 移动端 `/editor` 验证通过，空状态主按钮可打开文件选择器，移动端无横向溢出。
- Playwright smoke：13/13 通过。
- Playwright booking flow：6/6 通过。
- GitHub Actions：CI run `28238821338` 通过（main / `6fd98f7`）。

### 遗留风险
- In-app Browser 在本地预览域可能命中过期 PWA cache；当前阶段用 service-worker-blocked Playwright 证明了最新构建产物。
- `face-api-vendor` 和中日韩字体仍是主要体积热点。
- 真实 Stripe Payment Element 和 live card collection 仍未启用。

### 下一轮建议方向
1. IMPROVE：检查并强化编辑器模型加载失败、弱网、缓存和 degraded mode 的一致性。
2. IMPROVE：继续拆分或削减 `face-api-vendor` 与多语言字体的实际加载压力。
3. CHECK：系统扫雷 PWA service worker、runtime cache、预览验证和生产缓存更新链路。

### 推荐下一轮优先执行的旗舰级主改动
编辑器模型可靠性强化：围绕弱网、模型加载失败、PWA cache 与 degraded mode，确保用户上传照片后即使 AI 模型不可用，也能清楚看到状态并继续使用基础编辑、导出和重试路径。

---

## Campaign 015 Stage 4 — PWA Update Reliability Hardening

### 承接的上一轮方向
- 上一阶段发现本地预览域可能命中过期 PWA cache。
- 本阶段优先处理 service worker 更新链路，让新 app shell 不再依赖静默自动替换。

### 完成内容
- 将 Vite PWA 注册模式从 `autoUpdate` 改为 `prompt`，确保更新可见。
- 启用 Workbox `cleanupOutdatedCaches` 清理旧 precache，同时保留模型、图片、字体 runtime cache 策略。
- 强化更新横幅：ready/focus/visibility 主动检查更新、刷新中状态、禁用重复点击、reload fallback、标准 `{ type: "SKIP_WAITING" }` 消息。
- 补齐 zh-CN/en/ja/ko 刷新中文案。
- 新增 audit regression，防止 PWA 更新提示和旧 cache 清理退化。

### 已通过的验证
- Red/green：PWA 更新可靠性回归测试先失败后通过。
- Targeted：`audit-regressions` 53/53 通过。
- TypeScript / lint：通过。
- Vitest：245/245 通过。
- `build:full` + performance budget：通过。
- 生成产物检查：`dist/sw.js` 包含 Workbox `SKIP_WAITING` listener 和 `cleanupOutdatedCaches()`。
- Playwright smoke：13/13 通过。
- Playwright booking flow：6/6 通过。
- GitHub Actions：CI run `28239561321` 通过（main / `ae65ce5`）。

### 遗留风险
- 已打开的旧标签页仍需要用户接受更新或刷新后才能切到最新 app shell。
- 中日韩字体和 `face-api-vendor` 仍是主要体积热点。
- 真实 Stripe Payment Element 和 live card collection 仍未启用。

### 下一轮建议方向
1. CHECK：系统检查 PWA service worker、runtime cache、构建产物、Pages 部署与 stale-cache 行为。
2. IMPROVE：继续强化编辑器模型加载失败、弱网和 degraded mode 的用户反馈。
3. IMPROVE：继续削减字体与 `face-api-vendor` 的实际加载压力。

### 推荐下一轮优先执行的旗舰级主改动
PWA / 部署缓存系统扫雷：对 service worker 注册、生成产物、runtime cache、Pages 预览与生产更新链路做一次端到端核验，确保 Stage 4 的更新机制能在真实部署路径中可靠生效。

---

## Campaign 017 Stage 1 — Client Error Reports Admin Loop

### 承接的上一轮方向
- Campaign 016 已完成客户端错误追踪/上报基础能力。
- 本阶段把上报链路从 console/localStorage 推进到可持久化、可管理、可回归验证的后台运营入口。

### 完成内容
- 新增 D1 表 `client_error_reports` 与迁移 `011_create_client_error_reports.sql`。
- `/api/analytics/error` 支持真实 ErrorTracker payload 与旧 `logError` payload，写入 D1 并返回 `stored` 状态。
- ErrorTracker 默认上报到 `/api/analytics/error`。
- 新增管理员 `/api/admin/errors` 接口和后台“前端错误报告”Tab，支持 7/30 天范围、分类汇总、空/错/加载状态和响应式表格。
- 补齐 zh-CN/en/ja/ko 文案。
- 修复 smoke E2E 发现的 `/gallery` 双重 `id="gallery"` 导致导航定位歧义问题。

### 已通过的验证
- Red/green：错误报告持久化与后台可见性测试先失败后通过，目标测试 87/87 通过。
- Red/green：`/gallery` 重复 landmark 回归测试先失败后通过，`audit-regressions` 57/57 通过。
- TypeScript / lint：通过。
- Vitest：286/286 通过。
- `build:full` + performance budget：通过。
- Playwright smoke：13/13 通过。
- Playwright booking flow：6/6 通过。
- GitHub Actions：CI run `28298584333` 通过（main / `df89c5b`）。

### 遗留风险
- 生产环境需要应用 D1 migration 后才能持久化错误报告；DB binding 不存在时接口会返回 `stored: false` 并保留 Workers console 记录。
- 中日韩字体和 `face-api-vendor` 仍是主要体积热点。

### 下一轮建议方向
1. IMPROVE：让错误报告从“能看到”升级到“能处理”，例如状态、备注、解决/忽略、统计筛选。
2. CHECK：核对新错误报告接口的权限、D1 迁移链路和生产部署兼容性。
3. UIUX：优化后台错误报告页的信息密度、筛选体验和移动端阅读体验。

### 推荐下一轮优先执行的旗舰级主改动
管理员错误报告处理闭环：在已有捕获和收件箱基础上增加状态化处理能力，让错误能被标记、筛选和追踪，而不是只作为静态列表存在。

---

## Campaign 017 Stage 2 — Error Report Workflow

### 承接的上一轮方向
- Stage 1 已完成错误捕获、D1 持久化和后台收件箱。
- 本阶段把静态报告列表升级为可追踪的处理工作流。

### 完成内容
- 新增 D1 状态、处理备注、处理人、处理时间、更新时间字段及状态索引，并提供迁移 `012_add_client_error_report_workflow.sql`。
- `/api/admin/errors` 支持按 open/resolved/ignored 筛选并返回完整工作流字段。
- 新增受管理员鉴权和操作头保护的 `PATCH /api/admin/errors/:id`，支持解决、忽略和重新打开。
- 后台错误报告页新增状态筛选、状态标签、处理备注以及解决/忽略/重开操作，补齐加载和失败反馈。
- 补齐 zh-CN/en/ja/ko 文案和 API/UI 回归覆盖。

### 已通过的本地验证
- Red/green：API 动态路由缺失时先失败，UI 工作流断言在缺少变更请求头时先失败。
- Targeted：API + audit regression 84/84 通过。
- Wrangler 临时 D1：011 与 012 共 9 条 SQL 全部执行成功。
- TypeScript / lint：通过。
- Vitest：288/288 通过。
- `build:full` + performance budget：通过。
- Playwright smoke：13/13 通过。

### 遗留风险
- 生产环境必须先应用 012 migration，再使用新版后台错误报告接口。
- 中日韩字体和 `face-api-vendor` 仍是主要体积热点。

### 下一轮建议方向
1. UIUX：优化错误报告页在桌面和移动端的信息层级、操作密度与可扫描性。
2. CHECK：核验生产 D1 迁移和权限边界。
3. IMPROVE：补充错误聚合、重复计数或批量处理能力。

### 推荐下一轮优先执行的旗舰级主改动
后台错误处理体验打磨：把当前功能完整的表格改造成更清晰、更适合高频排查的响应式工作台，并用真实浏览器尺寸验证。

---

## Campaign 017 Stage 3 — Admin Error Triage UIUX

### 承接的上一轮方向
- Stage 2 已完成错误报告的状态、备注、解决、忽略和重开工作流。
- 本阶段重点解决实际渲染中暴露的后台导航空白区域、移动端当前标签不可见、错误报告表格横向裁切等体验问题。

### 完成内容
- 将后台 shell 从带空内容区的第三方 Tabs 渲染改为原生可横向滚动的 `<nav>`，并为当前标签添加 `aria-current`。
- 小屏下压缩后台顶栏操作，把退出和返回站点变为有 `aria-label` 的图标按钮，减少标题换行和操作挤压。
- Error Reports 在 720px 以下改为带字段标签的卡片化表格行，消息、状态、备注框和 Resolve/Ignore 操作都保持可见。
- Resolve/Ignore/Reopen 成功后新增 `role="status"` 成功反馈。
- 补齐 zh-CN/en/ja/ko 的后台导航和更新成功文案。
- 新增 audit regression，锁定窄屏后台错误处理必须保留导航可达性、状态反馈和卡片化表格结构。

### 已通过的验证
- Red/green：`audit-regressions` 先因缺少原生 `adm-tabs`/移动端卡片化断言失败，修复后 58/58 通过。
- Vitest：289/289 通过。
- TypeScript / lint：通过。
- `build:full` + performance budget：通过。
- Playwright smoke：先因 smoke 与 booking 并行运行争用同一 `4174` 预览服务失败，顺序重跑后 13/13 通过。
- Playwright booking flow：6/6 通过。
- Playwright CLI 桌面截图确认后台 nav 不再生成空白 tab 内容区。
- Playwright CLI 390px 移动端截图确认错误报告行已卡片化，字段标签、状态和操作按钮可见。
- Playwright CLI 移动端 Resolve 操作确认成功提示出现，Open 数量从 2 降到 1。
- GitHub Actions：CI run `28299944848` 通过（main / `236b51f`）。

### 遗留风险
- 本地 Pages 种子环境进入后台时 `/api/admin/bookings` 会返回 503；本阶段确认它不是 Error Reports 交互新增错误。
- 后台功能入口数量仍多，当前通过横向滚动解决可达性，后续可考虑分组或二级导航。

### 下一轮建议方向
1. IMPROVE：让错误报告具备重复聚合、发生次数或批量处理，减少后台逐条处理成本。
2. CHECK：核验错误报告工作流在权限、D1 migration 和部署环境中的边界。
3. IMPROVE：继续削减后台首屏资源压力，尤其是共享大包和 CJK 字体加载策略。

### 推荐下一轮优先执行的旗舰级主改动
错误报告聚合与降噪：在已有捕获、状态和响应式处理台基础上，增加重复错误聚合或批量处理能力，让管理员面对同类前端错误时处理更快。

---

## Campaign 017 Stage 4 — Error Report Grouping and Noise Reduction

### 承接的上一轮方向
- Stage 3 推荐继续做“错误报告聚合与降噪”。
- 本阶段已实质完成该方向：同类前端错误不再只以重复行出现，而是能按组显示发生次数并批量处理。

### 完成内容
- `/api/admin/errors` 返回按 category/message/source/URL 聚合后的错误组，新增 `occurrenceCount`、`groupKey`、`firstOccurredAt`、`latestOccurredAt` 和 `reportedTotal`。
- 列表会扫描更多近期报告再按组返回，减少重复错误被分页切散的概率。
- `PATCH /api/admin/errors/:id` 新增 `scope: "group"`，可对同组 open 错误批量解决、忽略或重开。
- 后台 Error Reports 增加分组摘要、发生次数徽标、Resolve group / Ignore group 操作和成功反馈。
- 补齐 zh-CN/en/ja/ko 文案和 CSS。
- 修复一个实现中发现的一致性风险：groupKey 维度改为与批量 SQL 完全一致的完整 URL，避免 UI 合并但后端批量更新不完整。

### 已通过的验证
- Red/green：重复错误聚合与 group-scope PATCH 测试先失败，修复后 API + audit regression 88/88 通过。
- Red/green：groupKey 与批量 SQL 维度一致性测试先失败，修复后通过。
- TypeScript / lint：通过。
- Vitest：292/292 通过。
- `build:full` + performance budget：通过，主包 310,313 bytes 仍在预算内。
- Playwright CLI + 本地 D1：重复 booking chunk 错误显示为 `2 occurrences`，执行 Resolve group 后两条重复记录都变为 resolved 并写入同一备注。
- Playwright smoke：13/13 通过。
- Playwright booking flow：6/6 通过。
- GitHub Actions：CI run `28305291347` 通过（main / `5c66966`）。

### 遗留风险
- 同组批量处理采用精确 category/message/source/URL 边界；带不同 query 的同一路径错误不会被合并，换取批量更新的确定性。
- 本地 Pages 种子环境仍会在进入后台时出现 `/api/admin/bookings` 503；本阶段确认它不来自 Error Reports。
- 中日韩字体和 `face-api-vendor` 仍是主要体积热点。

### 下一轮建议方向
1. CHECK：重点核验 Error Reports 的权限边界、D1 migration 兼容性、生产 API 响应形状和 group-scope mutation 安全性。
2. CHECK：复查本地/CI/部署链路中 D1 schema 是否已覆盖 011/012，避免生产缺列。
3. IMPROVE：继续削减后台首屏资源压力，尤其是共享大包和 CJK 字体加载策略。

### 推荐下一轮优先执行的旗舰级主改动
错误报告工作流生产验收：系统检查后台错误报告 API、group-scope 批量处理、权限头、D1 schema/migration 和 Pages 部署兼容性，确保新增降噪能力可以安全上线。

---

## Campaign 017 Stage 5 — Error Reports Production Safety Check

### 承接的上一轮方向
- Stage 4 已完成错误报告重复聚合和 group-scope 批量处理。
- 本阶段按 CHECK 重点核验权限、D1 migration/schema、API 响应形状、批量处理边界和部署工具链安全性。

### 完成内容
- 修复 `PATCH /api/admin/errors/:id` 单条更新时 D1 `changes = 0` 仍返回成功的问题，现在统一返回 `404 Client error report not found`。
- 修复 group-scope PATCH 找不到 seed report 时返回泛化 503 的问题，现在返回同一 404 not-found 语义。
- 新增 API 测试覆盖单条 missing report 与 group missing seed 两个边界。
- 新增 audit regression，锁定错误报告 workflow 必须保留 not-found 处理和 D1 changes 检查。
- 执行 `npm audit fix` 修复 dev 工具链漏洞，lockfile 更新 Wrangler/miniflare/workerd/undici/ws/esbuild/Babel 等依赖；复查 audit 为 0 漏洞。
- 将 `package.json` Node 引擎从 `>=20.0.0` 提升到 `>=22.0.0`，与更新后的 Wrangler/miniflare 要求和 GitHub Actions Node 24 一致，并加回归断言防止回退。

### 已通过的验证
- Red/green：missing single report 和 missing group seed 测试先分别暴露 200/503，修复后 `functions/api.test.ts` 31/31 通过。
- API + audit targeted：90/90 通过。
- Red/green：Node engine 回归先因 `>=20.0.0` 失败，更新后 audit regression 59/59 通过。
- 临时 Wrangler D1：成功应用 migration 011/012，插入临时报错记录，执行 group update SQL 后确认状态和备注正确。
- `npm ci`：通过；此前 Windows 本地 `wrangler.exe`/`workerd.exe`/`esbuild.exe` 进程锁导致 EPERM，停止项目本地残留进程后通过。
- `npm audit --json`：0 total vulnerabilities。
- TypeScript / lint：通过。
- Vitest：294/294 通过。
- `build:full` + performance budget：通过，主包 310,313 bytes 仍在预算内。
- Playwright smoke：13/13 通过。
- Playwright booking flow：6/6 通过。
- GitHub Actions：CI run `28305717619` 首次在 `npm ci` 遇到 registry `ECONNRESET`；失败任务原样重跑后安装、lint、test、build 和 performance budget 全部通过。

### 遗留风险
- 同组批量处理仍按精确 category/message/source/URL 边界匹配，带不同 query 的错误会独立成组。
- 中日韩字体和 `face-api-vendor` 仍是主要体积热点。
- Windows 本地若残留 Wrangler/workerd/esbuild 进程，`npm ci` 可能出现临时 EPERM 锁；清理相关项目进程即可恢复。

### 下一轮建议方向
1. IMPROVE：削减后台或全站资源压力，优先关注 CJK 字体、`face-api-vendor` 和后台懒加载边界。
2. IMPROVE：在 Error Reports 已安全后增加更细的运维可见性，例如最近一次处理人/处理耗时/按来源筛选。
3. CHECK：推送后继续核验 GitHub Actions 和 Pages 部署，确认依赖升级在 CI/生产构建中稳定。

### 推荐下一轮优先执行的旗舰级主改动
后台与公共资源加载减压：在不牺牲功能的前提下，继续削减大字体、`face-api-vendor` 或后台入口加载压力，让已新增的 Error Reports 能以更低资源成本运行。

---

## Campaign 017 Stage 6 — Resource Pressure and Navigation Intent Improve

### 承接的上一轮方向
- Stage 5 推荐继续削减 CJK 字体、`face-api-vendor` 或后台入口加载压力。
- 本阶段优先处理可验证、低风险且影响全站首载的字体输出，并顺手修复页脚死链与路由预取体验。

### 完成内容
- 新增 Vite pre-transform 插件，只剥离 `animal-island-ui` 自带的 `@font-face`，保留组件 CSS。
- 新增字体资源预算，限制 `dist/assets` 中 `.woff/.woff2/.ttf` 合计不超过 256 KiB。
- 将路由 lazy loader 抽成共享 `routeLoaders`，新增可去重、失败可重试的 `preloadRoute`。
- 新增 `PrefetchLink`，桌面导航、移动底栏、首页卡片和页脚链接会在 hover/focus/touch intent 时提前加载目标路由 chunk。
- 新增 `RouteHashScroller`，hash 跳转会等待 lazy 内容出现后再滚动。
- 修复页脚 `/about`、`/faq` 死链，改为 `/#why` 和 `/booking#faq`。
- 补齐 zh-CN/en/ja/ko 的 `nav.about`，避免中文页脚显示英文 fallback。

### 已通过的验证
- Red/green：route preload 去重、hash/search 归一化和失败重试测试先失败，修复后通过。
- Red/green：font strip 插件先保留 `@font-face` 导致测试失败，修复后通过并确认 `.animal-btn` 等组件 CSS 保留。
- Red/green：字体预算先在旧构建 8,096,916 bytes 下失败，新构建 110,160 bytes 后通过。
- Targeted Vitest：3 个文件、19/19 通过。
- TypeScript / lint：通过。
- `build:full`：通过，字体输出 6 个文件 / 110,160 bytes；总 bundle 2.90 MB / 966.3 KB gzip。
- Vitest 全量：45 个文件、302/302 通过。
- Browser + Playwright QA：干净 preview origin 上首页首屏可见、console 无错误、hover Gallery 预取 `GalleryPage-BhoMyoPO.js`、`/#why` 与 `/booking#faq` 均滚到目标区块且没有 404。
- Playwright e2e：30/30 通过。
- GitHub Actions：CI run `28307292636` 通过，覆盖 `npm ci`、lint、test、build 和 performance budget。

### 遗留风险
- `face-api-vendor` 仍是最大 lazy chunk，约 661 KB。
- Vite 构建仍有既有的 `face-api.js` 浏览器兼容 `fs` externalization warning。
- 本地内置 Browser 在 4174 曾命中过旧 service-worker cache；本阶段使用新 preview origin 和干净 Playwright context 作为权威浏览器证据。

### 下一轮建议方向
1. IMPROVE：继续拆分或按需加载 `face-api-vendor`，优先确认修图页之外不会触发该大包。
2. CHECK：上线后确认 Pages 部署产物字体资源仍保持在预算内，且 `/about`、`/faq` 不再被公开入口引用。
3. UIUX：复查移动端英雄区底部 CTA、scroll 提示和浮动 AI 按钮的间距，防止小屏高度下拥挤。

### 推荐下一轮优先执行的旗舰级主改动
修图能力按需加载减压：围绕 `face-api-vendor` 的触发路径做源代码和浏览器网络核验，只在进入修图/人脸相关能力时加载该大包，并为误加载加回归测试。

---

## Campaign 018 Stage 1 — Editor Workspace Lazy Boundary

### 承接的上一轮方向
- Campaign 017 将 `face-api-vendor` 确认为最大 lazy chunk，并建议核验它及修图重型代码的真实触发路径。
- 本阶段把 `/editor` 的轻量入口与完整工作区拆开，先解决进入路由就加载整套编辑代码的问题。

### 完成内容
- 新建轻量 `PhotoEditorPage`，通过 `lazy()` 和 `Suspense` 按需加载 `PhotoEditorWorkspace`。
- 保留首屏 `.editor-toolbar input[type="file"]` 上传契约；轻量壳层接收文件后把同一个 `File` 传给工作区。
- 将工作区的文件读取逻辑抽为 `loadImageFile`，统一处理壳层上传、工作区上传和拖拽文件。
- 编辑器常量、效果、图片处理、Canvas 状态和人脸模型依赖均留在工作区，不进入路由壳层。
- 增加回归测试，锁定 lazy 边界、初始文件传递以及轻量壳层不得导入重型模块。

### 已通过的验证
- Red/green：轻量路由契约先因缺少上传桥接失败，修复后 editor regression 17/17 通过。
- TypeScript / lint：通过。
- `build:full` + performance budget：通过；壳层 3.82 kB，工作区 52.83 kB，`face-api-vendor` 661.57 kB，均为 gzip 前体积。
- Vitest 全量：49 个文件、317/317 通过。
- Playwright 原失败用例：2/2 通过。
- Playwright 全量：30/30 通过（单 worker）。
- Browser：首屏仅观察到 `PhotoEditorPage`；点击 Open editor 后才出现 `PhotoEditorWorkspace`，且上传照片前仍没有 `face-api-vendor`；控制台无 error/warn。

### 遗留风险
- 真正上传照片并做人脸检测时仍需加载约 661.57 kB 的 `face-api-vendor`，这是功能成本而非首屏误加载。
- 当前图片读取缺少明确的损坏文件/解码失败反馈，加载状态可能缺少可恢复的用户提示。

### 下一轮建议方向
1. IMPROVE：为不支持或损坏的图片补充明确错误状态、重试入口和状态清理。
2. UIUX：在桌面与窄屏复查编辑器轻量入口、工作区工具栏和首屏可见性。
3. CHECK：继续锁定首屏、打开工作区、上传照片三段资源触发边界。

### 推荐下一轮优先执行的旗舰级主改动
修图图片摄入韧性：让文件读取、图片解码和 Canvas 初始化失败都能结束 loading、展示可恢复错误，并保证用户无需刷新即可重新选择照片。
