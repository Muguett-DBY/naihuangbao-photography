import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectCoverflow, Mousewheel } from "swiper/modules";
import { galleryItems } from "../data/gallery";
import "swiper/css";
import "swiper/css/effect-coverflow";

const items = [...galleryItems, ...galleryItems].slice(0, 10);

export function HorizontalGallery() {
  return (
    <section className="horiz-gallery-swiper">
      <div className="horiz-gallery-swiper-header">
        <span className="horiz-gallery-eyebrow">精选作品</span>
        <h2>3D 封面流</h2>
        <p className="horiz-gallery-hint">
          <span className="horiz-scroll-icon">↔</span>
          拖拽或滚轮浏览
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
