import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "../locales/en.json";
import mk from "../locales/mk.json";

export const resources = {
  en: { translation: en },
  mk: { translation: mk },
} as const;

export type SupportedLanguage = keyof typeof resources;

void i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  compatibilityJSON: "v4",
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export default i18n;
