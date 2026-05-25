$path = 'src/lib/audit-regressions.test.ts'
$content = Get-Content $path -Raw

# Test 1: lightbox fade animation -> PhotoSwipe imports
$old1 = '  it("keeps the lightbox fade animation paired with its keyframes and reduced-motion override", () => {
    expect(cssSource).toContain("@keyframes lightboxFade");
    expect(cssSource).toMatch(/\.lightbox-image\.is-loaded\s*\{[^}]*animation:\s*lightboxFade/s);
    expect(cssSource).toMatch(/@keyframes lightboxFade\s*\{[\s\S]*opacity:\s*1/s);
    expect(cssSource).toMatch(/prefers-reduced-motion:[^)]+reduce[\s\S]*\.lightbox-image[\s\S]*animation:\s*none\s*!important/);
  });'

$new1 = '  it("imports PhotoSwipe with its built-in animations and gestures", () => {
    expect(lightboxSource).toContain("from \"photoswipe\"");
    expect(lightboxSource).toContain("import \"photoswipe/style.css\"");
    expect(lightboxSource).toContain("wheelToZoom: true");
    expect(lightboxSource).toContain("showHideAnimationType: \"zoom\"");
    expect(lightboxSource).toContain("doubleTapAction");
  });'

$content = $content.Replace($old1, $new1)

# Test 2: lightbox keyboard safety -> PhotoSwipe delegation
$old2 = '  it("keeps the lightbox modal keyboard-safe while tracking cached image load state", () => {
    expect(lightboxSource).toContain("dialogRef");
    expect(lightboxSource).toContain("previousActiveElementRef");
    expect(lightboxSource).toContain("case \"Tab\"");
    expect(lightboxSource).toContain("querySelectorAll<HTMLElement>");
    expect(lightboxSource).toContain("useLayoutEffect");
    expect(lightboxSource).toContain("readImageElementStatus");
    expect(lightboxSource).toContain("imageLoadState");
    expect(lightboxSource).toContain("handleImageLoad");
    expect(lightboxSource).toContain("handleImageError");
    expect(lightboxSource).toContain("isImageLoaded");
    expect(lightboxSource).toContain("lightbox-spinner");
    expect(lightboxSource).toContain("is-loaded");
    expect(cssSource).toMatch(/\.lightbox-overlay\s*\{(?=[^}]*position:\s*fixed)(?=[^}]*inset:\s*0)(?=[^}]*z-index:\s*9999)(?=[^}]*display:\s*flex)(?=[^}]*align-items:\s*center)(?=[^}]*justify-content:\s*center)/s);
    expect(cssSource).not.toMatch(/\.lightbox-image\s*\{[^}]*opacity:\s*0/s);
    expect(cssSource).toMatch(/\.lightbox-image\s*\{[^}]*opacity:\s*1/s);
    expect(cssSource).toContain(".lightbox-image.is-loaded");
    expect(cssSource).toMatch(/\.lightbox-image-wrap\s*\{[^}]*max-height:\s*calc\(100dvh - 130px\)/s);
    expect(cssSource).toContain(".lightbox-loading");
    expect(cssSource).toMatch(/\.lightbox-loading,\s*\.lightbox-image-error\s*\{[^}]*z-index:\s*2/s);
    expect(cssSource).toContain(".lightbox-spinner");
  });'

$new2 = '  it("delegates lightbox keyboard and gesture handling to PhotoSwipe", () => {
    expect(lightboxSource).toContain("from \"photoswipe\"");
    expect(lightboxSource).toContain("new PhotoSwipe");
    expect(lightboxSource).toContain("pswp.on(\"close\"");
    expect(lightboxSource).toContain("tapAction");
    expect(lightboxSource).toContain("wheelToZoom");
    expect(lightboxSource).not.toContain("dialogRef");
    expect(lightboxSource).not.toContain("createPortal");
    expect(lightboxSource).not.toContain("handleImageLoad");
  });'

$content = $content.Replace($old2, $new2)

# Test 3: lightbox viewport bounds -> PhotoSwipe layout
$old3 = '  it("bounds lightbox images to the viewport stage instead of percentage max-height", () => {
    const lightboxContentBlock = cssSource.match(/\.lightbox-content\s*\{(?<body>[^}]*)\}/s)?.groups?.body ?? "";
    const lightboxWrapBlock = cssSource.match(/\.lightbox-image-wrap\s*\{(?<body>[^}]*)\}/s)?.groups?.body ?? "";
    const lightboxImageBlock = cssSource.match(/\.lightbox-image\s*\{(?<body>[^}]*)\}/s)?.groups?.body ?? "";

    expect(lightboxContentBlock).toContain("width: min(80vw, 1080px)");
    expect(lightboxWrapBlock).toContain("display: flex");
    expect(lightboxWrapBlock).toContain("align-items: center");
    expect(lightboxWrapBlock).toContain("justify-content: center");
    expect(lightboxWrapBlock).toContain("height: min(72dvh, 720px)");
    expect(lightboxWrapBlock).toContain("overflow: hidden");
    expect(lightboxImageBlock).toContain("width: auto");
    expect(lightboxImageBlock).toContain("height: auto");
    expect(lightboxImageBlock).toContain("max-width: 100%");
    expect(lightboxImageBlock).toContain("max-height: 100%");
    expect(lightboxImageBlock).not.toMatch(/^\s*width:\s*100%/m);
    expect(lightboxImageBlock).not.toMatch(/^\s*height:\s*100%/m);
    expect(lightboxImageBlock).toContain("object-fit: contain");
  });'

$new3 = '  it("lets PhotoSwipe handle image viewport fitting via its built-in layout", () => {
    expect(lightboxSource).toContain("width: 1600");
    expect(lightboxSource).toContain("height: 1200");
    expect(lightboxSource).toContain("preloaderDelay");
    expect(lightboxSource).toContain("padding");
    expect(lightboxSource).not.toContain(".lightbox-content");
    expect(lightboxSource).not.toContain(".lightbox-image-wrap");
  });'

$content = $content.Replace($old3, $new3)

# Test 4: createPortal -> PhotoSwipe modal
$old4 = '  it("mounts the lightbox outside transformed gallery containers", () => {
    expect(cssSource).toMatch(/main\s*\{[^}]*overflow:\s*hidden/s);
    expect(cssSource).toMatch(/\.section-shell\s*\{[^}]*transform:\s*translateY/s);
    expect(lightboxSource).toContain("from \"react-dom\"");
    expect(lightboxSource).toContain("createPortal");
    expect(lightboxSource).toMatch(/createPortal\(\s*dialog,\s*document\.body\s*\)/s);
  });'

$new4 = '  it("renders PhotoSwipe as a self-contained modal outside the DOM tree", () => {
    expect(cssSource).toMatch(/main\s*\{[^}]*overflow:\s*hidden/s);
    expect(cssSource).toMatch(/\.section-shell\s*\{[^}]*transform:\s*translateY/s);
    expect(lightboxSource).not.toContain("createPortal");
    expect(lightboxSource).not.toContain("from \"react-dom\"");
    expect(lightboxSource).toContain("new PhotoSwipe");
  });'

$content = $content.Replace($old4, $new4)

Set-Content $path $content
Write-Host "Done"
