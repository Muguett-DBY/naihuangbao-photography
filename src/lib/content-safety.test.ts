import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { faqs } from "../data/faq";

const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
const head = html.match(/<head>([\s\S]*?)<\/head>/)?.[1] ?? "";

const highRiskTerms = ["成人", "色情", "裸露", "私房", "福利", "擦边", "约炮"];
const boundaryCopy = "奶黄包摄影是个人练习项目，预约、价格、课程与商店流程仅用于界面和工程演示，不构成实际商业服务。";

describe("public content safety signals", () => {
  it("publishes a neutral boundary statement in the FAQ content", () => {
    const faqText = faqs.map((item) => `${item.question} ${item.answer}`).join("\n");

    expect(faqText).toContain(boundaryCopy);
    expect(html).toContain(boundaryCopy);
  });

  it("does not add high-risk terms to SEO and social metadata", () => {
    for (const term of highRiskTerms) {
      expect(head).not.toContain(term);
    }
  });
});
