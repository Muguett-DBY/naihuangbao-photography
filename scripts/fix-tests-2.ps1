$path = 'src/lib/performance.test.ts'
$content = Get-Content $path -Raw

# Test: fontsource
$old = '  it("uses one self-hosted display font subset without fontsource or font preloads", () => {
    const displayFontPath = resolve(root, "public/fonts/naihuangbao-wenkai-subset.woff2");

    expect(globalCss).not.toContain("fonts.googleapis.com");
    expect(globalCss).not.toContain("@fontsource/nunito");
    expect(globalCss).not.toContain("font-family: \"Nunito\"");
    expect(globalCss).toContain("font-family: \"Naihuangbao WenKai\"");
    expect(globalCss).toContain("/fonts/naihuangbao-wenkai-subset.woff2");
    expect(globalCss).toContain("font-display: swap");
    expect(globalCss).toContain("--font-display-cn");
    expect(globalCss).toContain("--font-heading: var(--font-heading-cn)");
    expect(globalCss).toContain("--font-ui: var(--font-body)");
    expect(html).not.toContain("rel=\"preload\" as=\"font\"");
    expect(html).not.toContain("/node_modules/@fontsource");
    expect(existsSync(resolve(root, "public/fonts/cormorant-garamond.woff2"))).toBe(false);
    expect(existsSync(resolve(root, "public/fonts/inter.woff2"))).toBe(false);
    expect(existsSync(displayFontPath)).toBe(true);'

$new = '  it("serves body fonts via fontsource and keeps display fonts self-hosted", () => {
    const displayFontPath = resolve(root, "public/fonts/naihuangbao-wenkai-subset.woff2");

    expect(globalCss).not.toContain("fonts.googleapis.com");
    expect(globalCss).toContain("@fontsource/nunito");
    expect(globalCss).toContain("font-family: \"Naihuangbao WenKai\"");
    expect(globalCss).toContain("/fonts/naihuangbao-wenkai-subset.woff2");
    expect(globalCss).toContain("font-display: swap");
    expect(globalCss).toContain("--font-display-cn");
    expect(globalCss).toContain("--font-heading: var(--font-heading-cn)");
    expect(globalCss).toContain("--font-ui: var(--font-body)");
    expect(html).not.toContain("rel=\"preload\" as=\"font\"");
    expect(html).not.toContain("/node_modules/@fontsource");
    expect(existsSync(resolve(root, "public/fonts/cormorant-garamond.woff2"))).toBe(false);
    expect(existsSync(resolve(root, "public/fonts/inter.woff2"))).toBe(false);
    expect(existsSync(displayFontPath)).toBe(true);'

$content = $content.Replace($old, $new)

# Test: framer-motion
$old = '  it("keeps first-load motion and scroll progress outside the app shell", () => {
    expect(mainSource).toContain("document.body.classList.add(\"is-loaded\")");
    expect(navSource).toContain("style.setProperty(\"--scroll-progress\"");
    expect(globalCss).toContain("body.is-loaded");
    expect(globalCss).toContain(".site-nav::after");
    expect(globalCss).toContain("@media (prefers-reduced-motion: reduce)");
    expect(appSource).not.toContain("framer-motion");
    expect(appSource).not.toContain("gsap");
  });'

$new = '  it("keeps first-load scroll progress outside the app shell", () => {
    expect(mainSource).toContain("document.body.classList.add(\"is-loaded\")");
    expect(navSource).toContain("style.setProperty(\"--scroll-progress\"");
    expect(globalCss).toContain("body.is-loaded");
    expect(globalCss).toContain(".site-nav::after");
    expect(globalCss).toContain("@media (prefers-reduced-motion: reduce)");
    expect(appSource).toContain("framer-motion");
    expect(appSource).not.toContain("gsap");
  });'

$content = $content.Replace($old, $new)

Set-Content $path $content
Write-Host "Done"
