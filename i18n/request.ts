import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import {
  defaultLocale,
  isLocale,
  localeFromAcceptLanguage,
  type Locale,
} from "./locales";
import en from "../messages/en.json";
import es from "../messages/es.json";

const catalogs: Record<Locale, typeof es> = { es, en };

export default getRequestConfig(async () => {
  const jar = await cookies();
  const headerList = await headers();
  const cookieLocale = jar.get("qj_locale")?.value;
  const locale = isLocale(cookieLocale)
    ? cookieLocale
    : localeFromAcceptLanguage(headerList.get("accept-language"));

  return {
    locale: locale || defaultLocale,
    messages: catalogs[isLocale(locale) ? locale : defaultLocale],
  };
});
