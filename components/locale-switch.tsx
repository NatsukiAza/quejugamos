"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { setLocale } from "@/app/actions";
import { locales, type Locale } from "@/i18n/locales";

export function LocaleSwitch() {
  const current = useLocale();
  const router = useRouter();
  const t = useTranslations("header");

  return (
    <div className="chip-row" role="group" aria-label={t("locale")}>
      {locales.map((locale) => (
        <button
          key={locale}
          type="button"
          className={locale === current ? "chip chip-active" : "chip"}
          aria-pressed={locale === current}
          onClick={async () => {
            await setLocale(locale as Locale);
            router.refresh();
          }}
        >
          {locale.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
