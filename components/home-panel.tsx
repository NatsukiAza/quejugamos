import { getLocale, getTranslations } from "next-intl/server";
import { refreshMyLibrary } from "@/app/actions";
import { GameRow } from "@/components/game-row";
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
      {authFailed ? <p className="banner">{t("authFailed")}</p> : null}
      {!session ? (
        <>
          <p className="lead">{t("lead")}</p>
          <SteamLoginButton returnTo="/" label={t("signIn")} />
        </>
      ) : (
        <LoggedIn steamId={session.steamId} locale={locale} />
      )}
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
      <form action="/api/rooms" method="post">
        <button className="button button-action" type="submit">
          {t("create")}
        </button>
      </form>
      <h1 className="section-title">{t("library")}</h1>
      {failure ? (
        <p className="banner">{t(failure === "redis_unconfigured" ? "unconfigured" : "network")}</p>
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
        <div className="banner stack">
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
