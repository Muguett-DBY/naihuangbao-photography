import "../styles/home-premiere.css";
import "../styles/platform-v4.css";
import "../styles/platform-v5.css";
import { useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  BookOpenText,
  Layers3,
  WandSparkles,
} from "lucide-react";
import { useSiteContent } from "../hooks/useSiteContent";
import { usePageRevealEffects } from "../hooks/usePageRevealEffects";
import { useSEO } from "../hooks/useSEO";
import { PageTransition } from "../components/shared/PageTransition";
import { PrefetchLink } from "../components/shared/PrefetchLink";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { CinematicPremiere } from "../components/CinematicPremiere";
import { HomeChapterIndex, type HomeChapter } from "../components/shared/HomeChapterIndex";
import { VisualLightTable } from "../components/VisualLightTable";
import { HomeVisualSystem } from "../components/HomeVisualSystem";

export function HomePage() {
  const { t } = useTranslation();
  const { siteConfig } = useSiteContent();
  const rootRef = useRef<HTMLDivElement>(null);
  const homeChapters = useMemo<HomeChapter[]>(
    () => [
      { id: "premiere", index: "00", label: t("opticalArchive.chapter") },
      { id: "light-table", index: "01", label: t("platform.playground.lightTable", "光桌") },
      { id: "visual-system", index: "02", label: "Visual OS" },
      { id: "portals", index: "03", label: "Explore" },
      { id: "make-something", index: "04", label: t("nav.create") },
    ],
    [t],
  );

  useSEO({ titleKey: "seo.homeTitle", descKey: "seo.homeDesc", path: "/" });
  usePageRevealEffects(rootRef);
  return (
    <PageTransition ref={rootRef}>
      <section
        className="hero hero-home"
        id="premiere"
        data-home-experience="calm-premiere"
      >
        <CinematicPremiere />
        <div className="hero-solid-scrim" aria-hidden="true" />

        <div className="hero-editorial-copy">
          <p className="hero-concept-label">
            {t("opticalArchive.label")} / {siteConfig.city}
          </p>
          <h1 className="hero-title" data-premiere-title>{siteConfig.brandName}</h1>
          <p className="hero-intro">{t("platform.playground.intro", "一个关于光、颜色、纸张与本地创作工具的个人视觉实验场。")}</p>

          <div className="hero-actions">
            <PrefetchLink to="/create" className="hero-create-primary">
              <WandSparkles size={18} aria-hidden="true" />
              {t("platform.playground.startCreating", "开始创作")}
            </PrefetchLink>
            <PrefetchLink to="/archive" className="hero-cover-primary-btn">
              <Layers3 size={18} aria-hidden="true" />
              {t("nav.archive")}
            </PrefetchLink>
          </div>
        </div>
      </section>

      <HomeChapterIndex ariaLabel={t("nav.home")} chapters={homeChapters} />

      <VisualLightTable />

      <HomeVisualSystem />

      <section id="portals" className="home-playground-portals" aria-labelledby="home-playground-portals-title">
        <header>
          <span className="platform-index">03 / EXPLORE · MAKE · READ</span>
          <div><h2 id="home-playground-portals-title">{t("platform.home.portals.title")}</h2><p>{t("platform.home.portals.intro")}</p></div>
        </header>
        <div>
          <PrefetchLink to="/archive">
            <ImageWithFallback src="/images/optical-archive/paper-water-lab-v1.webp" alt="" title={t("nav.archive")} sizes="(max-width: 760px) 100vw, 34vw" />
            <span><Layers3 size={21} aria-hidden="true" /><small>EXPLORE</small><strong>{t("nav.archive")}</strong><p>{t("platform.home.portals.archive")}</p></span>
            <ArrowRight size={19} aria-hidden="true" />
          </PrefetchLink>
          <PrefetchLink to="/create">
            <ImageWithFallback src="/images/optical-archive/print-room-morning-v2.webp" alt="" title={t("nav.create")} sizes="(max-width: 760px) 100vw, 34vw" />
            <span><WandSparkles size={21} aria-hidden="true" /><small>MAKE</small><strong>{t("nav.create")}</strong><p>{t("platform.home.portals.create")}</p></span>
            <ArrowRight size={19} aria-hidden="true" />
          </PrefetchLink>
          <PrefetchLink to="/stories">
            <ImageWithFallback src="/images/optical-archive/rain-observation-room-v1.webp" alt="" title={t("nav.stories")} sizes="(max-width: 760px) 100vw, 34vw" />
            <span><BookOpenText size={21} aria-hidden="true" /><small>READ</small><strong>{t("nav.stories")}</strong><p>{t("platform.home.portals.stories")}</p></span>
            <ArrowRight size={19} aria-hidden="true" />
          </PrefetchLink>
        </div>
      </section>

      <section className="home-final-cta home-final-cta--create" id="make-something" data-motion-group>
        <div className="home-final-cta-media" data-motion-item>
          <ImageWithFallback
            src="/images/optical-archive/print-room-morning-v2.webp"
            alt={t("platform.home.final.imageAlt")}
            title="NHB Create Studio"
            tone="ink"
            sizes="100vw"
          />
          <span aria-hidden="true" />
        </div>
        <div className="home-final-cta-content" data-motion-item>
          <p className="home-band-index">04 / MAKE SOMETHING</p>
          <div>
            <h2>{t("platform.home.final.title")}</h2>
            <p>{t("platform.home.final.intro")}</p>
          </div>
          <PrefetchLink to="/create" className="home-final-cta-button">
            <WandSparkles size={18} aria-hidden="true" />
            {t("platform.playground.startCreating", "开始创作")}
          </PrefetchLink>
        </div>
      </section>
    </PageTransition>
  );
}
