# 持续迭代记录

## 本轮 (4b41a78 → 当前)

### 完成的旗舰级主改动
后端 API 输入校验 — 创建 `_validation.ts` 轻量验证工具（无外部依赖），为 booking 和 workshop registration 端点添加字段存在性、长度、格式校验。

### 用户可见功能增量
- BookingModal 输入框添加字符计数显示（name: 0/50）
- API 返回更具体的验证错误消息（如"姓名不能超过 50 个字符"）
- workshop registration 添加人数、备注字段验证

### 关键稳定性提升
- 新建 `functions/_validation.ts`：validateString / validateOptionalString / validateDate / validatePositiveInt
- booking 端点：name(50) / contact(100) / notes(500) / date 格式校验
- workshop registration：name(50) / contact(100) / notes(500) / participants(正整数) 校验
- 全部无新依赖，纯 TypeScript 实现

### 已验证的内容
- TypeScript lint: 通过
- 单元测试: 92/92 通过
- Production build: 通过

### 本轮遗留风险
- 支付仍然是 placeholder 模式

### 下一轮最值得继续优化的方向
1. **仪表板页面增强** — 添加更多统计数据、图表
2. **Gallery 页面性能优化** — 虚拟化 masonry 网格
3. **PhotoEditor 组件拆分** — 1800+ 行单文件拆分为独立模块

### 推荐下一轮优先执行的旗舰级主改动
仪表板页面增强 — 用户仪表板已拆分为独立 tab，但缺少统计概览和数据可视化，可以添加预约统计、收入趋势等实用功能。
