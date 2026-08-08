import { FlaskConical, Home, Images, Info, WandSparkles } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";
import { PrefetchLink } from "./PrefetchLink";

type MobileNavLinkProps = {
  to: string;
  label: string;
  active: boolean;
  icon: ReactNode;
};

function MobileNavLink({ to, label, active, icon }: MobileNavLinkProps) {
  return (
    <PrefetchLink
      to={to}
      className={`mobile-bottom-nav__item${active ? " is-active" : ""}`}
      aria-current={active ? "page" : undefined}
      aria-label={label}
    >
      <span className="mobile-bottom-nav__icon">{icon}</span>
      <span>{label}</span>
    </PrefetchLink>
  );
}

export function MobileBottomNav() {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  return (
    <nav className="mobile-bottom-nav" aria-label={t("mobileNav.label")}>
      <MobileNavLink
        to="/"
        label={t("mobileNav.home")}
        active={pathname === "/"}
        icon={<Home size={21} aria-hidden="true" />}
      />
      <MobileNavLink
        to="/archive"
        label={t("nav.archive")}
        active={pathname.startsWith("/archive")}
        icon={<Images size={21} aria-hidden="true" />}
      />
      <PrefetchLink
        to="/studio"
        className={`mobile-bottom-nav__item mobile-bottom-nav__booking${pathname === "/studio" ? " is-active" : ""}`}
        aria-current={pathname === "/studio" ? "page" : undefined}
        aria-label={t("nav.studio")}
      >
        <span className="mobile-bottom-nav__icon mobile-bottom-nav__booking-icon">
          <WandSparkles size={23} aria-hidden="true" />
        </span>
        <span>{t("nav.studio")}</span>
      </PrefetchLink>
      <MobileNavLink
        to="/lab"
        label={t("nav.lab")}
        active={pathname === "/lab"}
        icon={<FlaskConical size={21} aria-hidden="true" />}
      />
      <MobileNavLink
        to="/about"
        label={t("nav.about")}
        active={pathname === "/about"}
        icon={<Info size={21} aria-hidden="true" />}
      />
    </nav>
  );
}
