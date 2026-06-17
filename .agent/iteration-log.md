# 持续迭代记录

## 本轮 (b523b03 → 当前)

### 完成的旗舰级主改动
仪表板页面增强 — 添加 OverviewTab 概览组件和后端 `/api/user/stats` 统计端点。

### 用户可见功能增量
- 仪表板新增"概览"首页（默认显示），展示预约/课程/工作坊的数量统计卡片
- 每张卡片显示总数、带颜色图标的视觉卡片、快速跳转链接
- 预约卡片额外显示即将进行的预约数量
- 加载时使用 Skeleton 骨架屏

### 关键稳定性提升
- 新增 `/api/user/stats` 后端端点，并行查询 booking / course_purchases / workshop_registrations 等统计

### 已验证的内容
- TypeScript lint: 通过
- 单元测试: 92/92 通过
- Production build: 通过

### 本轮遗留风险
- 支付仍然是 placeholder 模式
- stats 端点的 booking/workshop 查询使用 contact like %userId%，准确性依赖数据一致性

### 下一轮最值得继续优化的方向
1. **Gallery 页面性能优化** — 虚拟化 masonry 网格
2. **PhotoEditor 组件拆分** — 1800+ 行单文件拆分为独立模块
3. **后端 API 输入校验推广** — 将 _validation.ts 应用到更多端点

### 推荐下一轮优先执行的旗舰级主改动
Gallery 页面性能优化 — 当前 masonry 网格在大量图片时可能卡顿，使用虚拟化（如 react-window）或 CSS column 优化。
