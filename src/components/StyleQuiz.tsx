import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, RotateCcw, Share2, Sparkles } from "lucide-react";
import { Button } from "animal-island-ui";
import gsap from "gsap";
import { packages } from "../data/packages";

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
  options: { value: string; emoji: string }[];
}

const STEPS: QuizStep[] = [
  {
    key: "occasion",
    titleKey: "quiz.step1.title",
    options: [
      { value: "birthday", emoji: "🎂" },
      { value: "couple", emoji: "💑" },
      { value: "family", emoji: "👨‍👩‍👧" },
      { value: "personal", emoji: "🌸" },
      { value: "friends", emoji: "👯" },
    ],
  },
  {
    key: "style",
    titleKey: "quiz.step2.title",
    options: [
      { value: "natural", emoji: "🌿" },
      { value: "artistic", emoji: "🎨" },
      { value: "vintage", emoji: "🎞️" },
      { value: "modern", emoji: "🏙️" },
      { value: "cute", emoji: "🎀" },
    ],
  },
  {
    key: "season",
    titleKey: "quiz.step3.title",
    options: [
      { value: "spring", emoji: "🌷" },
      { value: "summer", emoji: "☀️" },
      { value: "autumn", emoji: "🍂" },
      { value: "winter", emoji: "❄️" },
    ],
  },
  {
    key: "people",
    titleKey: "quiz.step4.title",
    options: [
      { value: "solo", emoji: "🙋‍♀️" },
      { value: "couplePeople", emoji: "💑" },
      { value: "familyPeople", emoji: "👨‍👩‍👧‍👦" },
      { value: "group", emoji: "👯‍♀️" },
    ],
  },
];

function recommendPackage(answers: Answers) {
  const { occasion, style, season, people } = answers;

  let pkgName: string;
  let reason: string;

  if (people === "couplePeople" || occasion === "couple") {
    pkgName = "室外约拍";
    reason = "情侣约拍适合在自然光下的公园或街区漫步，捕捉两人最放松的状态。";
  } else if (people === "familyPeople" || occasion === "family") {
    pkgName = "室外约拍";
    reason = "家庭合影在户外自然环境中更能展现温馨氛围，适合全家一起互动。";
  } else if (people === "group" || occasion === "friends") {
    pkgName = "室外约拍";
    reason = "闺蜜或好友合拍在户外场景中更容易拍出自然欢快的氛围。";
  } else if (style === "artistic" || style === "modern") {
    pkgName = "室内写真";
    reason = "艺术创意和都市时尚风格更适合在室内棚拍，光线和场景更可控。";
  } else if (occasion === "birthday") {
    pkgName = "室内写真";
    reason = "生日纪念在室内布置主题场景，氛围感更强，不受天气影响。";
  } else if (season === "winter" || season === "summer") {
    pkgName = "室内写真";
    reason = `冬暖夏凉的室内环境让拍摄更舒适，${style === "vintage" ? "复古" : "自然"}风格同样出彩。`;
  } else {
    pkgName = "室外约拍";
    const seasonHint = season === "spring" ? "春花烂漫" : "秋叶金黄";
    reason = `${seasonHint}的南京户外是最美的天然影棚，${style === "vintage" ? "复古胶片" : "自然清新"}风格会非常好看。`;
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

export function StyleQuiz() {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({ occasion: "", style: "", season: "", people: "" });
  const [result, setResult] = useState<ReturnType<typeof recommendPackage> | null>(null);
  const stepRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalSteps = STEPS.length;
  const isComplete = currentStep >= totalSteps;
  const selectedValue = STEPS[currentStep]?.key ? answers[STEPS[currentStep].key] : "";

  const animateTransition = useCallback((direction: "next" | "back") => {
    if (!stepRef.current) return;
    const xFrom = direction === "next" ? 60 : -60;
    gsap.fromTo(
      stepRef.current,
      { opacity: 0, x: xFrom },
      { opacity: 1, x: 0, duration: 0.45, ease: "power2.out" },
    );
  }, []);

  useEffect(() => {
    if (isComplete && !result) {
      setResult(recommendPackage(answers));
    }
  }, [isComplete, answers, result]);

  useEffect(() => {
    if (containerRef.current && result) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" },
      );
    }
  }, [result]);

  const handleSelect = (value: string) => {
    if (isComplete) return;
    const step = STEPS[currentStep];
    setAnswers((prev) => ({ ...prev, [step.key]: value }));
    setTimeout(() => handleNext(), 300);
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep((s) => s + 1);
      animateTransition("next");
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
      animateTransition("back");
    }
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setAnswers({ occasion: "", style: "", season: "", people: "", });
    setResult(null);
    animateTransition("back");
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

  if (result) {
    const tags = getGalleryTags(answers);
    return (
      <div className="style-quiz" ref={containerRef}>
        <div className="quiz-result">
          <div className="quiz-result-badge">
            <Sparkles size={14} />
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
            {tags.length > 0 && (
              <div className="quiz-result-tags">
                {tags.map((tag) => (
                  <span key={tag} className="quiz-result-tag">{t(`gallery.filters.${tag}` as any)}</span>
                ))}
              </div>
            )}
          </div>
          <div className="quiz-result-actions">
            <Link to="/booking">
              <Button type="primary" size="large">{t("quiz.bookNow")}</Button>
            </Link>
            <div className="quiz-result-secondary-actions">
              <button type="button" className="quiz-action-btn" onClick={handleShare}>
                <Share2 size={14} /> {t("quiz.share")}
              </button>
              <button type="button" className="quiz-action-btn" onClick={handleRestart}>
                <RotateCcw size={14} /> {t("quiz.restart")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const step = STEPS[currentStep];

  return (
    <div className="style-quiz" ref={containerRef}>
      <div className="quiz-progress">
        {STEPS.map((_, i) => (
          <div key={i} className={`quiz-progress-dot ${i < currentStep ? "is-done" : ""} ${i === currentStep ? "is-active" : ""}`} />
        ))}
      </div>
      <p className="quiz-progress-text">{t("quiz.progress", { current: currentStep + 1, total: totalSteps })}</p>
      <div className="quiz-step" ref={stepRef}>
        <h3 className="quiz-step-title">{t(step.titleKey as any)}</h3>
        <div className="quiz-options">
          {step.options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`quiz-option ${selectedValue === opt.value ? "quiz-option--selected" : ""}`}
              onClick={() => handleSelect(opt.value)}
            >
              <span className="quiz-option-emoji">{opt.emoji}</span>
              <span className="quiz-option-label">{t(`quiz.options.${opt.value}` as any)}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="quiz-nav">
        {currentStep > 0 && (
          <button type="button" className="quiz-nav-btn quiz-nav-btn--back" onClick={handleBack}>
            <ArrowLeft size={16} /> {t("quiz.back")}
          </button>
        )}
        {selectedValue && currentStep < totalSteps - 1 && (
          <button type="button" className="quiz-nav-btn quiz-nav-btn--next" onClick={handleNext}>
            {t("quiz.next")} <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
