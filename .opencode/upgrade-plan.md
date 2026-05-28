# 奶黄包摄影 - 超级大升级方案

## 架构决策
- **保持现有架构**：Vite + React + Cloudflare Pages（SPA模式），不迁移SSR
- **不加运营工具**：图片上传CRM等暂不做
- **电商纯展示**：不做支付/购物车，详情页引导咨询

---

## 阶段 0：紧急修复（图标问号问题）
**问题**：所有课程/预设/工作坊/商品卡片显示问号
**原因**：iconify.design API 在中国可能被墙，外部SVG加载失败
**方案**：将SVG图标下载到 `public/icons/` 本地托管

### 需要的图标（tabler风格，品牌棕色 #5F3C31）
| 用途 | 图标名 | 文件名 |
|------|--------|--------|
| 课程1 人像入门 | camera | camera.svg |
| 课程2 自然光 | sun | sun.svg |
| 课程3 胶片后期 | palette | palette.svg |
| 课程4 摆姿引导 | user | user.svg |
| 课程5 夜景弱光 | moon | moon.svg |
| 课程6 PS精修 | sparkle | sparkle.svg |
| 预设1 胶片感 | film | film.svg |
| 预设2 复古暖调 | flame | flame.svg |
| 预设3 PS动作 | bolt | bolt.svg |
| 预设4 LUT | video | video.svg |
| 预设5 笔刷 | brush | brush.svg |
| 预设6 证件照 | id | id.svg |
| 预设7 日系 | flower | flower.svg |
| 预设8 婚纱 | heart | heart.svg |
| 工作坊1 玄武湖 | tree | tree.svg |
| 工作坊2 LR调色 | palette | palette.svg（复用） |
| 工作坊3 日落 | sunset | sunset.svg |
| 工作坊4 沙龙 | message-circle | message-circle.svg |
| 商品1 相册 | book | book.svg |
| 商品2 明信片 | mail | mail.svg |
| 商品3 冲印 | photo | photo.svg |
| 商品4 T恤 | shirt | shirt.svg |
| 商品5 帆布包 | shopping-bag | shopping-bag.svg |
| 商品6 器材租赁 | camera（复用） | camera.svg |
| 商品7 单张精修 | brush（复用） | brush.svg |
| 商品8 深度精修 | star | star.svg |
| 商品9 证件照 | id（复用） | id.svg |
| 商品10 批量调色 | rainbow | rainbow.svg |

### 实施步骤
1. 从 iconify 下载所有唯一SVG（~20个）到 `public/icons/`
2. 修改种子数据：`https://api.iconify.design/tabler/xxx.svg` → `/icons/xxx.svg`
3. CSS保持 `object-fit: contain` + 暖色背景
4. 测试确认所有卡片正常显示

---

## 阶段 1：四大详情页

### 1.1 路由结构
```
/courses              → 课程列表页（已有）
/courses/:id          → 课程详情页（新增）
/presets              → 预设列表页（已有）
/presets/:id          → 预设详情页（新增）
/workshops            → 工作坊列表页（已有）
/workshops/:id        → 工作坊详情页（新增）
/shop                 → 商品列表页（已有）
/shop/:id             → 商品详情页（新增）
```

### 1.2 课程详情页 `/courses/:id`
**内容结构：**
- Hero区：课程封面图 + 标题 + 难度标签 + 时长 + 价格
- 课程简介（中英日韩）
- 模块列表（course_modules表，支持video/text/gallery类型）
- 视频播放器（免费课程可预览，付费课程密码解锁）
- 适合人群
- 课前准备
- 常见问题
- 相关课程推荐
- 底部CTA：预约咨询

**付费课程密码保护：**
- 默认密码：lwj5201314
- 存储在localStorage，输入一次后记住
- 付费模块在未输入密码时显示遮罩+密码输入框

**视频内容：**
- 使用 Remotion 制作课程预告/教学片段
- 或嵌入B站/YouTube开源教程
- 视频URL存储在courses表的video_url字段

### 1.3 预设详情页 `/presets/:id`
**内容结构：**
- Hero区：预设封面 + 名称 + 价格 + 下载按钮
- 效果对比区：Before/After滑动对比
- 预设包含内容（X个预设文件列表）
- 使用说明（LR版本、兼容性、安装步骤）
- 适用场景
- 用户评价
- 相关预设推荐
- 相关课程推荐

### 1.4 工作坊详情页 `/workshops/:id`
**内容结构：**
- Hero区：封面 + 标题 + 日期时间 + 地点 + 价格 + 报名按钮
- 活动介绍
- 活动流程时间表（签到→讲解→实拍→点评→合影）
- 往期照片集（可手动配置照片URL）
- 讲师介绍
- 行前指南（装备清单、穿着建议、天气预案）
- 地点地图（复用Leaflet组件）
- 名额剩余提示
- 报名表单（复用现有表单组件）

### 1.5 商品详情页 `/shop/:id`
**内容结构：**
- Hero区：商品图 + 名称 + 价格 + 咨询按钮
- 多角度产品图（轮播）
- 商品介绍
- 规格参数（尺寸、材质、颜色等）
- 使用场景展示
- 购买指南（下单流程、支付方式、发货时间、退换政策）
- 相关商品推荐

---

## 阶段 2：国际化全量补齐

### 2.1 需要翻译的硬编码内容
| 文件 | 内容 | 状态 |
|------|------|------|
| `src/data/faq.ts` | FAQ问答 | 仅中文 |
| `src/data/reviews.ts` | 用户评价 | 仅中文 |
| `src/data/packages.ts` | 套餐信息 | 仅中文 |
| `src/components/PublicChatWidget.tsx` | 聊天UI字符串 | 仅中文 |
| `src/lib/chat.ts` | AI系统提示词 | 仅中文 |

### 2.2 新增翻译内容
- 课程详情页所有文案
- 预设详情页所有文案
- 工作坊详情页所有文案
- 商品详情页所有文案

### 2.3 实施方案
- FAQ/评价/套餐：改为从i18n JSON文件读取，或存入数据库
- 聊天：系统提示词根据用户语言动态切换
- 新页面：所有文案用 `t('key')` 形式

---

## 阶段 3：代码清理

### 3.1 重复组件清理
| 问题 | 方案 |
|------|------|
| `SiteNav.tsx` vs `shared/Header.tsx` | 删除SiteNav，统一用Header |
| `Hero.tsx` vs HomePage内联Hero | 统一到Hero.tsx |
| `Footer.tsx` 在两处 | 统一到 `shared/Footer.tsx` |
| `src/components/mood/` 空目录 | 删除或填充 |

### 3.2 死代码清理
- 检查并移除未使用的组件、hooks、工具函数
- 清理重复的CSS规则

---

## 阶段 4：真实内容制作

### 4.1 课程内容（6门课 × 完整大纲）
每门课需要：
- 6-10个模块
- 每个模块：标题 + 内容（文字+图片/视频）
- 课后练习/作业

### 4.2 预设内容（8个预设）
每个预设需要：
- Before/After对比图（需真实照片）
- 详细使用说明
- 适用场景描述

### 4.3 工作坊内容（4个工作坊）
每个工作坊需要：
- 活动流程时间表
- 往期照片
- 行前指南

### 4.4 商品内容（10个商品）
每个商品需要：
- 多角度产品图
- 规格参数
- 使用场景描述

### 4.5 视频内容
- 使用 Remotion 制作课程预告视频
- 或嵌入开源教学视频（B站/YouTube）

---

## 实施顺序

1. **阶段0：修复图标**（紧急，1小时内）
2. **阶段1.1：路由+基础页面骨架**（所有详情页）
3. **阶段1.2：课程详情页**（含视频播放器+密码保护）
4. **阶段1.3：预设详情页**（含Before/After对比）
5. **阶段1.4：工作坊详情页**（含报名表单+地图）
6. **阶段1.5：商品详情页**（含多图轮播）
7. **阶段2：国际化补齐**
8. **阶段3：代码清理**
9. **阶段4：内容填充**（与开发并行）

---

## 验证清单
每个阶段完成后：
- [ ] `npm run lint` 通过
- [ ] `npm test` 全部通过
- [ ] `npm run build` 成功
- [ ] 手动测试所有新页面
- [ ] 移动端适配检查
- [ ] 4语言切换测试
