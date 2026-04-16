"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { dictionaries } from "@/lib/i18n/dictionaries";

const LanguageContext = createContext<any>(null);

export const languages = dictionaries;

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLang] = useState("en");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("app_lang");
      if (saved && (dictionaries as any)[saved]) {
        setLang(saved);
        applyLangAttributes(saved);
      } else {
        applyLangAttributes("en");
      }
    }
  }, []);

  const applyLangAttributes = (l: string) => {
    if (typeof document !== "undefined") {
      const langConfig = (dictionaries as any)[l];
      document.documentElement.dir = langConfig?.dir || "ltr";
      document.documentElement.lang = l;
      
      if (l === "ur") {
        document.body.classList.add("lang-ur");
        document.body.classList.remove("lang-ro", "lang-en");
      } else if (l === "ro") {
        document.body.classList.add("lang-ro");
        document.body.classList.remove("lang-ur", "lang-en");
      } else {
        document.body.classList.add("lang-en");
        document.body.classList.remove("lang-ur", "lang-ro");
      }
    }
  };

  const changeLanguage = (newLang: string) => {
    if ((dictionaries as any)[newLang]) {
      setLang(newLang);
      applyLangAttributes(newLang);
      localStorage.setItem("app_lang", newLang);
      window.dispatchEvent(new CustomEvent("lang-change", { detail: { lang: newLang } }));
    }
  };

  const t = (dictionaries as any)[lang];

  return (
    <LanguageContext.Provider value={{ lang, changeLanguage, t, languages }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
};
