import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import "./types";
import { safeLocalStorage } from "../lib/browser-storage";

const localeLoaders = {
  "zh-CN": () => import("./locales/zh-CN.json").then((module) => module.default),
  en: () => import("./locales/en.json").then((module) => module.default),
  ko: () => import("./locales/ko.json").then((module) => module.default),
  ja: () => import("./locales/ja.json").then((module) => module.default),
} as const;

type SupportedLanguage = keyof typeof localeLoaders;

function detectBrowserLang(): SupportedLanguage {
  if (typeof navigator === "undefined") return "en";
  const lang = navigator.language || "";
  if (lang.startsWith("zh")) return "zh-CN";
  if (lang.startsWith("ko")) return "ko";
  if (lang.startsWith("ja")) return "ja";
  return "en";
}

const supportedLanguages = new Set<SupportedLanguage>(["zh-CN", "en", "ko", "ja"]);

function isSupportedLanguage(language: string): language is SupportedLanguage {
  return supportedLanguages.has(language as SupportedLanguage);
}

function getInitialLang(): SupportedLanguage {
  const queryLang = new URLSearchParams(window.location.search).get("lang");
  if (queryLang && isSupportedLanguage(queryLang)) return queryLang;
  const storedLang = safeLocalStorage.getItem("lang");
  return storedLang && isSupportedLanguage(storedLang) ? storedLang : detectBrowserLang();
}

const initialLanguage = getInitialLang();
const pendingLocales = new Map<SupportedLanguage, Promise<Record<string, unknown>>>();

function loadLocale(language: SupportedLanguage) {
  const existing = pendingLocales.get(language);
  if (existing) return existing;
  const pending = localeLoaders[language]() as Promise<Record<string, unknown>>;
  pendingLocales.set(language, pending);
  return pending;
}

async function initializeI18n() {
  let messages: Record<string, unknown> = {};
  try {
    messages = await loadLocale(initialLanguage);
  } catch {
    // Rendering untranslated keys is preferable to blocking the entire app shell.
  }

  await i18n.use(initReactI18next).init({
    resources: {
      [initialLanguage]: { translation: messages },
    },
    lng: initialLanguage,
    fallbackLng: false,
    returnObjects: true,
    interpolation: { escapeValue: false },
  });
  document.documentElement.lang = i18n.language;
}

export const i18nReady = initializeI18n();

export async function loadAndChangeLanguage(language: string) {
  if (!isSupportedLanguage(language)) return;
  await i18nReady;
  if (!i18n.hasResourceBundle(language, "translation")) {
    const messages = await loadLocale(language);
    i18n.addResourceBundle(language, "translation", messages, true, true);
  }
  await i18n.changeLanguage(language);
}

i18n.on("languageChanged", (language) => {
  document.documentElement.lang = language;
});

export default i18n;
