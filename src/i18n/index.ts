import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import zhCN from "./locales/zh-CN.json";
import en from "./locales/en.json";
import ko from "./locales/ko.json";
import ja from "./locales/ja.json";
import "./types";

function detectBrowserLang(): string {
  if (typeof navigator === "undefined") return "en";
  const lang = navigator.language || "";
  if (lang.startsWith("zh")) return "zh-CN";
  if (lang.startsWith("ko")) return "ko";
  if (lang.startsWith("ja")) return "ja";
  return "en";
}

const supportedLanguages = new Set(["zh-CN", "en", "ko", "ja"]);

function getInitialLang() {
  const queryLang = new URLSearchParams(window.location.search).get("lang");
  if (queryLang && supportedLanguages.has(queryLang)) {
    return queryLang;
  }
  return localStorage.getItem("lang") || detectBrowserLang();
}

const savedLang = getInitialLang();

void i18n.use(initReactI18next).init({
  resources: {
    "zh-CN": { translation: zhCN },
    en: { translation: en },
    ko: { translation: ko },
    ja: { translation: ja },
  },
  lng: savedLang,
  fallbackLng: {
    "ko": ["en", "zh-CN"],
    "ja": ["en", "zh-CN"],
    "default": ["zh-CN"],
  },
  returnObjects: true,
  interpolation: { escapeValue: false },
}).then(() => {
  document.documentElement.lang = i18n.language;
});

i18n.on("languageChanged", (lng) => {
  document.documentElement.lang = lng;
});

export default i18n;
