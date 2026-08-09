import { Boxes, FolderOpen, Home, Images, WandSparkles } from "lucide-react";
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
        to="/create"
        className={`mobile-bottom-nav__item mobile-bottom-nav__booking${pathname.startsWith("/create") ? " is-active" : ""}`}
        aria-current={pathname.startsWith("/create") ? "page" : undefined}
        aria-label={t("nav.create")}
      >
        <span className="mobile-bottom-nav__icon mobile-bottom-nav__booking-icon">
          <WandSparkles size={23} aria-hidden="true" />
        </span>
        <span>{t("nav.create")}</span>
      </PrefetchLink>
      <MobileNavLink
        to="/projects"
        label={t("nav.projects")}
        active={pathname === "/projects"}
        icon={<FolderOpen size={21} aria-hidden="true" />}
      />
      <MobileNavLink
        to="/vault"
        label={t("nav.vault")}
        active={pathname === "/vault"}
        icon={<Boxes size={21} aria-hidden="true" />}
      />
    </nav>
  );
}
