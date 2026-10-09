import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Roulette } from "@/components/roulette";
import { orUnconfigured } from "@/lib/http";
import { parseFilters } from "@/lib/rooms/query";
import { buildGames, readRoom } from "@/lib/rooms/service";

export default function RoulettePage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<div className="page muted">…</div>}>
      <RouletteContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function RouletteContent({
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
    const parsed = parseFilters(query);
    const games = await buildGames(room, parsed.minOwners);
    return { games, filters: parsed.filters };
  });
  if (loaded === "unconfigured") {
    const home = await getTranslations("home");
    return <div className="page banner">{home("unconfigured")}</div>;
  }
  if (!loaded) return <div className="page banner">{t("notFound")}</div>;
  return <Roulette code={code} games={loaded.games} filters={loaded.filters} />;
}
