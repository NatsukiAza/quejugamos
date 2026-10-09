"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { GameCover } from "@/components/game-cover";
import { SteamLoginButton } from "@/components/steam-login-button";
import { useHydratedGames } from "@/components/use-hydrated-games";
import { headerImageUrl } from "@/lib/format";
import { selectionOf, type GameFilters } from "@/lib/rooms/filters";
import { writeFilters } from "@/lib/rooms/query";
import { tallyVote, type VoteMap } from "@/lib/rooms/votes";
import type { GamesPayload, Viewer } from "@/lib/rooms/types";

type VoteResponse = {
  voters: { steamId: string; personaName: string }[];
  votes: VoteMap;
};

export function MatchDeck({
  code,
  games,
  filters,
  viewer,
}: {
  code: string;
  games: GamesPayload;
  filters: GameFilters;
  viewer: Viewer;
}) {
  const t = useTranslations("match");
  const { payload } = useHydratedGames(code, games);
  const selection = selectionOf(payload.games, payload.customGames, filters, headerImageUrl);
  const [votes, setVotes] = useState<VoteResponse>({ voters: [], votes: {} });
  const [index, setIndex] = useState(0);
  const voting = useRef(false);
  const query = writeFilters(payload.minOwners, filters);
  const returnTo = `/sala/${code}/match?${query}`;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const response = await fetch(`/api/rooms/${code}/votes`, { cache: "no-store" });
      if (!response.ok || cancelled) return;
      setVotes((await response.json()) as VoteResponse);
    }
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [code]);

  const voterIds = votes.voters.map((voter) => voter.steamId);
  const results = useMemo(
    () =>
      selection.map((game) => ({
        game,
        tally: tallyVote(voterIds, votes.votes, game.id),
      })),
    [selection, voterIds, votes.votes],
  );
  const current = selection[index] ?? null;

  async function vote(value: "yes" | "no") {
    if (!current || !viewer.canVote || voting.current) return;
    const appId = current.id;
    const steamId = viewer.steamId ?? "";
    voting.current = true;
    setVotes((state) => ({
      ...state,
      votes: {
        ...state.votes,
        [steamId]: {
          ...(state.votes[steamId] ?? {}),
          [appId]: value,
        },
      },
    }));
    try {
      const response = await fetch(`/api/rooms/${code}/votes`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ appId, value }),
      });
      if (!response.ok) {
        setVotes((state) => {
          const mine = { ...(state.votes[steamId] ?? {}) };
          delete mine[appId];
          return { ...state, votes: { ...state.votes, [steamId]: mine } };
        });
        return;
      }
      setIndex((valueIndex) => Math.min(selection.length, valueIndex + 1));
    } finally {
      voting.current = false;
    }
  }

  return (
    <div className="page match-layout">
      <Link href={`/sala/${code}?${query}`}>{t("back")}</Link>
      <h1 className="section-title">{t("title")}</h1>
      {selection.length === 0 ? <p className="banner">{t("empty")}</p> : null}
      {!viewer.steamId ? <SteamLoginButton returnTo={returnTo} label={t("login")} /> : null}
      {viewer.steamId && !viewer.isMember ? (
        <form action={`/api/rooms/${code}/join`} method="post">
          <button className="button button-action" type="submit">
            {t("join")}
          </button>
        </form>
      ) : null}
      {viewer.isMember && !viewer.canVote ? <p className="banner">{t("libraryOnly")}</p> : null}
      {current && viewer.canVote ? (
        <article
          className="match-card"
          onPointerUp={(event) => {
            const start = Number(event.currentTarget.dataset.x ?? event.clientX);
            const delta = event.clientX - start;
            if (delta > 80) void vote("yes");
            if (delta < -80) void vote("no");
          }}
          onPointerDown={(event) => {
            event.currentTarget.dataset.x = String(event.clientX);
          }}
        >
          <p className="muted">{t("card", { current: index + 1, total: selection.length })}</p>
          <GameCover src={current.imageUrl} name={current.name} />
          <h2 className="section-title">{current.name}</h2>
          <div className="vote-actions">
            <button className="button button-no" type="button" onPointerUp={(event) => event.stopPropagation()} onClick={() => void vote("no")}>
              {t("no")}
            </button>
            <button className="button button-action" type="button" onPointerUp={(event) => event.stopPropagation()} onClick={() => void vote("yes")}>
              {t("yes")}
            </button>
          </div>
          <p className="muted">
            {t("progress", {
              done: voterIds.length - tallyVote(voterIds, votes.votes, current.id).pending,
              total: voterIds.length,
            })}
          </p>
        </article>
      ) : null}
      {viewer.canVote && selection.length > 0 && !current ? <p>{t("done")}</p> : null}
      <ResultList title={t("unanimous")} items={results.filter((item) => item.tally.unanimous).map((item) => item.game.name)} empty={t("noneYet")} />
      <ResultList title={t("majority")} items={results.filter((item) => item.tally.majority && !item.tally.unanimous).map((item) => item.game.name)} empty={t("noneYet")} />
    </div>
  );
}

function ResultList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <section className="panel stack">
      <h2 className="section-title">{title}</h2>
      {items.length === 0 ? <p className="muted">{empty}</p> : items.map((name) => <p key={name}>{name}</p>)}
    </section>
  );
}
