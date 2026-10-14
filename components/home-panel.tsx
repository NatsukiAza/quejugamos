import { getLocale, getTranslations } from "next-intl/server";
import { refreshMyLibrary } from "@/app/actions";
import { GameRow } from "@/components/game-row";
import { LandingStage } from "@/components/landing-stage";
import { SteamLoginButton } from "@/components/steam-login-button";
import { formatHours, headerImageUrl } from "@/lib/format";
import { AppError } from "@/lib/store/redis";
import { loadLibrary } from "@/lib/rooms/service";
import { getSession } from "@/lib/session";

export async function HomePanel({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const t = await getTranslations("home");
  const locale = await getLocale();
  const session = await getSession();
  const authFailed = params.auth === "failed";

  return (
    <div className="page stack">
      {authFailed ? <p className="banner banner-error">{t("authFailed")}</p> : null}
      <section className="landing">
        <div className="landing-hero">
          <div className="landing-copy">
            <h1 className="landing-title">{t("heroTitle")}</h1>
            <p className="landing-lead">{t("heroLead")}</p>
            {session ? (
              <form action="/api/rooms" method="post">
                <button className="button button-action landing-create" type="submit">
                  {t("create")}
                </button>
              </form>
            ) : (
              <SteamLoginButton returnTo="/" label={t("signIn")} prominent />
            )}
          </div>
          <LandingStage landedLabel={t("landed")} />
        </div>
        <div className="landing-steps">
          <article className="panel landing-step">
            <span className="landing-step-index">01</span>
            <h2 className="landing-step-title">{t("stepEnterTitle")}</h2>
            <p>{t("stepEnterBody")}</p>
          </article>
          <article className="panel landing-step">
            <span className="landing-step-index">02</span>
            <h2 className="landing-step-title">{t("stepShareTitle")}</h2>
            <p>{t("stepShareBody")}</p>
          </article>
          <article className="panel landing-step">
            <span className="landing-step-index">03</span>
            <h2 className="landing-step-title">{t("stepDecideTitle")}</h2>
            <p>{t("stepDecideBody")}</p>
          </article>
        </div>
      </section>
      {session ? <LoggedIn steamId={session.steamId} locale={locale} /> : null}
    </div>
  );
}

async function LoggedIn({
  steamId,
  locale,
}: {
  steamId: string;
  locale: string;
}) {
  const t = await getTranslations("home");
  let failure: string | null = null;
  let library: Awaited<ReturnType<typeof loadLibrary>> | null = null;

  try {
    library = await loadLibrary(steamId);
  } catch (error) {
    failure = error instanceof AppError ? error.code : "network";
  }

  const games =
    library?.status === "ok"
      ? [...library.games].sort((a, b) => b.playtimeForever - a.playtimeForever || a.name.localeCompare(b.name))
      : [];

  return (
    <div className="stack">
      <h2 className="section-title">{t("library")}</h2>
      {failure ? (
        <p className="banner banner-error">{t(failure === "redis_unconfigured" ? "unconfigured" : "network")}</p>
      ) : null}
      {library?.status === "private" ? (
        <div className="banner stack">
          <p>{t("private")}</p>
          <form action={refreshMyLibrary}>
            <button className="button" type="submit">
              {t("retry")}
            </button>
          </form>
        </div>
      ) : null}
      {library?.status === "error" ? (
        <div className={library.libraryError === "rate_limit" ? "banner stack" : "banner banner-error stack"}>
          <p>{t(library.libraryError === "rate_limit" ? "rateLimit" : library.libraryError === "unconfigured" ? "unconfigured" : "network")}</p>
          <form action={refreshMyLibrary}>
            <button className="button" type="submit">
              {t("retry")}
            </button>
          </form>
        </div>
      ) : null}
      {library?.status === "ok" && games.length === 0 ? <p className="muted">{t("empty")}</p> : null}
      <div className="game-list">
        {games.map((game) => (
          <GameRow
            key={game.appid}
            name={game.name}
            imageUrl={headerImageUrl(game.appid)}
            meta={t("hours", { hours: formatHours(game.playtimeForever, locale) })}
          />
        ))}
      </div>
    </div>
  );
}
