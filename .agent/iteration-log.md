# 持续迭代记录

## 本轮 (ff1d558 → 当前)

### 完成的旗舰级主改动
Presets/Products 页面体验增强 — 添加分类筛选按钮、卡片悬停图片缩放动效、类别徽章叠加层、下载计数显示。

### 用户可见功能增量
- ProductsPage 新增分类筛选按钮（复用 Gallery 的 filter-row 样式）
- 预设卡片新增图片悬停放大动效
- 图片上叠加显示类别徽章（毛玻璃效果）
- 图片底部叠加显示下载次数
- 预约流程 E2E 测试覆盖（打开弹窗 → 填写表单 → 提交 → 验证）

### 已验证的内容
- TypeScript lint: 通过
- 单元测试: 92/92 通过
- Production build: 通过

### 本轮遗留风险
- 支付仍然是 placeholder 模式，需接入真实 Stripe
- E2E 测试依赖 Cloudflare Pages Functions，本地开发环境可能无法完整运行

### 下一轮最值得继续优化的方向
1. **CoursesPage/WorkshopsPage/ShopPage 视觉升级** — 统一各业务列表页的交互质量
2. **后端 API 输入校验** — 使用 zod 为 booking、workshop registration 添加 schema 校验
3. **Gallery 页面性能优化** — 虚拟化 masonry 网格

### 推荐下一轮优先执行的旗舰级主改动
CoursesPage 视觉升级 — 课程是核心营收业务，当前页面视觉质量远低于 Gallery 页，值得提升到同等水平。
