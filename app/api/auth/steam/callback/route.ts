import { NextRequest } from "next/server";
import { redirectTo } from "@/lib/http";
import { sealSession, SESSION_COOKIE, sessionConfigured, sessionCookieOptions } from "@/lib/session";
import { getPlayerSummary } from "@/lib/steam/client";
import { safeReturnTo, verifySteamOpenId } from "@/lib/steam/openid";

export async function GET(request: NextRequest) {
  const returnTo = safeReturnTo(request.nextUrl.searchParams.get("returnTo"));
  const steamId = await verifySteamOpenId(request.nextUrl.searchParams);
  if (!steamId) {
    const join = returnTo.includes("?") ? "&" : "?";
    return redirectTo(`${returnTo}${join}auth=failed`);
  }

  let personaName = steamId;
  let avatarUrl = "";
  try {
    const summary = await getPlayerSummary(steamId);
    personaName = summary.personaName;
    avatarUrl = summary.avatarUrl;
  } catch {
    personaName = steamId;
  }

  if (!sessionConfigured()) {
    const join = returnTo.includes("?") ? "&" : "?";
    return redirectTo(`${returnTo}${join}auth=failed`);
  }

  const token = await sealSession({ steamId, personaName, avatarUrl });
  const response = redirectTo(returnTo);
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}
