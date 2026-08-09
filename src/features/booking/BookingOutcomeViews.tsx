import type { RefObject } from "react";
import { ExternalLink, LayoutDashboard } from "lucide-react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { PaymentForm } from "../../components/PaymentForm";
import { Modal } from "../../components/ui/Modal";
import { BookingStepRail } from "./BookingStepRail";

type SharedOutcomeProps = {
  onClose: () => void;
  titleId: string;
  contentRef: RefObject<HTMLDivElement | null>;
};

type SuccessBridgeProps = {
  detail: string;
  showDashboard: boolean;
  profileUrl: string;
  onClose: () => void;
};

function SuccessBridge({ detail, showDashboard, profileUrl, onClose }: SuccessBridgeProps) {
  const { t } = useTranslation();
  return (
    <section className="booking-success-bridge" aria-label={t("bookingModal.successBridgeTitle", "Keep your session moving")}>
      <div className="booking-success-bridge-copy"><span>{t("bookingModal.successBridgeEyebrow", "Next steps")}</span><h3>{t("bookingModal.successBridgeTitle", "Keep your session moving")}</h3><p>{detail}</p></div>
      <div className="booking-success-bridge-actions">
        {showDashboard && <Link to="/dashboard" className="booking-success-bridge-action booking-success-bridge-action--primary booking-success-dashboard-btn" onClick={onClose}><LayoutDashboard size={16} aria-hidden="true" />{t("bookingModal.viewDashboard")}</Link>}
        <a href={profileUrl} target="_blank" rel="noreferrer" className="booking-success-bridge-action booking-success-bridge-action--secondary"><ExternalLink size={16} aria-hidden="true" />{t("bookingModal.messageOnXiaohongshu", "Message on Xiaohongshu")}</a>
        <button type="button" className="booking-success-bridge-action booking-success-bridge-action--ghost" onClick={onClose}>{t("bookingModal.continueBrowsing", "Continue browsing")}</button>
      </div>
    </section>
  );
}

export function WaitlistOutcomeView(props: SharedOutcomeProps & {
  alreadyJoined: boolean;
  waitlistId: string | null;
  date: string;
  packageName: string;
  accountLinked: boolean;
  profileUrl: string;
}) {
  const { t } = useTranslation();
  const title = props.alreadyJoined ? t("bookingModal.waitlistAlreadyJoinedTitle") : t("bookingModal.waitlistSuccessTitle");
  const description = props.alreadyJoined ? t("bookingModal.waitlistAlreadyJoinedDescription") : t("bookingModal.waitlistSuccessDescription");
  return (
    <Modal open onClose={props.onClose} footer={null} aria-labelledby={props.titleId}>
      <span id={props.titleId} className="sr-only">{title}</span>
      <div ref={props.contentRef} className="booking-modal-content">
        <BookingStepRail currentStage={5} />
        <section className="booking-numbered-group booking-numbered-group--success" aria-labelledby="booking-waitlist-confirmation-title">
          <header className="booking-numbered-group-heading"><span className="booking-group-index">05</span><h2 id="booking-waitlist-confirmation-title">{title}</h2></header>
          <div className={`booking-modal-success booking-waitlist-success${props.alreadyJoined ? " booking-waitlist-success--existing" : ""}`}>
            <SuccessCheck />
            <p className="booking-success-next">{description}</p>
            <div className="booking-success-details">
              {props.waitlistId && <Detail label={t("bookingModal.reference")} value={`#${props.waitlistId.slice(0, 8).toUpperCase()}`} />}
              <Detail label={t("bookingModal.date")} value={props.date} />
              {props.packageName && <Detail label={t("bookingModal.selectPackage")} value={props.packageName} />}
            </div>
            <SuccessBridge detail={props.accountLinked ? t("bookingModal.successBridgeWaitlistDetail", "This waitlist request is linked to your signed-in account. View its status in your dashboard.") : t("bookingModal.successBridgeContactDetail", "Updates will go to the contact details you provided. Message me if anything changes.")} showDashboard={props.accountLinked} profileUrl={props.profileUrl} onClose={props.onClose} />
          </div>
        </section>
      </div>
    </Modal>
  );
}

export function BookingPaymentView(props: SharedOutcomeProps & {
  amountCents: number;
  bookingId: string;
  packageName: string;
  name: string;
  onSuccess: () => void;
  onPending: () => void;
  onError: (error: string) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal open onClose={props.onClose} footer={null} aria-labelledby={props.titleId}>
      <span id={props.titleId} className="sr-only">{t("bookingModal.paymentTitle", "Payment")}</span>
      <div ref={props.contentRef} className="booking-modal-content">
        <BookingStepRail currentStage={4} />
        <section className="booking-numbered-group booking-numbered-group--payment" aria-labelledby="booking-payment-title">
          <header className="booking-numbered-group-heading"><span className="booking-group-index">04</span><h2 id="booking-payment-title">{t("payment.title")}</h2></header>
          <PaymentForm purpose="booking_deposit" amountCents={props.amountCents} currency="cny" referenceId={props.bookingId} metadata={{ packageName: props.packageName, name: props.name }} onSuccess={props.onSuccess} onPending={props.onPending} onError={props.onError} onCancel={props.onCancel} />
        </section>
      </div>
    </Modal>
  );
}

export function BookingSuccessView(props: SharedOutcomeProps & {
  bookingId: string | null;
  packageName?: string;
  date: string;
  timeLabel: string;
  accountLinked: boolean;
  depositOutcome: "pending" | "deferred" | "offline" | null;
  savedOffline: boolean;
  profileUrl: string;
}) {
  const { t } = useTranslation();
  const claritySteps = [
    ["saved", t("bookingModal.paymentClarity.saved", "Booking saved"), t("bookingModal.paymentClarity.savedDetail", "Your request has a reference number and can be checked later.")],
    ["notCharged", t("bookingModal.paymentClarity.notCharged", "No deposit charged"), t("bookingModal.paymentClarity.notChargedDetail", "Placeholder payment mode only records the deposit status.")],
    ["followUp", t("bookingModal.paymentClarity.followUp", "Follow-up next"), t("bookingModal.paymentClarity.followUpDetail", "We will confirm schedule and payment options before collection.")],
  ];
  return (
    <Modal open onClose={props.onClose} footer={null} aria-labelledby={props.titleId}>
      <span id={props.titleId} className="sr-only">{t("bookingModal.successTitle")}</span>
      <div ref={props.contentRef} className="booking-modal-content">
        <BookingStepRail currentStage={5} />
        <section className="booking-numbered-group booking-numbered-group--success" aria-labelledby="booking-confirmation-title">
          <header className="booking-numbered-group-heading"><span className="booking-group-index">05</span><h2 id="booking-confirmation-title">{t("bookingModal.successTitle")}</h2></header>
          <div className="booking-modal-success">
            <SuccessCheck />
            <div className="booking-success-details">
              <Detail label={t("bookingModal.reference")} value={`#${props.bookingId?.slice(0, 8).toUpperCase()}`} />
              {props.packageName && <Detail label={t("bookingModal.selectPackage")} value={props.packageName} />}
              {props.date && <Detail label={t("bookingModal.date")} value={props.date} />}
              <Detail label={t("bookingModal.time")} value={props.timeLabel} />
            </div>
            <p className="booking-success-next">{props.accountLinked ? t("bookingModal.nextStepLinked", "I'll review your booking and confirm via your contact info within 24 hours. This request is linked to your account.") : t("bookingModal.nextStepContact", "I'll review your booking and confirm via your contact info within 24 hours.")}</p>
            {props.depositOutcome && <div className={`booking-deposit-outcome booking-deposit-outcome--${props.depositOutcome}`} role="status"><strong>{t(`bookingModal.depositOutcome.${props.depositOutcome}.title`)}</strong><span>{t(`bookingModal.depositOutcome.${props.depositOutcome}.description`)}</span></div>}
            <section className="booking-payment-clarity" aria-label={t("bookingModal.paymentClarityLabel", "Payment status next steps")}>
              <p className="booking-payment-clarity-title">{t("bookingModal.paymentClarityTitle", "What happens with the deposit")}</p>
              <ol className="booking-payment-clarity-steps">{claritySteps.map(([key, label, detail], index) => <li key={key} className="booking-payment-clarity-step"><span className="booking-payment-clarity-index" aria-hidden="true">{index + 1}</span><span><strong>{label}</strong><small>{detail}</small></span></li>)}</ol>
            </section>
            {props.savedOffline && <p className="booking-success-offline-note">{t("bookingModal.offlineSyncNotice")}</p>}
            <SuccessBridge detail={props.accountLinked ? t("bookingModal.successBridgeDashboardDetail", "This booking request is linked to your signed-in account. View booking, date, and deposit updates in your dashboard.") : t("bookingModal.successBridgeContactDetail", "Updates will go to the contact details you provided. Message me if anything changes.")} showDashboard={props.accountLinked} profileUrl={props.profileUrl} onClose={props.onClose} />
          </div>
        </section>
      </div>
    </Modal>
  );
}

function SuccessCheck() {
  return <div className="booking-success-check"><svg viewBox="0 0 24 24" className="booking-success-check-svg" aria-hidden="true"><path d="M20 6L9 17l-5-5" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg></div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="booking-success-detail-item"><span className="booking-success-detail-label">{label}</span><span className="booking-success-detail-value">{value}</span></div>;
}
