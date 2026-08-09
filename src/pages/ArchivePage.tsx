import "../styles/platform-v3.css";
import "../styles/archive-v3.css";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { ArchiveConstellation } from "../components/ArchiveConstellation";
import { LivingArchiveExplorer } from "../components/LivingArchiveExplorer";
import { PageTransition } from "../components/shared/PageTransition";
import { useSEO } from "../hooks/useSEO";
import { getVisualAsset } from "../data/visual-assets";
import { visualAssetTransitionName } from "../lib/view-transition";

export function ArchivePage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const selectedAsset = getVisualAsset(searchParams.get("similar") ?? undefined);
  useSEO({ titleKey: "platform.archive.title", descKey: "platform.archive.description", path: "/archive" });

  return (
    <PageTransition className="platform-page archive-page">
      <section className="platform-hero platform-hero--archive">
        <div className="platform-hero__media" aria-hidden="true">
          <ImageWithFallback
            src={selectedAsset?.src ?? "/images/optical-archive/optical-garden-hero-v1.webp?v=20260808-1"}
            alt=""
            title={t("platform.archive.title")}
            priority
            sizes="100vw"
            tone="sage"
            transitionName={selectedAsset ? visualAssetTransitionName(selectedAsset.id) : undefined}
          />
          <ImageWithFallback
            src="/images/optical-archive/camellia-prism-macro-v1.webp?v=20260808-1"
            alt=""
            title={t("platform.archive.title")}
            priority
            sizes="(max-width: 768px) 42vw, 25vw"
            tone="cream"
          />
        </div>
        <div className="platform-hero__scrim" aria-hidden="true" />
        <div className="platform-hero__copy">
          <span className="platform-index">NHB / LIVING ARCHIVE / 2026</span>
          <h1>{t("platform.archive.title")}</h1>
          <p>{t("platform.archive.description")}</p>
          <a href="#archive-index" className="platform-hero__jump">{t("platform.archive.enter")} <span aria-hidden="true">↓</span></a>
        </div>
      </section>
      <ArchiveConstellation />
      <div id="archive-index"><LivingArchiveExplorer /></div>
    </PageTransition>
  );
}
