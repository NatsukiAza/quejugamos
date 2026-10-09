import "server-only";

import { Redis } from "@upstash/redis";

export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}

let client: Redis | null = null;

export function redisConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

export function redis(): Redis {
  if (!redisConfigured()) throw new AppError(503, "redis_unconfigured");
  if (!client) {
    client = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return client;
}

export const LIBRARY_TTL_SECONDS = 60 * 60;
export const APP_SUCCESS_TTL_SECONDS = 60 * 60 * 24 * 30;
export const APP_FAILURE_TTL_SECONDS = 60 * 60 * 24 * 7;
export const ROOM_TTL_SECONDS = 60 * 60 * 24;
export const MAX_PLAYERS = 8;
