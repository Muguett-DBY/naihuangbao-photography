import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Aperture,
  ArrowLeft,
  ArrowRight,
  Building2,
  CakeSlice,
  Flower2,
  Heart,
  Leaf,
  Palette,
  Ribbon,
  RotateCcw,
  Share2,
  Snowflake,
  Sparkles,
  Sun,
  UserRound,
  UserRoundPlus,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { packages } from "../data/packages";
import { useBookingModal } from "../hooks/useBookingModal";
import { usePublicPhotos } from "../hooks/usePublicPhotos";
import { ImageWithFallback } from "./ImageWithFallback";

type Answers = {
  occasion: string;
  style: string;
  season: string;
  people: string;
};

type StepKey = "occasion" | "style" | "season" | "people";

interface QuizStep {
  key: StepKey;
  titleKey: string;
  options: { value: string; icon: LucideIcon }[];
}

const STEPS: QuizStep[] = [
  {
    key: "occasion",
    titleKey: "quiz.step1.title",
    options: [
      { value: "birthday", icon: CakeSlice },
      { value: "couple", icon: Heart },
      { value: "family", icon: UsersRound },
      { value: "personal", icon: Flower2 },
      { value: "friends", icon: UserRoundPlus },
    ],
  },
  {
    key: "style",
    titleKey: "quiz.step2.title",
    options: [
      { value: "natural", icon: Leaf },
      { value: "artistic", icon: Palette },
      { value: "vintage", icon: Aperture },
      { value: "modern", icon: Building2 },
      { value: "cute", icon: Ribbon },
    ],
  },
  {
    key: "season",
    titleKey: "quiz.step3.title",
    options: [
      { value: "spring", icon: Flower2 },
      { value: "summer", icon: Sun },
      { value: "autumn", icon: Leaf },
      { value: "winter", icon: Snowflake },
    ],
  },
  {
    key: "people",
    titleKey: "quiz.step4.title",
    options: [
      { value: "solo", icon: UserRound },
      { value: "couplePeople", icon: Heart },
      { value: "familyPeople", icon: UsersRound },
      { value: "group", icon: UserRoundPlus },
    ],
  },
];

function recommendPackage(answers: Answers, t: (key: string, fallback: string) => string) {
  const { occasion, style, season, people } = answers;

  let pkgName: string;
  let reason: string;

  if (people === "couplePeople" || occasion === "couple") {
    pkgName = "室外约拍";
    reason = t("quiz.recommendations.couple", "情侣约拍适合在自然光下的公园或街区漫步，捕捉两人最放松的状态。");
  } else if (people === "familyPeople" || occasion === "family") {
    pkgName = "室外约拍";
    reason = t("quiz.recommendations.family", "家庭合影在户外自然环境中更能展现温馨氛围，适合全家一起互动。");
  } else if (people === "group" || occasion === "friends") {
    pkgName = "室外约拍";
    reason = t("quiz.recommendations.group", "闺蜜或好友合拍在户外场景中更容易拍出自然欢快的氛围。");
  } else if (style === "artistic" || style === "modern") {
    pkgName = "室内写真";
    reason = t("quiz.recommendations.studio", "艺术创意和都市时尚风格更适合在室内棚拍，光线和场景更可控。");
  } else if (occasion === "birthday") {
    pkgName = "室内写真";
    reason = t("quiz.recommendations.birthday", "生日纪念在室内布置主题场景，氛围感更强，不受天气影响。");
  } else if (season === "winter" || season === "summer") {
    pkgName = "室内写真";
    reason = t("quiz.recommendations.weather", "冬暖夏凉的室内环境让拍摄更舒适，复古或自然风格同样出彩。");
  } else {
    pkgName = "室外约拍";
    reason = season === "spring"
      ? t("quiz.recommendations.spring", "春花烂漫的南京户外是最美的天然影棚，自然清新或复古胶片风格都很好看。")
      : t("quiz.recommendations.autumn", "秋叶金黄的南京户外是最美的天然影棚，自然清新或复古胶片风格都很好看。");
  }

  const matched = packages.find((p) => p.name === pkgName) ?? packages[1];
  return { package: matched, reason };
}

function getGalleryTags(answers: Answers): string[] {
  const tags: string[] = [];
  if (answers.style === "natural" || answers.style === "vintage") tags.push("park");
  if (answers.style === "artistic" || answers.style === "modern") tags.push("street", "indoor");
  if (answers.style === "cute") tags.push("park", "sweet");
  if (answers.occasion === "couple") tags.push("couple");
  if (answers.season === "spring" || answers.season === "autumn") tags.push("park");
  return [...new Set(tags)];
}

export function StyleQuiz({ showPreview = false }: { showPreview?: boolean }) {
  const { t } = useTranslation();
  const { openBookingModal } = useBookingModal();
  const { photos } = usePublicPhotos();
  const reduceMotion = useReducedMotion();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({ occasion: "", style: "", season: "", people: "" });
  const [result, setResult] = useState<ReturnType<typeof recommendPackage> | null>(null);

  const totalSteps = STEPS.length;
  const isComplete = currentStep >= totalSteps;
  const selectedValue = STEPS[currentStep]?.key ? answers[STEPS[currentStep].key] : "";
  const previewPhotos = useMemo(
    () => photos.filter((photo) => photo.visibility === "public").slice(0, totalSteps),
    [photos, totalSteps],
  );

  const handleSelect = (value: string) => {
    if (isComplete) return;
    const step = STEPS[currentStep];
    if (!step) return;
    const nextAnswers = { ...answers, [step.key]: value };
    setAnswers(nextAnswers);

    if (currentStep === totalSteps - 1) {
      setCurrentStep(totalSteps);
      setResult(recommendPackage(nextAnswers, t));
      return;
    }

    setCurrentStep((value) => value + 1);
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setAnswers({ occasion: "", style: "", season: "", people: "", });
    setResult(null);
  };

  const handleShare = async () => {
    const shareData = {
      title: t("quiz.result.title"),
      text: `${t("quiz.result.title")}：${result?.package.name} — ${result?.reason}`,
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
    }
  };

  const step = STEPS[Math.min(currentStep, totalSteps - 1)] ?? STEPS[0];
  const previewIndex = Math.min(currentStep, totalSteps - 1);
  const previewPhoto = previewPhotos[previewIndex] ?? previewPhotos[0];
  const previewLabel = result ? result.package.name : t(step.titleKey as never);
  const tags = result ? getGalleryTags(answers) : [];

  return (
    <div className={showPreview ? "style-quiz style-quiz--with-preview" : "style-quiz"} data-motion-group>
      {showPreview ? (
        <div className="quiz-preview" data-motion-item>
          <AnimatePresence initial={false} mode="wait">
            {previewPhoto ? (
              <motion.div
                className="quiz-preview-frame"
                key={previewPhoto.id}
                initial={reduceMotion ? false : { opacity: 0, scale: 1.015 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
              >
                <ImageWithFallback
                  src={previewPhoto.imageUrl}
                  alt={previewPhoto.alt}
                  title={previewPhoto.title}
                  tone="ink"
                  sizes="(max-width: 980px) 100vw, 46vw"
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
          <div className="quiz-preview-caption">
            <span>{String(previewIndex + 1).padStart(2, "0")} / {String(totalSteps).padStart(2, "0")}</span>
            <p>{previewLabel}</p>
          </div>
        </div>
      ) : null}

      <div className="quiz-workbench" data-motion-item>
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={result ? "result" : currentStep}
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}
            transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            {result ? (
              <div className="quiz-result">
                <div className="quiz-result-badge">
                  <Sparkles size={14} aria-hidden="true" />
                  <span>{t("quiz.result.title")}</span>
                </div>
                <div className="quiz-result-package">
                  <h3>{result.package.name}</h3>
                  <p className="quiz-result-price">{result.package.price} <span>{result.package.duration}</span></p>
                  <p className="quiz-result-reason">{result.reason}</p>
                  <ul className="quiz-result-includes">
                    {result.package.includes.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  {tags.length > 0 ? (
                    <div className="quiz-result-tags">
                      {tags.map((tag) => (
                        <span key={tag} className="quiz-result-tag">{t(`gallery.filters.${tag}` as never)}</span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="quiz-result-actions">
                  <button type="button" className="quiz-book-button" onClick={() => openBookingModal()}>
                    {t("quiz.bookNow")}
                  </button>
                  <div className="quiz-result-secondary-actions">
                    <button type="button" className="quiz-action-btn" onClick={handleShare}>
                      <Share2 size={14} aria-hidden="true" /> {t("quiz.share")}
                    </button>
                    <button type="button" className="quiz-action-btn" onClick={handleRestart}>
                      <RotateCcw size={14} aria-hidden="true" /> {t("quiz.restart")}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="quiz-progress" aria-hidden="true">
                  {STEPS.map((_, stepIndex) => (
                    <div key={stepIndex} className={`quiz-progress-dot ${stepIndex < currentStep ? "is-done" : ""} ${stepIndex === currentStep ? "is-active" : ""}`} />
                  ))}
                </div>
                <p className="quiz-progress-text">{t("quiz.progress", { current: currentStep + 1, total: totalSteps })}</p>
                <div className="quiz-step">
                  <h3 className="quiz-step-title">{t(step.titleKey as never)}</h3>
                  <div className="quiz-options">
                    {step.options.map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          className={`quiz-option ${selectedValue === option.value ? "quiz-option--selected" : ""}`}
                          onClick={() => handleSelect(option.value)}
                          aria-pressed={selectedValue === option.value}
                        >
                          <span className="quiz-option-icon"><Icon size={24} aria-hidden="true" /></span>
                          <span className="quiz-option-label">{t(`quiz.options.${option.value}` as never)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="quiz-nav">
                  {currentStep > 0 ? (
                    <button type="button" className="quiz-nav-btn quiz-nav-btn--back" onClick={handleBack}>
                      <ArrowLeft size={16} aria-hidden="true" /> {t("quiz.back")}
                    </button>
                  ) : null}
                  {selectedValue && currentStep < totalSteps - 1 ? (
                    <button type="button" className="quiz-nav-btn quiz-nav-btn--next" onClick={handleNext}>
                      {t("quiz.next")} <ArrowRight size={16} aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
