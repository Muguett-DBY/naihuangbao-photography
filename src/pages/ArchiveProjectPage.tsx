import "../styles/platform-v4.css";
import { ArrowLeft, ArrowRight, Aperture, Layers3 } from "lucide-react";
import { useMemo } from "react";
import { useParams } from "react-router";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { NotFound } from "../components/NotFound";
import { PageTransition } from "../components/shared/PageTransition";
import { PrefetchLink } from "../components/shared/PrefetchLink";
import { archiveProjects } from "../data/living-archive";
import { useSEO } from "../hooks/useSEO";

export function ArchiveProjectPage() {
  const { id } = useParams();
  const project = archiveProjects.find((entry) => entry.id === id);
  const relatedProjects = useMemo(
    () => project?.related
      .map((relatedId) => archiveProjects.find((entry) => entry.id === relatedId))
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)) ?? [],
    [project],
  );

  useSEO({
    title: project?.title ?? "Archive",
    descKey: "platform.archive.description",
    path: project ? `/archive/${project.id}` : "/archive",
    image: project?.media[0]?.src,
    imageAlt: project?.media[0]?.alt,
  });

  if (!project) return <NotFound />;

  return (
    <PageTransition className="archive-study-page">
      <header className="archive-study-hero">
        <ImageWithFallback
          src={project.media[0].src}
          alt={project.media[0].alt}
          title={project.title}
          priority
          sizes="100vw"
          tone="sage"
        />
        <div className="archive-study-hero__scrim" aria-hidden="true" />
        <div className="archive-study-hero__copy">
          <PrefetchLink to="/archive" className="archive-study-back">
            <ArrowLeft size={17} aria-hidden="true" /> LIVING ARCHIVE
          </PrefetchLink>
          <span>{project.chapter} / {project.year} / CONCEPT STUDY</span>
          <h1>{project.title}</h1>
          <strong>{project.subtitle}</strong>
          <p>{project.summary}</p>
        </div>
      </header>

      <main className="archive-study-body">
        <section className="archive-study-statement">
          <span className="platform-index">01 / INTENT</span>
          <blockquote>{project.statement}</blockquote>
          <dl>
            <div><dt>PLACE</dt><dd>{project.place}</dd></div>
            <div><dt>SEASON</dt><dd>{project.season}</dd></div>
            <div><dt>MOOD</dt><dd>{project.moods.join(" / ")}</dd></div>
          </dl>
        </section>

        <section className="archive-study-frames" aria-label={`${project.title} frames`}>
          {project.media.map((media, index) => (
            <figure key={media.src} className={`archive-study-frame archive-study-frame--${index % 2 === 0 ? "wide" : "detail"}`}>
              <ImageWithFallback
                src={media.src}
                alt={media.alt}
                title={project.title}
                sizes={index % 2 === 0 ? "(max-width: 900px) 100vw, 72vw" : "(max-width: 900px) 88vw, 38vw"}
                tone={index % 2 === 0 ? "cream" : "ink"}
              />
              <figcaption>{String(index + 1).padStart(2, "0")} / {media.note ?? media.alt}</figcaption>
            </figure>
          ))}
        </section>

        <section className="archive-study-process">
          <header>
            <span className="platform-index">02 / PROCESS</span>
            <h2>画面如何形成</h2>
          </header>
          <ol>
            {project.process.map((step, index) => (
              <li key={step.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><h3>{step.title}</h3><p>{step.note}</p></div>
              </li>
            ))}
          </ol>
          <div className="archive-study-techniques">
            <Aperture size={20} aria-hidden="true" />
            {project.techniques.map((technique) => <span key={technique}>{technique}</span>)}
          </div>
        </section>

        <section className="archive-study-palette">
          <span className="platform-index">03 / PALETTE</span>
          <div>{project.palette.map((color) => <span key={color}><i aria-hidden="true" />{color}</span>)}</div>
        </section>

        <section className="archive-study-related">
          <header><Layers3 size={21} aria-hidden="true" /><h2>继续沿着线索探索</h2></header>
          <div>
            {relatedProjects.map((entry) => (
              <PrefetchLink to={`/archive/${entry.id}`} key={entry.id}>
                <ImageWithFallback src={entry.media[0].src} alt="" title={entry.title} sizes="(max-width: 700px) 100vw, 42vw" />
                <span><small>{entry.chapter} / {entry.palette.slice(0, 2).join(" · ")}</small><strong>{entry.title}</strong></span>
                <ArrowRight size={19} aria-hidden="true" />
              </PrefetchLink>
            ))}
          </div>
        </section>
      </main>
    </PageTransition>
  );
}
