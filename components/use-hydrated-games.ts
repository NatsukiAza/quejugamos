"use client";

import { useEffect, useState } from "react";
import { isListedApp } from "@/lib/steam/categories";
import type { SteamListGame } from "@/lib/rooms/filters";
import type { GamesPayload } from "@/lib/rooms/types";

type MetadataApp = {
  appId: number;
  success: boolean;
  type: string | null;
  isFree: boolean;
  categoryIds: number[];
  genreIds: number[];
};

function applyMetadata(payload: GamesPayload, apps: MetadataApp[]): GamesPayload {
  const byId = new Map(apps.map((app) => [app.appId, app]));
  const games: SteamListGame[] = [];
  for (const game of payload.games) {
    const meta = byId.get(game.appId);
    if (!meta) {
      games.push(game);
      continue;
    }
    if (!isListedApp(meta.success, meta.type)) continue;
    games.push({
      ...game,
      details: {
        categoryIds: meta.categoryIds,
        genreIds: meta.genreIds,
        isFree: meta.isFree,
        type: meta.type,
      },
    });
  }
  return {
    ...payload,
    games,
    pendingAppIds: payload.pendingAppIds.filter((id) => !byId.has(id)),
  };
}

export function useHydratedGames(code: string, initial: GamesPayload) {
  const signature = `${initial.minOwners}|${initial.games.map((game) => game.appId).join(",")}|${initial.pendingAppIds.join(",")}`;
  const pendingKey = initial.pendingAppIds.join(",");
  const [payload, setPayload] = useState(initial);
  const [rateLimited, setRateLimited] = useState(false);
  const [seen, setSeen] = useState(signature);

  if (seen !== signature) {
    setSeen(signature);
    setPayload(initial);
    setRateLimited(false);
  }

  useEffect(() => {
    const queue = pendingKey ? pendingKey.split(",").map(Number) : [];
    if (queue.length === 0) return;
    let cancelled = false;

    async function drain() {
      while (queue.length > 0 && !cancelled) {
        const batch = queue.splice(0, 8);
        const response = await fetch(`/api/rooms/${code}/metadata`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ appIds: batch }),
        });
        if (!response.ok || cancelled) return;
        const body = (await response.json()) as { apps: MetadataApp[]; rateLimited: boolean };
        setPayload((current) => applyMetadata(current, body.apps));
        if (body.rateLimited) {
          setRateLimited(true);
          return;
        }
      }
    }

    void drain();
    return () => {
      cancelled = true;
    };
  }, [code, signature, pendingKey]);

  return { payload, rateLimited };
}
