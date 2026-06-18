# 持续迭代记录

## 本轮 (73cbef6 → 44ca388) — Gallery 视频触屏支持 + 编辑器滚动提示

### 承接的上一轮方向
上一轮推荐：**Gallery 视频触屏支持** — ✅ 本轮完成

### 完成的旗舰级主改动
**Gallery 视频触屏支持** — 移动端用户现在可以点击播放/暂停视频预览

### 新增的用户可见增量
- Gallery 视频预览在触屏设备上支持 tap-to-play/pause（之前仅 hover 触发，移动端永不播放）
- 编辑器工具栏和分类选择器添加滚动渐变提示（右边缘淡出，提示用户可横向滚动）
- 视频预览添加 ARIA 角色和键盘支持（Enter/Space 触发播放）

### 关键改进
- `VideoPreview` 组件：从纯 hover 改为 hover + touch + keyboard 三重交互
- `gallery-video-wrap` 添加 `role="button"`、`tabIndex={0}`、`onKeyDown` 键盘支持
- 编辑器 `.editor-toolbar` 添加 `mask-image` 渐变（85% → transparent）
- 编辑器 `.editor-categories` 添加相同渐变指示器

### 已通过的验证
- TypeScript typecheck: 通过
- Vite production build: 通过
- 单元测试: 92/92 通过
- GitHub Actions: 通过

### 仍存在的风险
- PhotoEditorPage 1736 行 `@ts-nocheck`
- 无邮件发送基础设施
- 支付仍为 placeholder

### 下一轮建议方向
1. **PhotoEditor 核心渲染引擎提取** — 将 render 函数和图像处理算法提取到独立模块
2. **邮件发送基础设施集成** — 接入 Resend 或 Cloudflare Email Workers
3. **编辑器 beauty panel 拖拽手柄** — 移动端底部面板添加视觉拖拽提示

### 推荐下一轮优先执行的旗舰级主改动
PhotoEditor 核心渲染引擎提取 — 1736 行单文件是项目最大的维护风险，提取核心模块能降低复杂度并为后续 WebGL 加速做准备。
