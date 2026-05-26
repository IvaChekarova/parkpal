import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, ReactNode, useContext } from "react";

export type SupportedCurrency = "EUR" | "MKD" | "USD";

type ExchangeRates = Record<SupportedCurrency, number>;

type CurrencyContextType = {
  selectedCurrency: SupportedCurrency;
  exchangeRates: ExchangeRates;
  isLoadingRates: boolean;
  setSelectedCurrency: (currency: SupportedCurrency) => Promise<void>;
  convertPrice: (amountInEur: number) => number;
  formatPrice: (amountInEur: number) => string;
};

const STORAGE_KEY = "parkpal:selectedCurrency";
const RATES_STORAGE_KEY = "parkpal:exchangeRates";

const FALLBACK_RATES: ExchangeRates = {
  EUR: 1,
  MKD: 61.5,
  USD: 1.08,
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(
  undefined
);

const isSupportedCurrency = (value: string): value is SupportedCurrency => {
  return value === "EUR" || value === "MKD" || value === "USD";
};

const parseCachedRates = (value: string | null): ExchangeRates | null => {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<ExchangeRates>;

    if (
      typeof parsed.EUR === "number" &&
      typeof parsed.MKD === "number" &&
      typeof parsed.USD === "number"
    ) {
      return {
        EUR: parsed.EUR,
        MKD: parsed.MKD,
        USD: parsed.USD,
      };
    }
  } catch (_err) {
    return null;
  }

  return null;
};

const formatConvertedPrice = (
  value: number,
  currency: SupportedCurrency
) => {
  if (currency === "MKD") {
    return `${Math.round(value).toLocaleString(undefined, {
      maximumFractionDigits: 0,
    })} MKD`;
  }

  if (currency === "USD") {
    return `$${value.toFixed(2)}`;
  }

  return `€${value.toFixed(2)}`;
};

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [selectedCurrency, setSelectedCurrencyState] =
    React.useState<SupportedCurrency>("EUR");
  const [exchangeRates, setExchangeRates] =
    React.useState<ExchangeRates>(FALLBACK_RATES);
  const [isLoadingRates, setIsLoadingRates] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;

    const restoreCurrencySettings = async () => {
      setIsLoadingRates(true);

      try {
        const [storedCurrency, cachedRates] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(RATES_STORAGE_KEY),
        ]);
        const parsedCachedRates = parseCachedRates(cachedRates);

        if (isMounted && storedCurrency && isSupportedCurrency(storedCurrency)) {
          setSelectedCurrencyState(storedCurrency);
        }

        if (isMounted && parsedCachedRates) {
          setExchangeRates(parsedCachedRates);
        }

        const response = await fetch(
          "https://api.exchangerate.host/latest?base=EUR&symbols=MKD,USD"
        );
        const data = await response.json();
        const nextRates: ExchangeRates = {
          EUR: 1,
          MKD:
            typeof data?.rates?.MKD === "number"
              ? data.rates.MKD
              : parsedCachedRates?.MKD ?? FALLBACK_RATES.MKD,
          USD:
            typeof data?.rates?.USD === "number"
              ? data.rates.USD
              : parsedCachedRates?.USD ?? FALLBACK_RATES.USD,
        };

        if (isMounted) {
          setExchangeRates(nextRates);
        }

        await AsyncStorage.setItem(RATES_STORAGE_KEY, JSON.stringify(nextRates));
      } catch (_err) {
        if (isMounted) {
          setExchangeRates((current) => current ?? FALLBACK_RATES);
        }
      } finally {
        if (isMounted) {
          setIsLoadingRates(false);
        }
      }
    };

    restoreCurrencySettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const setSelectedCurrency = React.useCallback(
    async (currency: SupportedCurrency) => {
      setSelectedCurrencyState(currency);
      await AsyncStorage.setItem(STORAGE_KEY, currency);
    },
    []
  );

  const convertPrice = React.useCallback(
    (amountInEur: number) => {
      const rate = exchangeRates[selectedCurrency] ?? 1;
      return amountInEur * rate;
    },
    [exchangeRates, selectedCurrency]
  );

  const formatPrice = React.useCallback(
    (amountInEur: number) => {
      return formatConvertedPrice(convertPrice(amountInEur), selectedCurrency);
    },
    [convertPrice, selectedCurrency]
  );

  return (
    <CurrencyContext.Provider
      value={{
        selectedCurrency,
        exchangeRates,
        isLoadingRates,
        setSelectedCurrency,
        convertPrice,
        formatPrice,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);

  if (!context) {
    throw new Error("useCurrency must be used within CurrencyProvider");
  }

  return context;
}
