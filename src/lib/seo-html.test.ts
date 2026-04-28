import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");

describe("static SEO shell", () => {
  it("publishes readable brand metadata for search engines", () => {
    expect(html).toContain("<title>奶黄包摄影｜南京女生写真与情侣约拍</title>");
    expect(html).toContain('name="description"');
    expect(html).toContain("奶黄包摄影");
    expect(html).toContain("南京女生写真");
    expect(html).toContain("情侣约拍");
    expect(html).toContain("https://shoot.custard.top");
  });

  it("includes crawlable fallback content before React loads", () => {
    const rootMatch = html.match(/<div id="root">([\s\S]*?)<\/div>\s*<script/);

    expect(rootMatch?.[1]).toContain("奶黄包摄影");
    expect(rootMatch?.[1]).toContain("南京女生写真");
    expect(rootMatch?.[1]).toContain("情侣约拍");
    expect(rootMatch?.[1]).toContain("室内写真 50/h");
    expect(rootMatch?.[1]).toContain("室外约拍 60/h");
    expect(rootMatch?.[1]).toContain("小红书私信咨询");
  });

  it("uses ProfessionalService structured data for the photography brand", () => {
    expect(html).toContain('"@type": "ProfessionalService"');
    expect(html).toContain('"name": "奶黄包摄影"');
    expect(html).toContain('"areaServed"');
    expect(html).toContain('"南京"');
  });
});
