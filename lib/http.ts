import { NextResponse } from "next/server";
import { AppError } from "@/lib/store/redis";
import { SteamRequestError } from "@/lib/steam/client";

export function errorResponse(error: unknown) {
  if (error instanceof AppError) {
    return Response.json({ error: error.code }, { status: error.status });
  }
  if (error instanceof SteamRequestError) {
    const status =
      error.kind === "not_found"
        ? 404
        : error.kind === "rate_limit"
          ? 429
          : error.kind === "unconfigured"
            ? 503
            : 502;
    return Response.json({ error: error.kind }, { status });
  }
  console.error(error);
  return Response.json({ error: "internal" }, { status: 500 });
}

export async function orUnconfigured<T>(load: () => Promise<T>): Promise<T | "unconfigured"> {
  try {
    return await load();
  } catch (error) {
    if (error instanceof AppError && error.code === "redis_unconfigured") return "unconfigured";
    throw error;
  }
}
export function redirectTo(path: string) {
  const origin = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return NextResponse.redirect(new URL(path, origin));
}
