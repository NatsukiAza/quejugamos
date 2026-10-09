import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { LocaleSwitch } from "./locale-switch";
import type { Session } from "@/lib/session";

export async function SiteHeader({ session }: { session: Session | null }) {
  const t = await getTranslations("header");
  return (
    <header className="header">
      <Link className="wordmark" href="/">
        Qué Jugamos
      </Link>
      <div className="header-tools">
        <LocaleSwitch />
        {session ? (
          <>
            {session.avatarUrl ? (
              // Steam avatar hosts vary by account, so this stays a plain image.
              // eslint-disable-next-line @next/next/no-img-element
              <img className="avatar avatar-small" src={session.avatarUrl} alt="" />
            ) : null}
            <span className="header-name">{session.personaName}</span>
            <form action="/api/auth/logout" method="post">
              <button className="button" type="submit">
                {t("logout")}
              </button>
            </form>
          </>
        ) : null}
      </div>
    </header>
  );
}
