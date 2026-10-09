"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { GameCover } from "@/components/game-cover";
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
  const [strip, setStrip] = useState(selection.slice(0, 1));

  useEffect(() => {
    const saved = window.sessionStorage.getItem(storageKey);
    if (!saved) return;
    const next = JSON.parse(saved) as string[];
    queueMicrotask(() => setExcluded(next));
  }, [storageKey]);

  function save(next: string[]) {
    setExcluded(next);
    window.sessionStorage.setItem(storageKey, JSON.stringify(next));
  }

  const pool = useMemo(
    () => selection.filter((game) => !excluded.includes(game.id)),
    [selection, excluded],
  );
  const winner = selection.find((game) => game.id === winnerId) ?? null;
  const query = writeFilters(payload.minOwners, filters);

  function spin() {
    if (pool.length === 0 || spinning) return;
    const chosen = pool[Math.floor(Math.random() * pool.length)]!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setWinnerId(chosen.id);
      setStrip([chosen]);
      setOffset(0);
      return;
    }
    const sequence = Array.from({ length: 18 }, () => pool[Math.floor(Math.random() * pool.length)]!);
    sequence.push(chosen);
    setStrip(sequence);
    setOffset(0);
    setSpinning(true);
    setWinnerId(null);
    requestAnimationFrame(() => setOffset(sequence.length - 1));
    window.setTimeout(() => {
      setSpinning(false);
      setWinnerId(chosen.id);
    }, 2600);
  }

  return (
    <div className="page stack">
      <Link href={`/sala/${code}?${query}`}>{t("back")}</Link>
      <h1 className="section-title">{t("title")}</h1>
      {selection.length === 0 ? <p className="banner">{t("empty")}</p> : null}
      {selection.length > 0 && pool.length === 0 ? <p className="banner">{t("allExcluded")}</p> : null}
      {pool.length > 0 ? (
        <div className="reel-window" aria-live="polite">
          <div className="reel-track" style={{ transform: `translateY(-${offset * 140}px)` }}>
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
          <button className="button" type="button" onClick={() => save([...excluded, winner.id])}>
            {t("exclude")}
          </button>
        ) : null}
      </div>
      {winner ? (
        <p>
          {t("winner")}: <strong>{winner.name}</strong>
        </p>
      ) : null}
      <h2 className="section-title">{t("pool")}</h2>
      <div className="game-list">
        {selection.map((game) => {
          const isOut = excluded.includes(game.id);
          return (
            <article className="game-row" key={game.id}>
              <GameCover src={game.imageUrl} name={game.name} />
              <div className="stack">
                <strong>{game.name}</strong>
                <button
                  className="button"
                  type="button"
                  onClick={() => save(isOut ? excluded.filter((id) => id !== game.id) : [...excluded, game.id])}
                >
                  {isOut ? t("restore") : t("exclude")}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
