export function headerImageUrl(appId: number): string {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;
}

export function formatHours(minutes: number, locale: string): string {
  const hours = minutes / 60;
  if (hours === 0) return "0";
  if (hours < 0.1) return "<0.1";
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(hours);
}
