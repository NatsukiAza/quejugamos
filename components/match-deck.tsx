"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { GameCover } from "@/components/game-cover";
import { GameRow } from "@/components/game-row";
import { SteamLoginButton } from "@/components/steam-login-button";
import { useHydratedGames } from "@/components/use-hydrated-games";
import { headerImageUrl } from "@/lib/format";
import { selectionOf, type GameFilters, type SelectableGame } from "@/lib/rooms/filters";
import { writeFilters } from "@/lib/rooms/query";
import { tallyVote, type VoteMap } from "@/lib/rooms/votes";
import type { GamesPayload, Viewer } from "@/lib/rooms/types";

type VoteResponse = {
  voters: { steamId: string; personaName: string }[];
  votes: VoteMap;
};

const SWIPE_THRESHOLD = 100;
const LOCK_PX = 12;
const FLY_MS = 360;

type Drag = { id: number; x: number; y: number; locked: boolean };

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
  const { payload, pauseHydration } = useHydratedGames(code, games);
  const selection = selectionOf(payload.games, payload.customGames, filters, headerImageUrl);
  const [votes, setVotes] = useState<VoteResponse>({ voters: [], votes: {} });
  const [votesReady, setVotesReady] = useState(false);
  const [index, setIndex] = useState(0);
  const [pending, setPending] = useState(false);
  const [voteError, setVoteError] = useState(false);
  const voting = useRef(false);
  const started = useRef(false);
  const drag = useRef<Drag | null>(null);
  const cardRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const query = writeFilters(payload.minOwners, filters);
  const returnTo = `/sala/${code}/match?${query}`;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const response = await fetch(`/api/rooms/${code}/votes`, { cache: "no-store" });
      if (cancelled) return;
      if (!response.ok) {
        setVotesReady(true);
        return;
      }
      setVotes((await response.json()) as VoteResponse);
      setVotesReady(true);
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

  useEffect(() => {
    if (!votesReady || started.current || !viewer.canVote || !viewer.steamId) return;
    const mine = votes.votes[viewer.steamId] ?? {};
    const next = selection.findIndex((game) => mine[game.id] !== "yes" && mine[game.id] !== "no");
    setIndex(next === -1 ? selection.length : next);
  }, [votesReady, votes, selection, viewer.canVote, viewer.steamId]);

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
  const nearer = selection[index + 1] ?? null;
  const farther = selection[index + 2] ?? null;
  const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function paint(x: number, mode: "drag" | "fly" | "back") {
    const card = cardRef.current;
    const stage = stageRef.current;
    if (!card) return;
    card.style.animation = "none";
    card.style.transition =
      mode === "drag" ? "none" : mode === "fly" ? "transform 360ms ease-in" : "transform 200ms ease-out";
    const rotation = Math.max(-18, Math.min(18, x / 14));
    card.style.transform = `translate3d(${x}px, 0, 0) rotate(${rotation}deg)`;
    const amount = Math.min(1, Math.abs(x) / SWIPE_THRESHOLD);
    const yes = card.querySelector<HTMLElement>(".match-stamp-yes");
    const no = card.querySelector<HTMLElement>(".match-stamp-no");
    if (yes) yes.style.opacity = x > 0 ? String(amount) : "0";
    if (no) no.style.opacity = x < 0 ? String(amount) : "0";
    stage?.classList.toggle("match-stage-drag", mode === "drag");
    stage?.style.setProperty("--pull", mode === "back" ? "0" : String(amount));
  }

  async function vote(value: "yes" | "no") {
    if (!current || !viewer.canVote || voting.current) return;
    const appId = current.id;
    const steamId = viewer.steamId ?? "";
    const reduced = reducedMotion();
    started.current = true;
    voting.current = true;
    setPending(true);
    setVoteError(false);
    pauseHydration(true);
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
    if (!reduced) {
      const width = cardRef.current?.offsetWidth ?? 440;
      const travel = Math.max(window.innerWidth * 0.85, width + 240);
      paint((value === "yes" ? 1 : -1) * travel, "fly");
    }
    let saved = false;
    try {
      const [response] = await Promise.all([
        fetch(`/api/rooms/${code}/votes`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ appId, value }),
        }),
        reduced ? Promise.resolve() : wait(FLY_MS),
      ]);
      saved = response.ok;
    } catch {
      saved = false;
    }
    if (!saved) {
      setVotes((state) => {
        const mine = { ...(state.votes[steamId] ?? {}) };
        delete mine[appId];
        return { ...state, votes: { ...state.votes, [steamId]: mine } };
      });
      if (!reduced) paint(0, "back");
      setVoteError(true);
      voting.current = false;
      setPending(false);
      pauseHydration(false);
      return;
    }
    stageRef.current?.style.setProperty("--pull", "0");
    stageRef.current?.classList.remove("match-stage-drag");
    setIndex((valueIndex) => Math.min(selection.length, valueIndex + 1));
    voting.current = false;
    setPending(false);
    pauseHydration(false);
  }

  function onPointerDown(event: React.PointerEvent<HTMLElement>) {
    if (pending || reducedMotion() || event.button !== 0) return;
    if (cardRef.current) cardRef.current.style.animation = "none";
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, locked: false };
  }

  function onPointerMove(event: React.PointerEvent<HTMLElement>) {
    const active = drag.current;
    if (!active || active.id !== event.pointerId || pending) return;
    const dx = event.clientX - active.x;
    if (!active.locked) {
      if (Math.abs(dx) < LOCK_PX) return;
      active.locked = true;
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Some browsers reject capture; the card still follows pointermove.
      }
    }
    paint(dx, "drag");
  }

  function onPointerUp(event: React.PointerEvent<HTMLElement>) {
    const active = drag.current;
    if (!active || active.id !== event.pointerId) return;
    drag.current = null;
    if (!active.locked) return;
    const dx = event.clientX - active.x;
    if (dx >= SWIPE_THRESHOLD) void vote("yes");
    else if (dx <= -SWIPE_THRESHOLD) void vote("no");
    else paint(0, "back");
  }

  function onPointerCancel() {
    if (!drag.current) return;
    drag.current = null;
    paint(0, "back");
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      void vote("yes");
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      void vote("no");
    }
  }

  return (
    <div className="page match-layout">
      <Link href={`/sala/${code}?${query}`}>{t("back")}</Link>
      <div className="match-board">
        <div className="match-play">
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
          {current && viewer.canVote && votesReady ? (
            <>
              <div className="match-stage" ref={stageRef}>
                {farther ? <StackedCard game={farther} place="far" /> : null}
                {nearer ? <StackedCard game={nearer} place="near" /> : null}
                <article
                  key={current.id}
                  ref={cardRef}
                  className="match-card match-card-top"
                  aria-keyshortcuts="ArrowLeft ArrowRight"
                  onKeyDown={onKeyDown}
                  onDragStart={(event) => event.preventDefault()}
                  tabIndex={0}
                >
                  <div className="match-face">
                    <GameCover src={current.imageUrl} name={current.name} />
                    <span className="match-stamp match-stamp-yes" aria-hidden="true">
                      {t("yes")}
                    </span>
                    <span className="match-stamp match-stamp-no" aria-hidden="true">
                      {t("no")}
                    </span>
                  </div>
                  <div className="match-plate">
                    <p className="muted">{t("card", { current: index + 1, total: selection.length })}</p>
                    <h2 aria-live="polite">{current.name}</h2>
                    <p className="muted">
                      {t("progress", {
                        done: voterIds.length - tallyVote(voterIds, votes.votes, current.id).pending,
                        total: voterIds.length,
                      })}
                    </p>
                  </div>
                  <div
                    className="match-grab"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerCancel}
                  />
                </article>
              </div>
              <p className="muted match-hint">{t("hint")}</p>
              <div className="vote-actions">
                <button className="button button-no" type="button" onClick={() => void vote("no")} disabled={pending}>
                  {t("no")}
                </button>
                <button className="button button-action" type="button" onClick={() => void vote("yes")} disabled={pending}>
                  {t("yes")}
                </button>
              </div>
            </>
          ) : null}
          {voteError ? <p className="banner banner-error">{t("voteFailed")}</p> : null}
          {viewer.canVote && votesReady && selection.length > 0 && !current ? <p className="banner">{t("done")}</p> : null}
        </div>
        <div className="match-results">
          <ResultList
            title={t("unanimous")}
            items={results.filter((item) => item.tally.unanimous).map((item) => item.game)}
            empty={t("noneYet")}
          />
          <ResultList
            title={t("majority")}
            items={results.filter((item) => item.tally.majority && !item.tally.unanimous).map((item) => item.game)}
            empty={t("noneYet")}
          />
        </div>
      </div>
    </div>
  );
}

function StackedCard({ game, place }: { game: SelectableGame; place: "near" | "far" }) {
  return (
    <article className={place === "near" ? "match-card match-card-back match-card-back-1" : "match-card match-card-back match-card-back-2"} aria-hidden="true">
      <GameCover src={game.imageUrl} name={game.name} />
    </article>
  );
}

function ResultList({
  title,
  items,
  empty,
}: {
  title: string;
  items: { id: string; name: string; imageUrl: string | null }[];
  empty: string;
}) {
  return (
    <section className="panel stack">
      <h2 className="section-title">
        {title}
        {items.length > 0 ? <span className="muted"> · {items.length}</span> : null}
      </h2>
      {items.length === 0 ? (
        <p className="muted">{empty}</p>
      ) : (
        <div className="game-list">
          {items.map((game) => (
            <GameRow key={game.id} name={game.name} imageUrl={game.imageUrl} />
          ))}
        </div>
      )}
    </section>
  );
}

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
