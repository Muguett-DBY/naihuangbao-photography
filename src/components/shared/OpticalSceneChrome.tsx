import { memo } from "react";
import { useTranslation } from "react-i18next";
import { SCENE_PRESETS, type ScenePresetId } from "../../experience/scene-presets";

type OpticalSceneChromeProps = {
  preset: ScenePresetId;
  chapter?: string;
};

const CHAPTERS: Readonly<Record<ScenePresetId, string>> = Object.freeze({
  home: "01",
  gallery: "02",
  "photo-detail": "02A",
  courses: "03",
  "course-detail": "03A",
  presets: "04",
  "preset-detail": "04A",
  workshops: "05",
  "workshop-detail": "05A",
  shop: "06",
  "shop-detail": "06A",
  booking: "07",
  map: "08",
  login: "09",
  compare: "10",
  editor: "11",
  boundary: "00",
});

const EXPOSURE: Readonly<Record<ScenePresetId, string>> = Object.freeze({
  home: "F2.0",
  gallery: "F2.8",
  "photo-detail": "F1.8",
  courses: "F4.0",
  "course-detail": "F2.8",
  presets: "F5.6",
  "preset-detail": "F4.0",
  workshops: "F4.0",
  "workshop-detail": "F2.8",
  shop: "F5.6",
  "shop-detail": "F3.2",
  booking: "F2.8",
  map: "F8.0",
  login: "F2.0",
  compare: "F5.6",
  editor: "F4.0",
  boundary: "F4.0",
});

export const OpticalSceneChrome = memo(function OpticalSceneChrome({
  preset,
  chapter,
}: OpticalSceneChromeProps) {
  const { t } = useTranslation();
  const scene = SCENE_PRESETS[preset];
  const sceneChapter = chapter ?? CHAPTERS[preset];

  return (
    <div
      className={`optical-scene-chrome optical-scene-chrome--${scene.accent}`}
      data-optical-scene={preset}
      aria-hidden="true"
    >
      <span className="optical-scene-corner optical-scene-corner--tl" />
      <span className="optical-scene-corner optical-scene-corner--tr" />
      <span className="optical-scene-corner optical-scene-corner--bl" />
      <span className="optical-scene-corner optical-scene-corner--br" />

      <div className="optical-scene-status">
        <span className="optical-scene-live"><i /> {t("platform.optical.softLight")}</span>
        <span>{t("platform.optical.portraitDiary")}</span>
      </div>

      <div className="optical-scene-focus">
        <span />
        <i />
      </div>

      <div className="optical-scene-meter">
        <span>-2</span><i /><i /><i className="is-center" /><i /><i /><span>+2</span>
      </div>

      <div className="optical-scene-readout">
        <span>{t("platform.optical.gentle")}</span>
        <strong>{EXPOSURE[preset]}</strong>
        <span>{t("platform.optical.natural")}</span>
        <span>{t("platform.optical.noRush")}</span>
      </div>

      <div className="optical-scene-chapter">
        <strong>{sceneChapter}</strong>
        <span>NHB / {EXPOSURE[preset]}</span>
      </div>
    </div>
  );
});
