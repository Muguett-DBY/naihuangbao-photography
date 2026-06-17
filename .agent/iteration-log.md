# 持续迭代记录

## 本轮 (8a2b572 → 当前)

### 完成的旗舰级主改动
业务列表页系统性视觉升级 — CoursesPage、WorkshopsPage、ShopPage 三页面统一添加分类筛选按钮、卡片悬停图片缩放动效、类别/状态徽章叠加层、图片缺失占位提示。

### 用户可见功能增量
- CoursesPage: 分类筛选按钮、课程难度角标、悬停动效、课程时长图标、封面图缺失占位
- WorkshopsPage: 剩余名额角标（满员红色提示）、悬停动效、封面图缺失占位
- ShopPage: 商品分类筛选按钮、类别角标、悬停动效、封面图缺失占位
- 三个页面统一了与 Gallery/Products 相同的交互质量

### 已验证的内容
- TypeScript lint: 通过
- 单元测试: 92/92 通过
- Production build: 通过

### 本轮遗留风险
- 支付仍然是 placeholder 模式，需接入真实 Stripe

### 下一轮最值得继续优化的方向
1. **后端 API 输入校验** — 使用 zod 为 booking、workshop registration 添加 schema 校验
2. **Gallery 页面性能优化** — 虚拟化 masonry 网格
3. **仪表板页面增强** — 添加更多统计数据、图表

### 推荐下一轮优先执行的旗舰级主改动
后端 API 输入校验 — 所有业务列表页已完成视觉升级，下一轮应转向 API/后端的稳定性加固。
