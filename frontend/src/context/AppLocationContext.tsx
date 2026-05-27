import React, { ReactNode } from "react";

type AppLocationContextValue = {
  locationLabel: string;
  setLocationLabel: (label: string) => void;
};

const AppLocationContext = React.createContext<AppLocationContextValue | null>(
  null
);

export function AppLocationProvider({ children }: { children: ReactNode }) {
  const [locationLabel, setLocationLabel] = React.useState("Skopje");

  const value = React.useMemo(
    () => ({ locationLabel, setLocationLabel }),
    [locationLabel]
  );

  return (
    <AppLocationContext.Provider value={value}>
      {children}
    </AppLocationContext.Provider>
  );
}

export function useAppLocation() {
  const ctx = React.useContext(AppLocationContext);
  if (!ctx) {
    throw new Error("useAppLocation must be used within AppLocationProvider");
  }

  return ctx;
}
