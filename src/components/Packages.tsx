import { Check, MessageCircle } from "lucide-react";
import { Button, Card } from "animal-island-ui";
import { useTranslation } from "react-i18next";
import { useSiteContent } from "../hooks/useSiteContent";
import { useBookingModal } from "../features/booking/BookingContext";
import { Section } from "./Section";

const PACKAGE_SLUGS = ["indoor", "outdoor", "instant"] as const;

export function Packages() {
  const { t } = useTranslation();
  const { packages, sectionCopy } = useSiteContent();
  const { openBookingModal } = useBookingModal();

  return (
    <Section
      id="packages"
      eyebrow={sectionCopy.packages.eyebrow}
      title={sectionCopy.packages.title}
      intro={sectionCopy.packages.intro}
    >
      <div className="package-grid">
        {packages.map((item, index) => (
          <Card className={`package-card${index === 1 ? " is-popular" : ""}`} key={item.name}>
            <span className="package-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            {index === 1 && <span className="package-badge">{t("packages.recommend")}</span>}
            <div>
              <p>{item.duration}</p>
              <h3>{item.name}</h3>
              <strong aria-label={t("packages.priceLabel", { price: item.price })}>
                <span className="price-count">¥{item.price}</span>
              </strong>
              <span>{item.summary}</span>
            </div>
            <ul>
              {item.includes.map((line) => (
                <li key={line}>
                  <Check size={15} />
                  {line}
                </li>
              ))}
            </ul>
            {index < PACKAGE_SLUGS.length ? (
              <div className="package-fit">
                <p>{t(`packages.fitScene.${PACKAGE_SLUGS[index]}`)}</p>
                <p>{t(`packages.fitPeople.${PACKAGE_SLUGS[index]}`)}</p>
              </div>
            ) : null}
            <Button type="primary" className="package-cta" onClick={() => openBookingModal(item.name)}>
              <MessageCircle size={15} />
              {t("packages.bookThis")}
            </Button>
          </Card>
        ))}
      </div>
    </Section>
  );
}
