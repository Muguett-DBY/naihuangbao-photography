# 持续迭代记录

## 本轮 (6db88e7 → a44defa) — 密码重置流程 + ErrorBoundary 补齐

### 承接的上一轮方向
上一轮（全项目体检）建议的三个方向：
1. PhotoEditor 核心渲染引擎提取 — 范围过大（1736 行深度耦合），本轮不执行
2. 补齐更多页面的 ErrorBoundary — ✅ 本轮完成
3. 密码重置流程 — ✅ 本轮完成

### 完成的旗舰级主改动
**密码重置完整流程**：DB 迁移 + 2 个 API 端点 + 前端三步式 UI + 演示模式

### 新增的用户可见增量
- 登录页面新增"忘记密码？"链接
- 三步式密码重置流程：输入邮箱 → 输入令牌+新密码 → 成功
- 演示模式下令牌直接显示在页面上（可点击复制），生产环境通过邮件发送
- 密码重置令牌使用 SHA-256 哈希存储，1 小时过期，用后即废
- 所有 11 个缺少 ErrorBoundary 的页面已补齐

### 关键改进
- DB: 新增 `password_reset_tokens` 表（migration 006）
- API: `POST /api/auth/forgot-password`（速率限制 5/小时，邮箱枚举防护）
- API: `POST /api/auth/reset-password`（速率限制 5/小时，令牌验证+密码更新）
- 前端: LoginPage 重写为支持 login/register/reset 三种模式
- 安全: 令牌哈希存储、单次使用、1 小时过期、密码重置前作废旧令牌
- 16/16 页面现在都有 ErrorBoundary 保护

### 已通过的验证
- TypeScript typecheck: 通过
- Vite production build: 通过
- 单元测试: 92/92 通过
- GitHub Actions: 通过

### 仍存在的风险
- PhotoEditorPage 1736 行 `@ts-nocheck`
- 无邮件发送基础设施（密码重置在生产环境需要配置 Resend 或 Cloudflare Email Workers）
- 支付仍为 placeholder
- 37 个空 catch 块

### 下一轮建议方向
1. **PhotoEditor 核心渲染引擎提取** — 将 render 函数和图像处理算法提取到独立模块
2. **邮件发送基础设施集成** — 接入 Resend 或 Cloudflare Email Workers，使密码重置和通知功能完整
3. **空 catch 块治理** — 为关键操作添加错误反馈，改善用户体验

### 推荐下一轮优先执行的旗舰级主改动
邮件发送基础设施集成 — 使密码重置、预约确认、课程通知等核心业务流程从占位符升级为真实功能。
