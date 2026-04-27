# 内容维护指南（CONTENT_GUIDE.md）

## 修改文案

所有文案集中在 `src/data/` 目录下的 TypeScript 文件：

| 文件 | 内容 |
|---|---|
| `src/data/site.ts` | 品牌名称、城市、域名、描述、联系方式 |
| `src/data/gallery.ts` | 静态作品列表 |
| `src/data/packages.ts` | 套餐价格、服务政策、设备列表 |
| `src/data/faq.ts` | FAQ 问答、拍摄流程 |

### site.ts

```ts
export const siteConfig = {
  brandName: "奶黄包摄影",      // 品牌名
  city: "南京",                  // 城市
  domain: "shoot.custard.top",   // 域名
  tagline: "南京女生写真与情侣约拍",
  description: "偏柔雾胶片感的自然约拍...",
  contactStatus: "小红书私信咨询",
  contactHint: "小红书私信预约...",
  xiaohongshuProfile: "https://...",  // 小红书链接
};
```

### packages.ts

```ts
export const packages = [
  {
    name: "室内写真",
    price: "50/h",               // 修改价格
    duration: "2小时起拍",
    summary: "适合室内棚拍...",
    includes: ["单双人同价", "前期风格沟通", "不满2小时按2小时算"],
  },
  // ...
];
```

### faq.ts

修改 FAQ 问题和回答，或增删条目。

### gallery.ts

静态作品列表。上传的照片会从 D1 数据库读取并合并显示。

## 添加套餐

`src/data/packages.ts` 的 `packages` 数组中添加新对象。

## 添加 FAQ

`src/data/faq.ts` 的 `faqs` 数组中添加 `{ question, answer }`。

## 添加拍摄流程步骤

`src/data/faq.ts` 的 `processSteps` 数组中添加字符串。

## 管理已上传的照片

通过后台页面 `https://shoot.custard.top/admin` 操作。
