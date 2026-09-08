import type { Locator, Page } from "@playwright/test";

/**
 * 法学课时通用推进器：不依赖课时数据，逐步完成任意题型组合直到总结页。
 * 题型交互清单（与 src/components/law/player/steps/* 一一对应）：
 * - definition 点「解锁关键词」；list 逐条点卡片；flow 点「下一步」
 * - compare 逐行翻开；condition 逐项勾选；exception 点「但书」抓住
 * - timeline 逐个点亮圆点；mnemonic 先「背一遍」再逐字点开
 * - plain 挂载即完成，无需交互
 *
 * `.law-player__nav.is-primary` 在当前步完成前 disabled（LessonPlayer 门禁），
 * 因此"到达总结页"即证明沿途每个题型步骤都被真实完成过。
 * 返回途中出现过的题型容器名（如 "law-flow"），供用例断言目标题型确实渲染。
 */
export async function walkLessonToSummary(
  page: Page,
  options: { maxRounds?: number } = {},
): Promise<Set<string>> {
  const seen = new Set<string>();
  const summary = page.locator(".law-player__summary");
  const maxRounds = options.maxRounds ?? 40;

  for (let round = 0; round < maxRounds; round += 1) {
    if (await summary.isVisible().catch(() => false)) break;

    for (const container of [
      "law-definition", "law-list", "law-flow", "law-compare",
      "law-condition", "law-exception", "law-timeline", "law-mnemonic",
      "law-plain__terms",
    ]) {
      if (await page.locator(`.${container}`).first().isVisible().catch(() => false)) {
        seen.add(container);
      }
    }

    await completeVisibleStepInteractions(page);
    await clickNavIfReady(page);
  }

  return seen;
}

/** 当前步骤的题型交互：哪个题型在场上就点哪个（幂等，可重复调用） */
async function completeVisibleStepInteractions(page: Page) {
  // mnemonic：先进入背诵流程（按钮无 is-plain 修饰），再逐字点开
  const mnemonicGo = page.locator(".law-mnemonic__go:not(.is-plain)");
  if (await mnemonicGo.isVisible().catch(() => false)) {
    await mnemonicGo.first().click({ force: true });
    await page.waitForTimeout(150);
  }
  const glyph = page.locator(".law-mnemonic__glyph:not(.is-open)");
  if (await glyph.first().isVisible().catch(() => false)) {
    for (let i = 0; i < 20; i += 1) {
      const next = glyph.first();
      if (!(await next.isVisible().catch(() => false))) break;
      await next.click({ force: true });
      await page.waitForTimeout(60);
    }
  }

  await clickAll(page, page.locator(".law-definition__lock"));
  await clickAll(page, page.locator(".law-list__item:not([disabled])"));
  await clickAll(page, page.locator(".law-flow__next"));
  await clickAll(page, page.locator(".law-compare__row:not(.is-open)"));
  await clickAll(page, page.locator(".law-condition__item:not(.is-checked)"));
  await clickAll(page, page.locator(".law-exception__catch:not(.is-caught)"));
  await clickAll(page, page.locator(".law-timeline__dot:not(.is-visited)"));
}

async function clickAll(page: Page, locator: Locator) {
  for (let i = 0; i < 12; i += 1) {
    const next = locator.first();
    if (!(await next.isVisible().catch(() => false))) break;
    await next.click({ force: true });
    await page.waitForTimeout(80);
  }
}

async function clickNavIfReady(page: Page) {
  const nav = page.locator(".law-player__nav.is-primary");
  if (await nav.isEnabled().catch(() => false)) {
    await nav.click({ force: true });
    await page.waitForTimeout(250);
  } else {
    await page.waitForTimeout(250);
  }
}
