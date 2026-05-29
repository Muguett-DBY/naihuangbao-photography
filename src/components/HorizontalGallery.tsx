import { useMemo } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectCoverflow, Mousewheel } from "swiper/modules";
import { useTranslation } from "react-i18next";
import { usePublicPhotos } from "../hooks/usePublicPhotos";
import "swiper/css";
import "swiper/css/effect-coverflow";

export function HorizontalGallery() {
  const { t } = useTranslation();
  const { photos } = usePublicPhotos();

  const items = useMemo(() => {
    const base = photos.length > 0 ? photos : [];
    return [...base, ...base].slice(0, 10);
  }, [photos]);

  return (
    <section className="horiz-gallery-swiper">
      <div className="horiz-gallery-swiper-header">
        <span className="horiz-gallery-eyebrow">{t("horizontalGallery.eyebrow")}</span>
        <h2>{t("horizontalGallery.title")}</h2>
        <p className="horiz-gallery-hint">
          <span className="horiz-scroll-icon">↔</span>
          {t("horizontalGallery.hint")}
        </p>
      </div>

      <Swiper
        effect="coverflow"
        grabCursor
        centeredSlides
        loop
        slidesPerView="auto"
        coverflowEffect={{
          rotate: 30,
          stretch: 0,
          depth: 120,
          modifier: 1.5,
          slideShadows: true,
        }}
        autoplay={{ delay: 3500, disableOnInteraction: false, pauseOnMouseEnter: true }}
        mousewheel={{ forceToAxis: true }}
        modules={[Autoplay, EffectCoverflow, Mousewheel]}
        className="horiz-swiper"
      >
        {items.map((item, i) => (
          <SwiperSlide key={`${item.id}-${i}`} className="horiz-swiper-slide">
            <div className="horiz-swiper-card">
              <img
                src={item.imageUrl}
                alt={item.alt}
                className="horiz-swiper-img"
                width={400}
                height={533}
                loading={i < 3 ? "eager" : "lazy"}
              />
              <div className="horiz-swiper-overlay">
                <strong>{item.title}</strong>
                <span>{item.style} · {item.location}</span>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
