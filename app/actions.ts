"use server";

import { cookies } from "next/headers";
import { isLocale, type Locale } from "@/i18n/locales";
import { getSession } from "@/lib/session";
import { loadLibrary } from "@/lib/rooms/service";

export async function setLocale(locale: Locale) {
  if (!isLocale(locale)) return;
  const jar = await cookies();
  jar.set("qj_locale", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}

export async function refreshMyLibrary() {
  const session = await getSession();
  if (!session) return;
  await loadLibrary(session.steamId, { force: true });
}
