"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Languages } from "lucide-react";

export type Language = "en" | "ur";
const subscribeToHydration = () => () => {};
type LanguageContextValue = {
  language: Language;
  isUr: boolean;
  setLanguage: (language: Language) => void;
  t: (english: string, urdu: string) => string;
};
const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  initialLanguage,
  children,
}: {
  initialLanguage: Language;
  children: ReactNode;
}) {
  const [language, setCurrentLanguage] = useState(initialLanguage);
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ur" ? "rtl" : "ltr";
  }, [language]);
  function setLanguage(next: Language) {
    setCurrentLanguage(next);
    document.cookie = `mehria-language=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  }
  return (
    <LanguageContext
      value={{
        language,
        setLanguage,
        isUr: language === "ur",
        t: (english, urdu) => (language === "ur" ? urdu : english),
      }}
    >
      {children}
    </LanguageContext>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("LanguageProvider is required.");
  return context;
}

export function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();
  const ready = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  return (
    <button
      type="button"
      className="language-toggle"
      disabled={!ready}
      onClick={() => setLanguage(language === "en" ? "ur" : "en")}
      aria-label={t("Switch to Urdu", "انگریزی زبان منتخب کریں")}
    >
      <Languages size={16} />
      <span lang={language === "en" ? "ur" : "en"}>
        {language === "en" ? "اردو" : "English"}
      </span>
    </button>
  );
}
