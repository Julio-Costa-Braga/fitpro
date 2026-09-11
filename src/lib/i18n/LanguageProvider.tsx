"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { Lang, Dict } from "./dictionaries";

type T = (key: string, args?: Record<string, string | number>) => string;

interface LanguageCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: T;
}

const LanguageContext = createContext<LanguageCtx>({
  lang: "pt",
  setLang: () => {},
  t: (k) => k,
});

const STORAGE_KEY = "fitpro-lang";

function getInitialLang(): Lang {
  if (typeof window === "undefined") return "pt";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "es" || stored === "pt") return stored;
  const nav = navigator.language.toLowerCase();
  if (nav.startsWith("en")) return "en";
  if (nav.startsWith("es")) return "es";
  return "pt";
}

let dictionariesPromise: Promise<typeof import("./dictionaries").dictionaries> | null = null;
function loadDicts() {
  if (!dictionariesPromise) {
    dictionariesPromise = import("./dictionaries").then((m) => m.dictionaries);
  }
  return dictionariesPromise;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("pt");
  const [ready, setReady] = useState(false);
  const [dicts, setDicts] = useState<Record<Lang, Dict> | null>(null);

  useEffect(() => {
    setLangState(getInitialLang());
    loadDicts().then((d) => {
      setDicts(d);
      setReady(true);
    });
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const t: T = useCallback(
    (key, args) => {
      if (!dicts) return key;
      let val = dicts[lang][key] ?? dicts.pt[key] ?? key;
      if (args) {
        for (const [k, v] of Object.entries(args)) {
          val = val.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }
      }
      return val;
    },
    [lang, dicts]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}