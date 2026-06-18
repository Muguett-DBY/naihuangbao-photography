# 持续迭代记录

## 本轮 (ebda7c2 → ffc0471) — Hero CTA 层级优化 + Gallery 触摸叠加层

### 承接的上一轮方向
上一轮推荐：**Hero CTA 层级优化** — ✅ 本轮完成

### 完成的旗舰级主改动
**Hero CTA 层级翻转** — "立即预约" 从次级（玻璃按钮）升级为主按钮（实心渐变），"浏览作品" 降为次级

### 新增的用户可见增量
- Gallery 移动端触摸叠加层：点击照片卡片可显示标题/风格/地点信息（之前 hover only，移动端不可见）
- 叠加层 2.5 秒后自动消失，不干扰后续操作

### 关键改进
| 改动 | 说明 |
|------|------|
| `HomePage.tsx` | Hero CTA 顺序翻转：预约按钮获得 primary 样式（实心渐变），浏览按钮降为 secondary（玻璃） |
| `Gallery.tsx` | 新增 `touchedId` 状态 + `handleTouchStart(id)` 处理触摸事件，2.5 秒自动清除 |
| `gallery.css` | 新增 `.is-touched .gallery-masonry-overlay { opacity: 1 }` |
| `sections.css` | 触摸设备上 `.is-touched` 覆盖 hover 降级规则 |

### 已通过的验证
- TypeScript typecheck: 通过
- Vite production build: 通过
- 单元测试: 92/92 通过
- GitHub Actions: 通过

### 仍存在的体验风险
- 桌面端导航 9 个项目过挤
- 卡片背景渐变重复 7+ 次（未提取为 CSS 变量）

### 下一轮建议方向
1. **导航精简** — 减少桌面端导航项或添加分组
2. **卡片样式提取** — 将重复 7+ 次的渐变提取为 CSS 变量
3. **Gallery 搜索结果高亮** — 搜索时高亮匹配文字

### 推荐下一轮优先执行的旗舰级 UI/UX 主改动
导航精简 — 减少桌面端导航项，让核心路径更清晰。
