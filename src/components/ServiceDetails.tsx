import { Camera, Clock, Coins, ReceiptText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSiteContent } from "../hooks/useSiteContent";
import { Section } from "./Section";

export function ServiceDetails() {
  const { t } = useTranslation();
  const { sectionCopy, serviceAddOns, servicePolicies } = useSiteContent();
  const timingPolicy = servicePolicies[0];

  return (
    <Section
      id="details"
      eyebrow={sectionCopy.details.eyebrow}
      title={sectionCopy.details.title}
      intro={sectionCopy.details.intro}
    >
      <div className="service-detail-grid">
        <article className="service-detail-card service-detail-card-featured">
          <Camera size={24} />
          <h3>{t("serviceDetails.equipmentTitle")}</h3>
          <div className="equipment-list">
            {serviceAddOns.equipment.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </article>
        <article className="service-detail-card">
          <Coins size={24} />
          <h3>{t("serviceDetails.instantTitle")}</h3>
          <strong>{serviceAddOns.instantCamera.price}</strong>
          <span>{serviceAddOns.instantCamera.camera}</span>
        </article>
        <article className="service-detail-card">
          <Clock size={24} />
          <h3>{t("serviceDetails.timingTitle")}</h3>
          <strong>{timingPolicy?.title ?? t("serviceDetails.timingFallbackTitle")}</strong>
          <span>{timingPolicy?.detail ?? t("serviceDetails.timingFallbackDetail")}</span>
        </article>
        <article className="service-detail-card service-detail-card-wide">
          <ReceiptText size={24} />
          <h3>{t("serviceDetails.noticeTitle")}</h3>
          <div className="policy-chip-grid">
            {servicePolicies.map((item) => (
              <div key={item.title}>
                <strong>{item.title}</strong>
                <span>{item.detail}</span>
              </div>
            ))}
          </div>
        </article>
      </div>
    </Section>
  );
}
