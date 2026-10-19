/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { Tolgee, TolgeeProvider, FormatSimple } from "@tolgee/react";

// ─── Supported languages ─────────────────────────────────────────────────────
export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", nativeName: "English", flag: "🇬🇧" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు", flag: "🇮🇳" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்", flag: "🇮🇳" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ", flag: "🇮🇳" },
  { code: "mr", name: "Marathi", nativeName: "मराठी", flag: "🇮🇳" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી", flag: "🇮🇳" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", flag: "🇮🇳" },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ", flag: "🇮🇳" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം", flag: "🇮🇳" },
] as const;

export type LangCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

// ─── Translation type ─────────────────────────────────────────────────────────
type TranslationMap = Record<string, Record<string, string>>;

// ─── Client Cache for Dynamic Translations ────────────────────────────────────
const dynamicCache = new Map<string, string>();

// ─── Context type ─────────────────────────────────────────────────────────────
interface LanguageContextType {
  lang: LangCode;
  setLang: (code: LangCode) => void;
  t: (section: string, key: string, vars?: Record<string, string | number>) => string;
  langMeta: (typeof SUPPORTED_LANGUAGES)[number];
  translateDynamic: (text: string) => Promise<string>;
  translateBatch: (texts: string[]) => Promise<string[]>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = "farmveda_lang";

// ─── Static JSON Cache ───────────────────────────────────────────────────────
const translationCache: Partial<Record<LangCode, TranslationMap>> = {};

async function loadTranslations(code: LangCode): Promise<TranslationMap> {
  if (translationCache[code]) return translationCache[code]!;
  try {
    const mod = await import(`@/i18n/translations/${code}.json`);
    translationCache[code] = mod.default ?? mod;
    return translationCache[code]!;
  } catch {
    if (code !== "en") return loadTranslations("en");
    return {};
  }
}

// ─── Tolgee Client Initialization ─────────────────────────────────────────────
const tolgeeInstance = Tolgee()
  .use(FormatSimple())
  .init({
    language: "en",
    apiUrl: process.env.NEXT_PUBLIC_TOLGEE_API_URL || "https://app.tolgee.io",
    apiKey: process.env.NEXT_PUBLIC_TOLGEE_API_KEY,
  });

// ─── Provider ─────────────────────────────────────────────────────────────────
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>("en");
  const [translations, setTranslations] = useState<TranslationMap>({});

  // Load translations when lang changes
  useEffect(() => {
    loadTranslations(lang).then(setTranslations);
    try {
      tolgeeInstance.changeLanguage(lang);
    } catch {}
  }, [lang]);

  // Restore saved language on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY) as LangCode | null;
      if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
        setLangState(saved);
      }
    }
  }, []);

  const setLang = useCallback((code: LangCode) => {
    setLangState(code);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, code);
    }
  }, []);

  const t = useCallback(
    (section: string, key: string, vars?: Record<string, string | number>): string => {
      const raw = translations[section]?.[key] ?? key;
      if (!vars) return raw;
      return Object.entries(vars).reduce(
        (str, [k, v]) => str.replace(`{{${k}}}`, String(v)),
        raw
      );
    },
    [translations]
  );

  // Dynamic single text translator for APIs / News / Weather / Gemini
  const translateDynamic = useCallback(
    async (text: string): Promise<string> => {
      if (!text || !text.trim() || lang === "en") return text;
      const key = `${lang}:::${text.trim()}`;
      if (dynamicCache.has(key)) return dynamicCache.get(key)!;

      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, targetLang: lang }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.translatedText) {
            dynamicCache.set(key, data.translatedText);
            return data.translatedText;
          }
        }
      } catch (err) {
        console.warn("Dynamic translate error:", err);
      }
      return text;
    },
    [lang]
  );

  // Dynamic batch translator for lists of items
  const translateBatch = useCallback(
    async (texts: string[]): Promise<string[]> => {
      if (!texts || texts.length === 0 || lang === "en") return texts;

      const uncached: { index: number; text: string }[] = [];
      const results: string[] = new Array(texts.length);

      texts.forEach((text, i) => {
        const key = `${lang}:::${text.trim()}`;
        if (dynamicCache.has(key)) {
          results[i] = dynamicCache.get(key)!;
        } else {
          uncached.push({ index: i, text });
        }
      });

      if (uncached.length === 0) return results;

      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            texts: uncached.map((u) => u.text),
            targetLang: lang,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.translatedTexts)) {
            data.translatedTexts.forEach((translated: string, idx: number) => {
              const orig = uncached[idx];
              dynamicCache.set(`${lang}:::${orig.text.trim()}`, translated);
              results[orig.index] = translated;
            });
            return results;
          }
        }
      } catch (err) {
        console.warn("Batch translate error:", err);
      }

      uncached.forEach((u) => {
        results[u.index] = u.text;
      });
      return results;
    },
    [lang]
  );

  const langMeta = useMemo(
    () => SUPPORTED_LANGUAGES.find((l) => l.code === lang) ?? SUPPORTED_LANGUAGES[0],
    [lang]
  );

  return (
    <TolgeeProvider tolgee={tolgeeInstance}>
      <LanguageContext.Provider
        value={{
          lang,
          setLang,
          t,
          langMeta,
          translateDynamic,
          translateBatch,
        }}
      >
        {children}
      </LanguageContext.Provider>
    </TolgeeProvider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

// ─── Helper hook for auto-translating any dynamic text ────────────────────────
export function useDynamicText(text: string | null | undefined): string {
  const { lang, translateDynamic } = useLanguage();
  const [translated, setTranslated] = useState(text || "");

  useEffect(() => {
    let isMounted = true;
    if (!text) {
      setTranslated("");
      return;
    }
    if (lang === "en") {
      setTranslated(text);
      return;
    }

    const key = `${lang}:::${text.trim()}`;
    if (dynamicCache.has(key)) {
      setTranslated(dynamicCache.get(key)!);
      return;
    }

    translateDynamic(text).then((res) => {
      if (isMounted) setTranslated(res);
    });

    return () => {
      isMounted = false;
    };
  }, [text, lang, translateDynamic]);

  return translated;
}

// ─── Helper component for auto-translating any dynamic text in JSX ───────────
export function DynamicText({
  text,
  className,
}: {
  text: string | null | undefined;
  className?: string;
}) {
  const translated = useDynamicText(text);
  return <span className={className}>{translated}</span>;
}
