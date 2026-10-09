"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GameRow } from "@/components/game-row";
import { SteamLoginButton } from "@/components/steam-login-button";
import { useHydratedGames } from "@/components/use-hydrated-games";
import { formatHours, headerImageUrl } from "@/lib/format";
import { filterCustomGames, filterSteamGames, shortcutMinOwners, type GameFilters } from "@/lib/rooms/filters";
import { writeFilters } from "@/lib/rooms/query";
import { GENRE_IDS, isKnownGenre } from "@/lib/steam/categories";
import type { GamesPayload, RoomPlayer, RoomRecord, Viewer } from "@/lib/rooms/types";

export function RoomBoard({
  room,
  viewer,
  games,
  filters,
  notice,
}: {
  room: RoomRecord;
  viewer: Viewer;
  games: GamesPayload;
  filters: GameFilters;
  notice: string | null;
}) {
  const t = useTranslations("room");
  const genres = useTranslations("genres");
  const locale = useLocale();
  const router = useRouter();
  const { payload, rateLimited } = useHydratedGames(room.code, games);
  const [filterState, setFilterState] = useState(filters);
  const filterKey = JSON.stringify(filters);
  const [seenFilters, setSeenFilters] = useState(filterKey);
  if (seenFilters !== filterKey) {
    setSeenFilters(filterKey);
    setFilterState(filters);
  }
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customGenres, setCustomGenres] = useState<number[]>([]);

  const steam = filterSteamGames(payload.games, filterState);
  const custom = filterCustomGames(payload.customGames, filterState);
  const presentGenres = useMemo(() => {
    const ids = new Set<number>();
    for (const game of payload.games) game.details?.genreIds.forEach((id) => ids.add(id));
    for (const game of payload.customGames) game.genreIds.forEach((id) => ids.add(id));
    return GENRE_IDS.filter((id) => ids.has(id));
  }, [payload]);

  const classified = payload.games.filter((game) => game.details).length;
  const totalToClassify = classified + payload.pendingAppIds.length;
  const query = writeFilters(payload.minOwners, filterState);
  const returnTo = `/sala/${room.code}?${query}`;

  function pushFilters(nextOwners: number, nextFilters: GameFilters) {
    router.replace(`/sala/${room.code}?${writeFilters(nextOwners, nextFilters)}`, { scroll: false });
  }

  function toggleGenre(id: number) {
    const genreIds = filterState.genreIds.includes(id)
      ? filterState.genreIds.filter((genre) => genre !== id)
      : [...filterState.genreIds, id];
    const next = { ...filterState, genreIds };
    setFilterState(next);
    pushFilters(payload.minOwners, next);
  }

  async function mutate(url: string, init: RequestInit) {
    const response = await fetch(url, init);
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setPasteError(body.error ?? "forbidden");
      return;
    }
    setPasteError(null);
    router.refresh();
  }

  return (
    <div className="page stack">
      {notice ? <p className="banner">{t.has(notice) ? t(notice) : notice}</p> : null}
      <section className="banner stack">
        <p className="stat">{t("libraries", { loaded: payload.visibleCount, total: payload.playerCount })}</p>
        {payload.missingLibraries.length > 0 ? (
          <>
            <p>{payload.missingLibraries.map((player) => player.personaName).join(", ")}</p>
            <p className="muted">{t("privateHelp")}</p>
          </>
        ) : null}
      </section>

      <section className="stack">
        <h1 className="section-title">{t("players")}</h1>
        <div className="player-list">
          {room.players.map((player) => (
            <PlayerRow
              key={player.steamId}
              player={player}
              viewer={viewer}
              onRemove={() =>
                mutate(`/api/rooms/${room.code}/players/${player.steamId}`, { method: "DELETE" })
              }
              onRefresh={() =>
                mutate(`/api/rooms/${room.code}/players/${player.steamId}/refresh`, { method: "POST" })
              }
            />
          ))}
        </div>
        {!viewer.isMember ? (
          viewer.steamId ? (
            <form action={`/api/rooms/${room.code}/join`} method="post">
              <button className="button button-action" type="submit">
                {t("join")}
              </button>
            </form>
          ) : (
            <SteamLoginButton returnTo={returnTo} label={t("login")} />
          )
        ) : null}
        {viewer.isHost ? (
          <form
            className="field"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const input = String(data.get("input") ?? "");
              void mutate(`/api/rooms/${room.code}/players`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ input }),
              });
              event.currentTarget.reset();
            }}
          >
            <label htmlFor="paste">{t("pasteLabel")}</label>
            <input id="paste" name="input" placeholder={t("pastePlaceholder")} required />
            <button className="button" type="submit">
              {t("pasteSubmit")}
            </button>
            {pasteError ? <p className="muted">{t.has(pasteError) ? t(pasteError) : pasteError}</p> : null}
          </form>
        ) : null}
      </section>

      <section className="panel stack">
        <h2 className="section-title">{t("filters")}</h2>
        <div className="shortcut-row">
          <button className="chip" type="button" onClick={() => pushFilters(shortcutMinOwners("all", payload.visibleCount), filterState)}>
            {t("all")}
          </button>
          <button className="chip" type="button" onClick={() => pushFilters(shortcutMinOwners("allButOne", payload.visibleCount), filterState)}>
            {t("allButOne")}
          </button>
          <button className="chip" type="button" onClick={() => pushFilters(shortcutMinOwners("half", payload.visibleCount), filterState)}>
            {t("half")}
          </button>
        </div>
        {payload.visibleCount > 1 ? (
          <label className="field">
            {t("minOwners")}
            <input
              className="range"
              type="range"
              min={1}
              max={payload.visibleCount}
              value={payload.minOwners}
              onChange={(event) => pushFilters(Number(event.target.value), filterState)}
            />
            <span className="stat">{payload.minOwners}</span>
          </label>
        ) : null}
        <div className="chip-row">
          <FilterChip
            active={filterState.multiplayer}
            label={t("multi")}
            onClick={() => {
              const next = { ...filterState, multiplayer: !filterState.multiplayer };
              setFilterState(next);
              pushFilters(payload.minOwners, next);
            }}
          />
          <FilterChip
            active={filterState.coop}
            label={t("coop")}
            onClick={() => {
              const next = { ...filterState, coop: !filterState.coop };
              setFilterState(next);
              pushFilters(payload.minOwners, next);
            }}
          />
          <FilterChip
            active={filterState.pvp}
            label={t("pvp")}
            onClick={() => {
              const next = { ...filterState, pvp: !filterState.pvp };
              setFilterState(next);
              pushFilters(payload.minOwners, next);
            }}
          />
          <FilterChip
            active={filterState.freeToPlay}
            label={t("f2p")}
            onClick={() => {
              const next = { ...filterState, freeToPlay: !filterState.freeToPlay };
              setFilterState(next);
              pushFilters(payload.minOwners, next);
            }}
          />
          {presentGenres.map((id) => (
            <FilterChip
              key={id}
              active={filterState.genreIds.includes(id)}
              label={genres(String(id))}
              onClick={() => toggleGenre(id)}
            />
          ))}
        </div>
        <label className="field">
          {t("minHours")}
          <input
            type="number"
            min={0}
            step={1}
            value={filterState.minHours}
            onChange={(event) => {
              const next = { ...filterState, minHours: Math.max(0, Number(event.target.value) || 0) };
              setFilterState(next);
              pushFilters(payload.minOwners, next);
            }}
          />
        </label>
        {payload.pendingAppIds.length > 0 ? (
          <p className="muted">{t("classifying", { done: classified, total: totalToClassify })}</p>
        ) : null}
        {rateLimited ? <p className="muted">{t("rateLimit")}</p> : null}
      </section>

      <div className="row-actions">
        <Link className="button" href={`/sala/${room.code}/ruleta?${query}`}>
          {t("roulette")}
        </Link>
        <Link className="button" href={`/sala/${room.code}/match?${query}`}>
          {t("match")}
        </Link>
        <button
          className="button"
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(`${window.location.origin}/sala/${room.code}?${query}`);
            setCopied(true);
          }}
        >
          {copied ? t("copied") : t("copy")}
        </button>
      </div>

      {steam.length === 0 ? <p className="muted">{t("empty")}</p> : null}
      <div className="game-list">
        {steam.map((game) => (
          <GameRow
            key={game.appId}
            name={game.name}
            imageUrl={headerImageUrl(game.appId)}
            meta={t("hours", { hours: formatHours(game.playtimeMinutes, locale) })}
            detail={game.missing.length > 0 ? t("missing", { names: game.missing.map((player) => player.personaName).join(", ") }) : undefined}
          />
        ))}
      </div>

      <section className="stack">
        <h2 className="section-title">{t("custom")}</h2>
        <div className="game-list">
          {custom.map((game) => (
            <article className="game-row" key={game.id}>
              <span className="cover cover-fallback" aria-hidden="true">
                {game.name.slice(0, 1).toUpperCase()}
              </span>
              <div className="stack">
                <strong>{game.name}</strong>
                <p className="muted">
                  {game.genreIds.length === 0
                    ? t("noGenre")
                    : game.genreIds.filter(isKnownGenre).map((id) => genres(String(id))).join(", ")}
                </p>
                {viewer.canVote ? (
                  <button
                    className="button"
                    type="button"
                    onClick={() =>
                      mutate(`/api/rooms/${room.code}/custom-games/${game.id}`, { method: "DELETE" })
                    }
                  >
                    {t("removeCustom")}
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
        {viewer.canVote ? (
          <form
            className="field"
            onSubmit={(event) => {
              event.preventDefault();
              if (!customName.trim()) return;
              void mutate(`/api/rooms/${room.code}/custom-games`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ name: customName.trim(), genreIds: customGenres }),
              });
              setCustomName("");
              setCustomGenres([]);
            }}
          >
            <label htmlFor="custom-name">{t("addCustom")}</label>
            <input
              id="custom-name"
              value={customName}
              placeholder={t("customPlaceholder")}
              onChange={(event) => setCustomName(event.target.value)}
            />
            <div className="chip-row">
              {GENRE_IDS.map((id) => (
                <FilterChip
                  key={id}
                  active={customGenres.includes(id)}
                  label={genres(String(id))}
                  onClick={() =>
                    setCustomGenres((current) =>
                      current.includes(id) ? current.filter((genre) => genre !== id) : [...current, id],
                    )
                  }
                />
              ))}
            </div>
            <button className="button" type="submit">
              {t("add")}
            </button>
          </form>
        ) : null}
      </section>
    </div>
  );
}

function FilterChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" className={active ? "chip chip-active" : "chip"} aria-pressed={active} onClick={onClick}>
      {label}
    </button>
  );
}

function PlayerRow({
  player,
  viewer,
  onRemove,
  onRefresh,
}: {
  player: RoomPlayer;
  viewer: Viewer;
  onRemove: () => void;
  onRefresh: () => void;
}) {
  const t = useTranslations("room");
  const canRemove = viewer.isHost || (viewer.steamId === player.steamId && player.canVote);
  const canRefresh = viewer.steamId === player.steamId || (viewer.isHost && !player.canVote);
  return (
    <article className="player">
      {player.avatarUrl ? (
        // Steam avatar hosts vary by account, so this stays a plain image.
        // eslint-disable-next-line @next/next/no-img-element
        <img className="avatar" src={player.avatarUrl} alt="" />
      ) : (
        <span className="avatar" />
      )}
      <div>
        <strong>{player.personaName}</strong>
        <p className="muted">
          {!player.canVote ? t("libraryOnly") : null}
          {player.libraryStatus === "ok" && player.gameCount !== null
            ? `${player.canVote ? "" : " · "}${t("games", { count: player.gameCount })}`
            : null}
          {player.libraryStatus === "private" ? t("statusPrivate") : null}
          {player.libraryStatus === "error" ? t("statusError") : null}
        </p>
      </div>
      <div className="row-actions">
        {canRefresh && player.libraryStatus !== "ok" ? (
          <button className="button" type="button" onClick={onRefresh}>
            {t("retry")}
          </button>
        ) : null}
        {canRemove ? (
          <button className="button" type="button" onClick={onRemove}>
            {viewer.steamId === player.steamId ? t("leave") : t("remove")}
          </button>
        ) : null}
      </div>
    </article>
  );
}
