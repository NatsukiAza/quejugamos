import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { MatchDeck } from "@/components/match-deck";
import { orUnconfigured } from "@/lib/http";
import { parseFilters } from "@/lib/rooms/query";
import { buildGames, readRoom, viewerOf } from "@/lib/rooms/service";
import { getSession } from "@/lib/session";

export default function MatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<div className="page muted">…</div>}>
      <MatchContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function MatchContent({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { code } = await params;
  const query = await searchParams;
  const t = await getTranslations("room");
  const loaded = await orUnconfigured(async () => {
    const room = await readRoom(code);
    if (!room) return null;
    const session = await getSession();
    const parsed = parseFilters(query);
    const games = await buildGames(room, parsed.minOwners);
    return { room, session, games, filters: parsed.filters };
  });
  if (loaded === "unconfigured") {
    const home = await getTranslations("home");
    return <div className="page banner">{home("unconfigured")}</div>;
  }
  if (!loaded) return <div className="page banner">{t("notFound")}</div>;
  return (
    <MatchDeck
      code={code}
      games={loaded.games}
      filters={loaded.filters}
      viewer={viewerOf(loaded.room, loaded.session)}
    />
  );
}
