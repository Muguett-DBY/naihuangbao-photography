import { test, expect, type Page } from "@playwright/test";

/**
 * /chat 冒烟：不真打上游 API，用 page.route 把 /api/us-chat 换成固定返回。
 * 覆盖：主导航含「聊天」入口（05）、/chat 三段式渲染、
 * 错暗号提示（前端摘要校验，零请求）、对暗号进入聊天并发消息出气泡。
 */

type UsChatRequest = {
  persona?: string;
  password?: string;
  messages?: { role: string; content: string }[];
};

const CHAT_API = "**/api/us-chat";

/** 固定“流”：text/plain，一段人设口吻的短回复。 */
const FIXED_STREAM_REPLY = "我也想你\n宝宝在干嘛呢";

async function interceptUsChat(page: Page, requests: UsChatRequest[]) {
  await page.route(CHAT_API, async (route) => {
    const body = route.request().postDataJSON() as UsChatRequest;
    requests.push(body);
    const passwordOk =
      (body.persona === "su-yiping" && body.password === "2001") ||
      (body.persona === "liao-wenjing" && body.password === "2004");
    if (!passwordOk) {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "密码不对，再想想？" }),
      });
      return;
    }
    const last = body.messages?.at(-1)?.content?.trim();
    if (!last) {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "说点什么吧" }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "text/plain; charset=utf-8",
      body: FIXED_STREAM_REPLY,
    });
  });
}

const zh = (path: string) => `${path}${path.includes("?") ? "&" : "?"}lang=zh-CN`;

test.describe("我们的聊天室 /chat", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
  });

  test("主导航在「关于」右侧出现「聊天」入口（序号 05）", async ({ page }) => {
    await page.goto(zh("/"));
    const chatLink = page.locator('.nav-menu--inline a[href="/chat"]');
    await expect(chatLink).toHaveCount(1);
    await expect(chatLink).toContainText("聊天");
    await expect(chatLink.locator(".nav-route-index")).toHaveText("05");
    // 顺序：关于(04) 之后
    const aboutLink = page.locator('.nav-menu--inline a[href="/about"]');
    await expect(aboutLink.locator(".nav-route-index")).toHaveText("04");
  });

  test("/chat 渲染选人卡：两张人设卡、键盘可达", async ({ page }) => {
    await page.goto(zh("/chat"));
    await expect(page.locator(".us-chat-note")).toContainText("AI 模拟的我们 · 仅自己人可进");
    const cards = page.locator(".us-chat-persona-card");
    await expect(cards).toHaveCount(2);
    await expect(page.getByRole("button", { name: /苏一平/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /廖文静/ })).toBeVisible();
    // 键盘可达：Tab 能聚焦到第一张卡
    await page.locator(".us-chat-persona-card").first().focus();
    await expect(page.locator(".us-chat-persona-card").first()).toBeFocused();
  });

  test("错误暗号：抖动提示，不进入聊天、不发请求", async ({ page }) => {
    const requests: UsChatRequest[] = [];
    await interceptUsChat(page, requests);
    await page.goto(zh("/chat"));
    await page.getByRole("button", { name: /苏一平/ }).click();

    const gateInput = page.locator('input[type="password"]');
    await expect(gateInput).toBeVisible();
    await expect(gateInput).toHaveAttribute("autocomplete", "off");

    await gateInput.fill("0000");
    await gateInput.press("Enter");

    await expect(page.locator("#us-chat-gate-error")).toContainText("密码不对，再想想？");
    await expect(page.locator(".us-chat-layout")).toHaveCount(0);
    expect(requests).toHaveLength(0); // 前端摘要校验，未打到接口
  });

  test("正确暗号进入聊天 UI，发消息出双方气泡，请求携带 persona+password", async ({ page }) => {
    const requests: UsChatRequest[] = [];
    await interceptUsChat(page, requests);
    await page.goto(zh("/chat"));
    await page.getByRole("button", { name: /苏一平/ }).click();

    const gateInput = page.locator('input[type="password"]');
    await gateInput.fill("2001");
    await gateInput.press("Enter");

    const composer = page.locator("#us-chat-input");
    await expect(composer).toBeVisible();
    // 暗号落在 sessionStorage（关标签页即失效的会话存储）
    const stored = await page.evaluate(() => sessionStorage.getItem("us-chat-session"));
    expect(stored).toContain('"persona":"su-yiping"');
    expect(stored).toContain('"password":"2001"');

    // 聊天区 role=log aria-live=polite
    await expect(page.locator(".us-chat-log")).toHaveAttribute("role", "log");
    await expect(page.locator(".us-chat-log")).toHaveAttribute("aria-live", "polite");

    await composer.fill("你在干嘛");
    await composer.press("Enter");

    await expect(page.locator(".us-chat-bubble--user")).toHaveText("你在干嘛");
    await expect(page.locator(".us-chat-bubble--assistant")).toContainText("我也想你");

    expect(requests.length).toBeGreaterThanOrEqual(1);
    const last = requests.at(-1)!;
    expect(last.persona).toBe("su-yiping");
    expect(last.password).toBe("2001");
    expect(last.messages?.at(-1)).toEqual({ role: "user", content: "你在干嘛" });
  });
});
