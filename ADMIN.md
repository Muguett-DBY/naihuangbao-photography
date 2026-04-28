# 后台管理说明

## 进入后台

- 访问 `https://shoot.custard.top/admin`
- 使用管理员密码登录
- 密码通过 `wrangler pages secret put ADMIN_PASSWORD` 配置

## 功能

- 照片：上传、编辑标题/风格/地点、设为精选、公开/隐藏、删除。
- 套餐价格：编辑套餐名、价格、时长、说明和包含内容。
- 服务规则：编辑设备、拍立得信息、预约规则。
- FAQ/流程：编辑预约流程和常见问题。
- 主页文案：编辑品牌、联系方式、首页简介、各区域标题、选择理由和页脚标语。

内容保存后立即发布到官网，不设草稿。

## 首次部署 CMS

执行 D1 schema 和静态作品 seed：

```bash
npx wrangler d1 execute naihuangbao-photography --file=./schema.sql --remote
npx wrangler d1 execute naihuangbao-photography --file=./scripts/seed-static-gallery.sql --remote
```

第二条命令会把原来首页的 6 张静态作品登记到 D1，让后台可以编辑、隐藏或删除这些主页照片。脚本使用 `insert or ignore`，重复执行不会覆盖后台已编辑内容。

## 技术说明

- 后台使用 HMAC-SHA256 cookie session 认证，有效期 30 天。
- 所有后台 API 都需要登录 cookie。
- 上传文件存于 Cloudflare R2，照片和 CMS 内容元数据存于 D1。
