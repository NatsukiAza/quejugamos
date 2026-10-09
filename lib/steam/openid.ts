import "server-only";

const OPENID_ENDPOINT = "https://steamcommunity.com/openid/login";
const IDENTIFIER = "http://specs.openid.net/auth/2.0/identifier_select";

export function appOrigin(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function safeReturnTo(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  if (value.includes("://")) return "/";
  return value;
}

export function steamLoginRedirect(returnTo: string): string {
  const callback = new URL("/api/auth/steam/callback", appOrigin());
  callback.searchParams.set("returnTo", safeReturnTo(returnTo));
  const params = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": callback.toString(),
    "openid.realm": `${appOrigin()}/`,
    "openid.identity": IDENTIFIER,
    "openid.claimed_id": IDENTIFIER,
  });
  return `${OPENID_ENDPOINT}?${params.toString()}`;
}

export async function verifySteamOpenId(searchParams: URLSearchParams): Promise<string | null> {
  const claimed = searchParams.get("openid.claimed_id") ?? "";
  const match = claimed.match(/^https?:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/);
  if (!match?.[1]) return null;

  const returnTo = searchParams.get("openid.return_to") ?? "";
  if (!returnTo.startsWith(`${appOrigin()}/api/auth/steam/callback`)) return null;

  const body = new URLSearchParams();
  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith("openid.")) body.append(key, value);
  }
  body.set("openid.mode", "check_authentication");

  const response = await fetch(OPENID_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "text/plain",
      "user-agent": "QueJugamos/0.1",
    },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  const text = await response.text();
  if (!text.includes("is_valid:true")) return null;
  return match[1];
}
