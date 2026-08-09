import { CalendarCheck, CircleUserRound, Home, Images, UserRound } from "lucide-react";
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
        to="/gallery"
        label={t("mobileNav.gallery")}
        active={pathname.startsWith("/gallery")}
        icon={<Images size={21} aria-hidden="true" />}
      />
      <PrefetchLink
        to="/booking"
        className={`mobile-bottom-nav__item mobile-bottom-nav__booking${pathname.startsWith("/booking") ? " is-active" : ""}`}
        aria-current={pathname.startsWith("/booking") ? "page" : undefined}
        aria-label={t("mobileNav.booking")}
      >
        <span className="mobile-bottom-nav__icon mobile-bottom-nav__booking-icon">
          <CalendarCheck size={23} aria-hidden="true" />
        </span>
        <span>{t("mobileNav.booking")}</span>
      </PrefetchLink>
      <MobileNavLink
        to="/about"
        label={t("nav.about")}
        active={pathname === "/about"}
        icon={<UserRound size={21} aria-hidden="true" />}
      />
      <MobileNavLink
        to="/dashboard"
        label={t("mobileNav.account")}
        active={pathname.startsWith("/dashboard") || pathname.startsWith("/login")}
        icon={<CircleUserRound size={21} aria-hidden="true" />}
      />
    </nav>
  );
}
