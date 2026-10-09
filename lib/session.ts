import "server-only";

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

export type Session = {
  steamId: string;
  personaName: string;
  avatarUrl: string;
};

const COOKIE = "qj_session";

function secret(): Uint8Array {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 16) return new Uint8Array();
  return new TextEncoder().encode(value);
}

export function sessionConfigured(): boolean {
  return secret().length > 0;
}

export async function sealSession(session: Session): Promise<string> {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}

export async function getSession(): Promise<Session | null> {
  if (!sessionConfigured()) return null;
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.steamId !== "string") return null;
    return {
      steamId: payload.steamId,
      personaName: typeof payload.personaName === "string" ? payload.personaName : payload.steamId,
      avatarUrl: typeof payload.avatarUrl === "string" ? payload.avatarUrl : "",
    };
  } catch {
    return null;
  }
}

export { COOKIE as SESSION_COOKIE };
