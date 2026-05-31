import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { ReactNode } from "react";

export type ThemeMode = "dark" | "light";

type ThemeTokens = {
  mode: ThemeMode;
  colors: {
    background: string;
    header: string;
    surface: string;
    surfaceElevated: string;
    text: string;
    textMuted: string;
    border: string;
    accent: string;
    accentStrong: string;
    success: string;
    warning: string;
    error: string;
    overlay: string;
    input: string;
    tabBar: string;
  };
};

type ThemeModeContextValue = {
  selectedTheme: ThemeMode;
  themeTokens: ThemeTokens;
  setTheme: (theme: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
  isThemeReady: boolean;
};

const THEME_STORAGE_KEY = "parkpal.theme";

const darkTokens: ThemeTokens = {
  mode: "dark",
  colors: {
    background: "#071426",
    header: "#071426",
    surface: "#10223f",
    surfaceElevated: "#12243f",
    text: "#f8fbff",
    textMuted: "#8ca6c8",
    border: "rgba(148,171,207,0.14)",
    accent: "#38bdf8",
    accentStrong: "#2563eb",
    success: "#08d6a3",
    warning: "#f59e0b",
    error: "#f87171",
    overlay: "rgba(2,6,23,0.72)",
    input: "rgba(8,24,45,0.92)",
    tabBar: "#08182d",
  },
};

const lightTokens: ThemeTokens = {
  mode: "light",
  colors: {
    background: "#f3f6fb",
    header: "#f8fafc",
    surface: "#ffffff",
    surfaceElevated: "#eef5ff",
    text: "#071426",
    textMuted: "#52657d",
    border: "rgba(15,35,64,0.12)",
    accent: "#0284c7",
    accentStrong: "#2563eb",
    success: "#059669",
    warning: "#d97706",
    error: "#dc2626",
    overlay: "rgba(15,23,42,0.38)",
    input: "#ffffff",
    tabBar: "#ffffff",
  },
};

const ThemeModeContext = React.createContext<ThemeModeContextValue | null>(null);

const isThemeMode = (value: string | null): value is ThemeMode =>
  value === "dark" || value === "light";

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [selectedTheme, setSelectedTheme] = React.useState<ThemeMode>("dark");
  const [isThemeReady, setIsThemeReady] = React.useState(false);

  React.useEffect(() => {
    let isMounted = true;

    const restoreTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (isMounted && isThemeMode(storedTheme)) {
          setSelectedTheme(storedTheme);
        }
      } finally {
        if (isMounted) {
          setIsThemeReady(true);
        }
      }
    };

    void restoreTheme();

    return () => {
      isMounted = false;
    };
  }, []);

  const setTheme = React.useCallback(async (nextTheme: ThemeMode) => {
    setSelectedTheme(nextTheme);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  }, []);

  const toggleTheme = React.useCallback(async () => {
    await setTheme(selectedTheme === "dark" ? "light" : "dark");
  }, [selectedTheme, setTheme]);

  const themeTokens = selectedTheme === "dark" ? darkTokens : lightTokens;

  const value = React.useMemo(
    () => ({
      selectedTheme,
      themeTokens,
      setTheme,
      toggleTheme,
      isThemeReady,
    }),
    [selectedTheme, themeTokens, setTheme, toggleTheme, isThemeReady]
  );

  return (
    <ThemeModeContext.Provider value={value}>
      {children}
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode() {
  const ctx = React.useContext(ThemeModeContext);
  if (!ctx) {
    throw new Error("useThemeMode must be used within ThemeModeProvider");
  }

  return ctx;
}
