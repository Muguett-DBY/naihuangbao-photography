import { Aperture, CalendarCheck, Home, Images, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useBookingModal } from "../../hooks/useBookingModal";
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
      {icon}
      <span>{label}</span>
    </PrefetchLink>
  );
}

export function MobileBottomNav() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { openBookingModal: openBooking } = useBookingModal();
  const accountPath = user ? "/dashboard" : "/login";

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
      <button
        type="button"
        className={`mobile-bottom-nav__item mobile-bottom-nav__booking${pathname === "/booking" ? " is-active" : ""}`}
        onClick={() => openBooking()}
        aria-current={pathname === "/booking" ? "page" : undefined}
        aria-label={t("mobileNav.booking")}
      >
        <span className="mobile-bottom-nav__booking-icon">
          <CalendarCheck size={23} aria-hidden="true" />
        </span>
        <span>{t("mobileNav.booking")}</span>
      </button>
      <MobileNavLink
        to="/editor"
        label={t("mobileNav.editor")}
        active={pathname === "/editor"}
        icon={<Aperture size={21} aria-hidden="true" />}
      />
      <MobileNavLink
        to={user ? "/dashboard" : "/login"}
        label={t("mobileNav.account")}
        active={pathname === accountPath}
        icon={<UserRound size={21} aria-hidden="true" />}
      />
    </nav>
  );
}
