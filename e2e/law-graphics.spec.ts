import { expect, test } from "@playwright/test";

/**
 * 图解课堂七种图型全覆盖（S3 巡逻轮 1 补强）：
 * 图解工厂 2.0 后共 56 张图解、7 种 kind（assemble/flow/tree/stairs/timeline/balance/matrix），
 * 此前 e2e 只覆盖 1 张。本套件对每种图型各取一张真实图解，验证：
 * ① 图型专属渲染器挂载（dia-<kind> 根类）② 舞台与解说帧 ③ 手动跳帧推进。
 * 课时选样来自 graphics 源扫描；数据重建后若课时变化，测试会明确失败而不是静默跳过。
 */
const KIND_LESSONS: Array<{ kind: string; lesson: string; note: string }> = [
  { kind: "assemble", lesson: "xingfa-q014", note: "四要件装配" },
  { kind: "flow", lesson: "xingfa-q047", note: "五道闸门流程" },
  { kind: "tree", lesson: "xingfa-q083", note: "树状展开" },
  { kind: "stairs", lesson: "minfa-q067", note: "阶梯递进" },
  { kind: "timeline", lesson: "zhishixiang-q014", note: "时间线" },
  { kind: "balance", lesson: "xianfa-q034", note: "双盘天平" },
  { kind: "matrix", lesson: "minfa-q305", note: "矩阵对照（S5 新图型）" },
];

test.describe("law graphics 七种图型", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      // 预解锁全部彩蛋，避免时段型彩蛋信弹窗挡住图解交互
      const triggers = [
        "midnight", "morning", "firstLesson", "hundred", "streak3", "streak7",
        "wrongbook3", "wrongGraduate", "pathHalf", "bookDone",
        "graphicFirst", "exam30", "christmas", "symbol",
      ];
      const unlocked = Object.fromEntries(triggers.map((t) => [t, true]));
      localStorage.setItem("nhb-law-egg-v1", JSON.stringify({ unlocked, seenAt: { morning: 1 } }));
    });
  });

  for (const { kind, lesson, note } of KIND_LESSONS) {
    test(`${kind} 图解渲染并可跳帧（${lesson} · ${note}）`, async ({ page }) => {
      test.setTimeout(45_000);
      await page.goto(`/law/graphic/${lesson}`);
      const stage = page.locator(".law-graphic__stage");
      await expect(stage).toBeVisible();
      // 图型专属渲染器挂载
      await expect(stage.locator(`.dia-${kind}`).first()).toBeVisible();
      // 解说帧从 1/N 开始（<b> 标签不计入 textContent）
      const caption = page.locator(".law-graphic__caption");
      await expect(caption).toContainText(/^1 \/ \d+/);
      // 手动跳一帧（点「下一步」按钮，非 autoplay 时序依赖）
      const counter = caption.locator("b");
      const before = await counter.textContent();
      await page.locator(".law-graphic__nav", { hasText: "下一步" }).click({ force: true });
      await expect(counter).not.toHaveText(before ?? "");
    });
  }
});
