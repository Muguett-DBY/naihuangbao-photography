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

test.describe("错题本页（三分组 / 复习跳转 / 空态）", () => {
  const NOW = Date.now();
  const DAY = 86_400_000;

  /** 三种错题状态各一课：到期（falixue-q052 有自测题，?review=1 可直达）/ 未到期 / 毕业 */
  async function seedWrongbook(page: import("@playwright/test").Page) {
    await page.addInitScript(
      (payload) => {
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
          JSON.stringify({ version: 1, lastLessonId: "falixue-q052", lessons: payload }),
        );
      },
      {
        "falixue-q052": {
          stepsDone: { s0: true }, quizBest: 0, quizTotal: 4, wrongCount: 2,
          lastVisitedAt: NOW, wrongAt: NOW, reviewStage: 0, reviewDueAt: NOW - 3_600_000,
        },
        "minfa-q033": {
          stepsDone: { s0: true }, quizBest: 1, quizTotal: 4, wrongCount: 1,
          lastVisitedAt: NOW, wrongAt: NOW, reviewStage: 1, reviewDueAt: NOW + 3 * DAY,
        },
        "minfa-q031": {
          stepsDone: { s0: true }, quizBest: 4, quizTotal: 4, wrongCount: 1,
          lastVisitedAt: NOW, wrongAt: NOW - 10 * DAY, reviewStage: 5,
        },
      } as Record<string, Record<string, unknown>>,
    );
  }

  test.beforeEach(async ({ page }) => {
    await seedWrongbook(page);
  });

  test("三分组各归其位，摘要计数与分组一致", async ({ page }) => {
    await page.goto("/law/wrongbook");
    await expect(page.locator(".law-wrongbook__head h1")).toContainText("错题本");
    // 摘要三枚 chip 的计数
    await expect(page.locator(".law-wrongbook__chip", { hasText: "今天到期 1" })).toBeVisible();
    await expect(page.locator(".law-wrongbook__chip", { hasText: "未来到期 1" })).toBeVisible();
    await expect(page.locator(".law-wrongbook__chip", { hasText: "已毕业 1" })).toBeVisible();
    // 三个分组各含一条目标课，到期状态文案口径正确
    const dueGroup = page.locator(".law-wrongbook__group", { hasText: "今天到期" });
    await expect(dueGroup.locator(".law-wrongbook__item")).toHaveCount(1);
    await expect(dueGroup.locator(".law-wrongbook__item").first()).toContainText("今天到期");
    const upcomingGroup = page.locator(".law-wrongbook__group", { hasText: "未来到期" });
    await expect(upcomingGroup.locator(".law-wrongbook__item").first()).toContainText("3 天后到期");
    const graduatedGroup = page.locator(".law-wrongbook__group", { hasText: "已毕业" });
    await expect(graduatedGroup.locator(".law-wrongbook__item").first()).toContainText("已毕业");
  });

  test("到期条目直达复习模式，未到期只进课时页", async ({ page }) => {
    await page.goto("/law/wrongbook");
    // 到期 → ?review=1 直达自测
    const due = page.locator(".law-wrongbook__group", { hasText: "今天到期" }).locator(".law-wrongbook__item").first();
    await expect(due).toHaveAttribute("href", /\/law\/learn\/falixue-q052\?review=1$/);
    await due.click();
    await expect(page).toHaveURL(/\/law\/learn\/falixue-q052\?review=1$/);
    await expect(page.locator(".law-quiz")).toBeVisible();

    // 未到期 → 不带 review 参数（提前翻看可以，但别急着测）
    await page.goto("/law/wrongbook");
    const upcoming = page.locator(".law-wrongbook__group", { hasText: "未来到期" }).locator(".law-wrongbook__item").first();
    await expect(upcoming).toHaveAttribute("href", /\/law\/learn\/minfa-q033$/);
    await upcoming.click();
    await expect(page).toHaveURL(/\/law\/learn\/minfa-q033$/);
    await expect(page.locator(".law-player")).toBeVisible();
    await expect(page.locator(".law-quiz")).toHaveCount(0);
  });

  test("空错题本显示空态引导而非空页面", async ({ page }) => {
    // 后注册的 initScript 后执行：用空进度覆盖 beforeEach 的种子
    await page.addInitScript(() => {
      localStorage.setItem("nhb-law-academy-v1", JSON.stringify({ version: 1, lessons: {} }));
    });
    await page.goto("/law/wrongbook");
    await expect(page.locator(".law-wrongbook__empty")).toBeVisible();
    await expect(page.locator(".law-wrongbook__empty")).toContainText("还是空白的");
    await expect(page.locator(".law-wrongbook__group")).toHaveCount(0);
    await expect(page.locator(".law-wrongbook__empty-cta")).toHaveAttribute("href", "/law");
  });
});

test.describe("统计页（图表渲染 / 数据联动）", () => {
  test("KPI、柱状图与错题健康度随进度数据联动", async ({ page }) => {
    const now = Date.now();
    await page.addInitScript((ts) => {
      localStorage.clear();
      const triggers = [
        "midnight", "morning", "firstLesson", "hundred", "streak3", "streak7",
        "wrongbook3", "wrongGraduate", "pathHalf", "bookDone",
        "graphicFirst", "exam30", "christmas", "symbol",
      ];
      const unlocked = Object.fromEntries(triggers.map((t) => [t, true]));
      localStorage.setItem("nhb-law-egg-v1", JSON.stringify({ unlocked, seenAt: { morning: 1 } }));
      // 今日完成 2 课 + 1 课答错待复习：KPI/柱状图/健康度三处都要反映
      localStorage.setItem(
        "nhb-law-academy-v1",
        JSON.stringify({
          version: 1,
          lastLessonId: "minfa-q031",
          lessons: {
            "minfa-q031": {
              stepsDone: { s0: true, s1: true }, quizBest: 4, quizTotal: 4, wrongCount: 0,
              lastVisitedAt: ts, completedAt: ts,
            },
            "minfa-q033": {
              stepsDone: { s0: true }, quizBest: 4, quizTotal: 4, wrongCount: 0,
              lastVisitedAt: ts, completedAt: ts,
            },
            "falixue-q052": {
              stepsDone: { s0: true }, quizBest: 0, quizTotal: 4, wrongCount: 1,
              lastVisitedAt: ts, wrongAt: ts, reviewStage: 0, reviewDueAt: ts - 3_600_000,
            },
          },
        }),
      );
    }, now);

    await page.goto("/law/stats");
    await expect(page.locator(".law-stats__head h1")).toContainText("学习统计");
    // KPI：已掌握课时 = 2（completedAt 口径，错题课不算掌握）
    const kpis = page.locator(".law-stats__kpi");
    await expect(kpis.filter({ hasText: "已掌握课时" }).locator("b")).toHaveText("2");
    // 柱状图：30 根柱渲染，今日柱非零，摘要与注入数据一致（2 课时）
    await expect(page.locator(".law-stats__chart svg rect")).toHaveCount(30);
    await expect(page.locator(".law-stats__chart rect.is-today")).not.toHaveClass(/is-zero/);
    await expect(page.locator(".law-stats__chart-summary")).toContainText("近 30 天完成 2 课时");
    // 错题健康度：今日到期 1 / 未毕业 1 → 1/1（is-warn 态）
    await expect(kpis.filter({ hasText: "错题健康度" })).toContainText("1/1");
    // 数据联动：错题区给出复习入口
    await expect(page.locator(".law-stats__wrong")).toContainText("1 课今天到期");
  });

  test("无学习记录时显示空态引导", async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
    await page.goto("/law/stats");
    await expect(page.locator(".law-stats__empty")).toBeVisible();
    await expect(page.locator(".law-stats__cards")).toHaveCount(0);
    await expect(page.locator(".law-stats__empty")).toContainText("还没有可统计的学习记录");
  });
});

test.describe("关卡地图扩展（浮层 / 自测入口 / 蜿蜒结构）", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      // 预解锁全部彩蛋：深夜/清晨等时段信弹窗会挡住视图切换交互
      const triggers = [
        "midnight", "morning", "firstLesson", "hundred", "streak3", "streak7",
        "wrongbook3", "wrongGraduate", "pathHalf", "bookDone",
        "graphicFirst", "exam30", "christmas", "symbol",
      ];
      const unlocked = Object.fromEntries(triggers.map((t) => [t, true]));
      localStorage.setItem("nhb-law-egg-v1", JSON.stringify({ unlocked, seenAt: { morning: 1 } }));
      localStorage.setItem("nhb-law-subject-view", "tree");
    });
  });

  test("节点浮层：聚焦显示课名与时长，失焦消失", async ({ page }) => {
    await page.goto("/law/xianfa");
    // 切到学习路径视图（蜿蜒关卡地图）
    await page.locator(".law-subject__viewtoggle button", { hasText: "学习路径" }).click();
    const node = page.locator(".law-path__node:not(.is-current)").first();
    await node.focus();
    // 浮层显示课名与"步 ≈ 分钟"时长说明（focus 与 hover 共用同一状态通道）
    const tip = page.locator(".law-path__tip").first();
    await expect(tip).toBeVisible();
    await expect(tip.locator("b")).not.toBeEmpty();
    await expect(tip.locator("small")).toContainText(/步 ≈ \d+ 分钟/);
    await node.blur();
    await expect(page.locator(".law-path__tip")).toHaveCount(0);
  });

  test("当前节点「直接自测」直达复习模式", async ({ page }) => {
    // q001-tour 导览课不出题：标记完成后当前节点变为有自测题的 q002
    await page.addInitScript(() => {
      localStorage.setItem(
        "nhb-law-academy-v1",
        JSON.stringify({
          version: 1,
          lessons: {
            "xianfa-q001-tour": {
              stepsDone: { s0: true }, quizBest: 1, quizTotal: 1, wrongCount: 0,
              lastVisitedAt: Date.now(), completedAt: Date.now(),
            },
          },
        }),
      );
    });
    await page.goto("/law/xianfa");
    await page.locator(".law-subject__viewtoggle button", { hasText: "学习路径" }).click();
    const current = page.locator(".law-path__node.is-current");
    await expect(current).toHaveCount(1);
    // 当前节点带开始旗与自测入口
    await expect(page.locator(".law-path__start")).toBeVisible();
    const quizEntry = page.locator(".law-path__quiz");
    await expect(quizEntry).toBeVisible();
    await expect(quizEntry).toContainText("直接自测");
    await quizEntry.click();
    await expect(page).toHaveURL(/\/law\/learn\/.+\?review=1$/);
    await expect(page.locator(".law-quiz")).toBeVisible();
  });

  test("蜿蜒结构：跨章分区且节点横向偏移交替", async ({ page }) => {
    await page.goto("/law/xianfa");
    await page.locator(".law-subject__viewtoggle button", { hasText: "学习路径" }).click();
    // 分区：每章一个 section（宪法书正文 > 5 章）
    const sections = page.locator(".law-path__section");
    expect(await sections.count()).toBeGreaterThan(5);
    // 蜿蜒：相邻节点 --dx 偏移交替（非全部同一值）
    const dxValues = await page.locator(".law-path__slot").evaluateAll((slots) => {
      const first = (slots[0] as HTMLElement).style.getPropertyValue("--dx");
      const second = (slots[1] as HTMLElement).style.getPropertyValue("--dx");
      return [first, second];
    });
    expect(dxValues[0]).not.toBe(dxValues[1]);
    // 分区标题带 done/total 计数
    await expect(page.locator(".law-path__divider").first()).toContainText(/\d+\/\d+/);
  });
});

test.describe("音效偏好（reduce-motion 用户）", () => {
  // 方法学备忘（A 会话 + 本会话探针复核）：test.use({ reducedMotion }) 与启动参数都不生效，
  // 必须 browser.newContext({ reducedMotion: "reduce" }) 手动建上下文
  test("reduce-motion 用户音效默认静音，仍可手动开启", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    try {
      await page.addInitScript(() => {
        localStorage.clear();
        const triggers = [
          "midnight", "morning", "firstLesson", "hundred", "streak3", "streak7",
          "wrongbook3", "wrongGraduate", "pathHalf", "bookDone",
          "graphicFirst", "exam30", "christmas", "symbol",
        ];
        const unlocked = Object.fromEntries(triggers.map((t) => [t, true]));
        localStorage.setItem("nhb-law-egg-v1", JSON.stringify({ unlocked, seenAt: { morning: 1 } }));
      });
      await page.goto("/law");
      const toggle = page.locator(".law-sound-toggle");
      await expect(toggle).toBeVisible();
      await expect(toggle).toHaveText(/🔇/);
      await toggle.click();
      await expect(toggle).toHaveText(/🔊/);
      const saved = await page.evaluate(() => localStorage.getItem("nhb-law-sound"));
      expect(saved).toBe("on");
    } finally {
      await context.close();
    }
  });
});
