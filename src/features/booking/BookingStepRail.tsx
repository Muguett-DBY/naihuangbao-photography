import { useTranslation } from "react-i18next";

type BookingStepRailProps = {
  currentStage: 1 | 2 | 3 | 4 | 5;
};

export function BookingStepRail({ currentStage }: BookingStepRailProps) {
  const { t } = useTranslation();
  const stages = [
    t("bookingModal.selectPackage"),
    `${t("bookingModal.date")} / ${t("bookingModal.time")}`,
    t("bookingModal.contact"),
    t("payment.title"),
    t("bookingModal.successTitle"),
  ];

  return (
    <ol className="booking-step-rail" aria-label={t("bookingModal.stepNavigation")}>
      {stages.map((label, index) => {
        const stage = (index + 1) as BookingStepRailProps["currentStage"];
        return (
          <li
            key={label}
            className={`${stage < currentStage ? "is-complete" : ""}${stage === currentStage ? " is-current" : ""}`.trim()}
            aria-current={stage === currentStage ? "step" : undefined}
          >
            <span aria-hidden="true">{String(stage).padStart(2, "0")}</span>
            <strong>{label}</strong>
          </li>
        );
      })}
    </ol>
  );
}
