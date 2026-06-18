# 持续迭代记录

## 本轮 (ffc0471 → c3bf987) — 导航精简 + 卡片样式提取

### 承接的上一轮方向
上一轮推荐：**导航精简** — ✅ 本轮完成

### 完成的旗舰级主改动
**导航从 9 项精简为 6 项** — 移除 Editor、Map、Workshops，保留核心路径

### 新增的用户可见增量
- 导航栏更清爽：从 9 个链接减至 6 个（首页、作品集、课程、预设、商店、预约）
- 移除的页面（编辑器、地图、工坊）仍可通过 URL 直接访问，只是不再占据导航空间

### 关键改进
| 改动 | 说明 |
|------|------|
| `Header.tsx` | navItems 从 9 项减至 6 项（移除 editor/map/workshops） |
| `base.css` | 新增 `--card-gradient` CSS 变量（卡片背景渐变） |
| `pages.css` + `sections.css` | 16 处硬编码渐变替换为 `var(--card-gradient)` |

### 已通过的验证
- TypeScript typecheck: 通过
- Vite production build: 通过
- 单元测试: 92/92 通过
- GitHub Actions: 通过

### 仍存在的体验风险
- 预约页面（`/booking`）仍作为独立页面存在，与 Hero 弹窗重复

### 下一轮建议方向
1. **预约流程统一** — 合并 `/booking` 页面与 Hero 弹窗，减少重复
2. **Gallery 搜索结果高亮** — 搜索时高亮匹配文字
3. **编辑器从导航移除后的发现路径** — 在 Dashboard 或 Gallery 中添加编辑器入口

### 推荐下一轮优先执行的旗舰级 UI/UX 主改动
预约流程统一 — 合并重复的预约入口，减少用户困惑。
