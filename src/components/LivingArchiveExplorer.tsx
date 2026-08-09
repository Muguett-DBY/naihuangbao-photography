import { ArrowRight, Search, RotateCcw, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { archiveProjects } from "../data/living-archive";
import { usePublicPhotos } from "../hooks/usePublicPhotos";
import { createArchiveView, type ArchiveFacet, type ArchiveFilters } from "../lib/living-archive";
import { photoTransitionName } from "../lib/photo-transition";
import { ImageWithFallback } from "./ImageWithFallback";
import { PrefetchLink } from "./shared/PrefetchLink";
import { ArchiveDiscoveryDeck } from "./ArchiveDiscoveryDeck";
import { getVisualAssetBySource } from "../data/visual-assets";

const initialFilters: ArchiveFilters = {
  place: "all",
  season: "all",
  mood: "all",
  palette: "all",
  technique: "all",
  medium: "all",
  query: "",
};
const facetLabels: Record<ArchiveFacet, string> = {
  place: "platform.archive.place",
  season: "platform.archive.season",
  mood: "platform.archive.mood",
  palette: "platform.archive.palette",
  technique: "platform.archive.technique",
  medium: "platform.archive.medium",
};

export function LivingArchiveExplorer() {
  const { t } = useTranslation();
  const { photos } = usePublicPhotos();
  const [filters, setFilters] = useState(initialFilters);
  const view = useMemo(() => createArchiveView(archiveProjects, filters), [filters]);
  const realPhotos = photos.filter((photo) => photo.visibility === "public");
  const isFiltered = Object.entries(filters).some(([key, value]) => key === "query" ? Boolean(value) : value !== "all");

  const updateFilter = (facet: ArchiveFacet, value: string) => {
    setFilters((current) => ({ ...current, [facet]: value }));
  };

  return (
    <div className="living-archive">
      <section className="archive-filter-band" aria-labelledby="archive-filter-title">
        <div>
          <span className="platform-index">01 / INDEX</span>
          <h2 id="archive-filter-title">{t("platform.archive.filterTitle")}</h2>
          <p>{t("platform.archive.filterDescription")}</p>
        </div>
        <div className="archive-filters">
          <label className="archive-search-field">
            <span>{t("platform.archive.search", "搜索档案")}</span>
            <span><Search size={17} aria-hidden="true" /><input type="search" value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} placeholder={t("platform.archive.searchHint", "标题、材料、技法或情绪")} /></span>
          </label>
          {(Object.keys(facetLabels) as ArchiveFacet[]).map((facet) => (
            <label key={facet}>
              <span>{t(facetLabels[facet] as never)}</span>
              <select value={filters[facet]} onChange={(event) => updateFilter(facet, event.target.value)}>
                <option value="all">{t("platform.archive.all")}</option>
                {view.facets[facet].map((value) => <option value={value} key={value}>{value}</option>)}
              </select>
            </label>
          ))}
          <button
            type="button"
            className="archive-filter-reset"
            disabled={!isFiltered}
            onClick={() => setFilters(initialFilters)}
            title={t("platform.archive.reset")}
            aria-label={t("platform.archive.reset")}
          >
            <RotateCcw size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="archive-filter-summary" aria-live="polite">
          <span><SlidersHorizontal size={15} aria-hidden="true" />{t("platform.archive.resultCount", { count: view.projects.length, defaultValue: `${view.projects.length} 个项目` })}</span>
          {isFiltered ? (
            <button type="button" onClick={() => setFilters(initialFilters)}><X size={14} aria-hidden="true" />{t("platform.archive.clearAll", "清除全部条件")}</button>
          ) : null}
        </div>
      </section>

      <ArchiveDiscoveryDeck />

      <section className="archive-concept-section" aria-labelledby="archive-concept-title">
        <header className="platform-section-head">
          <div>
            <span className="platform-index">03 / CONCEPT STUDIES</span>
            <h2 id="archive-concept-title">{t("platform.archive.conceptTitle")}</h2>
          </div>
          <p>{t("platform.archive.conceptDisclosure")}</p>
        </header>

        <div className="archive-projects" aria-live="polite">
          {view.projects.map((project, index) => (
            <article className="archive-project" key={project.id} id={project.id}>
              <div className="archive-project__media">
                {project.media.slice(0, 2).map((media, mediaIndex) => (
                  <ImageWithFallback
                    key={media.src}
                    src={media.src}
                    alt={media.alt}
                    title={project.title}
                    priority={index === 0 && mediaIndex === 0}
                    sizes={mediaIndex === 0 ? "(max-width: 768px) 100vw, 68vw" : "(max-width: 768px) 42vw, 24vw"}
                    tone={mediaIndex === 0 ? "sage" : "cream"}
                  />
                ))}
              </div>
              <div className="archive-project__copy">
                <span>{project.chapter} / {project.year}</span>
                <h3>{project.title}</h3>
                <strong>{project.subtitle}</strong>
                <p>{project.summary}</p>
                <dl>
                  <div><dt>{t("platform.archive.place")}</dt><dd>{project.place}</dd></div>
                  <div><dt>{t("platform.archive.season")}</dt><dd>{project.season}</dd></div>
                  <div><dt>{t("platform.archive.mood")}</dt><dd>{project.moods.join(" / ")}</dd></div>
                  <div><dt>{t("platform.archive.medium", "媒介")}</dt><dd>{project.mediums.join(" / ")}</dd></div>
                </dl>
                <div className="archive-project__palette" aria-label={project.palette.join(", ")}>
                  {project.palette.map((color) => <span key={color}>{color}</span>)}
                </div>
                <PrefetchLink className="archive-project__open" to={`/archive/${project.id}`}>
                  打开完整研究 <ArrowRight size={17} aria-hidden="true" />
                </PrefetchLink>
                {getVisualAssetBySource(project.media[0]?.src) ? (
                  <PrefetchLink className="archive-project__similar" to={`/archive?similar=${getVisualAssetBySource(project.media[0]?.src)!.id}#archive-discovery`}>
                    <Sparkles size={15} aria-hidden="true" /> 查找相似画面
                  </PrefetchLink>
                ) : null}
              </div>
            </article>
          ))}
          {!view.projects.length ? <p className="archive-empty">{t("platform.archive.empty")}</p> : null}
        </div>
      </section>

      <section className="archive-real-work" aria-labelledby="archive-real-title">
        <header className="platform-section-head">
          <div>
            <span className="platform-index">04 / REAL WORK</span>
            <h2 id="archive-real-title">{t("platform.archive.realTitle")}</h2>
          </div>
          <p>{t("platform.archive.realDescription")}</p>
        </header>
        <div className="archive-real-grid">
          {realPhotos.map((photo) => (
            <PrefetchLink to={`/gallery/${photo.id}`} key={photo.id} className="archive-real-item">
              <ImageWithFallback
                src={photo.imageUrl}
                alt={photo.alt}
                title={photo.title}
                sizes="(max-width: 640px) 50vw, 25vw"
                transitionName={photoTransitionName(photo.id)}
              />
              <span><strong>{photo.title}</strong><small>{photo.location}</small></span>
            </PrefetchLink>
          ))}
        </div>
        <PrefetchLink to="/gallery" className="platform-text-link">{t("platform.archive.openGallery")} <span aria-hidden="true">↗</span></PrefetchLink>
      </section>
    </div>
  );
}
