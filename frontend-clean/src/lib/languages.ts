import type { Language, ResponseLanguage } from "./types";

export const RESPONSE_LANGUAGE_OPTIONS: { value: ResponseLanguage; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "en", label: "English" },
  { value: "ja", label: "Japanese" },
  { value: "si", label: "Sinhala" },
];

export const RESPONSE_LANGUAGES = RESPONSE_LANGUAGE_OPTIONS.map((o) => o.value);

export function isResponseLanguage(value: unknown): value is ResponseLanguage {
  return typeof value === "string" && (RESPONSE_LANGUAGES as string[]).includes(value);
}

const FLAGS: Partial<Record<Language, string>> = {
  ja: "🇯🇵",
  en: "🇬🇧",
  si: "🇱🇰",
  zh: "🇨🇳",
  es: "🇪🇸",
  fr: "🇫🇷",
  de: "🇩🇪",
};

export function languageFlag(lang: Language): string {
  return FLAGS[lang] ?? "🌐";
}
