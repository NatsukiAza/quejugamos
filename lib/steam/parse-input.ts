const STEAM_ID = /^\d{17}$/;
const VANITY = /^(?=.*[a-zA-Z])[a-zA-Z0-9_-]{2,64}$/;

export type ParsedSteamInput =
  | { type: "id"; steamId: string }
  | { type: "vanity"; vanity: string };

export function parseSteamInput(raw: string): ParsedSteamInput | null {
  const value = raw.trim();
  if (!value) return null;

  const withoutScheme = value.replace(/^https?:\/\//i, "");
  const path = withoutScheme.replace(/^www\./i, "").split(/[?#]/)[0] ?? "";

  const profiles = path.match(/(?:^|\/)profiles\/(\d{17})\/?$/i);
  if (profiles?.[1]) return { type: "id", steamId: profiles[1] };

  const vanityUrl = path.match(/(?:^|steamcommunity\.com\/)id\/([^/]+)\/?$/i);
  if (vanityUrl?.[1] && VANITY.test(decodeURIComponent(vanityUrl[1]))) {
    return { type: "vanity", vanity: decodeURIComponent(vanityUrl[1]) };
  }

  if (STEAM_ID.test(value)) return { type: "id", steamId: value };
  if (!value.includes("/") && VANITY.test(value)) return { type: "vanity", vanity: value };
  return null;
}
