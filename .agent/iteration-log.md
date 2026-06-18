# 持续迭代记录

## 本轮 (eb423d7 → 6db88e7) — 全项目体检与修复

### 本轮性质
全项目系统性体检、问题排查和修复（非功能新增）

### 体检发现的主要问题
| 优先级 | 问题 | 影响 |
|--------|------|------|
| P0 | CI 无 build 验证 | 破坏性构建可合并到 main |
| P0 | `/api/user/profile` 端点缺失 | 个人资料修改和密码修改完全不可用 |
| P0 | `/api/user/bookings/:id/cancel` 缺失 | 用户无法取消预约 |
| P0 | `/api/user/bookings/:id/reschedule` 缺失 | 用户无法改期 |
| P1 | 无 `.gitattributes` | Windows CRLF 可能破坏 Linux CI 测试 |
| P1 | DashboardPage 无 ErrorBoundary | 组件崩溃导致整个页面白屏 |
| P1 | notifications/send.ts 泄露 PII | console.log 记录邮箱、主题等敏感信息 |
| P1 | 速率限制在 DB 缺失时静默绕过 | 认证/速率限制在配置错误时完全失效 |

### 本轮修复的问题
| 修复 | 说明 |
|------|------|
| CI 添加 build 步骤 | `.github/workflows/ci.yml` 增加 `npm run build` |
| 创建 `/api/user/profile` | PUT 端点，支持修改显示名称和密码 |
| 创建 `/api/user/bookings/:id/cancel` | POST 端点，用户可取消自己的预约 |
| 创建 `/api/user/bookings/:id/reschedule` | POST 端点，用户可改期 |
| 添加 `.gitattributes` | `* text=auto eol=lf` 确保跨平台行尾一致 |
| DashboardPage 添加 ErrorBoundary | 崩溃时显示友好错误界面而非白屏 |
| 移除 PII 泄露 | notifications/send.ts 中移除包含邮箱/主题的 console.log |
| 速率限制降级日志 | DB 缺失时返回 degraded 标记而非静默绕过 |

### 已通过的验证
- TypeScript typecheck (`tsc -b --noEmit`): 通过
- Vite production build: 通过
- 单元测试: 92/92 通过
- GitHub Actions: 通过

### commit message
`fix: stabilize project — add CI build step, create missing endpoints, fix PII leak, add ErrorBoundary`

### 仍存在的风险（已记录但未本轮修复）
- 37 个空 catch 块（静默失败，用户体验差）
- PhotoEditorPage 1736 行 `@ts-nocheck`（隐藏真实类型问题）
- 13 个页面缺少 ErrorBoundary（本轮仅修复了 DashboardPage）
- 通知系统仍为占位符
- 支付仍为 placeholder
- 无 ESLint/Prettier 代码风格检查

### 下一轮建议方向
1. **PhotoEditor 核心渲染引擎提取** — 降低 1736 行单文件复杂度
2. **补齐更多页面的 ErrorBoundary** — 防止局部崩溃白屏整个页面
3. **密码重置流程** — 用户忘记密码时的恢复机制
