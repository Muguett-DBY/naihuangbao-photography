# 持续迭代记录

## 本轮 (66cf0a9 → e1e93b3) — 全项目安全与稳定性审计修复

### 本轮性质
全项目系统性安全审计 + 问题修复（非功能新增）

### 审计发现的主要问题
| 优先级 | 问题 | 影响 |
|--------|------|------|
| P0 | 通知邮件 HTML 注入 — `body.data.*` 直接插入 HTML 模板 | 安全 |
| P1 | 错误上报端点假速率限制 — windowKey 计算但从未执行 | 安全 |
| P1 | 9 个 D1 查询 catch 块静默吞错 | 稳定性 |
| P1 | AdminShell 6 个未使用 Lucide 图标导入 | 代码质量 |
| P1 | LoginPage 缺少 ErrorBoundary | 稳定性 |
| P1 | notifications/send.ts console.log 泄露信息 | 安全 |

### 本轮修复的问题
| 修复 | 说明 |
|------|------|
| `notifications/send.ts` | 添加 `esc()` HTML 转义函数，所有模板值通过转义；移除 console.log 和 PII 泄露 |
| `analytics/error.ts` | 用真实 `enforceRateLimit` 替换假速率限制；移除 stack/URL 日志 |
| 9 个 API catch 块 | 添加 `console.error` 日志，静默失败变为可追踪错误 |
| `AdminShell.tsx` | 移除 6 个未使用 Lucide 图标导入 |
| `LoginPage.tsx` | 添加 ErrorBoundary 包裹（两个 return 路径） |

### 仍存在的风险
- 无邮件发送基础设施
- 支付仍为 placeholder
- PhotoEditorPage 956 行 `@ts-nocheck`（可继续优化）
- Preset 下载计数可被任意膨胀（无认证）

### 下一轮建议方向
1. **邮件发送基础设施集成** — 接入 Resend 或 Cloudflare Email Workers
2. **Admin 照片拖拽排序** — 添加 sort_order 字段实现手动排序
3. **Presets 下载认证保护** — 防止下载计数被恶意膨胀

### 推荐下一轮优先执行的旗舰级主改动
邮件发送基础设施集成 — 使密码重置、预约确认、课程通知等核心业务流程从占位符升级为真实功能。
