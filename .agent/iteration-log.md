# 持续迭代记录

## 本轮 (e1e93b3 → ebda7c2) — UI/UX 设计系统统一与体验优化

### 本轮性质
全站 UI/UX 体验审查 + 设计系统修复（非功能新增）

### 完成的旗舰级 UI/UX 主改动
**设计系统统一** — 修复 ErrorBoundary CSS 变量、统一按钮/输入圆角、升级加载状态

### 完成的体验改进
| 改动 | 说明 |
|------|------|
| ErrorBoundary CSS 变量修复 | `--animal-text-color` → `--caramel-text`，`--caramel` → `--peach-accent` |
| DataState 加载状态升级 | 从纯文本 "Loading..." 升级为旋转 spinner + 文字 |
| 密码可见性切换 | 登录页密码输入框添加 Eye/EyeOff 切换按钮 |
| 输入圆角统一 | 登录输入框从 8px 改为 12px（与 booking/detail 一致） |
| Gallery 紧凑模式 | 紧凑视图隐藏叠加层和标题，避免小格子内文字溢出 |
| 登录输入焦点样式 | 添加 focus ring（box-shadow），修复之前无焦点反馈的问题 |

### 已通过的验证
- TypeScript typecheck: 通过
- Vite production build: 通过
- 单元测试: 92/92 通过
- GitHub Actions: 通过

### 仍存在的体验风险
- Hero CTA 层级：主 CTA 滚动到画廊，次 CTA（预约）被弱化
- 桌面端导航 9 个项目过挤
- Gallery 移动端叠加层不可见（hover only）
- 卡片背景渐变重复 7+ 次（未提取为 CSS 变量）

### 下一轮建议方向
1. **Hero CTA 层级优化** — 调整主次 CTA 优先级
2. **导航精简** — 减少桌面端导航项或添加分组
3. **Gallery 移动端叠加层** — 添加 tap 显示叠加层

### 推荐下一轮优先执行的旗舰级 UI/UX 主改动
Hero CTA 层级优化 — 让预约按钮成为首页最突出的行动召唤。
