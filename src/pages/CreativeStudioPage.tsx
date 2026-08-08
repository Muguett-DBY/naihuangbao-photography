import "../styles/platform-v3.css";
import "../styles/platform-v4.css";
import { Aperture } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CompositionStudio } from "../components/studio/CompositionStudio";
import { PageTransition } from "../components/shared/PageTransition";
import { PrefetchLink } from "../components/shared/PrefetchLink";
import { useSEO } from "../hooks/useSEO";

export function CreativeStudioPage() {
  const { t } = useTranslation();
  useSEO({ titleKey: "platform.studio.title", descKey: "platform.studio.description", path: "/studio" });

  return (
    <PageTransition className="platform-page studio-page">
      <header className="studio-heading">
        <div>
          <span className="platform-index">NHB / COMPOSITION WORKSPACE</span>
          <h1>{t("platform.studio.title")}</h1>
          <p>{t("platform.studio.description")}</p>
        </div>
        <PrefetchLink to="/editor" className="studio-darkroom-link"><Aperture size={19} aria-hidden="true" />{t("platform.studio.openDarkroom")}</PrefetchLink>
      </header>
      <CompositionStudio />
    </PageTransition>
  );
}
