"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { GameCover } from "@/components/game-cover";
import { GameRow } from "@/components/game-row";
import { useHydratedGames } from "@/components/use-hydrated-games";
import { headerImageUrl } from "@/lib/format";
import { selectionOf, type GameFilters } from "@/lib/rooms/filters";
import { writeFilters } from "@/lib/rooms/query";
import type { GamesPayload } from "@/lib/rooms/types";

export function Roulette({
  code,
  games,
  filters,
}: {
  code: string;
  games: GamesPayload;
  filters: GameFilters;
}) {
  const t = useTranslations("roulette");
  const { payload } = useHydratedGames(code, games);
  const selection = selectionOf(payload.games, payload.customGames, filters, headerImageUrl);
  const storageKey = `qj-exclude:${code}`;
  const [excluded, setExcluded] = useState<string[]>([]);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [strip, setStrip] = useState(selection.slice(0, 1));
  const spinTimer = useRef<number | null>(null);

  useEffect(() => {
    const saved = window.sessionStorage.getItem(storageKey);
    if (!saved) return;
    const next = JSON.parse(saved) as string[];
    queueMicrotask(() => setExcluded(next));
  }, [storageKey]);

  useEffect(() => {
    return () => {
      if (spinTimer.current !== null) window.clearTimeout(spinTimer.current);
    };
  }, []);

  function save(next: string[]) {
    setExcluded(next);
    window.sessionStorage.setItem(storageKey, JSON.stringify(next));
  }

  const pool = useMemo(
    () => selection.filter((game) => !excluded.includes(game.id)),
    [selection, excluded],
  );
  const winner = selection.find((game) => game.id === winnerId) ?? null;
  const winnerOut = winner ? excluded.includes(winner.id) : false;
  const query = writeFilters(payload.minOwners, filters);

  function spin() {
    if (pool.length === 0 || spinning) return;
    const chosen = pool[Math.floor(Math.random() * pool.length)]!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setAnimate(false);
      setWinnerId(chosen.id);
      setStrip([chosen]);
      setOffset(0);
      return;
    }
    const sequence = Array.from({ length: 18 }, () => pool[Math.floor(Math.random() * pool.length)]!);
    sequence.push(chosen);
    setStrip(sequence);
    setOffset(0);
    setAnimate(false);
    setSpinning(true);
    setWinnerId(null);
    // The reel has to paint at the top with no transition before the next move,
    // otherwise the second spin jumps because the offset is already at the end.
    requestAnimationFrame(() => {
      setAnimate(true);
      requestAnimationFrame(() => {
        setOffset(sequence.length - 1);
        spinTimer.current = window.setTimeout(() => {
          spinTimer.current = null;
          setSpinning(false);
          setWinnerId(chosen.id);
        }, 2600);
      });
    });
  }

  return (
    <div className="page stack">
      <Link href={`/sala/${code}?${query}`}>{t("back")}</Link>
      <h1 className="section-title">{t("title")}</h1>
      {selection.length === 0 ? <p className="banner">{t("empty")}</p> : null}
      {selection.length > 0 && pool.length === 0 ? <p className="banner">{t("allExcluded")}</p> : null}
      {pool.length > 0 ? (
        <div className={winner ? "reel-window reel-chosen" : "reel-window"} aria-live="polite">
          <div className={animate ? "reel-track reel-track-spin" : "reel-track"} style={{ transform: `translateY(-${offset * 140}px)` }}>
            {strip.map((game, index) => (
              <div className="reel-item" key={`${game.id}-${index}`}>
                <GameCover src={game.imageUrl} name={game.name} />
                <strong>{game.name}</strong>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <div className="row-actions">
        <button className="button button-action" type="button" onClick={spin} disabled={pool.length === 0 || spinning}>
          {spinning ? t("spinning") : winner ? t("again") : t("spin")}
        </button>
        {winner ? (
          <button
            className="button"
            type="button"
            onClick={() =>
              save(winnerOut ? excluded.filter((id) => id !== winner.id) : [...excluded, winner.id])
            }
          >
            {winnerOut ? t("restore") : t("exclude")}
          </button>
        ) : null}
      </div>
      {winner ? (
        <p>
          {t("winner")}: <strong>{winner.name}</strong>
        </p>
      ) : null}
      {winner && winnerOut ? <p className="banner">{t("excludedNotice", { name: winner.name })}</p> : null}
      <h2 className="section-title">{t("pool")}</h2>
      <div className="game-list">
        {selection.map((game) => {
          const isOut = excluded.includes(game.id);
          return (
            <GameRow className={isOut ? "game-row-out" : undefined} key={game.id} name={game.name} imageUrl={game.imageUrl}>
              <button
                className="button"
                type="button"
                onClick={() => save(isOut ? excluded.filter((id) => id !== game.id) : [...excluded, game.id])}
              >
                {isOut ? t("restore") : t("exclude")}
              </button>
            </GameRow>
          );
        })}
      </div>
    </div>
  );
}
