import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowUpRight, BookOpen, Camera, Download, MapPinned, type LucideIcon } from "lucide-react";
import { usePublicPhotos } from "../hooks/usePublicPhotos";
import { PrefetchLink } from "./shared/PrefetchLink";
import { ImageWithFallback } from "./ImageWithFallback";

type ServiceDefinition = {
  to: string;
  titleKey: string;
  descriptionKey: string;
  icon: LucideIcon;
  photoOffset: number;
};

const SERVICE_DEFINITIONS: ServiceDefinition[] = [
  { to: "/courses", titleKey: "nav.courses", descriptionKey: "courses.intro", icon: BookOpen, photoOffset: 0 },
  { to: "/products", titleKey: "nav.presets", descriptionKey: "presets.intro", icon: Download, photoOffset: 3 },
  { to: "/workshops", titleKey: "nav.workshops", descriptionKey: "workshops.intro", icon: MapPinned, photoOffset: 1 },
  { to: "/shop", titleKey: "nav.shop", descriptionKey: "merchandise.intro", icon: Camera, photoOffset: 4 },
];

export function ServiceJournal() {
  const { t } = useTranslation();
  const { photos } = usePublicPhotos();
  const [activeIndex, setActiveIndex] = useState(0);

  const publicPhotos = useMemo(
    () => photos.filter((photo) => photo.visibility === "public"),
    [photos],
  );

  const services = useMemo(() => {
    if (publicPhotos.length === 0) return [];

    return SERVICE_DEFINITIONS.map((service) => ({
      ...service,
      title: t(service.titleKey as never),
      description: t(service.descriptionKey as never),
      photo: publicPhotos[service.photoOffset % publicPhotos.length],
    }));
  }, [publicPhotos, t]);

  if (services.length === 0) return null;

  return (
    <div className="home-service-journal" data-motion-group>
      <div className="home-service-panels" data-motion-item>
        {services.map((service, index) => {
          const Icon = service.icon;
          return (
            <PrefetchLink
              className={index === activeIndex ? "home-service-panel is-active" : "home-service-panel"}
              key={service.to}
              to={service.to}
              onPointerEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
            >
              <div className="home-service-panel-media">
                <ImageWithFallback
                  src={service.photo.imageUrl}
                  alt={service.photo.alt}
                  title={service.photo.title}
                  tone="ink"
                  priority={index === 0}
                  sizes="(max-width: 740px) 100vw, (max-width: 1100px) 50vw, 36vw"
                />
              </div>
              <span className="home-service-panel-scrim" aria-hidden="true" />
              <div className="home-service-panel-content">
                <div className="home-service-panel-topline">
                  <Icon size={20} aria-hidden="true" />
                  <span>{String(index + 1).padStart(2, "0")}</span>
                </div>
                <div className="home-service-panel-copy">
                  <p className="home-service-panel-location">{service.photo.location}</p>
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                  <span className="home-service-panel-link">
                    {t("common.learnMore")}
                    <ArrowUpRight size={17} aria-hidden="true" />
                  </span>
                </div>
              </div>
            </PrefetchLink>
          );
        })}
      </div>
    </div>
  );
}
