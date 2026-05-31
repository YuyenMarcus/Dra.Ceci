import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { translations } from "./translations.js";
import { setLocale } from "../lib/format.js";

const LANG_KEY = "medtrack.lang";
const DEFAULT_LANG = "es";

const LanguageContext = createContext(null);

function interpolate(str, vars) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (m, k) =>
    vars[k] != null ? String(vars[k]) : m
  );
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const stored = localStorage.getItem(LANG_KEY);
    return stored === "en" || stored === "es" ? stored : DEFAULT_LANG;
  });

  // Keep the date formatter and <html lang> in sync.
  useEffect(() => {
    setLocale(lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next) => {
    setLangState(next);
    localStorage.setItem(LANG_KEY, next);
  }, []);

  const t = useCallback(
    (key, vars) => {
      const table = translations[lang] || translations[DEFAULT_LANG];
      const str = table[key] ?? translations[DEFAULT_LANG][key] ?? key;
      return interpolate(str, vars);
    },
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
}
