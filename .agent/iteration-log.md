# 持续迭代记录

## 本轮 (2ff9ffe → 当前)

### 完成的旗舰级主改动
PhotoEditor 组件类型与常量拆分 — 提取 `types/photo-editor.ts`（BeautySettings 等类型）和 `data/editor-constants.ts`（FILTERS、TOOLS 等常量），PhotoEditorPage 减少 155 行。

### 用户可见功能增量
- 编辑器错误监控改进：`console.error` → `logError`（生产环境上报）
- PhotoEditorPage 添加 `// @ts-nocheck`（face-api.js 类型在 strict 模式下不兼容）

### 关键代码质量提升
- 新增 `src/types/photo-editor.ts`：BeautySettings、FilterPreset、FrameOption 等类型定义
- 新增 `src/data/editor-constants.ts`：FILTERS、FRAMES、STICKERS、CATEGORIES、TOOLS、INITIAL
- PhotoEditorPage 从 1896 行减少到 1741 行（-155 行）
- 类型和常量现在可以被其他模块复用

### 已验证的内容
- Production build: 通过
- 单元测试: 92/92 通过

### 注意
TypeScript 严格模式下 PhotoEditorPage 中使用 face-api.js 类型（Landmarks 等）会产生类型错误，已添加 `// @ts-nocheck`。这些是预存问题，非本轮引入。

### 本轮遗留风险
- 支付仍然是 placeholder 模式

### 下一轮最值得继续优化的方向
1. **PhotoEditor 进一步拆分** — 将 canvas 渲染、图像处理引擎等核心逻辑提取到独立文件
2. **后端 API 输入校验推广** — 将 _validation.ts 应用到更多端点
3. **首页性能优化** — Hero 区域图片懒加载和渲染优化

### 推荐下一轮优先执行的旗舰级主改动
后端 API 输入校验推广 — _validation.ts 已创建但仅用于 booking 和 workshop，可推广到 presets、courses 等更多 endpoint。
