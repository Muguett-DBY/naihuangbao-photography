# 百度收录与基础 SEO 操作说明

## 本次代码侧已完成的内容

- 首页 `title`、`description`、Open Graph、Twitter card 和 JSON-LD 已改为可读中文。
- 首页初始 HTML 已加入静态 SEO fallback，百度在 JavaScript 执行前也能读到「奶黄包摄影」「南京女生写真」「情侣约拍」「室内写真 50/h」「室外约拍 60/h」等核心内容。
- `robots.txt` 允许抓取公开官网，禁止抓取 `/admin`。
- `sitemap.xml` 已指向 `https://shoot.custard.top/`。

## 你需要在百度搜索资源平台完成的步骤

1. 打开百度搜索资源平台：
   `https://ziyuan.baidu.com/`
2. 登录百度账号，进入「用户中心」或「站点管理」。
3. 添加站点：
   `https://shoot.custard.top`
4. 推荐选择「文件验证」。
5. 百度会给一个类似 `baidu_verify_codeva-xxxx.html` 的验证文件。
6. 把验证文件的文件名和内容发给我，我会把它加入 `public/` 并提交部署。
7. 部署完成后回到百度搜索资源平台点击「完成验证」。
8. 验证通过后，在「资源提交」里提交 sitemap：
   `https://shoot.custard.top/sitemap.xml`
9. 使用「抓取诊断」检查：
   `https://shoot.custard.top/`
10. 之后定期在百度搜索：
    `site:shoot.custard.top`

## 需要注意

- 百度普通收录可以缩短爬虫发现链接的时间，但不保证一定收录。
- 搜索「奶黄包摄影」能否排名靠前，取决于百度抓取、站点信任度、外链、品牌一致性和时间。
- 小红书主页、个人简介、笔记置顶或其他平台最好都放上官网链接 `https://shoot.custard.top/`，这会加强品牌词关联。
