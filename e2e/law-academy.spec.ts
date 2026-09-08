import { expect, test } from "@playwright/test";

// 法硕学习中心（/law）：核心学习路径回归
test.describe("law academy", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      // 预解锁全部彩蛋，避免时段型彩蛋信（清晨/深夜/考前30天）弹窗挡住交互
      const triggers = [
        "midnight", "morning", "firstLesson", "hundred", "streak3", "streak7",
        "wrongbook3", "wrongGraduate", "pathHalf", "bookDone",
        "graphicFirst", "exam30", "christmas", "symbol",
      ];
      const unlocked = Object.fromEntries(triggers.map((t) => [t, true]));
      localStorage.setItem("nhb-law-egg-v1", JSON.stringify({ unlocked, seenAt: { morning: 1 } }));
      // 本章节省默认目录视图；关卡地图视图由专门的用例覆盖
      localStorage.setItem("nhb-law-subject-view", "tree");
    });
  });

  test("学习中心首页渲染学科、计划卡与统计", async ({ page }) => {
    await page.goto("/law");
    await expect(page.locator(".law-academy__hero h1")).toContainText("五本书");
    await expect(page.locator(".law-plan-card")).toBeVisible();
    await expect(page.locator(".law-subject-card")).toHaveCount(5);
    await expect(page.locator(".law-graphic-card").first()).toBeVisible();
    // 知识点总数来自 stats.json（排除索引空壳课后为 1510）
    await expect(page.locator(".law-academy__stats")).toContainText(/个知识点/);
  });

  test("学科页展开章节并显示课时", async ({ page }) => {
    await page.goto("/law/xianfa");
    await expect(page.locator(".law-subject__hero h1")).toContainText("宪法");
    await expect(page.locator(".law-search__box input")).toBeVisible();
    // 第一章默认展开，含课时链接
    const lessons = page.locator(".law-lesson-link");
    await expect(lessons.first()).toBeVisible();
    await expect(page.locator(".law-chapter__head").first()).toBeVisible();
  });

  test("学科内搜索可跳转到课时（SPA 导航，无整页刷新）", async ({ page }) => {
    await page.goto("/law/xianfa");
    // 监听要挂在初始 goto 之后——goto 本身会触发一次 load
    let reloaded = false;
    page.on("load", () => {
      reloaded = true;
    });
    await page.fill(".law-search__box input", "根本");
    const hit = page.locator(".law-search__results li button").first();
    await expect(hit).toBeVisible();
    await hit.click();
    await expect(page).toHaveURL(/\/law\/learn\//);
    expect(reloaded, "搜索跳转不应触发整页刷新").toBe(false);
  });

  test("完整学习流：定义→列举→总结→自测按钮出现", async ({ page }) => {
    await page.goto("/law/learn/falixue-q052");
    await expect(page.locator(".law-player")).toBeVisible();

    // 第 1 步：定义解锁（按钮带呼吸动画，需 force 点击）
    await page.locator(".law-definition__lock").first().click({ force: true });
    await page.locator(".law-player__nav.is-primary").click();

    // 第 2 步：列举逐条点完
    for (let i = 0; i < 10; i += 1) {
      const item = page.locator(".law-list__item:not([disabled])").first();
      if (!(await item.isVisible().catch(() => false))) break;
      await item.click({ force: true });
    }
    await page.locator(".law-player__nav.is-primary").click();

    // 总结页必须出现"来自测"按钮（回归：quiz 曾因 phase 依赖永远不显示）
    const quizCta = page.locator(".law-player__summary").getByText("来自测一下");
    await expect(quizCta).toBeVisible({ timeout: 10_000 });
    await quizCta.click();
    // 首题可能是选择题（选项）或排序题（卡片），任一出现即可
    const option = page.locator(".law-quiz__option").first();
    const chip = page.locator(".law-quiz__order-chip").first();
    if (await option.isVisible().catch(() => false)) {
      await option.click();
    } else {
      await chip.click();
      const chip2 = page.locator(".law-quiz__order-chip").first();
      if (await chip2.isVisible().catch(() => false)) await chip2.click();
      if (await chip2.isVisible().catch(() => false)) await chip2.click();
    }
    await expect(page.locator(".law-quiz__feedback")).toBeVisible();
  });

  test("复习模式（?review=1）直达自测", async ({ page }) => {
    await page.goto("/law/learn/falixue-q052?review=1");
    await expect(page.locator(".law-quiz")).toBeVisible();
    const option = page.locator(".law-quiz__option").first();
    const chip = page.locator(".law-quiz__order-chip").first();
    await expect(option.or(chip).first()).toBeVisible();
  });

  test("图解课堂渲染舞台与解说", async ({ page }) => {
    await page.goto("/law/graphic/xingfa-q014");
    await expect(page.locator(".law-graphic__bar")).toBeVisible();
    await expect(page.locator(".law-graphic__stage")).toBeVisible();
    await expect(page.locator(".law-graphic__caption")).toBeVisible();
  });

  test("「下一课」跳过索引空壳课（回归：曾直接落进无正文的死页）", async ({ page }) => {
    await page.goto("/law/learn/minfa-q031");
    await expect(page.locator(".law-player")).toBeVisible();
    // 推进到总结页：plain 步自动完成，list 步逐条点，nav 可点就点
    const summary = page.locator(".law-player__summary");
    for (let round = 0; round < 24 && !(await summary.isVisible().catch(() => false)); round += 1) {
      const item = page.locator(".law-list__item:not([disabled])").first();
      if (await item.isVisible().catch(() => false)) {
        await item.click({ force: true });
        continue;
      }
      const nav = page.locator(".law-player__nav.is-primary");
      if (await nav.isEnabled().catch(() => false)) {
        await nav.click({ force: true });
        await page.waitForTimeout(250);
      } else {
        await page.waitForTimeout(300);
      }
    }
    await expect(summary).toBeVisible({ timeout: 10_000 });
    const skip = summary.getByText("跳过自测，直接标记掌握");
    const master = summary.getByText("学完了，标记掌握");
    if (await skip.isVisible().catch(() => false)) await skip.click();
    else await master.click();
    const nextBtn = page.locator(".law-player__result-actions").getByText("下一课");
    // minfa-q032 是空壳索引课，必须被跳过直达 minfa-q033
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();
    await expect(page).toHaveURL(/\/law\/learn\/minfa-q033$/);
  });

  test("附录章不进章节目录（回归：98 个索引课时曾混进学习目录）", async ({ page }) => {
    await page.goto("/law/zhishixiang");
    await expect(page.locator(".law-subject__hero h1")).toContainText("法制史");
    // 附录章不出现在章节列表里
    await expect(page.locator(".law-chapter__head", { hasText: "附录" })).toHaveCount(0);
    // 附录内容折叠保留可查阅
    await expect(
      page.locator(".law-subject__leftover h2", { hasText: "考点速查索引" }),
    ).toBeVisible();
  });

  test("关卡地图：默认路径视图 + 当前节点 + 双视图切换", async ({ page }) => {
    // 不预设视图偏好 → 默认落在路径视图
    await page.addInitScript(() => localStorage.removeItem("nhb-law-subject-view"));
    await page.goto("/law/xianfa");
    await expect(page.locator(".law-path")).toBeVisible();
    // 恰好一个"当前位置"节点，且带开始旗
    await expect(page.locator(".law-path__node.is-current")).toHaveCount(1);
    await expect(page.locator(".law-path__start")).toBeVisible();
    // 全部节点中不含索引空壳课链接
    const nodeCount = await page.locator(".law-path__node").count();
    expect(nodeCount).toBeGreaterThan(50);
    // 切到章节目录，再切回来
    await page.locator(".law-subject__viewtoggle button", { hasText: "章节目录" }).click();
    await expect(page.locator(".law-chapter__head").first()).toBeVisible();
    await page.locator(".law-subject__viewtoggle button", { hasText: "学习路径" }).click();
    await expect(page.locator(".law-path")).toBeVisible();
    // 偏好已持久化：刷新后仍在路径视图
    await page.reload();
    await expect(page.locator(".law-path")).toBeVisible();
  });

  test("彩蛋图鉴：入口可达，解锁态与剪影态同屏", async ({ page }) => {
    // 只解锁一部分彩蛋 → 图鉴里既有彩色卡也有剪影卡。
    // 时段型（清晨/深夜/考前/圣诞）必须保持已解锁，否则真实时间的彩蛋信会弹窗挡住交互
    await page.addInitScript(() => {
      localStorage.setItem(
        "nhb-law-egg-v1",
        JSON.stringify({
          unlocked: {
            firstLesson: true,
            symbol: true,
            morning: true,
            midnight: true,
            christmas: true,
            exam30: true,
          },
          unlockedAt: { firstLesson: 1756000000000, symbol: 1756000000000 },
          seenAt: {},
        }),
      );
    });
    await page.goto("/law");
    const entry = page.locator(".law-gallery-entry");
    await expect(entry).toBeVisible();
    await expect(entry).toContainText("6/14");
    await entry.click();
    const gallery = page.locator(".law-gallery");
    await expect(gallery).toBeVisible();
    await expect(gallery.locator(".law-gallery__head")).toContainText("已收集 6 / 14");
    // 解锁卡：显示标题与预览；剪影卡：显示 ？？？ 与待解锁
    await expect(gallery.locator(".law-gallery__egg.is-unlocked")).toHaveCount(6);
    await expect(gallery.locator(".law-gallery__egg.is-locked").first()).toBeVisible();
    expect(await gallery.locator(".law-gallery__egg.is-locked").count()).toBe(8);
    await expect(gallery.locator(".law-gallery__egg.is-unlocked").first()).toContainText("解锁");
    await expect(gallery.locator(".law-gallery__egg.is-locked b").first()).toHaveText("？？？");
    // 点开已解锁卡 → 重读信件弹窗
    await gallery.locator(".law-gallery__egg.is-unlocked").first().click();
    await expect(page.locator(".law-egg-card")).toBeVisible();
    await page.locator(".law-egg-card__close").click();
    await expect(page.locator(".law-egg-card")).toHaveCount(0);
    // 关闭图鉴
    await page.locator(".law-gallery__x").click();
    await expect(page.locator(".law-gallery")).toHaveCount(0);
  });

  test("通关横幅：一本书全部掌握时在学习中心庆祝", async ({ page }) => {
    // 宪法书全课完成（stats 口径 done>=total 给横幅候选，横幅内部再用 meta 精确口径复核）。
    // 课时 id 有 q001 与 q001-tour 两种形态，两种都注入多余的 key 无害（精确口径只认 meta 里的）
    await page.addInitScript(() => {
      const lessons: Record<string, unknown> = {};
      const pad = (n: number) => String(n).padStart(3, "0");
      for (let i = 1; i <= 120; i += 1) {
        for (const id of [`xianfa-q${pad(i)}`, `xianfa-q${pad(i)}-tour`]) {
          lessons[id] = {
            stepsDone: {},
            quizBest: 1,
            quizTotal: 1,
            wrongCount: 0,
            lastVisitedAt: 1,
            completedAt: 1757000000000,
          };
        }
      }
      localStorage.setItem(
        "nhb-law-academy-v1",
        JSON.stringify({ version: 1, lastLessonId: "xianfa-q001", lessons }),
      );
    });
    await page.goto("/law");
    const banner = page.locator(".law-finish-banner__card");
    await expect(banner).toBeVisible({ timeout: 15_000 });
    await expect(banner).toContainText("宪法");
    await expect(banner).toContainText("已通");
  });

  test("音效开关：默认开，可切换并持久化", async ({ page }) => {
    await page.goto("/law");
    const toggle = page.locator(".law-sound-toggle");
    await expect(toggle).toBeVisible();
    // 默认未写入偏好（无 reduce-motion 的测试环境）→ 开
    await expect(toggle).toHaveText(/🔊/);
    await toggle.click();
    await expect(toggle).toHaveText(/🔇/);
    // 偏好已落盘（不能断言 reload 后状态：beforeEach 的 initScript 每次导航都会清空 localStorage）
    const saved = await page.evaluate(() => localStorage.getItem("nhb-law-sound"));
    expect(saved).toBe("off");
  });
  test("新题型：填空题与多选题出现并可作答（S1）", async ({ page }) => {
    // 按题型特征定位：引擎是确定性的，但题量分配会随数据/引擎版本漂移，
    // 所以用候选课列表 + 逐题作答直到遇到目标题型（不硬绑定某一课的题目形态）
    const fillCandidates = ["falixue-q053", "falixue-q073", "falixue-q083"];
    const multiCandidates = ["falixue-q034", "falixue-q103", "falixue-q106"];

    const answerGeneric = async () => {
      const mcqOption = page.locator(".law-quiz__options .law-quiz__option:not(.law-quiz__option--multi)");
      const chip = page.locator(".law-quiz__order-chip");
      const multiOption = page.locator(".law-quiz__option--multi");
      const fillInput = page.locator(".law-quiz__fill-input");
      if (await fillInput.isVisible().catch(() => false)) {
        await fillInput.fill("测试错误输入");
        await page.locator(".law-quiz__fill-submit").click();
      } else if (await mcqOption.first().isVisible().catch(() => false)) {
        await mcqOption.first().click();
      } else if (await multiOption.first().isVisible().catch(() => false)) {
        await multiOption.nth(0).click();
        await page.locator(".law-quiz__multi-confirm").click();
      } else {
        for (let i = 0; i < 6 && (await chip.count()) > 0; i += 1) await chip.first().click();
      }
      await expect(page.locator(".law-quiz__feedback")).toBeVisible();
      await page.locator(".law-quiz__next").click();
    };

    // fill：逐题作答直到遇到填空题，输入错误词验证答错路径与答案揭示
    let fillDone = false;
    for (const lessonId of fillCandidates) {
      await page.goto(`/law/learn/${lessonId}?review=1`);
      // 课时正文是异步分块加载的，必须等 quiz 挂载（isVisible 立即返回会误判未加载）
      const mounted = await page.locator(".law-quiz").waitFor({ timeout: 10_000 }).then(() => true).catch(() => false);
      if (!mounted) continue;
      for (let round = 0; round < 5 && !fillDone; round += 1) {
        const fillInput = page.locator(".law-quiz__fill-input");
        if (await fillInput.isVisible().catch(() => false)) {
          await fillInput.fill("测试错误输入");
          await page.locator(".law-quiz__fill-submit").click();
          const feedback = page.locator(".law-quiz__feedback");
          await expect(feedback).toBeVisible();
          await expect(feedback).toContainText("正确答案：");
          fillDone = true;
          break;
        }
        await answerGeneric();
      }
      if (fillDone) break;
    }
    expect(fillDone, "候选课中必须出现至少一道填空题").toBe(true);

    // multi：勾两项确认（部分选=错，全对才对），验证反馈与正确项高亮
    let multiDone = false;
    for (const lessonId of multiCandidates) {
      await page.goto(`/law/learn/${lessonId}?review=1`);
      const multiMounted = await page.locator(".law-quiz").waitFor({ timeout: 10_000 }).then(() => true).catch(() => false);
      if (!multiMounted) continue;
      for (let round = 0; round < 5 && !multiDone; round += 1) {
        const multiOption = page.locator(".law-quiz__option--multi");
        if (await multiOption.first().isVisible().catch(() => false)) {
          await multiOption.nth(0).click();
          await multiOption.nth(1).click();
          await page.locator(".law-quiz__multi-confirm").click();
          const feedback = page.locator(".law-quiz__feedback");
          await expect(feedback).toBeVisible();
          await expect(page.locator(".law-quiz__option--multi.is-correct").first()).toBeVisible();
          multiDone = true;
          break;
        }
        await answerGeneric();
      }
      if (multiDone) break;
    }
    expect(multiDone, "候选课中必须出现至少一道多选题").toBe(true);
  });

});
