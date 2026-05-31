import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { ReactNode } from "react";
import { I18nextProvider } from "react-i18next";

import i18n, { SupportedLanguage } from "../i18n";

export type { SupportedLanguage };

const LANGUAGE_STORAGE_KEY = "parkpal.language";

type LocalizationContextValue = {
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => Promise<void>;
  isLanguageReady: boolean;
};

const LocalizationContext =
  React.createContext<LocalizationContextValue | null>(null);

const isSupportedLanguage = (value: string | null): value is SupportedLanguage =>
  value === "en" || value === "mk";

export function LocalizationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = React.useState<SupportedLanguage>("en");
  const [isLanguageReady, setIsLanguageReady] = React.useState(false);

  React.useEffect(() => {
    let isMounted = true;

    const restoreLanguage = async () => {
      try {
        const storedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        const nextLanguage = isSupportedLanguage(storedLanguage)
          ? storedLanguage
          : "en";

        await i18n.changeLanguage(nextLanguage);

        if (isMounted) {
          setLanguageState(nextLanguage);
        }
      } finally {
        if (isMounted) {
          setIsLanguageReady(true);
        }
      }
    };

    void restoreLanguage();

    return () => {
      isMounted = false;
    };
  }, []);

  const setLanguage = React.useCallback(async (nextLanguage: SupportedLanguage) => {
    setLanguageState(nextLanguage);
    await i18n.changeLanguage(nextLanguage);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  }, []);

  const value = React.useMemo(
    () => ({ language, setLanguage, isLanguageReady }),
    [language, setLanguage, isLanguageReady]
  );

  return (
    <LocalizationContext.Provider value={value}>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </LocalizationContext.Provider>
  );
}

export function useLocalization() {
  const ctx = React.useContext(LocalizationContext);
  if (!ctx) {
    throw new Error("useLocalization must be used within LocalizationProvider");
  }

  return ctx;
}
