import "../styles/platform-v3.css";
import { Aperture, BookOpen, CalendarDays, Columns2, GraduationCap, Images, Map, PackageOpen, SlidersHorizontal, Store, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageTransition } from "../components/shared/PageTransition";
import { PrefetchLink } from "../components/shared/PrefetchLink";
import { practiceNavigation } from "../data/product-navigation";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { useSEO } from "../hooks/useSEO";

const icons = {
  gallery: Images,
  editor: Aperture,
  compare: Columns2,
  courses: GraduationCap,
  presets: SlidersHorizontal,
  workshops: CalendarDays,
  shop: Store,
  booking: BookOpen,
  map: Map,
  account: UserRound,
} as const;

export function LabPage() {
  const { t } = useTranslation();
  const isOnline = useOnlineStatus();
  useSEO({ titleKey: "platform.lab.title", descKey: "platform.lab.description", path: "/lab" });

  return (
    <PageTransition className="platform-page lab-page">
      <header className="platform-editorial-header platform-editorial-header--lab">
        <span className="platform-index">NHB / PRACTICE SYSTEMS</span>
        <h1>{t("platform.lab.title")}</h1>
        <p>{t("platform.lab.description")}</p>
        <div className="lab-status" aria-label={t("platform.lab.statusLabel")}>
          <span className={isOnline ? "is-online" : "is-offline"} />
          {isOnline ? t("platform.lab.online") : t("platform.lab.offline")}
          <small>LOCAL-FIRST / PWA READY</small>
        </div>
      </header>

      <section className="lab-tools" aria-labelledby="lab-tools-title">
        <div className="platform-section-head">
          <div><span className="platform-index">01 / MODULES</span><h2 id="lab-tools-title">{t("platform.lab.modules")}</h2></div>
          <PackageOpen size={30} aria-hidden="true" />
        </div>
        <div className="lab-tool-grid">
          {practiceNavigation.map((route, index) => {
            const Icon = icons[route.id as keyof typeof icons];
            return (
              <PrefetchLink to={route.to} className="lab-tool" key={route.id}>
                <span className="lab-tool__index">{String(index + 1).padStart(2, "0")}</span>
                {Icon ? <Icon size={24} strokeWidth={1.6} aria-hidden="true" /> : null}
                <strong>{t(route.labelKey as never)}</strong>
                <p>{t(route.descriptionKey as never)}</p>
                <span className="lab-tool__open" aria-hidden="true">↗</span>
              </PrefetchLink>
            );
          })}
        </div>
      </section>
    </PageTransition>
  );
}
