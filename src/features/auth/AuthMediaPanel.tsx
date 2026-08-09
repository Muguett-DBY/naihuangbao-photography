import { useTranslation } from "react-i18next";
import { useImmersiveAnchor } from "../../experience/useImmersiveAnchor";

const LOGIN_IMMERSIVE_IMAGES = ["/images/gallery/gallery-daily-01.webp"];

export function AuthMediaPanel() {
  const { t } = useTranslation();
  const authMediaAnchor = useImmersiveAnchor({
    id: "login-media",
    preset: "login",
    imageUrls: LOGIN_IMMERSIVE_IMAGES,
  });

  return (
    <aside
      ref={authMediaAnchor}
      className="auth-page-media"
      aria-label={t("auth.visualLabel")}
      data-immersive-anchor="login"
    >
      <picture>
        <source srcSet="/images/gallery/gallery-daily-01.avif" type="image/avif" />
        <source srcSet="/images/gallery/gallery-daily-01.webp" type="image/webp" />
        <img
          src="/images/gallery/gallery-daily-01.webp"
          alt={t("auth.visualImageAlt")}
          width={1200}
          height={1600}
          fetchPriority="high"
        />
      </picture>
      <div className="auth-page-media-copy">
        <span>{t("auth.visualEyebrow")}</span>
        <h2>{t("auth.visualTitle")}</h2>
        <p>{t("auth.visualDescription")}</p>
      </div>
    </aside>
  );
}
