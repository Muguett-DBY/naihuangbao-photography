import "../styles/home-premiere.css";
import "../styles/platform-v4.css";
import "../styles/platform-v5.css";
import { Suspense, lazy, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  BookOpenText,
  Layers3,
  ShieldCheck,
  WandSparkles,
} from "lucide-react";
import { useSiteContent } from "../hooks/useSiteContent";
import { usePublicPhotos } from "../hooks/usePublicPhotos";
import { usePageRevealEffects } from "../hooks/usePageRevealEffects";
import { useSEO } from "../hooks/useSEO";
import { PageTransition } from "../components/shared/PageTransition";
import { PrefetchLink } from "../components/shared/PrefetchLink";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { SectionSkeleton } from "../components/SectionSkeleton";
import { CinematicPremiere } from "../components/CinematicPremiere";
import { opticalGardenFrames } from "../data/optical-archive";
import { useImmersiveAnchor } from "../experience/useImmersiveAnchor";
import { OpticalSceneChrome } from "../components/shared/OpticalSceneChrome";
import { HomeChapterIndex, type HomeChapter } from "../components/shared/HomeChapterIndex";
import { SoftMagnet } from "../components/shared/SoftMagnet";
import { VisualLightTable } from "../components/VisualLightTable";
import { HomeVisualSystem } from "../components/HomeVisualSystem";
import { HomeCreativePulse } from "../components/HomeCreativePulse";

const FilmStripStory = lazy(() =>
  import("../components/FilmStripStory").then((module) => ({ default: module.FilmStripStory })),
);
const RainLetterPremiere = lazy(() => import("../components/RainLetterPremiere").then((module) => ({
  default: module.RainLetterPremiere,
})));

export function HomePage() {
  const { t } = useTranslation();
  const { siteConfig } = useSiteContent();
  const rootRef = useRef<HTMLDivElement>(null);
  const { photos } = usePublicPhotos();

  const coverPhotos = useMemo(
    () => photos.filter((photo) => photo.visibility === "public").slice(0, 3),
    [photos],
  );
  const immersiveImages = useMemo(() => {
    const conceptImages = opticalGardenFrames.slice(0, 3).map((frame) => frame.imageUrl);
    const photoImages = coverPhotos.map((photo) => photo.imageUrl);
    return [
      ...conceptImages,
      ...photoImages,
    ].filter((imageUrl): imageUrl is string => Boolean(imageUrl));
  }, [coverPhotos]);
  const immersiveHeroRef = useImmersiveAnchor({
    id: "home-hero",
    preset: "home",
    imageUrls: immersiveImages,
  });
  const homeChapters = useMemo<HomeChapter[]>(
    () => [
      { id: "premiere", index: "00", label: t("opticalArchive.chapter") },
      { id: "light-table", index: "01", label: t("platform.playground.lightTable", "光桌") },
      { id: "visual-system", index: "02", label: "Visual OS" },
      { id: "portals", index: "03", label: "Explore" },
      { id: "rain-letter", index: "04", label: t("rainLetter.chapter") },
      { id: "creative-pulse", index: "05", label: "Now" },
      { id: "field-notes", index: "06", label: t("filmstrip.title" as never) },
      { id: "make-something", index: "07", label: t("nav.create") },
    ],
    [t],
  );

  useSEO({ titleKey: "seo.homeTitle", descKey: "seo.homeDesc", path: "/" });
  usePageRevealEffects(rootRef);
  return (
    <PageTransition ref={rootRef}>
      <section
        ref={immersiveHeroRef}
        className="hero hero-home"
        id="premiere"
        data-immersive-anchor="home"
        data-optical-garden="true"
      >
        <CinematicPremiere />
        <div className="hero-contact-sheet">
          {coverPhotos.map((photo, index) => (
            <div
              className={`hero-contact-sheet-frame hero-contact-sheet-frame--${index + 1}`}
              key={photo.id}
            >
              <ImageWithFallback
                src={photo.imageUrl}
                alt={photo.alt}
                title={photo.title}
                tone="ink"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 58vw, 42vw"
              />
            </div>
          ))}
        </div>
        <div className="hero-solid-scrim" aria-hidden="true" />
        <OpticalSceneChrome preset="home" chapter="01" />

        <div className="hero-editorial-copy">
          <p className="hero-concept-label">
            <span>{t("opticalArchive.label")}</span>
            <span>{t("premiere.disclosure")}</span>
          </p>
          <div className="mood-signature" aria-live="polite">
            <span className="mood-signature__magazine">NHB / SOFT CINEMA EDITION</span>
            <span className="mood-signature__cute">NHB / LITTLE PHOTO DIARY</span>
          </div>
          <p className="hero-issue-line">
            <span>{t("hero.volBadge")}</span>
            <span>{siteConfig.city}</span>
            <span>2026</span>
          </p>
          <h1 className="hero-title" data-premiere-title>{siteConfig.brandName}</h1>
          <p className="hero-field-note">NHB / PERSONAL VISUAL OPERATING SYSTEM</p>
          <p className="hero-intro">{t("platform.playground.intro", "一个关于光、颜色、纸张与本地创作工具的个人视觉实验场。")}</p>

          <div className="hero-proof-line" aria-label={t("platform.playground.local", "本地优先")}>
            <span><ShieldCheck size={15} aria-hidden="true" />{t("platform.playground.local", "本地优先")}</span>
            <span>{t("platform.playground.archive", "持续生长的视觉档案")}</span>
            <span>{t("platform.playground.practice", "为实验而制作")}</span>
          </div>

          <div className="hero-actions">
            <SoftMagnet strength={12}>
              <PrefetchLink to="/create" className="hero-create-primary">
                <WandSparkles size={18} aria-hidden="true" />
                {t("platform.playground.startCreating", "开始创作")}
              </PrefetchLink>
            </SoftMagnet>
            <SoftMagnet strength={12}>
              <PrefetchLink
                to="/archive"
                className="hero-cover-primary-btn"
              >
                <Layers3 size={18} aria-hidden="true" />
                {t("nav.archive")}
              </PrefetchLink>
            </SoftMagnet>
            <SoftMagnet strength={8}>
              <PrefetchLink to="/stories" className="hero-gallery-link">
                {t("nav.stories")}
                <ArrowRight size={18} aria-hidden="true" />
              </PrefetchLink>
            </SoftMagnet>
          </div>
        </div>

      </section>

      <HomeChapterIndex ariaLabel={t("nav.home")} chapters={homeChapters} />

      <VisualLightTable />

      <HomeVisualSystem />

      <section id="portals" className="home-playground-portals" aria-labelledby="home-playground-portals-title">
        <header>
          <span className="platform-index">03 / EXPLORE · MAKE · READ</span>
          <div><h2 id="home-playground-portals-title">从一张画面进入完整系统</h2><p>浏览概念档案、打开本地创作工具，或阅读每个实验背后的选择。</p></div>
        </header>
        <div>
          <PrefetchLink to="/archive">
            <ImageWithFallback src="/images/optical-archive/paper-water-lab-v1.webp" alt="" title={t("nav.archive")} sizes="(max-width: 760px) 100vw, 34vw" />
            <span><Layers3 size={21} aria-hidden="true" /><small>EXPLORE</small><strong>{t("nav.archive")}</strong><p>沿着天气、颜色和材质探索概念项目。</p></span>
            <ArrowRight size={19} aria-hidden="true" />
          </PrefetchLink>
          <PrefetchLink to="/create">
            <ImageWithFallback src="/images/optical-archive/print-room-morning-v2.webp" alt="" title={t("nav.create")} sizes="(max-width: 760px) 100vw, 34vw" />
            <span><WandSparkles size={21} aria-hidden="true" /><small>MAKE</small><strong>{t("nav.create")}</strong><p>排版、调色、保存并导出自己的视觉项目。</p></span>
            <ArrowRight size={19} aria-hidden="true" />
          </PrefetchLink>
          <PrefetchLink to="/stories">
            <ImageWithFallback src="/images/optical-archive/rain-observation-room-v1.webp" alt="" title={t("nav.stories")} sizes="(max-width: 760px) 100vw, 34vw" />
            <span><BookOpenText size={21} aria-hidden="true" /><small>READ</small><strong>{t("nav.stories")}</strong><p>阅读画面、过程和小型技术实验笔记。</p></span>
            <ArrowRight size={19} aria-hidden="true" />
          </PrefetchLink>
        </div>
      </section>

      <ErrorBoundary>
        <Suspense fallback={<SectionSkeleton lines={3} hasImage />}>
          <RainLetterPremiere />
        </Suspense>
      </ErrorBoundary>

      <HomeCreativePulse />

      <ErrorBoundary>
        <Suspense fallback={<SectionSkeleton lines={3} hasImage />}>
          <FilmStripStory />
        </Suspense>
      </ErrorBoundary>

      <section className="home-final-cta home-final-cta--create" id="make-something" data-motion-group>
        <div className="home-final-cta-media" data-motion-item>
          <ImageWithFallback
            src="/images/optical-archive/print-room-morning-v2.webp"
            alt="清晨无人印样室、奶油色艺术纸与苔藓绿工作台"
            title="NHB Create Studio"
            tone="ink"
            sizes="100vw"
          />
          <span aria-hidden="true" />
        </div>
        <div className="home-final-cta-content" data-motion-item>
          <p className="home-band-index">07 / MAKE SOMETHING</p>
          <div>
            <h2>不要只看，打开一张自己的画面</h2>
            <p>创建联系表、胶片条、视觉故事或一份可以带走的 NHB 本地工程。</p>
          </div>
          <SoftMagnet strength={12}>
            <PrefetchLink
              to="/create"
              className="home-final-cta-button"
            >
              <WandSparkles size={18} aria-hidden="true" />
              {t("platform.playground.startCreating", "开始创作")}
            </PrefetchLink>
          </SoftMagnet>
        </div>
      </section>
    </PageTransition>
  );
}
