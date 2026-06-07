import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import zh from "./locales/zh.json";

export const LANGUAGE_STORAGE_KEY = "r2md-lang";

function readStoredLanguage(): string {
  if (typeof window === "undefined") {
    return "zh";
  }
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return stored === "en" ? "en" : "zh";
}

void i18n.use(initReactI18next).init({
  resources: {
    zh: { translation: zh },
    en: { translation: en },
  },
  lng: readStoredLanguage(),
  fallbackLng: "zh",
  interpolation: {
    escapeValue: false,
  },
});

export function setAppLanguage(language: "zh" | "en"): void {
  void i18n.changeLanguage(language);
  if (typeof document !== "undefined") {
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }
}

export function getAppLanguage(): "zh" | "en" {
  return i18n.language === "en" ? "en" : "zh";
}

if (typeof document !== "undefined") {
  document.documentElement.lang = getAppLanguage() === "zh" ? "zh-CN" : "en";
}

export default i18n;
