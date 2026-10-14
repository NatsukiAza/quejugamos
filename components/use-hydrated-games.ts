"use client";

import { startTransition, useCallback, useEffect, useRef, useState } from "react";
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

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useHydratedGames(code: string, initial: GamesPayload) {
  const signature = `${initial.minOwners}|${initial.games.map((game) => game.appId).join(",")}|${initial.pendingAppIds.join(",")}`;
  const pendingKey = initial.pendingAppIds.join(",");
  const [payload, setPayload] = useState(initial);
  const [rateLimited, setRateLimited] = useState(false);
  const [seen, setSeen] = useState(signature);
  const paused = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  if (seen !== signature) {
    setSeen(signature);
    setPayload(initial);
    setRateLimited(false);
  }

  const pauseHydration = useCallback((value: boolean) => {
    paused.current = value;
    if (value) abortRef.current?.abort();
  }, []);

  useEffect(() => {
    const queue = pendingKey ? pendingKey.split(",").map(Number) : [];
    if (queue.length === 0) return;
    let cancelled = false;

    async function waitUntilRunning() {
      while (paused.current && !cancelled) await wait(40);
    }

    async function drain() {
      while (queue.length > 0 && !cancelled) {
        await waitUntilRunning();
        if (cancelled) return;
        const batch = queue.splice(0, 8);
        const controller = new AbortController();
        abortRef.current = controller;
        let response: Response;
        try {
          response = await fetch(`/api/rooms/${code}/metadata`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ appIds: batch }),
            signal: controller.signal,
          });
        } catch (error) {
          if (cancelled) return;
          if (error instanceof DOMException && error.name === "AbortError") {
            queue.unshift(...batch);
            continue;
          }
          return;
        }
        if (!response.ok || cancelled) return;
        const body = (await response.json()) as { apps: MetadataApp[]; rateLimited: boolean };
        await waitUntilRunning();
        if (cancelled) return;
        startTransition(() => {
          setPayload((current) => applyMetadata(current, body.apps));
          if (body.rateLimited) setRateLimited(true);
        });
        if (body.rateLimited) return;
      }
    }

    void drain();
    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, [code, signature, pendingKey]);

  return { payload, rateLimited, pauseHydration };
}
