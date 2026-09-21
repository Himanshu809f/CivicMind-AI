import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type Lang = "en" | "hi";

const DICT: Record<Lang, Record<string, string>> = {
  en: {
    "nav.home": "Home",
    "nav.how": "How It Works",
    "nav.features": "Features",
    "nav.about": "About",
    "nav.contact": "Contact",
    "nav.login": "Login",
    "nav.register": "Register",
    "hero.title": "Turn Civic Complaints Into Real Action",
    "hero.sub":
      "AI-powered public issue intelligence for faster reporting, smarter routing, transparent tracking and better civic services.",
    "hero.cta1": "Report an Issue",
    "hero.cta2": "Explore Platform",
    "dash.title": "Dashboard",
    "dash.new": "Report New Issue",
    "common.total": "Total complaints",
    "common.open": "Open",
    "common.progress": "In progress",
    "common.resolved": "Resolved",
    "common.closed": "Closed",
  },
  hi: {
    "nav.home": "होम",
    "nav.how": "यह कैसे काम करता है",
    "nav.features": "विशेषताएँ",
    "nav.about": "हमारे बारे में",
    "nav.contact": "संपर्क",
    "nav.login": "लॉगिन",
    "nav.register": "रजिस्टर",
    "hero.title": "नागरिक शिकायतों को वास्तविक कार्रवाई में बदलें",
    "hero.sub":
      "तेज़ रिपोर्टिंग, स्मार्ट रूटिंग, पारदर्शी ट्रैकिंग और बेहतर नागरिक सेवाओं के लिए एआई-आधारित प्रणाली।",
    "hero.cta1": "शिकायत दर्ज करें",
    "hero.cta2": "प्लेटफ़ॉर्म देखें",
    "dash.title": "डैशबोर्ड",
    "dash.new": "नई शिकायत दर्ज करें",
    "common.total": "कुल शिकायतें",
    "common.open": "खुली",
    "common.progress": "प्रगति में",
    "common.resolved": "हल हुई",
    "common.closed": "बंद",
  },
};

type I18nValue = { lang: Lang; setLang: (l: Lang) => void; t: (key: string) => string };

const I18nContext = createContext<I18nValue>({ lang: "en", setLang: () => {}, t: (k) => k });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem("civicmind.lang");
    if (stored === "hi" || stored === "en") setLangState(stored);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    window.localStorage.setItem("civicmind.lang", l);
  }, []);

  const t = useCallback((key: string) => DICT[lang][key] ?? DICT.en[key] ?? key, [lang]);

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
