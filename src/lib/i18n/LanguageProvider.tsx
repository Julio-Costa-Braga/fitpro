"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { Lang, Dict } from "./dictionaries";
import { EXERCISE_NAMES } from "./exerciseNames";

type T = (key: string, args?: Record<string, string | number>) => string;

interface LanguageCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: T;
  tExerciseName: (name: string) => string;
}

const LanguageContext = createContext<LanguageCtx>({
  lang: "pt-br",
  setLang: () => {},
  t: (k) => k,
  tExerciseName: (name) => name,
});

const STORAGE_KEY = "fitpro-lang";

function getInitialLang(): Lang {
  if (typeof window === "undefined") return "pt-br";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "es" || stored === "pt-br" || stored === "pt-pt") return stored;
  if (stored === "pt") return "pt-br";
  const nav = navigator.language.toLowerCase();
  if (nav.startsWith("en")) return "en";
  if (nav.startsWith("es")) return "es";
  if (nav.startsWith("pt")) {
    if (nav.includes("pt-pt")) return "pt-pt";
    return "pt-br";
  }
  return "pt-br";
}

let dictionariesPromise: Promise<typeof import("./dictionaries").dictionaries> | null = null;
function loadDicts() {
  if (!dictionariesPromise) {
    dictionariesPromise = import("./dictionaries").then((m) => m.dictionaries);
  }
  return dictionariesPromise;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("pt-br");
  const [dicts, setDicts] = useState<Record<Lang, Dict> | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setLangState(getInitialLang()), 0);
    loadDicts().then((d) => setDicts(d));
    return () => clearTimeout(id);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const t: T = useCallback(
    (key, args) => {
      if (!dicts) return key;
      let val = dicts[lang][key] ?? dicts["pt-br"][key] ?? key;
      if (args) {
        for (const [k, v] of Object.entries(args)) {
          val = val.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }
      }
      return val;
    },
    [lang, dicts]
  );

  const tExerciseName = useCallback(
    (name: string) => {
      if (lang === "pt-br" || lang === "pt-pt") return name;
      return EXERCISE_NAMES[name]?.[lang] ?? name;
    },
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, tExerciseName }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}