export const locales = ["es", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "es";

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "es" || value === "en";
}

export function localeFromAcceptLanguage(header: string | null): Locale {
  if (!header) return defaultLocale;
  const ranges = header.split(",").map((part) => part.split(";")[0]?.trim().toLowerCase());
  for (const range of ranges) {
    if (!range) continue;
    if (range.startsWith("en")) return "en";
    if (range.startsWith("es")) return "es";
  }
  return defaultLocale;
}

export function steamLanguage(locale: string): "spanish" | "english" {
  return locale === "en" ? "english" : "spanish";
}
