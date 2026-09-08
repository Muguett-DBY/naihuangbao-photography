import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { walkLessonToSummary } from "./fixtures/law-walk";

/**
 * 九种学习题型（step kind）逐题型完整作答流：
 * 每个用例打开一个含目标题型的真实课时，用通用推进器完成全部步骤到总结页。
 * `.law-player__nav.is-primary` 由 LessonPlayer 门禁（步骤完成才可点），
 * 到达总结页 = 沿途题型交互全部真实完成；再断言目标题型容器确实渲染过。
 *
 * 课时选样来自构建数据扫描（步骤少、目标题型靠前的非空壳课），
 * 若数据重建后课时结构变化，测试会明确失败而不是静默跳过。
 */
const KIND_LESSONS: Array<{ kind: string; container: string; lesson: string; note: string }> = [
  { kind: "definition", container: "law-definition", lesson: "falixue-q005", note: "定义解锁→列举" },
  { kind: "list", container: "law-list", lesson: "falixue-q004", note: "3 步段落 + 列举卡片" },
  { kind: "flow", container: "law-flow", lesson: "falixue-q006", note: "流程节点逐个点亮" },
  { kind: "compare", container: "law-compare", lesson: "falixue-q163", note: "对比行逐行翻开" },
  { kind: "condition", container: "law-condition", lesson: "falixue-q134", note: "要件逐项勾选" },
  { kind: "exception", container: "law-exception", lesson: "falixue-q048", note: "但书滑入后抓住" },
  { kind: "timeline", container: "law-timeline", lesson: "xianfa-q014", note: "时间线圆点逐个点亮" },
  { kind: "mnemonic", container: "law-mnemonic", lesson: "zhishixiang-q084", note: "口诀背诵→逐字揭示" },
];

test.describe("law step kinds（九种题型完整作答流）", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      // 预解锁全部彩蛋，避免时段型彩蛋信弹窗挡住交互
      const triggers = [
        "midnight", "morning", "firstLesson", "hundred", "streak3", "streak7",
        "wrongbook3", "wrongGraduate", "pathHalf", "bookDone",
        "graphicFirst", "exam30", "christmas", "symbol",
      ];
      const unlocked = Object.fromEntries(triggers.map((t) => [t, true]));
      localStorage.setItem("nhb-law-egg-v1", JSON.stringify({ unlocked, seenAt: { morning: 1 } }));
    });
  });

  for (const { kind, container, lesson, note } of KIND_LESSONS) {
    test(`${kind} 型步骤交互完成并可推进到总结页（${note}）`, async ({ page }) => {
      await page.goto(`/law/learn/${lesson}`);
      await expect(page.locator(".law-player")).toBeVisible();

      const seen = await walkLessonToSummary(page);
      expect(seen.has(container), `应渲染过 .${container}（课时 ${lesson}）`).toBe(true);

      // 总结页出现 = 门禁导航一路放行 = 目标题型交互真实完成
      await expect(page.locator(".law-player__summary")).toBeVisible({ timeout: 10_000 });
    });
  }

  test("plain 型读就是任务：无需任何点击即可到总结页", async ({ page }) => {
    // 单步纯段落课：挂载即完成。断言"不点任何东西"也能走到总结页（回归：曾因关键词锁死整步）
    await page.goto("/law/learn/falixue-q002-tour");
    await expect(page.locator(".law-player")).toBeVisible();
    // law-plain__terms 是可选的关键词标记（非门禁），其余八种门禁题型容器不应出现
    const seen = await walkLessonToSummary(page);
    const gating = [...seen].filter((c) => c !== "law-plain__terms");
    expect(gating, "纯段落课不应出现门禁题型").toEqual([]);
    await expect(page.locator(".law-player__summary")).toBeVisible({ timeout: 10_000 });
  });
});

/**
 * S1 题型扩展骨架：fill（填空）/ multi（多选）/ 自适应复习。
 * 运行时探测源码是否已上线对应能力——S1 落地后这些用例自动参与回归，
 * 选择器按当时的真实 UI 调整（骨架期先给出占位交互流）。
 */
const quizRunnerSource = readFileSync(
  resolve(process.cwd(), "src/components/law/player/QuizRunner.tsx"),
  "utf8",
);
const lawQuizSource = readFileSync(resolve(process.cwd(), "src/lib/law-quiz.ts"), "utf8");
const lawProgressSource = readFileSync(resolve(process.cwd(), "src/lib/law-progress.ts"), "utf8");
// fill：QuizRunner 渲染 + buildQuiz 产出双条件（只看渲染会把"渲染了但没出题"误判为已上线）
const fillShipped = /["']fill["']/.test(quizRunnerSource) && /kind:\s*["']fill["']/.test(lawQuizSource);
// multi：渲染 + buildQuiz 接线（law-quiz.ts import 出题器）双条件
const multiShipped =
  /["']multi["']/.test(quizRunnerSource) && /law-quiz-multi/.test(lawQuizSource);
const adaptiveShipped = /adaptive|自适应/i.test(lawProgressSource);

/** 当前题按任意形态作答（选项/排序/填空/多选）并翻到下一题。
 *  全部 force 点击：quiz 按钮带呼吸动画（"element is not stable" 超时的已知脆弱点） */
async function answerGeneric(page: import("@playwright/test").Page) {
  const fillInput = page.locator(".law-quiz__fill-input");
  const multiOption = page.locator(".law-quiz__option--multi").first();
  const option = page.locator(".law-quiz__option:not(.law-quiz__option--multi)").first();
  if (await fillInput.isVisible().catch(() => false)) {
    await fillInput.fill("任意作答");
    await fillInput.press("Enter");
  } else if (await multiOption.isVisible().catch(() => false)) {
    await multiOption.click({ force: true });
    await page.locator(".law-quiz__multi-confirm").click({ force: true });
  } else if (await option.isVisible().catch(() => false)) {
    await option.click({ force: true });
  } else {
    // 排序题：点完全部卡片才判分（顺序对错不影响流程推进）
    for (let c = 0; c < 6; c += 1) {
      const chip = page.locator(".law-quiz__order-chip").first();
      if (!(await chip.isVisible().catch(() => false))) break;
      await chip.click({ force: true });
      await page.waitForTimeout(80);
    }
  }
  await expect(page.locator(".law-quiz__feedback")).toBeVisible();
  await page.locator(".law-quiz__next").click({ force: true });
  await page.waitForTimeout(200);
}

test.describe("law quiz kinds 扩展（S1 上线后启用）", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      // 预解锁全部彩蛋，避免深夜/清晨时段信弹窗挡住作答交互
      const triggers = [
        "midnight", "morning", "firstLesson", "hundred", "streak3", "streak7",
        "wrongbook3", "wrongGraduate", "pathHalf", "bookDone",
        "graphicFirst", "exam30", "christmas", "symbol",
      ];
      const unlocked = Object.fromEntries(triggers.map((t) => [t, true]));
      localStorage.setItem("nhb-law-egg-v1", JSON.stringify({ unlocked, seenAt: { morning: 1 } }));
    });
  });

  test("fill 填空题型完整作答流", async ({ page }) => {
    test.skip(!fillShipped, "S1 的 fill 填空题型未上线（源码探测无 fill kind）");
    await page.goto("/law/learn/falixue-q083?review=1");
    await expect(page.locator(".law-quiz")).toBeVisible();

    // 题序不确定：逐题作答，直到遇到填空题（falixue-q083 必出 fill）
    for (let i = 0; i < 4; i += 1) {
      const fillInput = page.locator(".law-quiz__fill-input");
      if (await fillInput.isVisible().catch(() => false)) {
        // 提交按钮在空输入时禁用（防误触交白卷）
        await expect(page.locator(".law-quiz__fill-submit")).toBeDisabled();
        await fillInput.fill("测试作答");
        await expect(page.locator(".law-quiz__fill-submit")).toBeEnabled();
        // 回车提交（键盘路径与点按钮等价）
        await fillInput.press("Enter");
        const feedback = page.locator(".law-quiz__feedback");
        await expect(feedback).toBeVisible();
        await expect(feedback).toContainText(/答对啦|不对哦/);
        return; // 填空作答流闭环（输入→提交→判分反馈）
      }
      await answerGeneric(page);
    }
    throw new Error("falixue-q083 应产生至少一道 fill 题（S1 数据变化时请更换课时）");
  });

  test("multi 多选题型完整作答流", async ({ page }) => {
    test.skip(!multiShipped, "S1 的 multi 多选题型未上线（出题未接线 law-quiz.ts）");
    await page.goto("/law/learn/falixue-q034?review=1");
    await expect(page.locator(".law-quiz")).toBeVisible();

    // 题序不确定：逐题作答，直到遇到多选题（falixue-q034 必出 multi）
    for (let i = 0; i < 4; i += 1) {
      const multiOption = page.locator(".law-quiz__option--multi").first();
      if (await multiOption.isVisible().catch(() => false)) {
        const confirm = page.locator(".law-quiz__multi-confirm");
        // 未选任何项时确认按钮禁用（防误触交白卷）
        await expect(confirm).toBeDisabled();
        await multiOption.click();
        await page.locator(".law-quiz__option--multi").nth(1).click();
        await expect(confirm).toContainText("2 项");
        await confirm.click();
        const feedback = page.locator(".law-quiz__feedback");
        await expect(feedback).toBeVisible();
        await expect(feedback).toContainText(/答对啦|不对哦/);
        return; // 多选作答流闭环（勾选→确认→判分反馈）
      }
      // 非多选题：选项/排序/填空任一形态作答后点下一题
      await answerGeneric(page);
    }
    throw new Error("falixue-q034 应产生至少一道 multi 题（S1 数据变化时请更换课时）");
  });

  test("自适应复习：记忆强度星级与错因标签随掌握度分层展示", async ({ page }) => {
    test.skip(!adaptiveShipped, "S1 的自适应复习未上线（law-progress.ts 无 adaptive 痕迹）");
    // 两种掌握度的错题：高正确率 → ★★★；低正确率 → ★☆☆；错因标签展示最常错的题型
    const now = Date.now();
    await page.addInitScript(
      (ts) => {
        localStorage.clear();
        const triggers = [
          "midnight", "morning", "firstLesson", "hundred", "streak3", "streak7",
          "wrongbook3", "wrongGraduate", "pathHalf", "bookDone",
          "graphicFirst", "exam30", "christmas", "symbol",
        ];
        const unlocked = Object.fromEntries(triggers.map((t) => [t, true]));
        localStorage.setItem("nhb-law-egg-v1", JSON.stringify({ unlocked, seenAt: { morning: 1 } }));
        localStorage.setItem(
          "nhb-law-academy-v1",
          JSON.stringify({
            version: 1,
            lessons: {
              // 掌握好：正确率 100% → 难度系数拉满（间隔拉长）、记忆 3 星
              "falixue-q052": {
                stepsDone: { s0: true }, quizBest: 4, quizTotal: 4, wrongCount: 1,
                lastVisitedAt: ts, wrongAt: ts, reviewStage: 1, reviewDueAt: ts + 3 * 86_400_000,
                wrongTags: { 概念混淆: 1 },
              },
              // 常答错：正确率 25% + 错 2 次 → 系数压低（间隔缩短）、记忆 1 星
              "minfa-q031": {
                stepsDone: { s0: true }, quizBest: 1, quizTotal: 4, wrongCount: 2,
                lastVisitedAt: ts, wrongAt: ts, reviewStage: 1, reviewDueAt: ts + 1 * 86_400_000,
                wrongTags: { 数字记错: 2, 概念混淆: 1 },
              },
            },
          }),
        );
      },
      now,
    );

    await page.goto("/law/wrongbook");
    const items = page.locator(".law-wrongbook__item");
    await expect(items.first()).toBeVisible();
    // 星级分层：高正确率 3 星、低正确率 1 星（同一页两种掌握度可辨）
    await expect(items.filter({ hasText: "★★★" })).toHaveCount(1);
    await expect(items.filter({ hasText: "★☆☆" })).toHaveCount(1);
    // 错因标签：常错课展示最高频错因（数字记错 ×2）
    const weak = items.filter({ hasText: "★☆☆" });
    await expect(weak).toContainText("数字记错 ×2");
  });
});
